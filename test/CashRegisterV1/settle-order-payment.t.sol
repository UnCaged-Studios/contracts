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

    function setUp() public {
        cashRegister = new KaChingCashRegisterV1Testable();
        mockMBS = new MockMBS();
        mockNFT = new MockMonkeyNFT();
        sigUtils = new SigUtils(mockMBS.DOMAIN_SEPARATOR());
    }

    function stringToUint128(string memory uuid) public pure returns (uint128) {
        return uint128(uint256(keccak256(abi.encodePacked(uuid))));
    }

    function testCreditCustomer() public {
        string memory uuid = "550e8400-e29b-41d4-a716-446655440000";
        address orderSigner = vm.addr(signerPrivateKey);
        address customer = vm.addr(42);
        // fund contract with MBS
        mockMBS.mint(address(cashRegister), 3e18);

        FullOrder memory order = FullOrder({
            id: stringToUint128(uuid),
            expiry: 2,
            customer: customer,
            notBefore: 3,
            items: new OrderItem[](1)
        });
        order.items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: true, ERC: 20, id: 0});

        bytes32 hash = cashRegister.getEIP712Hash(order);

        vm.startPrank(orderSigner); // switch to the signer address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank(); // switch back to the original sender

        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);
        assertTrue(cashRegister.isOrderProcessed(stringToUint128(uuid)));
        assertEq(mockMBS.balanceOf(customer), 1e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 2e18, "cashRegister");
    }

    // credit customer with ERC20
    function testDebitCustomer() public {
        string memory uuid = "550e8400-e29b-41d4-a716-446655440000";
        address orderSigner = vm.addr(signerPrivateKey);
        address customer = vm.addr(0xA11CE);
        // fund customer with MBS
        mockMBS.mint(customer, 3e18);

        FullOrder memory order = FullOrder({
            id: stringToUint128(uuid),
            expiry: 2,
            customer: customer,
            notBefore: 3,
            items: new OrderItem[](1)
        });
        order.items[0] = OrderItem({amount: 1e18, currency: address(mockMBS), credit: false, ERC: 20, id: 0});

        bytes32 hash = cashRegister.getEIP712Hash(order);

        vm.startPrank(orderSigner); // switch to the signer address
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(signerPrivateKey, hash);
        bytes memory signature = abi.encodePacked(r, s, v);
        vm.stopPrank(); // switch back to the original sender

        SigUtils.Permit memory permit =
            SigUtils.Permit({owner: customer, spender: address(cashRegister), value: 1e18, nonce: 0, deadline: 1 days});
        bytes32 digest = sigUtils.getTypedDataHash(permit);

        (uint8 v1, bytes32 r1, bytes32 s1) = vm.sign(0xA11CE, digest);

        mockMBS.permit(permit.owner, permit.spender, permit.value, permit.deadline, v1, r1, s1);

        vm.prank(customer);
        cashRegister.settleOrderPayment(order, signature);
        assertEq(mockMBS.balanceOf(customer), 2e18, "customer");
        assertEq(mockMBS.balanceOf(address(cashRegister)), 1e18, "cashRegister");
        // FIXME Error: Compiler error (/solidity/libsolidity/codegen/LValue.cpp:56):Stack too deep. Try compiling with `--via-ir` (cli) or the equivalent `viaIR: true` (standard JSON) while enabling the optimizer. Otherwise, try removing local variables.
        // assertTrue(cashRegister.isOrderProcessed(stringToUint128(uuid)));
    }
}
