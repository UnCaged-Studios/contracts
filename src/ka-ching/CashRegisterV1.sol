// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

struct OrderItem {
    uint64 amount;
    address currency;
    bool credit;
    uint16 ERC; // Add the TokenType enum as a field in the struct
}

struct FullOrder {
    uint128 id;
    uint32 expiry;
    address customer;
    uint32 notBefore;
    OrderItem[] items;
}

interface ERCTokensBalanceOf {
    function balanceOf(address account) external view returns (uint256);
}

contract KaChingCashRegisterV1 is EIP712 {
    mapping(uint128 => bool) private _orderProcessed;
    address[] private ORDER_SIGNER_ADDRESSES;

    constructor() EIP712("KaChingCashRegisterV1", "1") {
        ORDER_SIGNER_ADDRESSES = [0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 /*, more addresses here if needed */ ];
    }

    function _getFullOrderHash(FullOrder memory order) internal pure returns (bytes32) {
        bytes memory itemsPacked = new bytes(32 * order.items.length);
        for (uint256 i = 0; i < order.items.length; i++) {
            bytes32 itemHash = keccak256(
                abi.encode(
                    keccak256("OrderItem(uint64 amount,address currency,bool credit,uint16 ERC)"),
                    order.items[i].amount,
                    order.items[i].currency,
                    order.items[i].credit,
                    order.items[i].ERC
                )
            );
            for (uint256 j = 0; j < 32; j++) {
                itemsPacked[i * 32 + j] = itemHash[j];
            }
        }
        return keccak256(
            abi.encode(
                keccak256("FullOrder(uint128 id,uint32 expiry,address customer,uint32 notBefore,bytes32 itemsHash)"),
                order.id,
                order.expiry,
                order.customer,
                order.notBefore,
                keccak256(itemsPacked)
            )
        );
    }

    function _isOrderSignerValid(FullOrder memory order, bytes memory signature) internal view returns (bool) {
        bytes32 fullOrderHash = _getFullOrderHash(order);
        address signer = ECDSA.recover(_hashTypedDataV4(fullOrderHash), signature);

        bool isSignerValid = false;
        for (uint256 i = 0; i < ORDER_SIGNER_ADDRESSES.length; i++) {
            if (signer == ORDER_SIGNER_ADDRESSES[i]) {
                isSignerValid = true;
                break;
            }
        }
        return isSignerValid;
    }

    function _checkBalances(FullOrder calldata order) internal view {
        for (uint256 i = 0; i < order.items.length; i++) {
            OrderItem calldata item = order.items[i];
            require(item.ERC == 20 || item.ERC == 721 || item.ERC == 1155, "Item type (ERC number) is not supported");

            ERCTokensBalanceOf token = ERCTokensBalanceOf(item.currency);
            if (item.credit) {
                require(token.balanceOf(address(this)) >= item.amount, "Contract does not have enough tokens");
            } else {
                require(token.balanceOf(msg.sender) >= item.amount, "Customer does not have enough tokens");
            }
        }
    }

    function _performTransfers(FullOrder calldata order) internal {
        for (uint256 i = 0; i < order.items.length; i++) {
            OrderItem calldata item = order.items[i];
            // TODO - support ERC712 and ERC1155
            IERC20 token = IERC20(item.currency);
            if (item.credit) {
                token.transfer(msg.sender, item.amount);
            } else {
                token.transferFrom(msg.sender, address(this), item.amount);
            }
        }
    }

    function settleOrderPayment(FullOrder calldata order, bytes calldata signature) public {
        // read-only validations
        require(!_orderProcessed[order.id], "Order already processed");
        require(_isOrderSignerValid(order, signature), "Invalid signature");
        // TODO require - expiry and notBefore
        // TODO require - customer address
        _checkBalances(order);

        // change state
        _orderProcessed[order.id] = true;
        _performTransfers(order);
    }

    function isOrderProcessed(uint128 orderId) public view returns (bool) {
        return _orderProcessed[orderId];
    }
}
