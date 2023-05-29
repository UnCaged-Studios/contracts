import { expect, test, beforeAll } from '@jest/globals';
import {
  ContractRunner,
  JsonRpcProvider,
  Wallet,
  Signature,
  ContractTransactionResponse,
} from 'ethers';
import { parse as parseUUID, v4 as UUID } from 'uuid';
import {
  privateKeys,
  kaChingCashRegister,
  contractDeployer,
  mockMBS,
} from './anvil.json';
import { FullOrderStruct, sdkFactory } from '../../src/ka-ching/sdk';
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

beforeAll(async () => {
  await _waitForTxn(() => deployerSdk.addCashier(cashier.address));
  await _waitForTxn(() => cashierSdk.setOrderSigners([orderSigner.address]));
  // fund customer with MBS
  const deployerMBS = mbsSDK(deployer);
  await _waitForTxn(() =>
    deployerMBS.mint(customer.address, BigInt(5 * 10 ** 18))
  );
}, 30_000);

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('cashier wallet can perform actions', async () => {
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});

test('debit customer with erc20', async () => {
  const amount = BigInt(3 * 10 ** 18);
  const customerMBS = mbsSDK(customer);
  const currency = await customerMBS.getAddress();
  const order = customerSdk.debitCustomerWithERC20({
    id: parseUUID(UUID()),
    amount,
    currency,
  });
  const nonces = await customerMBS.nonces(customer.address);
  const domain = {
    name: await customerMBS.name(),
    version: '1',
    chainId: '31337',
    verifyingContract: currency,
  };
  const types = {
    Permit: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'spender',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  };
  const values = {
    owner: customer.address,
    spender: kaChingCashRegister,
    value: amount,
    nonce: nonces,
    deadline: Math.floor(Date.now() / 1000) + 60,
  };
  const permitSignature = await customer.signTypedData(domain, types, values);
  const sigi = Signature.from(permitSignature);
  await _waitForTxn(() =>
    customerMBS.permit(
      values.owner,
      values.spender,
      values.value,
      values.deadline,
      sigi.v,
      sigi.r,
      sigi.s
    )
  );
  const orderSignature = await _signOffChain(order);
  await _waitForTxn(() =>
    customerSdk.settleOrderPayment(order, orderSignature)
  );
  expect(await customerMBS.balanceOf(customer.address)).toBe(
    BigInt(2 * 10 ** 18)
  );
}, 30_000);
