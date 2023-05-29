import { coreSdkFactory } from './core';
import { orderSignerSdkFactory } from './order-signer';
import { customerSdkFactory } from './customer';
import type { BaseWallet } from 'ethers';

export {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1Abi';

export function sdkFactory(contractAddress: string) {
  return {
    deployer: (wallet: BaseWallet) => coreSdkFactory(contractAddress, wallet),
    cashier: (wallet: BaseWallet) => coreSdkFactory(contractAddress, wallet),
    customer: (wallet: BaseWallet) =>
      customerSdkFactory(contractAddress, wallet),
    orderSigner: (wallet: BaseWallet) =>
      orderSignerSdkFactory(contractAddress, wallet),
  };
}
