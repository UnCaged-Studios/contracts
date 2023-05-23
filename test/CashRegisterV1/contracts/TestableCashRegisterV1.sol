// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../../../src/ka-ching/CashRegisterV1.sol";

contract KaChingCashRegisterV1Testable is KaChingCashRegisterV1 {
    function getEIP712Hash(FullOrder calldata order) external view returns (bytes32) {
        bytes32 fullOrderHash = _getFullOrderHash(order);
        return _hashTypedDataV4(fullOrderHash);
    }
}
