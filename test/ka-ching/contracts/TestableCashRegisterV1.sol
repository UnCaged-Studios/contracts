// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../../../src/ka-ching/KaChingCashRegisterV1.sol";

contract KaChingCashRegisterV1Testable is KaChingCashRegisterV1 {
    constructor(address _cashier, address _erc20Token) KaChingCashRegisterV1(_cashier, _erc20Token) {}

    function getEIP712Hash(FullOrder calldata order) external view returns (bytes32) {
        bytes32 fullOrderHash = _getFullOrderHash(order);
        return _hashTypedDataV4(fullOrderHash);
    }
}
