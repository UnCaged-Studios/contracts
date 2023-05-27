import { expect, test, beforeAll } from '@jest/globals';
import { sdkFactory } from '../src/ka-ching/sdk';
import { JsonRpcProvider, Wallet } from 'ethers';
import { privateKeys, contractAddress, contractDeployer } from './anvil.json';

const localJsonRpcProvider = new JsonRpcProvider();
const cashier = new Wallet(privateKeys[1], localJsonRpcProvider);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);

beforeAll(async () => {
  const wallet = new Wallet(contractDeployer, new JsonRpcProvider());
  const deployerSdk = sdkFactory(contractAddress, wallet);
  await deployerSdk.addCashier(cashier.address);
  const cashierSdk = sdkFactory(contractAddress, cashier);
  await cashierSdk.setOrderSigners([orderSigner.address]);
});

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('cashier wallet can perform actions', async () => {
  const cashierSdk = sdkFactory(contractAddress, cashier);
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});

// test('debit customer with erc20', async () => {
//   const x = sdkFactory();
// });
