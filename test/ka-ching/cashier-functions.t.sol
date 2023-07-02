// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;

    uint128 public uuid = uint128(uint256(keccak256(abi.encodePacked("550e8400-e29b-41d4-a716-446655440000"))));
    address public customer = vm.addr(0xA11CE);
    address public cahiser = vm.addr(0xCa11);

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable(cahiser);
    }

    function testSetOrderSignersTwoAddresses() public {
        address[] memory newSigners = new address[](2);
        newSigners[0] = vm.addr(0xB0B1);
        newSigners[1] = vm.addr(0xB0B2);

        vm.startPrank(cahiser);
        cashRegister.setOrderSigners(newSigners);
        address[] memory cashRegisterSigners = cashRegister.getOrderSigners();

        // Check that the new signers match the set signers
        for (uint256 i = 0; i < newSigners.length; i++) {
            assertEq(cashRegisterSigners[i], newSigners[i]);
        }
    }

    function testSetOrderSignersEmptyArray() public {
        address[] memory newSigners = new address[](0);

        vm.startPrank(cahiser);
        cashRegister.setOrderSigners(newSigners);
        address[] memory cashRegisterSigners = cashRegister.getOrderSigners();

        // Check that there are no signers
        assertEq(cashRegisterSigners.length, 0);
    }

    function testRevertWhenOverridingSignersNotByCashier() public {
        address[] memory newSigners = new address[](1);

        vm.startPrank(customer);
        vm.expectRevert();
        cashRegister.setOrderSigners(newSigners);
    }

    function testRevertWhenSetMoreThanMaxSigners() public {
        address[] memory newSigners = new address[](4);
        newSigners[0] = vm.addr(0xB0B1);
        newSigners[1] = vm.addr(0xB0B2);
        newSigners[2] = vm.addr(0xB0B3);
        newSigners[3] = vm.addr(0xB0B4);

        vm.startPrank(cahiser);
        vm.expectRevert("Cannot set more than 3 signers");
        cashRegister.setOrderSigners(newSigners);
    }

    function testRevertWhenSetZeroAddressSigner() public {
        address[] memory newSigners = new address[](1);
        newSigners[0] = address(0);

        vm.startPrank(cahiser);
        vm.expectRevert("Signer address cannot be 0x0");
        cashRegister.setOrderSigners(newSigners);
    }
}
