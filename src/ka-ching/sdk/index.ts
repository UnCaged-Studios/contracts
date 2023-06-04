import { coreSdkFactory } from './core';
import { orderSignerSdkFactory } from './order-signer';
import { customerSdkFactory } from './customer';
import type { providers, Signer } from 'ethers';
import { readonlySdkFactory } from './readonly';
import { AdvancedSigner } from './types';
export type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';

export function sdkFactory(contractAddress: string) {
  return {
    readonly: (provider: providers.Provider) =>
      readonlySdkFactory(contractAddress, provider),
    customer: (customer: AdvancedSigner) =>
      customerSdkFactory(contractAddress, customer),
    orderSigner: (signer: AdvancedSigner) =>
      orderSignerSdkFactory(contractAddress, signer),
    // TODO - expose only relevant functions
    deployer: (deployer: Signer) => coreSdkFactory(contractAddress, deployer),
    cashier: (cashier: Signer) => coreSdkFactory(contractAddress, cashier),
  };
}
