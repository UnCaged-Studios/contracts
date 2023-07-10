/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Contract, Signer, utils } from "ethers";
import type { Provider } from "@ethersproject/providers";
import type {
  KaChingCashRegisterV1Abi,
  KaChingCashRegisterV1AbiInterface,
} from "../KaChingCashRegisterV1Abi";

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_cashier",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "InvalidShortString",
    type: "error",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "str",
        type: "string",
      },
    ],
    name: "StringTooLong",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [],
    name: "EIP712DomainChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "uint128",
        name: "orderId",
        type: "uint128",
      },
      {
        indexed: true,
        internalType: "address",
        name: "customer",
        type: "address",
      },
    ],
    name: "OrderFullySettled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "signer1",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "signer2",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "signer3",
        type: "address",
      },
    ],
    name: "OrderSignersUpdated",
    type: "event",
  },
  {
    inputs: [],
    name: "CASHIER_ROLE",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "eip712Domain",
    outputs: [
      {
        internalType: "bytes1",
        name: "fields",
        type: "bytes1",
      },
      {
        internalType: "string",
        name: "name",
        type: "string",
      },
      {
        internalType: "string",
        name: "version",
        type: "string",
      },
      {
        internalType: "uint256",
        name: "chainId",
        type: "uint256",
      },
      {
        internalType: "address",
        name: "verifyingContract",
        type: "address",
      },
      {
        internalType: "bytes32",
        name: "salt",
        type: "bytes32",
      },
      {
        internalType: "uint256[]",
        name: "extensions",
        type: "uint256[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getOrderSigners",
    outputs: [
      {
        internalType: "address[]",
        name: "",
        type: "address[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint128",
        name: "orderId",
        type: "uint128",
      },
    ],
    name: "isOrderProcessed",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address[]",
        name: "newSigners",
        type: "address[]",
      },
    ],
    name: "setOrderSigners",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "id",
            type: "uint128",
          },
          {
            internalType: "uint32",
            name: "expiry",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "notBefore",
            type: "uint32",
          },
          {
            internalType: "address",
            name: "customer",
            type: "address",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "currency",
                type: "address",
              },
              {
                internalType: "bool",
                name: "credit",
                type: "bool",
              },
            ],
            internalType: "struct OrderItem[1]",
            name: "items",
            type: "tuple[1]",
          },
        ],
        internalType: "struct FullOrder",
        name: "order",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
    ],
    name: "settleOrderPayment",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          {
            internalType: "uint128",
            name: "id",
            type: "uint128",
          },
          {
            internalType: "uint32",
            name: "expiry",
            type: "uint32",
          },
          {
            internalType: "uint32",
            name: "notBefore",
            type: "uint32",
          },
          {
            internalType: "address",
            name: "customer",
            type: "address",
          },
          {
            components: [
              {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
              },
              {
                internalType: "address",
                name: "currency",
                type: "address",
              },
              {
                internalType: "bool",
                name: "credit",
                type: "bool",
              },
            ],
            internalType: "struct OrderItem[1]",
            name: "items",
            type: "tuple[1]",
          },
        ],
        internalType: "struct FullOrder",
        name: "order",
        type: "tuple",
      },
      {
        internalType: "bytes",
        name: "signature",
        type: "bytes",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "settleOrderPaymentWithPermit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export class KaChingCashRegisterV1Abi__factory {
  static readonly abi = _abi;
  static createInterface(): KaChingCashRegisterV1AbiInterface {
    return new utils.Interface(_abi) as KaChingCashRegisterV1AbiInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): KaChingCashRegisterV1Abi {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as KaChingCashRegisterV1Abi;
  }
}
