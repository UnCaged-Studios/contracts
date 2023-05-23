// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
    }

    function testSettleOrderPayment() public {
        // anvil available accounts index[0] (address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
        uint256 signerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address alice = vm.addr(signerPrivateKey);
        FullOrder memory order =
            FullOrder({id: 1, expiry: 2, customer: address(0), not_before: 3, items: new OrderItem[](1)});
        order.items[0] = OrderItem({amount: 1, currency: address(0), op: 1});
        bytes32 hash = cashRegister.getEIP712Hash(order);

        vm.startPrank(alice); // switch to the signer address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank(); // switch back to the original sender

        cashRegister.settleOrderPayment(order, signature);
        // assertEq(cashRegister.orderProcessed(1), true, "Order not processed correctly");
    }
}
