import ms from 'ms';
import { FullOrderStruct } from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';
import { coreSdkFactory } from './core';
import {
  AddressLike,
  BaseWallet,
  BigNumberish,
  Contract,
  Log,
  Signature,
} from 'ethers';
import { abi, types } from './permit';

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

type TypedDataDomain = {
  name: string;
  version: string;
  chainId: BigNumberish;
  verifyingContract: string;
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

  const _permitERC20 = async (
    amount: bigint,
    deadlineIn: string,
    domain: TypedDataDomain
  ) => {
    const erc20 = new Contract(domain.verifyingContract, abi, customer);
    const nonce = await erc20.nonces(customer.address);
    const values = {
      owner: customer.address,
      spender: contractAddress,
      value: amount,
      nonce,
      deadline: toEpoch(deadlineIn),
    };
    const signedTypedData = await customer.signTypedData(domain, types, values);
    const permitSignature = Signature.from(signedTypedData);
    return erc20.permit(
      values.owner,
      values.spender,
      values.value,
      values.deadline,
      permitSignature.v,
      permitSignature.r,
      permitSignature.s
    );
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
    settleOrderPayment(order: FullOrderStruct, signature: string) {
      return _sdk.settleOrderPayment(order, signature);
    },
    permitERC20(amount: bigint, deadlineIn: string, domain: TypedDataDomain) {
      return _permitERC20(amount, deadlineIn, domain);
    },
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
        findByCustomer(blockFilters?: QueryEventsBlockFilters) {
          return _queryOrderFullySettledEvents(
            undefined,
            customer.address,
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
