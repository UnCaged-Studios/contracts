// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

struct OrderItem {
    uint256 amount;
    address currency; // consider using immutable state variable
    bool credit;
    uint16 ERC; // FIXME can be removed (only)
    uint256 id; // FIXME move to after amount (strcut packing)
}

// packing optimization
struct FullOrder {
    uint128 id;
    uint32 expiry;
    address customer;
    uint32 notBefore;
    OrderItem[] items;
}

error Foo(uint128 orderId);

// FIXME - add docs as comments
contract KaChingCashRegisterV1 is EIP712, AccessControl, ReentrancyGuard {
    bytes32 private constant _ORDER_ITEM_HASH =
        keccak256("OrderItem(uint256 amount,address currency,bool credit,uint16 ERC,uint256 id)");
    bytes32 private constant _FULL_ORDER_HASH =
        keccak256("FullOrder(uint128 id,uint32 expiry,address customer,uint32 notBefore,bytes32 itemsHash)");
    mapping(uint128 => bool) private _orderProcessed;
    // FIXME - where is the limit?
    address[] private _orderSignerAddresses;
    bytes32 public constant CASHIER_ROLE = keccak256("CASHIER_ROLE");

    bytes32 public constant GOVERNOR_ROLE = keccak256("GOVERNOR_ROLE");

    event OrderFullySettled(uint128 indexed orderId, address indexed customer);

    constructor() EIP712("KaChingCashRegisterV1", "1") {
        // FIXME - set admin as GOVERNOR_ROLE
        // check that DEFAULT_ADMIN_ROLE is not 0x00
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _getFullOrderHash(FullOrder memory order) internal pure returns (bytes32) {
        bytes memory itemsPacked = new bytes(32 * order.items.length);
        unchecked {
            for (uint256 i = 0; i < order.items.length; i++) {
                bytes32 itemHash = keccak256(
                    abi.encode(
                        _ORDER_ITEM_HASH,
                        order.items[i].amount,
                        order.items[i].currency,
                        order.items[i].credit,
                        order.items[i].ERC,
                        order.items[i].id
                    )
                );
                for (uint256 j = 0; j < 32; j++) {
                    itemsPacked[i * 32 + j] = itemHash[j];
                }
            }
        }
        return keccak256(
            abi.encode(
                _FULL_ORDER_HASH, order.id, order.expiry, order.customer, order.notBefore, keccak256(itemsPacked)
            )
        );
    }

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

    function _checkBalances(FullOrder calldata order) internal view {
        unchecked {
            for (uint256 i = 0; i < order.items.length; i++) {
                OrderItem calldata item = order.items[i];
                // can be removed
                require(item.ERC == 20, "Item ERC type is not supported");
                IERC20 token = IERC20(item.currency);
                if (item.credit) {
                    require(token.balanceOf(address(this)) >= item.amount, "Contract does not have enough tokens");
                } else {
                    require(token.balanceOf(msg.sender) >= item.amount, "Customer does not have enough tokens");
                }
            }
        }
    }

    function _performTransfers(FullOrder calldata order, address party) internal {
        unchecked {
            for (uint256 i = 0; i < order.items.length; i++) {
                OrderItem calldata item = order.items[i];
                require(item.ERC == 20, "Item ERC type is not supported");
                IERC20 token = IERC20(item.currency);
                if (item.credit) {
                    // FIXME - msg.sender should be passed as param
                    // FIXME - move to safeTransfer (safeERC20)
                    token.transfer(party, item.amount);
                } else {
                    token.transferFrom(party, address(this), item.amount);
                }
            }
        }
    }

    function settleOrderPayment(FullOrder calldata order, bytes calldata signature) external nonReentrant {
        // read-only validations
        require(msg.sender == order.customer, "Customer does not match sender address");
        // FIXME : revert Foo();
        require(block.timestamp <= order.expiry, "Order is expired");
        require(block.timestamp >= order.notBefore, "Order cannot be used yet");
        require(_isOrderSignerValid(order, signature), "Invalid signature");
        require(false == _orderProcessed[order.id], "Order already processed");
        _checkBalances(order);

        // change state
        _orderProcessed[order.id] = true;
        _performTransfers({order: order, party: msg.sender});

        // event
        emit OrderFullySettled({orderId: order.id, customer: msg.sender});
    }

    function isOrderProcessed(uint128 orderId) external view returns (bool) {
        return _orderProcessed[orderId];
    }

    // TBD - no need for cashier role
    function addCashier(address cashier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(CASHIER_ROLE, cashier);
    }

    // TBD no need for cashier role
    function removeCashier(address cashier) external onlyRole(DEFAULT_ADMIN_ROLE) {
        renounceRole(CASHIER_ROLE, cashier);
    }

    function setOrderSigners(address[] memory newSigners) external onlyRole(CASHIER_ROLE) {
        _orderSignerAddresses = newSigners;
    }

    function getOrderSigners() external view returns (address[] memory) {
        return _orderSignerAddresses;
    }
}
