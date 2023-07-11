import {
  BigNumber,
  ContractTransaction,
  Signer,
  Wallet,
  providers,
} from 'ethers';
import { privateKeys, contracts } from './anvil.json';
import { MBSOptimism } from '../dist/cjs';

export const localJsonRpcProvider = new providers.JsonRpcProvider();

export const bridge = new Wallet(
  privateKeys.optimismBridge,
  localJsonRpcProvider
);

export const mbsSDK = (runner: Signer | providers.Provider) =>
  MBSOptimism.sdkFactory(contracts.mbsOptimism, runner);

export const _waitForTxn = async (
  sendTxn: () => Promise<ContractTransaction>
) => {
  const resp = await sendTxn();
  await resp.wait();
};

export const _ensureNonZeroBalance = async (
  walletAddress: string,
  mintAmount = BigNumber.from(BigInt(10 * 10 ** 18))
) => {
  const tokenContract = mbsSDK(bridge);
  const balance = await tokenContract.balanceOf(walletAddress);
  if (balance.gt(0)) {
    return balance;
  }
  await _waitForTxn(() => tokenContract.mint(walletAddress, mintAmount));
  return mintAmount;
};
