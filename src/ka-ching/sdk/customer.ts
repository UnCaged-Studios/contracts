import { coreSdkFactory } from './core';
import { utils, BigNumberish, Contract, Signer, BigNumber } from 'ethers';
import type { TypedDataSigner } from '@ethersproject/abstract-signer';
import { abi, types } from './permit';
import { toEpoch } from './commons';
import { SerializedOrder, deserializeOrder } from './order-serialization';

type TypedDataDomain = {
  name: string;
  version: string;
  chainId: BigNumberish;
  verifyingContract: string;
};

export function customerSdkFactory(
  contractAddress: string,
  customer: Signer & TypedDataSigner
) {
  const _sdk = coreSdkFactory(contractAddress, customer);

  const _permitERC20 = async (
    amount: BigNumber,
    deadlineIn: number | string,
    domain: TypedDataDomain
  ) => {
    const erc20 = new Contract(domain.verifyingContract, abi, customer);
    const customerAddress = await customer.getAddress();
    const nonce = await erc20.nonces(customerAddress);
    const values = {
      owner: customerAddress,
      spender: contractAddress,
      value: amount,
      nonce,
      deadline: toEpoch(deadlineIn),
    };
    const signedTypedData = await customer._signTypedData(
      domain,
      types,
      values
    );
    const { v, r, s } = utils.splitSignature(signedTypedData);
    return {
      payload: {
        deadline: values.deadline,
        v,
        r,
        s,
      },
      sendTxn: () =>
        erc20.permit(
          values.owner,
          values.spender,
          values.value,
          values.deadline,
          v,
          r,
          s
        ),
    };
  };

  return {
    settleOrderPayment(order: SerializedOrder, signature: string) {
      const _order = deserializeOrder(order);
      return _sdk.settleOrderPayment(_order, signature);
    },
    async settleOrderPaymentWithPermit(
      order: SerializedOrder,
      signature: string,
      domain: TypedDataDomain
    ) {
      const _order = deserializeOrder(order);
      const [debitOrderItem, ...rest] = _order.items.filter(
        (x) => false === x.credit
      );
      if (rest.length > 0) {
        throw new Error(
          `found more than a single debit ERC20, cannot invoke permit`
        );
      }
      const { payload } = await _permitERC20(
        BigNumber.from(debitOrderItem.amount),
        toEpoch('5m'),
        domain
      );
      return _sdk.settleOrderPaymentWithPermit(
        _order,
        signature,
        payload.deadline,
        payload.v,
        payload.r,
        payload.s
      );
    },
    async permitERC20(
      amount: BigNumber,
      deadlineIn: string,
      domain: TypedDataDomain
    ) {
      const { sendTxn } = await _permitERC20(amount, deadlineIn, domain);
      return sendTxn();
    },
  };
}
