import { keccak256, concat, AbiCoder } from 'ethers';
import type { BaseWallet, TypedDataDomain } from 'ethers';
import type { FullOrderStruct } from './abi/KaChingCashRegisterV1Abi';

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

async function _signTypedData(
  order: FullOrderStruct,
  customer: BaseWallet,
  domain: TypedDataDomain
) {
  const { items, ...baseOrder } = order;
  const itemsPacked = items.map((item) =>
    keccak256(
      AbiCoder.defaultAbiCoder().encode(
        ['uint256', 'address', 'bool', 'uint16', 'uint256'],
        [item.amount, item.currency, item.credit, item.ERC, item.id]
      )
    )
  );

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
      itemsHash: keccak256(concat(itemsPacked)),
    }
  );
}
