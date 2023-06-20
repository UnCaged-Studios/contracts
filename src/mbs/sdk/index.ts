import { ethers } from 'ethers';
import { MonkeyLeagueERC20Abi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MonkeyLeagueERC20Abi__factory.connect(contractAddress, runner);
}
