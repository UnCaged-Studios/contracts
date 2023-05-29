import { KaChingCashRegisterV1Abi__factory } from './abi';
import type { BaseWallet } from 'ethers';

export function coreSdkFactory(contractAddress: string, wallet: BaseWallet) {
  return KaChingCashRegisterV1Abi__factory.connect(contractAddress, wallet);
}
