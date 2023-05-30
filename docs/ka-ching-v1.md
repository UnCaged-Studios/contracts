# Ka-Ching Decentralized Point-of-Sale (PoS) System

### ⚠️ **Disclaimer: This project is currently in its development phase and not ready for production use.**

Ka-Ching is a decentralized point-of-sale (PoS) system, essentially a blockchain-based digital checkout counter that enables transactions without any central authority. Its key feature is the use of off-chain EIP712 signed orders, which blend the safety and transparency of on-chain transactions with the effectiveness of off-chain processes. The system validates orders for authorized signers, expiry, and usage to prevent fraud and double-spending.

## Overview

The system includes two main components:

- **Smart Contracts**: Serving as the backbone of the system, handling transactions, and maintaining the integrity and security of the system.
- **TypeScript SDK**: Facilitating interaction with the smart contracts, providing convenient and type-safe methods to interact with the Ka-Ching system from a TypeScript (or JavaScript) environment.

## Features (Work-In-Progress)

1. **Off-chain Signed Orders**: Combining the security and transparency of on-chain transactions with the efficiency and flexibility of off-chain operations.
2. **ERC20 Token Support**: Transactions are currently limited to ERC20 tokens, allowing debit and credit operations on these tokens.
3. **Role-based interactions**: Different roles (deployer, cashier, customer, and order signer) are defined with distinct permissions and capabilities.

For detailed insights into the API, high-level design, and system usage examples, please stay tuned for upcoming updates to this documentation.

## Contributions and Feedback

We encourage you to contribute to Ka-Ching! Whether you're fixing a bug, proposing a new feature, or providing feedback on our work, we welcome all contributions.

Please note that this project is released with a [Contributor Code of Conduct](https://www.contributor-covenant.org/). By participating in this project you agree to abide by its terms.

## License

Ka-Ching is [MIT licensed](LICENSE).
