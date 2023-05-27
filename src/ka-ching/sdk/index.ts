import { BaseWallet, JsonRpcProvider } from 'ethers';
import { KaChingCashRegisterV1Abi__factory } from './abi';

export async function getBlockNumber() {
  const provider = new JsonRpcProvider();
  return await provider.getBlockNumber();
}

export function sdkFactory({ wallet }: { wallet: BaseWallet }) {
  return KaChingCashRegisterV1Abi__factory.connect(
    '0x5e5713a0d915701f464debb66015add62b2e6ae9',
    wallet
  );
}
