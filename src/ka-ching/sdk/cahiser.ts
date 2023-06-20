import { Signer } from 'ethers';
import { coreSdkFactory } from './core';

export function cashierSdkFactory(contractAddress: string, cashier: Signer) {
  const _sdk = coreSdkFactory(contractAddress, cashier);

  return {
    setOrderSigners(newSigners: string[]) {
      return _sdk.setOrderSigners(newSigners);
    },
    getOrderSigners() {
      return _sdk.getOrderSigners();
    },
  };
}
