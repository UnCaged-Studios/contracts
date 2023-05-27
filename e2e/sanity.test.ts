import { expect, test, beforeAll } from '@jest/globals';
import { sdkFactory } from '../src/ka-ching/sdk';
import { JsonRpcProvider, Wallet } from 'ethers';
import { CONTRACT_DEPLOYER_PRIVATE_KEY } from './config';

const localJsonRpcProvider = new JsonRpcProvider();
const cashier = new Wallet(
  '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
  localJsonRpcProvider
);
const orderSigner = Wallet.createRandom(localJsonRpcProvider);

beforeAll(async () => {
  const wallet = new Wallet(
    CONTRACT_DEPLOYER_PRIVATE_KEY,
    new JsonRpcProvider()
  );
  const deployerSdk = sdkFactory({ wallet });
  await deployerSdk.addCashier(cashier.address);
  const cashierSdk = sdkFactory({ wallet: cashier });
  await cashierSdk.setOrderSigners([orderSigner.address]);
});

test('node is online', async () => {
  expect(await localJsonRpcProvider.getBlockNumber()).toBeGreaterThan(0);
});

test('cashier wallet can perform actions', async () => {
  const cashierSdk = sdkFactory({ wallet: cashier });
  expect(await cashierSdk.getOrderSigners()).toEqual([orderSigner.address]);
});
