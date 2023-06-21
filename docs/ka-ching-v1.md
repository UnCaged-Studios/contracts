# KaChingCashRegisterV1

KaChingCashRegisterV1, is a decentralized point-of-sale (PoS) system leveraging the Ethereum blockchain.

It operates as a digital checkout counter, facilitating transactions with no central authority. Utilizing EIP712 and ECDSA for cryptographic functions and the IERC20 standard for token transactions, the system fosters security and transparency. Its distinctive feature is the use of off-chain EIP712 signed orders, marrying on-chain safety with off-chain efficacy. This feature validates orders based on authorized signers, expiration, and usage, significantly mitigating the risks of fraud and double-spending.

This smart contract presents the following primary features:

1. **Off-chain Signed Orders**: Enhances the blend of on-chain security and off-chain efficiency.
2. **ERC20 Token Support**: Currently, transactions are only possible using ERC20 tokens, providing support for debit and credit operations.

## Interface

Users can interact with this smart contract through an Ethereum wallet that supports contract interaction.

- You can use the high-level provided SDK. ([see SDK docs](./ka-ching-v1.md#sdk)) for further details.
- Alternatively, you can consume the ABI directly from the `@uncaged-studios/evm-contracts-library` npm package, at `node_modules/@uncaged-studios/evm-contracts-library/src/abi`

## Functions

The smart contract provides several functions for managing orders and payments:

1. `settleOrderPayment`: Used to settle an order's payment, it requires the order data and a signature as parameters.
2. `isOrderProcessed`: Checks if an order has been processed, requiring the order ID as a parameter.
3. `setOrderSigners`: Updates the list of order signers, can only be called by the cashier. Requires a list of new signers' addresses as parameters.
4. `getOrderSigners`: Returns the list of current order signers.

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

### Consume package:

```ts
// esm
import { KaChingV1 } from '@uncaged-studios/evm-contracts-library';
// commonjs
const { KaChingV1 } = require('@uncaged-studios/evm-contracts-library');
```

### Initialize:

```ts
// pass the deployed contract address
const sdk = KaChingV1.sdkFactory(`0x${string}`);
```

### Create an order:

```ts
const order = readonlySdk.orders.debitCustomerWithERC20({
  id,
  customer: `0x${string}`,
  amount: BigNumber.from(42),
  currency: `0x${string}`,
  expiresIn: '1m', // accepts various time formats, e.g. '2.5 hrs', '10m', '1y', '5s'
});
```

### Sign an order:

```ts
const orderSignature = await orderSignerSdk.signOrder(order, {
  chainId: '31337',
});
```

### Settle an order's payment:

```ts
await customerSdk.settleOrderPayment(order, orderSignature);
```

### Retrieve Order Events:

```ts
const [FooOrderFullySettledEvent] =
  await readonlySdk.events.OrderFullySettled.findByOrderId('foo');

const CustomerOrderFullySettledEvents =
  await readonlySdk.events.OrderFullySettled.findByCustomer(`0x{string}`);
```

### Set and Get Order Signers:

```ts
await cashierSdk.setOrderSigners([`0x${string}`]);
const currentSigners = await cashierSdk.getOrderSigners();
```

## License

This smart contract and SDK are licensed under the MIT License - see the [LICENSE.md](../LICENSE) file for details.

## Contact

For more information or help with the smart contract or SDK, please contact [provide contact information].

## Acknowledgments

- The smart contract utilizes OpenZeppelin's smart contract security standards for secure, robust operation.
- The SDK is built on the popular Ethereum library, ethers.js (v5).
