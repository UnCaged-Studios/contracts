// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";
import "./contracts/MockMBS.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;
    MockMBS public mockMBS;

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS = new MockMBS();
        mockMBS.mint(address(cashRegister), 2 * 10 ** 18);
    }

    function stringToUint128(string memory uuid) public pure returns (uint128) {
        return uint128(uint256(keccak256(abi.encodePacked(uuid))));
    }

    function testSanity() public {
        // anvil available accounts index[0] (address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266)
        uint256 signerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        string memory uuid = "550e8400-e29b-41d4-a716-446655440000";
        address customer = vm.addr(signerPrivateKey);
        FullOrder memory order = FullOrder({
            id: stringToUint128(uuid),
            expiry: 2,
            customer: address(0),
            notBefore: 3,
            items: new OrderItem[](1)
        });
        order.items[0] = OrderItem({amount: 1 * 10 ** 18, currency: address(mockMBS), credit: true});
        bytes32 hash = cashRegister.getEIP712Hash(order);

        vm.startPrank(customer); // switch to the signer address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank(); // switch back to the original sender

        cashRegister.settleOrderPayment(order, signature);
        assertTrue(cashRegister.isOrderProcessed(stringToUint128(uuid)));
    }
}
