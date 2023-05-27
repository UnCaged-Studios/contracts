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
    bytes32 public constant CASHIER_ROLE = keccak256("CASHIER_ROLE");

    function _createAndSignOrder(OrderItem[] memory items, uint32 expiry, uint32 notBefore)
        internal
        returns (FullOrder memory, bytes memory)
    {
        cashRegister.addCashier(0x7FA9385bE102ac3EAc297483Dd6233D62b3e1496);
        address[] memory newSigners = new address[](1);
        newSigners[0] = orderSigner;
        cashRegister.setOrderSigners(newSigners);
        FullOrder memory order =
            FullOrder({id: uuid, expiry: expiry, customer: customer, notBefore: notBefore, items: items});
        bytes32 hash = cashRegister.getEIP712Hash(order);
        vm.startPrank(orderSigner);
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

        vm.warp(baselineBlocktime);
        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);

        address cashier = vm.addr(0xB0B1);
        cashRegister.addCashier(cashier);
        vm.prank(cashier);
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

        vm.warp(baselineBlocktime);
        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);

        assertEq(mockMBS.balanceOf(customer), 2e18, "customer MBS balance is not 2");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister MBS balance is not 1");
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

        vm.warp(baselineBlocktime);
        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);

        assertEq(mockMBS.balanceOf(customer), 2e18, "customer MBS balance is not 2");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister MBS balance is not 1");
        assertEq(mockMonkeyNFT.ownerOf(42), customer);
        assertEq(mockMonkeyNFT.ownerOf(73), address(cashRegister));
        assertEq(mockCapsuleSFT.balanceOf(customer, 101), 3);
        assertEq(mockCapsuleSFT.balanceOf(address(cashRegister), 101), 2);
    }

    function testRevertWhenOrderExpired() public {
        OrderItem[] memory items = new OrderItem[](0);
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime - 1, baselineBlocktime);

        vm.warp(baselineBlocktime);
        vm.prank(customer);
        vm.expectRevert("Order is expired");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenOrderNotBefore() public {
        OrderItem[] memory items = new OrderItem[](0);
        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime + 1);

        vm.warp(baselineBlocktime);
        vm.prank(customer);
        vm.expectRevert("Order cannot be used yet");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenProcessingOrderTwice() public {
        mockMBS.mint(address(cashRegister), 3e18);
        // Create an order
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        vm.warp(baselineBlocktime);
        vm.startPrank(customer);
        // Process the order for the first time
        cashRegister.settleOrderPayment(order, signature);

        // Attempt to process the same order again and expect a revert
        vm.expectRevert("Order already processed");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenInvalidSignature() public {
        // Create an order
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        // Invalidate the signature by altering the first byte
        signature[0] = bytes1(uint8(signature[0]) ^ 0xff);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        // Try to process the order with the invalid signature
        vm.expectRevert("Invalid signature");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenOrderAlteredAfterSignature() public {
        // Create an order
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        // Alter the order after the signature was created
        order.items[0].amount = 2e18;

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        // Try to process the order with the altered details
        vm.expectRevert("Invalid signature");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenCustomerIsSignerButNotMsgSender() public {
        // Create an order
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        // Change the blocktime to the valid order time
        vm.warp(baselineBlocktime);

        // Try to process the order with the customer as the signer, but not using vm.prank(customer)
        vm.expectRevert("Customer does not match sender address");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenItemTypeNotSupported() public {
        // Mint some tokens for the cash register
        mockMBS.mint(address(cashRegister), 3e18);

        // Create an order with an unsupported ERC number
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 123, id: 0}); // Unsupported ERC number

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        // Expect the contract to revert with "Item type (ERC number) is not supported"
        vm.expectRevert("Item type (ERC number) is not supported");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenOrderSignedByDifferentSigner() public {
        mockMBS.mint(address(cashRegister), 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        uint256 newSignerPrivateKey = 0xbc0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff81; // New private key
        address newOrderSigner = vm.addr(newSignerPrivateKey); // New signer address
        FullOrder memory order = FullOrder({
            id: uuid,
            expiry: baselineBlocktime + 1,
            customer: customer,
            notBefore: baselineBlocktime - 1,
            items: items
        });
        vm.startPrank(newOrderSigner); // Use the new signer address here
        bytes32 hash = cashRegister.getEIP712Hash(order);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(newSignerPrivateKey, hash); // Sign the order with the new private key
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();

        vm.prank(customer);
        vm.warp(baselineBlocktime);

        vm.expectRevert("Invalid signature");
        cashRegister.settleOrderPayment(order, signature);
    }
}
