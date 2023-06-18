import { expect, test, beforeAll } from '@jest/globals';
import {
  Wallet,
  Signer,
  providers,
  ContractTransaction,
  ethers,
  BigNumber,
} from 'ethers';
import { parse as parseUUID, v4 as uuid } from 'uuid';
import {
  privateKeys,
  kaChingCashRegister,
  contractDeployer,
  mbs as mbsAddress,
} from '../anvil.json';
import { KaChingV1 } from '../../dist/cjs';
import { MBS } from '../../dist/cjs';

// wallets
const localJsonRpcProvider = new ethers.providers.JsonRpcProvider();
const deployer = new Wallet(contractDeployer, localJsonRpcProvider);
const cashier = new Wallet(privateKeys[3], localJsonRpcProvider);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);
const customer = new Wallet(privateKeys[4], localJsonRpcProvider);

// SDKs under test
const sdk = KaChingV1.sdkFactory(kaChingCashRegister);
const deployerSdk = sdk.deployer(deployer);
const cashierSdk = sdk.cashier(cashier);
const customerSdk = sdk.customer(customer);
const orderSignerSdk = sdk.orderSigner(orderSigner);
const readonlySdk = sdk.readonly(localJsonRpcProvider);

// test SDKs
const mbsSDK = (runner: Signer | providers.Provider) =>
  MBS.sdkFactory(mbsAddress, runner);

const _signOffChain = (order: KaChingV1.FullOrderStruct) =>
  orderSignerSdk.signOrder(order, { chainId: '31337' });

const _waitForTxn = async (sendTxn: () => Promise<ContractTransaction>) => {
  const resp = await sendTxn();
  await resp.wait();
};

const _ensureNonZeroBalance = async (
  walletAddress: string,
  mintAmount = BigNumber.from(BigInt(5 * 10 ** 18))
) => {
  const tokenContract = mbsSDK(deployer);
  const balance = await tokenContract.balanceOf(walletAddress);
  if (balance.gt(0)) {
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

  const amount = BigNumber.from(BigInt(3 * 10 ** 18));
  await _waitForTxn(() =>
    customerSdk.permitERC20(amount, '1h', {
      name: 'MonkeyLeague',
      version: '1',
      chainId: '31337',
      verifyingContract: mbsAddress,
    })
  );
  const id = parseUUID(uuid());
  const order = readonlySdk.orders.debitCustomerWithERC20({
    id,
    customer: customer.address,
    amount,
    currency: mbsAddress,
    expiresIn: '1m',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(order, orderSignature)
  );
  const customer_b1 = await mbsSDK(localJsonRpcProvider).balanceOf(
    customer.address
  );
  expect(customer_b1.toBigInt()).toBe(customer_b0.sub(amount).toBigInt());
  _orders.push(id);
}, 30_000);

test('credit customer with erc20', async () => {
  const cashRegister_b0 = await _ensureNonZeroBalance(kaChingCashRegister);

  const mbs = mbsSDK(localJsonRpcProvider);
  const customer_b0 = await mbs.balanceOf(customer.address);
  expect(cashRegister_b0.toBigInt()).toBeGreaterThan(BigInt(0));

  const amount = cashRegister_b0;
  const id = parseUUID(uuid());
  const order = readonlySdk.orders.creditCustomerWithERC20({
    id,
    amount,
    customer: customer.address,
    currency: mbsAddress,
    expiresIn: '30s',
  });
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(order, orderSignature)
  );
  const customer_b1 = await mbs.balanceOf(customer.address);
  expect(customer_b1.toBigInt()).toBe(customer_b0.add(amount).toBigInt());
  _orders.push(id);
}, 30_000);

test('OrderFullySettled event', async () => {
  const [allEvents, byOrderId_1, byCustomer] = await Promise.all([
    readonlySdk.events.OrderFullySettled.findAll(),
    readonlySdk.events.OrderFullySettled.findByOrderId(_orders[1]),
    readonlySdk.events.OrderFullySettled.findByCustomer(customer.address),
  ]);
  expect(allEvents.length).toBe(2);
  expect(byCustomer.length).toBe(2);
  expect(byOrderId_1.length).toBe(1);
}, 30_000);
