// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.15;

import "forge-std/Test.sol";
import "./contracts/TestableCashRegisterV1.sol";
import "../../src/mbs/MonkeyLeagueOptimismMintableERC20.sol";
import "./contracts/SigUtils.sol";

contract KaChingCashRegisterV1Test is Test {
    KaChingCashRegisterV1Testable public cashRegister;
    SigUtils public sigUtils;

    MonkeyLeagueOptimismMintableERC20 public mockMBS;

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

    function _mint(address to, uint256 amount) internal {
        vm.prank(0xdEADBEeF00000000000000000000000000000000);
        mockMBS.mint(to, amount);
    }

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS =
        new MonkeyLeagueOptimismMintableERC20(0xdEADBEeF00000000000000000000000000000000, 0x4F0dDcE25D496698e9e3F6218c019AED3e862aA7);
        sigUtils = new SigUtils(mockMBS.DOMAIN_SEPARATOR());
    }

    function testCreditCustomerWithERC20() public {
        _mint(address(cashRegister), 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

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
        _mint(customer, 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: false});
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
        _mint(address(cashRegister), 3e18);
        // Create an order
        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

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
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

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
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

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
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

        (FullOrder memory order, bytes memory signature) =
            _createAndSignOrder(items, baselineBlocktime + 1, baselineBlocktime - 1);

        // Change the blocktime to the valid order time
        vm.warp(baselineBlocktime);

        // Try to process the order with the customer as the signer, but not using vm.prank(customer)
        vm.expectRevert("Customer does not match sender address");
        cashRegister.settleOrderPayment(order, signature);
    }

    function testRevertWhenOrderSignedByDifferentSigner() public {
        _mint(address(cashRegister), 3e18);

        OrderItem[] memory items = new OrderItem[](1);
        items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true});

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
