import { coreSdkFactory } from './core';
import { orderSignerSdkFactory } from './order-signer';
import { customerSdkFactory } from './customer';
import type { BaseWallet, Provider } from 'ethers';
export type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';

export function sdkFactory(contractAddress: string) {
  return {
    contract: (provider: Provider) => coreSdkFactory(contractAddress, provider),
    deployer: (wallet: BaseWallet) => coreSdkFactory(contractAddress, wallet),
    cashier: (wallet: BaseWallet) => coreSdkFactory(contractAddress, wallet),
    customer: (wallet: BaseWallet) =>
      customerSdkFactory(contractAddress, wallet),
    orderSigner: (wallet: BaseWallet) =>
      orderSignerSdkFactory(contractAddress, wallet),
  };
}
