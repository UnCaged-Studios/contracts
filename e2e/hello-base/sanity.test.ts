import { expect, test } from '@jest/globals';
import { privateKeys, contracts } from '../anvil.json';
import { _waitForTxn, localJsonRpcProvider } from '../test-utils';
import { Wallet } from 'ethers';

import { HelloBaseScoreGoal } from '../../dist/cjs';

const alice = new Wallet(privateKeys.alice, localJsonRpcProvider);
const bob = new Wallet(privateKeys.bob, localJsonRpcProvider);

const aliceSdk = HelloBaseScoreGoal.sdkFactory(
  contracts.helloBaseScoreGoal,
  alice
);
const bobSdk = HelloBaseScoreGoal.sdkFactory(contracts.helloBaseScoreGoal, bob);

test('Alice and Bob can score a goal and cannot score again', async () => {
  await Promise.all([
    _waitForTxn(() => aliceSdk.scoreGoal()),
    _waitForTxn(() => bobSdk.scoreGoal()),
  ]);
  const hasAliceScoredGoal = await aliceSdk.hasScoredGoal(alice.address);
  expect(hasAliceScoredGoal).toBeTruthy();

  const hasBobScoredGoal = await bobSdk.hasScoredGoal(bob.address);
  expect(hasBobScoredGoal).toBeTruthy();

  try {
    await aliceSdk.scoreGoal();
  } catch (e: unknown) {
    expect((e as Error).message).toContain('You have already scored a goal!');
  }
});
