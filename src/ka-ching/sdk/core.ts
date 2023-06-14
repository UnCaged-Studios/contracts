import { KaChingCashRegisterV1Abi__factory } from './abi';
import type { ethers } from 'ethers';

export function coreSdkFactory(
  contractAddress: string,
  runner: ethers.Signer | ethers.providers.Provider
) {
  return KaChingCashRegisterV1Abi__factory.connect(contractAddress, runner);
}
