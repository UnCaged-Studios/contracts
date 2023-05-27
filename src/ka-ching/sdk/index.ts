import type { BaseWallet } from 'ethers';
import { KaChingCashRegisterV1Abi__factory } from './abi';

export function sdkFactory({ wallet }: { wallet: BaseWallet }) {
  // TODO - split sdk based on type (deployer, cashier and customer)
  return KaChingCashRegisterV1Abi__factory.connect(
    '0x5e5713a0d915701f464debb66015add62b2e6ae9',
    wallet
  );
}
