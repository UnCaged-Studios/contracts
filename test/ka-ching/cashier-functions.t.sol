// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;

    uint128 public uuid = uint128(uint256(keccak256(abi.encodePacked("550e8400-e29b-41d4-a716-446655440000"))));
    address public customer = vm.addr(0xA11CE);
    bytes32 public constant CASHIER_ROLE = keccak256("CASHIER_ROLE");

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
    }

    function testAddCashier() public {
        // Initial assumption: The cashier is not yet a cashier
        assertFalse(cashRegister.hasRole(CASHIER_ROLE, address(this)));

        cashRegister.addCashier(address(this));

        // After adding, the cashier should have the cashier role
        assertTrue(cashRegister.hasRole(CASHIER_ROLE, address(this)));
    }

    function testsetOrderSigners() public {
        address[] memory newSigners = new address[](2);
        newSigners[0] = vm.addr(0xB0B1);
        newSigners[1] = vm.addr(0xB0B2);

        address newCashier = vm.addr(0xCa11);
        cashRegister.addCashier(newCashier);

        vm.startPrank(newCashier);
        cashRegister.setOrderSigners(newSigners);
        address[] memory cashRegisterSigners = cashRegister.getOrderSigners();

        // Check that the new signers match the set signers
        for (uint256 i = 0; i < newSigners.length; i++) {
            assertEq(cashRegisterSigners[i], newSigners[i]);
        }
    }

    function testRevertWhenAddingCashierNotByAdmin() public {
        // Attempt to add a cashier by someone who is not an admin should fail
        vm.startPrank(customer);
        vm.expectRevert();
        cashRegister.addCashier(customer);
    }

    function testRevertWhenOverridingSignersNotByCashier() public {
        address[] memory newSigners = new address[](1);

        vm.startPrank(customer);
        vm.expectRevert();
        cashRegister.setOrderSigners(newSigners);
    }

    function testRevertWhenCheckingIsOrderProcessedNotByCashier() public {
        vm.startPrank(vm.addr(0xB0B));
        vm.expectRevert();
        cashRegister.isOrderProcessed(uuid);
    }
}
