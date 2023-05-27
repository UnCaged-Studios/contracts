import { expect, test, beforeAll } from '@jest/globals';
import { sdkFactory, getBlockNumber } from '../src/ka-ching/sdk';
import { JsonRpcProvider, Wallet } from 'ethers';
import { CONTRACT_DEPLOYER_PRIVATE_KEY } from './config';

const localJsonRpcProvider = new JsonRpcProvider();
const cashier = Wallet.createRandom(localJsonRpcProvider);

beforeAll(async () => {
  const wallet = new Wallet(
    CONTRACT_DEPLOYER_PRIVATE_KEY,
    new JsonRpcProvider()
  );
  const sdk = sdkFactory({ wallet });
  await sdk.addCashier(cashier.address);
});

test('node is online', async () => {
  expect(await getBlockNumber()).toBeGreaterThan(0);
});

test('sanity', async () => {
  const sdk = sdkFactory({ wallet: cashier });
  expect(await sdk.getOrderSigners()).toEqual([]);
});
