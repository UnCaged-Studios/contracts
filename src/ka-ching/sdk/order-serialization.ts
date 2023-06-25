import { FullOrderStruct } from './abi/KaChingCashRegisterV1Abi';
import { KaChingCashRegisterV1Abi__factory } from './abi';

const contractInterface = KaChingCashRegisterV1Abi__factory.createInterface();

export type SerializedOrder = `0x${string}`;

export function isSerializedOrder(o: unknown): o is SerializedOrder {
  return typeof o === 'string' && o.startsWith('0x');
}

export function serializeOrder(order: FullOrderStruct): `0x${string}` {
  return contractInterface.encodeFunctionData('settleOrderPayment', [
    {
      id: order.id,
      expiry: order.expiry,
      notBefore: order.notBefore,
      customer: order.customer,
      items: order.items,
    },
    '0x', // signature is not needed for serialization
  ]) as `0x${string}`;
}

export function deserializeOrder(data: `0x${string}`): FullOrderStruct {
  const [order] = contractInterface.decodeFunctionData(
    'settleOrderPayment',
    data
  );
  return {
    id: order.id,
    expiry: order.expiry,
    notBefore: order.notBefore,
    customer: order.customer,
    items: order.items.map(([amount, currency, credit]: any) => ({
      amount,
      currency,
      credit,
    })),
  };
}
