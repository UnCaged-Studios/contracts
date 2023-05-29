import ms from 'ms';
import { FullOrderStruct } from './abi/KaChingCashRegisterV1Abi';
import { coreSdkFactory } from './core';
import type { BaseWallet } from 'ethers';

function toEpoch(until: string): number {
  const durationMs = ms(until);
  if (!durationMs) {
    throw new Error(`Invalid duration format: ${until}`);
  }
  return Math.floor((Date.now() + durationMs) / 1000);
}

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

type UnaryOrderParams = {
  id: Uint8Array;
  amount: bigint;
  currency: string;
  expiresIn: string;
  startsIn?: string;
};

export function customerSdkFactory(
  contractAddress: string,
  customer: BaseWallet
) {
  const _sdk = coreSdkFactory(contractAddress, customer);
  const _unaryOrder = (
    { id, amount, currency, expiresIn, startsIn }: UnaryOrderParams,
    credit: boolean
  ) => {
    if (ms(startsIn || '0') >= ms(expiresIn)) {
      throw new Error(
        `Invalid duration: startsIn (${startsIn}) should be less than expiresIn (${expiresIn})`
      );
    }
    return {
      id: serializeOrderId(id),
      customer: customer.address,
      expiry: toEpoch(expiresIn),
      notBefore: startsIn ? toEpoch(startsIn) : 0,
      items: [{ amount, currency, credit, ERC: 20, id: 0 }],
    };
  };

  return {
    creditCustomerWithERC20(params: UnaryOrderParams) {
      return _unaryOrder(params, true);
    },
    debitCustomerWithERC20(params: UnaryOrderParams) {
      return _unaryOrder(params, false);
    },
    settleOrderPayment(order: FullOrderStruct, signature: string) {
      return _sdk.settleOrderPayment(order, signature);
    },
  };
}
