import { ethers } from 'ethers';
import { MBSOptimismMintableERC20Abi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MBSOptimismMintableERC20Abi__factory.connect(contractAddress, runner);
}
