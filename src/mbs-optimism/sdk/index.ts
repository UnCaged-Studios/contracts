import { ethers } from 'ethers';
import { MBSTokenOptimismMintableERC20Abi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MBSTokenOptimismMintableERC20Abi__factory.connect(
    contractAddress,
    runner
  );
}
