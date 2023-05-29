import { keccak256, TypedDataEncoder } from 'ethers';
import type { BaseWallet, TypedDataDomain } from 'ethers';
import type {
  FullOrderStruct,
  OrderItemStruct,
} from './abi/KaChingCashRegisterV1Abi';

const hashedItem = (item: OrderItemStruct): string =>
  TypedDataEncoder.from({
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

async function _signTypedData(
  order: FullOrderStruct,
  customer: BaseWallet,
  domain: TypedDataDomain
) {
  const { items, ...baseOrder } = order;
  return await customer.signTypedData(
    domain,
    {
      FullOrder: [
        { name: 'id', type: 'uint128' },
        { name: 'expiry', type: 'uint32' },
        { name: 'customer', type: 'address' },
        { name: 'notBefore', type: 'uint32' },
        { name: 'itemsHash', type: 'bytes32' },
      ],
    },
    {
      ...baseOrder,
      itemsHash: keccak256('0x' + items.map(hashedItem).join('')),
    }
  );
}

export function orderSignerSdkFactory(
  contractAddress: string,
  orderSigner: BaseWallet
) {
  const signOrder = async (
    order: FullOrderStruct,
    chain: { chainId: string }
  ) => {
    return await _signTypedData(order, orderSigner, {
      name: 'KaChingCashRegisterV1',
      version: '1',
      chainId: chain.chainId,
      verifyingContract: contractAddress,
    });
  };
  return {
    signOrder,
  };
}
