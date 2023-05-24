// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";
import "./contracts/MockMBS.sol";
import "./contracts/MockMonkeyNFT.sol";
import "./contracts/SigUtils.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;
    SigUtils public sigUtils;

    MockMBS public mockMBS;
    MockMonkeyNFT public mockNFT;

    uint256 public signerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint128 public uuid = uint128(uint256(keccak256(abi.encodePacked("550e8400-e29b-41d4-a716-446655440000"))));
    address public orderSigner = vm.addr(signerPrivateKey);
    address public customer = vm.addr(0xA11CE);

    function _signOrder(address signer, bytes32 hash) internal returns (bytes memory) {
        vm.startPrank(signer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();
        return signature;
    }

    function _createAndSignOrder(bool credit) internal returns (FullOrder memory, bytes memory) {
        FullOrder memory order =
            FullOrder({id: uuid, expiry: 2, customer: customer, notBefore: 3, items: new OrderItem[](1)});
        order.items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: credit, ERC: 20, id: 0});
        bytes32 hash = cashRegister.getEIP712Hash(order);
        bytes memory signature = _signOrder(vm.addr(signerPrivateKey), hash);
        return (order, signature);
    }

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS = new MockMBS();
        mockNFT = new MockMonkeyNFT();
        sigUtils = new SigUtils(mockMBS.DOMAIN_SEPARATOR());
    }

    function testCreditCustomer() public {
        mockMBS.mint(address(cashRegister), 3e18);
        (FullOrder memory order, bytes memory signature) = _createAndSignOrder(true);
        vm.prank(customer);

        cashRegister.settleOrderPayment(order, signature);

        assertTrue(cashRegister.isOrderProcessed(uuid));
        assertEq(mockMBS.balanceOf(customer), 1e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 2e18, "cashRegister");
    }

    function testDebitCustomer() public {
        mockMBS.mint(customer, 3e18);
        (FullOrder memory order, bytes memory signature) = _createAndSignOrder(false);

        SigUtils.Permit memory permit =
            SigUtils.Permit({owner: customer, spender: address(cashRegister), value: 1e18, nonce: 0, deadline: 1 days});
        bytes32 digest = sigUtils.getTypedDataHash(permit);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, digest);
        mockMBS.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s);

        vm.prank(customer);

        cashRegister.settleOrderPayment(order, signature);

        assertEq(mockMBS.balanceOf(customer), 2e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister");
        assertTrue(cashRegister.isOrderProcessed(uuid));
    }
}
