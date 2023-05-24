// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";
import "./contracts/MockMBS.sol";
import "./contracts/MockMonkeyNFT.sol";
import "./contracts/MockCapsuleSFT.sol";
import "./contracts/SigUtils.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;
    SigUtils public sigUtils;

    MockMBS public mockMBS;
    MockMonkeyNFT public mockMonkeyNFT;
    MockCapsuleSFT public mockCapsuleSFT;

    uint256 public signerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
    uint128 public uuid = uint128(uint256(keccak256(abi.encodePacked("550e8400-e29b-41d4-a716-446655440000"))));
    address public orderSigner = vm.addr(signerPrivateKey);
    address public customer = vm.addr(0xA11CE);
    uint32 public baselineBlocktime = 1684911164;

    function _createAndSignOrder(OrderItem[] memory items, uint32 expiry, uint32 notBefore)
        internal
        returns (FullOrder memory, bytes memory)
    {
        FullOrder memory order =
            FullOrder({id: uuid, expiry: expiry, customer: customer, notBefore: notBefore, items: items});
        vm.startPrank(orderSigner);
        bytes32 hash = cashRegister.getEIP712Hash(order);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();
        return (order, signature);
    }

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS = new MockMBS();
        mockMonkeyNFT = new MockMonkeyNFT();
        mockCapsuleSFT = new MockCapsuleSFT();
        sigUtils = new SigUtils(mockMBS.DOMAIN_SEPARATOR());
    }

    function testCreditCustomerWithERC20() public {
        mockMBS.mint(address(cashRegister), 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        cashRegister.settleOrderPayment(order, signature);

        assertTrue(cashRegister.isOrderProcessed(uuid));
        assertEq(mockMBS.balanceOf(customer), 1e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 2e18, "cashRegister");
    }

    function testDebitCustomerWtihERC20Permit() public {
        mockMBS.mint(customer, 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: false, ERC: 20, id: 0});
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        SigUtils.Permit memory permit = SigUtils.Permit({
            owner: customer,
            spender: address(cashRegister),
            value: 1e18,
            nonce: 0,
            deadline: baselineBlocktime + 1
        });
        bytes32 digest = sigUtils.getTypedDataHash(permit);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, digest);
        mockMBS.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        cashRegister.settleOrderPayment(order, signature);

        assertEq(mockMBS.balanceOf(customer), 2e18, "customer MBS balance is not 2");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister MBS balance is not 1");
        assertTrue(cashRegister.isOrderProcessed(uuid));
    }

    function testDebitAndCreditCustomerWtihDifferentERCs() public {
        mockMBS.mint(customer, 3e18);
        mockMonkeyNFT.mint(address(cashRegister), 42); // mint tokenId: 0
        mockMonkeyNFT.mint(address(cashRegister), 73); // mint tokenId: 1
        mockCapsuleSFT.mint(address(cashRegister), 101, 5, "");

        OrderItem[] memory items = new OrderItem[](3);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: false, ERC: 20, id: 0});
        items[1] = OrderItem({amount: 1, currency: address(mockMonkeyNFT), credit: true, ERC: 721, id: 42});
        items[2] = OrderItem({amount: 3, currency: address(mockCapsuleSFT), credit: true, ERC: 1155, id: 101});
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        SigUtils.Permit memory permit = SigUtils.Permit({
            owner: customer,
            spender: address(cashRegister),
            value: 1e18,
            nonce: 0,
            deadline: baselineBlocktime + 1
        });
        bytes32 digest = sigUtils.getTypedDataHash(permit);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, digest);
        mockMBS.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        cashRegister.settleOrderPayment(order, signature);

        assertEq(mockMBS.balanceOf(customer), 2e18, "customer MBS balance is not 2");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister MBS balance is not 1");
        assertEq(mockMonkeyNFT.ownerOf(42), customer);
        assertEq(mockMonkeyNFT.ownerOf(73), address(cashRegister));
        assertEq(mockCapsuleSFT.balanceOf(customer, 101), 3);
        assertEq(mockCapsuleSFT.balanceOf(address(cashRegister), 101), 2);

        assertTrue(cashRegister.isOrderProcessed(uuid));
    }

    function testRevertWhenOrderExpired() public {
        OrderItem[] memory items = new OrderItem[](0);
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime - 1, baselineBlocktime);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        vm.expectRevert("Order is expired");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenOrderNotBefore() public {
        OrderItem[] memory items = new OrderItem[](0);
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime + 1);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        vm.expectRevert("Order cannot be used yet");
        cashRegister.settleOrderPayment(order, signature);
    }
}
