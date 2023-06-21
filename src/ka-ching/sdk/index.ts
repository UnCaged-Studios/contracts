import { orderSignerSdkFactory } from './order-signer';
import { customerSdkFactory } from './customer';
import type { providers, Signer } from 'ethers';
import { readonlySdkFactory } from './readonly';
import { AdvancedSigner } from './types';
import { cashierSdkFactory } from './cahiser';
export type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1Abi';

export function sdkFactory(contractAddress: string) {
  return {
    readonly: (provider: providers.Provider) =>
      readonlySdkFactory(contractAddress, provider),
    customer: (customer: AdvancedSigner) =>
      customerSdkFactory(contractAddress, customer),
    orderSigner: (signer: AdvancedSigner) =>
      orderSignerSdkFactory(contractAddress, signer),
    cashier: (cashier: Signer) => cashierSdkFactory(contractAddress, cashier),
  };
}
