import { FullOrderStruct } from './abi/KaChingCashRegisterV1Abi';
import { coreSdkFactory } from './core';
import type { BaseWallet } from 'ethers';

function serializeOrderId(orderId: Uint8Array) {
  if (orderId.length != 16) {
    throw new Error(
      `orderId is ${orderId.length} bytes, which does not represent a 128-bit number (16 bytes)`
    );
  }
  let hex = Array.from(orderId)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return BigInt('0x' + hex);
}

type DebitOrder = {
  id: Uint8Array;
  amount: bigint;
  currency: string;
};

export function customerSdkFactory(
  contractAddress: string,
  customer: BaseWallet
) {
  const _sdk = coreSdkFactory(contractAddress, customer);
  return {
    debitCustomerWithERC20({ id, currency, amount }: DebitOrder) {
      return {
        id: serializeOrderId(id),
        customer: customer.address,
        expiry: Math.ceil((Date.now() + 60_000) / 1_000),
        notBefore: 0,
        items: [{ amount, currency, credit: false, ERC: 20, id: 0 }],
      };
    },
    creditCustomerWithERC20({ id, currency, amount }: DebitOrder) {
      return {
        id: serializeOrderId(id),
        customer: customer.address,
        expiry: Math.ceil((Date.now() + 60_000) / 1_000),
        notBefore: 0,
        items: [{ amount, currency, credit: true, ERC: 20, id: 0 }],
      };
    },
    settleOrderPayment(order: FullOrderStruct, signature: string) {
      return _sdk.settleOrderPayment(order, signature);
    },
  };
}
