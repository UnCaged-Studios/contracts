import { BigNumber, BigNumberish, providers } from 'ethers';
import ms from 'ms';
import { coreSdkFactory } from './core';
import { toEpoch } from './commons';
import { serializeOrder } from './order-serialization';
import { OrderItemStruct } from './abi/KaChingCashRegisterV1Abi';

function serializeOrderId(orderId: Uint8Array) {
  if (orderId.length != 16) {
    throw new Error(
      `orderId is ${orderId.length} bytes, which does not represent a 128-bit number (16 bytes)`
    );
  }
  const hex = Array.from(orderId)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return BigNumber.from('0x' + hex);
}

type UnaryOrderParams = {
  id: Uint8Array;
  customer: string;
  amount: BigNumber;
  expiresIn: string;
  startsIn?: string;
};

type QueryEventsBlockFilters = {
  fromBlockOrBlockhash?: string | number | undefined;
  toBlock?: string | number | undefined;
};

export function readonlySdkFactory(
  contractAddress: string,
  provider: providers.Provider
) {
  const _sdk = coreSdkFactory(contractAddress, provider);

  const _unaryOrder = (
    { id, amount, expiresIn, startsIn, customer }: UnaryOrderParams,
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
      items: [{ amount, credit }] as [OrderItemStruct],
    };
  };

  const _queryOrderFullySettledEvents = async (
    orderId: BigNumberish | undefined,
    customerAddress: string | undefined,
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
      ...ev, //  as InferSerializable<Log>
      description: _sdk.interface.parseLog(ev),
    }));
  };

  return {
    orders: {
      creditCustomerWithERC20(params: UnaryOrderParams) {
        const order = _unaryOrder(params, true);
        return { order, serializedOrder: serializeOrder(order) };
      },
      debitCustomerWithERC20(params: UnaryOrderParams) {
        const order = _unaryOrder(params, false);
        return { order, serializedOrder: serializeOrder(order) };
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
