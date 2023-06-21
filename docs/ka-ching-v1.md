# KaChingCashRegisterV1

KaChingCashRegisterV1 is a decentralized point-of-sale (PoS) system deployed on the Ethereum blockchain. As a part of Ka-Ching, it's essentially a blockchain-based digital checkout counter that enables transactions without any central authority. It utilizes the EIP712 and ECDSA standards for cryptographic operations and the IERC20 standard for token transactions. The key feature of this system is the use of off-chain EIP712 signed orders, which combine the safety and transparency of on-chain transactions with the efficiency of off-chain processes. The system validates orders for authorized signers, expiry, and usage to prevent fraud and double-spending.

## Interface

Users can interact with this smart contract through an Ethereum wallet that supports contract interaction.

- You can use the high-level provided SDK. ([see SDK docs](./ka-ching-v1.md#sdk)) for further details.
- Alternatively, you can consume the ABI directly from the `@uncaged-studios/evm-contracts-library` npm package, at `node_modules/@uncaged-studios/evm-contracts-library/src/abi`

## Functions and Features

The smart contract provides several functions for managing orders and payments:

1. `settleOrderPayment`: Used to settle an order's payment, it requires the order data and a signature as parameters.
2. `isOrderProcessed`: Checks if an order has been processed, requiring the order ID as a parameter.
3. `setOrderSigners`: Updates the list of order signers, can only be called by the cashier. Requires a list of new signers' addresses as parameters.
4. `getOrderSigners`: Returns the list of current order signers.

The smart contract's key features, some of which are still a work-in-progress, include:

1. Off-chain Signed Orders: Combines the security and transparency of on-chain transactions with the efficiency and flexibility of off-chain operations.
2. ERC20 Token Support: Transactions are currently limited to ERC20 tokens, supporting debit and credit operations on these tokens.

## Prerequisites

Before interacting with the contract, users must:

1. Have an Ethereum wallet that supports contract interactions.
2. Own enough tokens for making payments, depending on the specific order.

## Risks

Users should be aware of the following risks when using this smart contract:

- Smart contract bugs: Despite efforts to ensure the contract is secure and bug-free, there is always a risk of undiscovered bugs that could lead to loss of funds.
- Financial risks: Misuse of the contract functions or sending transactions to incorrect addresses may result in the loss of funds.
- Ethereum transaction costs: Each transaction will require a certain amount of gas to be paid in ETH.

Ensure a full understanding of the contract functions before interacting with it.

## SDK

The KaChingV1 SDK provides methods to interact with the KaChingV1 smart contract. The SDK is built on ethers.js.

```bash
npm i @uncaged-studios/evm-contracts-library
```

Consume package:

```ts
import { KaChingV1 } from '@uncaged-studios/evm-contracts-library';
```

or

```js
const { KaChingV1 } = require('@uncaged-studios/evm-contracts-library');
```

To initialize:

```ts
const sdk = KaChingV1.sdkFactory(contracts.kaChingCashRegister);
```

Create an order:

```ts
const order = readonlySdk.orders.debitCustomerWithERC20({
  id,
  customer: customer.address,
  amount,
  currency: contracts.mbsOptimism,
  expiresIn: '1m',
});
```

Sign an order:

```ts
const orderSignature = await orderSignerSdk.signOrder(order, {
  chainId: '31337',
});
```

Settle an order's payment:

```ts
await customerSdk.settleOrderPayment(order, orderSignature);
```

Retrieve Order Events:

```ts
const allEvents = await readonlySdk.events.OrderFullySettled.findAll();
```

Set and Get Order Signers:

```ts
await cashierSdk.setOrderSigners([orderSigner.address]);
const currentSigners = await cashierSdk.getOrderSigners();
```

## License

This smart contract and SDK are licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.

## Contact

For more information or help with the smart contract or SDK, please contact [provide contact information].

## Acknowledgments

- The smart contract utilizes OpenZeppelin's smart contract security standards for secure, robust operation.
- The SDK is built on the popular Ethereum library, ethers.js.

```

```
