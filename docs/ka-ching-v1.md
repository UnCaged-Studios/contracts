# KaChing Cash Register V1

## High-Level Design and Contract Description

The `KaChingCashRegisterV1` contract serves as a decentralized point-of-sale (PoS) system. It operates on the blockchain, allowing the handling of transactions without a centralized authority or intermediary.

The contract is designed to handle the complete cycle of order placement and settlement of ERC20, ERC721, and ERC1155 tokens. It uses the concept of off-chain signed orders, combining the security and transparency of on-chain transactions with the efficiency of off-chain operations.

### Role of Order-Signer and Off-chain Signature

The contract utilizes a role called Order-Signer to authorize orders. The Order-Signer signs the orders off-chain and the signed order acts as proof that the order is authorized and can be processed. Off-chain signature provides efficiency by reducing the cost and time associated with on-chain transactions, while still maintaining the necessary level of security.

## EIP712 Usage

EIP712 standardizes the hashing and signing of typed structured data. In this contract, it's used to create a unique hash of the order (a structured data) that can be signed off-chain by an Order-Signer. This signature is then validated on-chain, providing a secure and efficient method of authorizing transactions.

## Terminology

- **Deployer:** The creator of the contract, typically the store owner, responsible for managing the contract, including adding or removing cashiers.

- **Cashier:** Role assigned by the deployer to handle the order-signing process. The cashier can set order signers and check if an order is processed.

- **Order-Signer:** Responsible for signing orders off-chain before they are processed. The cashier role sets order signers. The signed order ensures that the order is authorized and can be processed.

- **Customer:** The end-user who wants to purchase or sell items (tokens). They interact with the contract to settle their orders.

## Functions

### Deployer API

- **addCashier(address cashier):** The deployer can add a new cashier.

- **removeCashier(address cashier):** The deployer can remove an existing cashier.

### Cashier API

- **setOrderSigners(address[] memory newSigners):** The cashier can set new order signers.

- **getOrderSigners():** Returns the current order signers.

- **isOrderProcessed(uint128 orderId):** Checks if a specific order has been processed.

### Customer API

- **settleOrderPayment(FullOrder calldata order, bytes calldata signature):** A customer can settle their order payment.

## Security

This contract has strict security measures in place. Before settling an order, it validates the customer's address, checks the order's expiry, verifies the validity of the order signer and ensures that the order has not been processed before. It also verifies sufficient token balances for the order.

## Limitations and Caveats

While this contract brings a lot of efficiencies to managing orders on the blockchain, it is important to note that it relies on the honesty and security of Order-Signers. If the private key of an Order-Signer is compromised, fraudulent orders could potentially be authorized.

Additionally, since orders are signed off-chain, the contract has no control over the order creation process, which also depends on the security of the off-chain systems.

Finally, remember that while every effort has been made to ensure the security of this contract, smart contracts are a complex technology. Ensure that you understand the contract interactions before sending any transactions.

## License

This contract is unlicensed. Use of this contract or its code in any form is solely at the risk of the user.
