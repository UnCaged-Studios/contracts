import { utils } from 'ethers';
import type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';
import { AdvancedSigner } from './types';

const hashedItem = (item: OrderItemStruct): string =>
  utils._TypedDataEncoder
    .from({
      OrderItem: [
        { name: 'amount', type: 'uint256' },
        { name: 'currency', type: 'address' },
        { name: 'credit', type: 'bool' },
        { name: 'ERC', type: 'uint16' },
        { name: 'id', type: 'uint256' },
      ],
    })
    .hash(item)
    .slice(2);

function hashOrderItems(order: FullOrderStruct) {
  const { items, ...baseOrder } = order;
  return {
    ...baseOrder,
    itemsHash: utils.keccak256('0x' + items.map(hashedItem).join('')),
  };
}

export function orderSignerSdkFactory(
  contractAddress: string,
  orderSigner: AdvancedSigner
) {
  const signOrder = async (
    order: FullOrderStruct,
    chain: { chainId: string }
  ) => {
    const values = hashOrderItems(order);
    return orderSigner._signTypedData(
      {
        name: 'KaChingCashRegisterV1',
        version: '1',
        chainId: chain.chainId,
        verifyingContract: contractAddress,
      },
      {
        FullOrder: [
          { name: 'id', type: 'uint128' },
          { name: 'expiry', type: 'uint32' },
          { name: 'customer', type: 'address' },
          { name: 'notBefore', type: 'uint32' },
          { name: 'itemsHash', type: 'bytes32' },
        ],
      },
      values
    );
  };
  return {
    signOrder,
  };
}
