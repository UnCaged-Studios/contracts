// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155Receiver.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

struct OrderItem {
    uint256 amount;
    address currency;
    bool credit;
    uint16 ERC;
    uint256 id;
}

struct FullOrder {
    uint128 id;
    uint32 expiry;
    address customer;
    uint32 notBefore;
    OrderItem[] items;
}

contract KaChingCashRegisterV1 is EIP712, IERC721Receiver, IERC1155Receiver, ERC165, AccessControl {
    mapping(uint128 => bool) private _orderProcessed;

    address[] private ORDER_SIGNER_ADDRESSES;
    bytes32 public constant CASHIER_ROLE = keccak256("CASHIER_ROLE");

    event OrderFullySettled(uint128 orderId, address customer);

    constructor() EIP712("KaChingCashRegisterV1", "1") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function _getFullOrderHash(FullOrder memory order) internal pure returns (bytes32) {
        bytes memory itemsPacked = new bytes(32 * order.items.length);
        for (uint256 i = 0; i < order.items.length; i++) {
            bytes32 itemHash = keccak256(
                abi.encode(
                    keccak256("OrderItem(uint256 amount,address currency,bool credit,uint16 ERC,uint256 id)"),
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

            if (item.ERC == 1155) {
                IERC1155 token = IERC1155(item.currency);
                if (item.credit) {
                    require(
                        token.balanceOf(address(this), item.id) >= item.amount, "Contract does not have enough tokens"
                    );
                } else {
                    require(token.balanceOf(msg.sender, item.id) >= item.amount, "Customer does not have enough tokens");
                }
            } else if (item.ERC == 721) {
                IERC721 token = IERC721(item.currency);
                if (item.credit) {
                    require(token.ownerOf(item.id) == address(this), "Contract does not own this token");
                } else {
                    require(token.ownerOf(item.id) == msg.sender, "Customer does not own this token");
                }
            } else if (item.ERC == 20) {
                IERC20 token = IERC20(item.currency);
                if (item.credit) {
                    require(token.balanceOf(address(this)) >= item.amount, "Contract does not have enough tokens");
                } else {
                    require(token.balanceOf(msg.sender) >= item.amount, "Customer does not have enough tokens");
                }
            }
        }
    }

    function _performTransfers(FullOrder calldata order) internal {
        for (uint256 i = 0; i < order.items.length; i++) {
            OrderItem calldata item = order.items[i];
            if (item.ERC == 20) {
                IERC20 erc20Token = IERC20(item.currency);
                if (item.credit) {
                    erc20Token.transfer(msg.sender, item.amount);
                } else {
                    erc20Token.transferFrom(msg.sender, address(this), item.amount);
                }
            } else if (item.ERC == 721) {
                IERC721 erc721Token = IERC721(item.currency);
                if (item.credit) {
                    erc721Token.transferFrom(address(this), msg.sender, item.id);
                } else {
                    erc721Token.transferFrom(msg.sender, address(this), item.id);
                }
            } else if (item.ERC == 1155) {
                IERC1155 erc1155Token = IERC1155(item.currency);
                if (item.credit) {
                    erc1155Token.safeTransferFrom(address(this), msg.sender, item.id, item.amount, "");
                } else {
                    erc1155Token.safeTransferFrom(msg.sender, address(this), item.id, item.amount, "");
                }
            }
        }
    }

    function settleOrderPayment(FullOrder calldata order, bytes calldata signature) public {
        // read-only validations
        require(msg.sender == order.customer, "Customer does not match sender address");
        require(block.timestamp <= order.expiry, "Order is expired");
        require(block.timestamp >= order.notBefore, "Order cannot be used yet");
        require(_isOrderSignerValid(order, signature), "Invalid signature");
        require(false == _orderProcessed[order.id], "Order already processed");
        _checkBalances(order);

        // change state
        _orderProcessed[order.id] = true;
        _performTransfers(order);

        // event
        emit OrderFullySettled(order.id, msg.sender);
    }

    function onERC721Received(
        address, /* operator */
        address, /* from */
        uint256, /* tokenId */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function onERC1155Received(
        address, /* operator */
        address, /* from */
        uint256, /* id */
        uint256, /* value */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155Received.selector;
    }

    function onERC1155BatchReceived(
        address, /* operator */
        address, /* from */
        uint256[] calldata, /* ids */
        uint256[] calldata, /* values */
        bytes calldata /* data */
    ) external pure override returns (bytes4) {
        return this.onERC1155BatchReceived.selector;
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC165, IERC165, AccessControl)
        returns (bool)
    {
        return interfaceId == type(IERC1155Receiver).interfaceId || super.supportsInterface(interfaceId);
    }

    function isOrderProcessed(uint128 orderId) public view onlyRole(CASHIER_ROLE) returns (bool) {
        return _orderProcessed[orderId];
    }

    function addCashier(address cashier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        grantRole(CASHIER_ROLE, cashier);
    }

    function removeCashier(address cashier) public onlyRole(DEFAULT_ADMIN_ROLE) {
        renounceRole(CASHIER_ROLE, cashier);
    }

    function setOrderSigners(address[] memory newSigners) public onlyRole(CASHIER_ROLE) {
        ORDER_SIGNER_ADDRESSES = newSigners;
    }

    function getOrderSigners() public view onlyRole(CASHIER_ROLE) returns (address[] memory) {
        return ORDER_SIGNER_ADDRESSES;
    }
}
