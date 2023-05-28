import { expect, test, beforeAll } from '@jest/globals';
import { JsonRpcProvider, Wallet } from 'ethers';
import { parse as parseUUID, v4 as UUID } from 'uuid';
import {
  privateKeys,
  kaChingCashRegister,
  contractDeployer,
  mockMBS,
} from './anvil.json';

import { FullOrderStruct, sdkFactory } from '../src/ka-ching/sdk';

// wallets
const localJsonRpcProvider = new JsonRpcProvider();
const deployer = new Wallet(contractDeployer, new JsonRpcProvider());
const cashier = new Wallet(privateKeys[3], localJsonRpcProvider);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);
const customer = new Wallet(privateKeys[4], localJsonRpcProvider);

// SDKs
const sdk = sdkFactory(kaChingCashRegister);
const deployerSdk = sdk.deployer(deployer);
const cashierSdk = sdk.cashier(cashier);
const customerSdk = sdk.customer(customer);
const orderSignerSdk = sdk.orderSigner(orderSigner);

const _signOffChain = (order: FullOrderStruct) =>
  orderSignerSdk.signOrder(order, { chainId: '31337' });

beforeAll(async () => {
  await deployerSdk.addCashier(cashier.address);
  await cashierSdk.setOrderSigners([orderSigner.address]);
});

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('cashier wallet can perform actions', async () => {
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});

test('debit customer with erc20', async () => {
  const order = customerSdk.debitCustomerWithERC20({
    id: parseUUID(UUID()),
    amount: BigInt(3 * 10 ** 18),
    currency: mockMBS as `0x${string}`,
  });
  const signature = await _signOffChain(order);
  await customerSdk.settleOrderPayment(order, signature);
  // TODO - verify it was over
});
