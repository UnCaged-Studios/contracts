import { ethers } from 'ethers';
import { HelloBaseScoreGoalAbi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return HelloBaseScoreGoalAbi__factory.connect(contractAddress, runner);
}
