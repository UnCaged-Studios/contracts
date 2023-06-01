import ms from 'ms';
import { FullOrderStruct } from './abi/KaChingCashRegisterV1/KaChingCashRegisterV1Abi';
import { coreSdkFactory } from './core';
import { BigNumberish, Contract, Signature, Signer } from 'ethers';
import { abi, types } from './permit';
import { toEpoch } from './commons';

type TypedDataDomain = {
  name: string;
  version: string;
  chainId: BigNumberish;
  verifyingContract: string;
};

export function customerSdkFactory(contractAddress: string, customer: Signer) {
  const _sdk = coreSdkFactory(contractAddress, customer);

  const _permitERC20 = async (
    amount: bigint,
    deadlineIn: string,
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

  return {
    settleOrderPayment(order: FullOrderStruct, signature: string) {
      return _sdk.settleOrderPayment(order, signature);
    },
    permitERC20(amount: bigint, deadlineIn: string, domain: TypedDataDomain) {
      return _permitERC20(amount, deadlineIn, domain);
    },
  };
}
