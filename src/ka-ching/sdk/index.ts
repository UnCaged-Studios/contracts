import { coreSdkFactory } from './core';
import { orderSignerSdkFactory } from './order-signer';
import { customerSdkFactory } from './customer';
import type { Provider, Signer } from 'ethers';
import { readonlySdkFactory } from './readonly';
export type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';

export function sdkFactory(contractAddress: string) {
  return {
    readonly: (provider: Provider) =>
      readonlySdkFactory(contractAddress, provider),
    customer: (customer: Signer) =>
      customerSdkFactory(contractAddress, customer),
    orderSigner: (signer: Signer) =>
      orderSignerSdkFactory(contractAddress, signer),
    // TODO - expose only relevant functions
    deployer: (deployer: Signer) => coreSdkFactory(contractAddress, deployer),
    cashier: (cashier: Signer) => coreSdkFactory(contractAddress, cashier),
  };
}
