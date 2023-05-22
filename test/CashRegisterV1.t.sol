// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/ka-ching/CashRegisterV1.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1 public cashRegister;

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1();
    }

    function testSanity() public {
        assertEq(true, true);
    }
}
