import { expect, test, beforeAll } from '@jest/globals';
import {
  ContractRunner,
  JsonRpcProvider,
  Wallet,
  ContractTransactionResponse,
} from 'ethers';
import { parse as parseUUID, v4 as uuid } from 'uuid';
import {
  privateKeys,
  kaChingCashRegister,
  contractDeployer,
  mockMBS,
} from '../anvil.json';
import { sdkFactory, type FullOrderStruct } from '../../dist/ka-ching';
import { MockMBSAbi__factory } from './abi/MockMBS';

// wallets
const localJsonRpcProvider = new JsonRpcProvider();
const deployer = new Wallet(contractDeployer, new JsonRpcProvider());
const cashier = new Wallet(privateKeys[3], localJsonRpcProvider);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);
const customer = new Wallet(privateKeys[4], localJsonRpcProvider);

// SDKs under test
const sdk = sdkFactory(kaChingCashRegister);
const deployerSdk = sdk.deployer(deployer);
const cashierSdk = sdk.cashier(cashier);
const customerSdk = sdk.customer(customer);
const orderSignerSdk = sdk.orderSigner(orderSigner);

// test SDKs
const mbsSDK = (runner: ContractRunner) =>
  MockMBSAbi__factory.connect(mockMBS, runner);

const _signOffChain = (order: FullOrderStruct) =>
  orderSignerSdk.signOrder(order, { chainId: '31337' });

const _waitForTxn = async (
  sendTxn: () => Promise<ContractTransactionResponse>
) => {
  const resp = await sendTxn();
  await resp.wait();
};

const _ensureNonZeroBalance = async (
  walletAddress: string,
  mintAmount = BigInt(5 * 10 ** 18)
) => {
  const tokenContract = mbsSDK(deployer);
  let balance = await tokenContract.balanceOf(walletAddress);
  if (balance > 0) {
    return balance;
  }
  await _waitForTxn(() => tokenContract.mint(walletAddress, mintAmount));
  return mintAmount;
};

let _orders: Uint8Array[];

beforeAll(async () => {
  await _waitForTxn(() => deployerSdk.addCashier(cashier.address));
  await _waitForTxn(() => cashierSdk.setOrderSigners([orderSigner.address]));
  _orders = [];
}, 30_000);

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('cashier wallet can perform actions', async () => {
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});

test('debit customer with erc20', async () => {
  const customer_b0 = await _ensureNonZeroBalance(customer.address);

  const amount = BigInt(3 * 10 ** 18);
  await _waitForTxn(() =>
    customerSdk.permitERC20(amount, '1h', {
      name: 'Mock MBS',
      version: '1',
      chainId: '31337',
      verifyingContract: mockMBS,
    })
  );
  const id = parseUUID(uuid());
  _orders.push(id);
  const order = customerSdk.orders.debitCustomerWithERC20({
    id,
    amount,
    currency: mockMBS,
    expiresIn: '1m',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(order, orderSignature)
  );
  const customer_b1 = await mbsSDK(localJsonRpcProvider).balanceOf(
    customer.address
  );
  expect(customer_b1).toBe(customer_b0 - amount);
}, 30_000);

test('credit customer with erc20', async () => {
  const cashRegister_b0 = await _ensureNonZeroBalance(kaChingCashRegister);

  const mbs = mbsSDK(localJsonRpcProvider);
  const customer_b0 = await mbs.balanceOf(customer.address);
  expect(cashRegister_b0).toBeGreaterThan(0);

  const amount = cashRegister_b0;
  const id = parseUUID(uuid());
  _orders.push(id);
  const order = customerSdk.orders.creditCustomerWithERC20({
    id,
    amount,
    currency: mockMBS,
    expiresIn: '30s',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(order, orderSignature)
  );
  const customer_b1 = await mbs.balanceOf(customer.address);
  expect(customer_b1).toBe(customer_b0 + amount);
}, 30_000);

test('OrderFullySettled event', async () => {
  const [allEvents, byOrderId_1, byCustomer] = await Promise.all([
    customerSdk.events.OrderFullySettled.findAll(),
    customerSdk.events.OrderFullySettled.findByOrderId(_orders[1]),
    customerSdk.events.OrderFullySettled.findByCustomer(),
  ]);
  expect(allEvents.length).toBe(2);
  expect(byCustomer.length).toBe(2);
  expect(byOrderId_1.length).toBe(1);
}, 30_000);
