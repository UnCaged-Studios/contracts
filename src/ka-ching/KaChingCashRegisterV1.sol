// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @dev Struct representing a single order item.
struct OrderItem {
    uint256 amount; // Amount of the item
    address currency; // Currency of the item
    bool credit; // Credit flag for the item
}

/// @dev Struct representing a full order.
struct FullOrder {
    uint128 id; // Order id
    uint32 expiry; // Order expiry
    uint32 notBefore; // Order start time
    address customer; // Address of the customer
    OrderItem[] items; // Items of the order
}

/// @title KaChingCashRegisterV1
/// @dev This contract defines the KaChing cash register functionality.
/// @notice It includes functions for managing orders and signers, and for settling payments.
/// The role of the cashier is only assignable upon deployment and cannot be changed.
contract KaChingCashRegisterV1 is EIP712, ReentrancyGuard {
    bytes32 private constant _ORDER_ITEM_HASH = keccak256("OrderItem(uint256 amount,address currency,bool credit)");
    bytes32 private constant _FULL_ORDER_HASH =
        keccak256("FullOrder(uint128 id,uint32 expiry,uint32 notBefore,address customer,bytes32 itemsHash)");
    mapping(uint128 => bool) private _orderProcessed;
    address[] private _orderSignerAddresses;

    /// @dev The cashier is an address capable of updating the order signers.
    address public immutable CASHIER_ROLE;

    /// @dev Event emitted when an order is fully settled.
    event OrderFullySettled(uint128 indexed orderId, address indexed customer);

    /// @dev Contract constructor sets initial cashier.
    /// @param _cashier Address of the cashier.
    constructor(address _cashier) EIP712("KaChingCashRegisterV1", "1") {
        require(_cashier != address(0), "Cashier address cannot be 0x0");
        CASHIER_ROLE = _cashier;
    }

    /// @dev Modifier to only allow the cashier to execute a function.
    modifier onlyCashier() {
        require(msg.sender == CASHIER_ROLE, "Caller is not a cashier");
        _;
    }

    /// @dev Internal function to calculate the hash of an order.
    function _getFullOrderHash(FullOrder memory order) internal pure returns (bytes32) {
        bytes memory itemsPacked = new bytes(32 * order.items.length);
        unchecked {
            for (uint256 i = 0; i < order.items.length; i++) {
                bytes32 itemHash = keccak256(
                    abi.encode(_ORDER_ITEM_HASH, order.items[i].amount, order.items[i].currency, order.items[i].credit)
                );
                uint256 baseIndex = i * 32;
                for (uint256 j = 0; j < 32; j++) {
                    itemsPacked[baseIndex + j] = itemHash[j];
                }
            }
        }
        return keccak256(
            abi.encode(
                _FULL_ORDER_HASH, order.id, order.expiry, order.notBefore, order.customer, keccak256(itemsPacked)
            )
        );
    }

    /// @dev Internal function to check if the signer of an order is valid.
    function _isOrderSignerValid(FullOrder memory order, bytes memory signature) internal view returns (bool) {
        bytes32 fullOrderHash = _getFullOrderHash(order);
        address signer = ECDSA.recover(_hashTypedDataV4(fullOrderHash), signature);

        bool isSignerValid = false;
        unchecked {
            for (uint256 i = 0; i < _orderSignerAddresses.length; i++) {
                if (signer == _orderSignerAddresses[i]) {
                    isSignerValid = true;
                    break;
                }
            }
        }
        return isSignerValid;
    }

    /// @dev Internal function to perform transfers of all items in an order.
    function _performTransfers(FullOrder calldata order, address to) internal {
        unchecked {
            for (uint256 i = 0; i < order.items.length; i++) {
                OrderItem calldata item = order.items[i];
                IERC20 token = IERC20(item.currency);
                if (item.credit) {
                    token.transfer(to, item.amount);
                } else {
                    token.transferFrom(to, address(this), item.amount);
                }
            }
        }
    }

    /// @notice External function to settle an order's payment.
    function settleOrderPayment(FullOrder calldata order, bytes calldata signature) external nonReentrant {
        // read-only validations
        require(msg.sender == order.customer, "Customer does not match sender address");
        require(block.timestamp <= order.expiry, "Order is expired");
        require(block.timestamp >= order.notBefore, "Order cannot be used yet");
        require(_isOrderSignerValid(order, signature), "Invalid signature");
        require(false == _orderProcessed[order.id], "Order already processed");

        // change state
        _orderProcessed[order.id] = true;
        _performTransfers({order: order, to: msg.sender});

        // event
        emit OrderFullySettled({orderId: order.id, customer: msg.sender});
    }

    /// @notice External function to check if an order has been processed.
    function isOrderProcessed(uint128 orderId) external view returns (bool) {
        return _orderProcessed[orderId];
    }

    /// @notice Updates the list of order signers.
    /// @dev Only the cashier can update this list.
    /// @param newSigners New list of signers.
    function setOrderSigners(address[] calldata newSigners) external onlyCashier {
        require(newSigners.length <= 3, "Cannot set more than 3 signers");
        _orderSignerAddresses = newSigners;
    }

    function getOrderSigners() external view returns (address[] memory) {
        return _orderSignerAddresses;
    }
}
