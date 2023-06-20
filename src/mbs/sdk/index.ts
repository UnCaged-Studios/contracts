import { ethers } from 'ethers';
import { MBSTokenAbi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MBSTokenAbi__factory.connect(contractAddress, runner);
}
