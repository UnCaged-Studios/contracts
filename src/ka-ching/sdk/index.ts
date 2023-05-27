import { KaChingCashRegisterV1Abi__factory } from './abi';
import type { BaseWallet } from 'ethers';

export function sdkFactory(contractAddress: string, wallet: BaseWallet) {
  // TODO - split sdk based on type (deployer, cashier and customer)
  return KaChingCashRegisterV1Abi__factory.connect(contractAddress, wallet);
}
