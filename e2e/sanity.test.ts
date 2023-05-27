import { expect, test } from '@jest/globals';
import * as sdk from '../src/ka-ching/sdk';

test('sanity', async () => {
  expect(await sdk.getBlockNumber()).toBeGreaterThan(0);
  expect(await sdk.getOrderSigners()).toEqual(['wham']);
});
