import { utils, BigNumber } from 'ethers';
import ms from 'ms';
import { FullOrderStruct } from './abi/KaChingCashRegisterV1Abi';

export function toEpoch(until: string): number {
  const durationMs = ms(until);
  if (!durationMs) {
    throw new Error(`Invalid duration format: ${until}`);
  }
  return Math.floor((Date.now() + durationMs) / 1000);
}

export type SerializedOrder = `0x${string}`;

export function isSerializedOrder(o: unknown): o is SerializedOrder {
  return typeof o === 'string' && o.startsWith('0x');
}

export function serializeOrder(order: FullOrderStruct): `0x${string}` {
  const orderData = [
    utils.hexZeroPad(utils.hexlify(order.id), 32),
    utils.hexZeroPad(utils.hexlify(order.expiry), 32),
    utils.hexZeroPad(utils.hexlify(order.notBefore), 32),
    order.customer,
  ].join('');

  const itemsData = order.items
    .map((item) => [
      utils.hexZeroPad(utils.hexlify(item.amount), 32),
      utils.hexlify(utils.toUtf8Bytes(item.currency)),
      item.credit ? '01' : '00',
    ])
    .join('');

  return `0x${orderData}${itemsData}`;
}

export function deserializeOrder(
  serializedOrder: `0x${string}`
): FullOrderStruct {
  // Remove '0x' from start of the string
  const hexString = serializedOrder.slice(2);

  // Decode hex string back to values
  const id = BigNumber.from(hexString.slice(0, 64));
  const expiry = BigNumber.from(hexString.slice(64, 128));
  const notBefore = BigNumber.from(hexString.slice(128, 192));
  const customer = utils.getAddress(`0x${hexString.slice(192, 264)}`);

  const items = [];
  let position = 264;
  while (position < hexString.length) {
    const amount = BigNumber.from(hexString.slice(position, position + 64));
    const currencyBytes = utils.arrayify(
      `0x${hexString.slice(position + 64, position + 128)}`
    );
    const currency = utils.toUtf8String(currencyBytes);
    const credit = hexString.slice(position + 128, position + 130) === '01';
    items.push({ amount, currency, credit });
    position += 130;
  }

  return { id, expiry, notBefore, customer, items };
}
