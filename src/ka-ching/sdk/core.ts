import { KaChingCashRegisterV1Abi__factory } from './abi/KaChingCashRegisterV1';
import type { ContractRunner } from 'ethers';

export function coreSdkFactory(
  contractAddress: string,
  runner: ContractRunner
) {
  return KaChingCashRegisterV1Abi__factory.connect(contractAddress, runner);
}
