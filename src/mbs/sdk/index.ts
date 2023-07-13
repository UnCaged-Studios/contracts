import { ethers } from 'ethers';
import { MBSAbi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MBSAbi__factory.connect(contractAddress, runner);
}
