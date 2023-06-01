import { AddressLike, BigNumberish, Log, Provider } from 'ethers';
import ms from 'ms';
import { coreSdkFactory } from './core';
import { toEpoch } from './commons';

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
  customer: string;
  amount: bigint;
  currency: string;
  expiresIn: string;
  startsIn?: string;
};

type QueryEventsBlockFilters = {
  fromBlockOrBlockhash?: string | number | undefined;
  toBlock?: string | number | undefined;
};

type Serializable =
  | string
  | number
  | boolean
  | null
  | { [K in string | number]: Serializable }
  | Serializable[];

type InferSerializable<T> = {
  [P in keyof T as T[P] extends Serializable ? P : never]: T[P];
};

export function readonlySdkFactory(
  contractAddress: string,
  provider: Provider
) {
  const _sdk = coreSdkFactory(contractAddress, provider);

  const _unaryOrder = (
    { id, amount, currency, expiresIn, startsIn, customer }: UnaryOrderParams,
    credit: boolean
  ) => {
    if (ms(startsIn || '0') >= ms(expiresIn)) {
      throw new Error(
        `Invalid duration: startsIn (${startsIn}) should be less than expiresIn (${expiresIn})`
      );
    }
    return {
      id: serializeOrderId(id),
      customer,
      expiry: toEpoch(expiresIn),
      notBefore: startsIn ? toEpoch(startsIn) : 0,
      items: [{ amount, currency, credit, ERC: 20, id: 0 }],
    };
  };

  const _queryOrderFullySettledEvents = async (
    orderId: BigNumberish | undefined,
    customerAddress: AddressLike | undefined,
    { fromBlockOrBlockhash, toBlock }: QueryEventsBlockFilters = {}
  ) => {
    const topicFilter = _sdk.filters.OrderFullySettled(
      orderId,
      customerAddress
    );
    const result = await _sdk.queryFilter(
      topicFilter,
      fromBlockOrBlockhash,
      toBlock
    );
    return result.map((ev) => ({
      ...(ev.toJSON() as InferSerializable<Log>),
      description: _sdk.interface.parseLog(ev as any),
    }));
  };

  return {
    orders: {
      creditCustomerWithERC20(params: UnaryOrderParams) {
        return _unaryOrder(params, true);
      },
      debitCustomerWithERC20(params: UnaryOrderParams) {
        return _unaryOrder(params, false);
      },
    },
    events: {
      OrderFullySettled: {
        findByCustomer(
          customerAddress: string,
          blockFilters?: QueryEventsBlockFilters
        ) {
          return _queryOrderFullySettledEvents(
            undefined,
            customerAddress,
            blockFilters
          );
        },
        findByOrderId(id: Uint8Array, blockFilters?: QueryEventsBlockFilters) {
          return _queryOrderFullySettledEvents(
            serializeOrderId(id),
            undefined,
            blockFilters
          );
        },
        findAll(blockFilters?: QueryEventsBlockFilters) {
          return _queryOrderFullySettledEvents(
            undefined,
            undefined,
            blockFilters
          );
        },
      },
    },
  };
}
