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
    string public uuid = "550e8400-e29b-41d4-a716-446655440000";

    function _stringToUint128(string memory _uuid) internal pure returns (uint128) {
        return uint128(uint256(keccak256(abi.encodePacked(_uuid))));
    }

    function _signOrder(address signer, bytes32 hash) internal returns (bytes memory) {
        vm.startPrank(signer);
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank();
        return signature;
    }

    function _createOrder(string memory _uuid, address customer, bool credit)
        internal
        view
        returns (FullOrder memory)
    {
        FullOrder memory order = FullOrder({
            id: _stringToUint128(_uuid),
            expiry: 2,
            customer: customer,
            notBefore: 3,
            items: new OrderItem[](1)
        });
        order.items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: credit, ERC: 20, id: 0});
        return order;
    }

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS = new MockMBS();
        mockNFT = new MockMonkeyNFT();
        sigUtils = new SigUtils(mockMBS.DOMAIN_SEPARATOR());
    }

    function testCreditCustomer() public {
        address orderSigner = vm.addr(signerPrivateKey);
        address customer = vm.addr(0xA11CE);
        mockMBS.mint(address(cashRegister), 3e18);

        FullOrder memory order = _createOrder(uuid, customer, true);
        bytes32 hash = cashRegister.getEIP712Hash(order);
        bytes memory signature = _signOrder(orderSigner, hash);

        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);
        assertTrue(cashRegister.isOrderProcessed(_stringToUint128(uuid)));
        assertEq(mockMBS.balanceOf(customer), 1e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 2e18, "cashRegister");
    }

    // credit customer with ERC20
    function testDebitCustomer() public {
        address orderSigner = vm.addr(signerPrivateKey);
        address customer = vm.addr(0xA11CE);
        mockMBS.mint(customer, 3e18);

        FullOrder memory order = _createOrder(uuid, customer, false);
        bytes32 hash = cashRegister.getEIP712Hash(order);
        bytes memory signature = _signOrder(orderSigner, hash);

        SigUtils.Permit memory permit =
            SigUtils.Permit({owner: customer, spender: address(cashRegister), value: 1e18, nonce: 0, deadline: 1 days});
        bytes32 digest = sigUtils.getTypedDataHash(permit);

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(0xA11CE, digest);

        mockMBS.permit(permit.owner, permit.spender, permit.value, permit.deadline, v, r, s);

        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);
        assertEq(mockMBS.balanceOf(customer), 2e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister");
        assertTrue(cashRegister.isOrderProcessed(_stringToUint128(uuid)));
    }
}
