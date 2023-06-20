import { ethers } from 'ethers';
import { MonkeyLeagueOptimismMintableERC20Abi__factory } from './abi';

export function sdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return MonkeyLeagueOptimismMintableERC20Abi__factory.connect(
    contractAddress,
    runner
  );
}
