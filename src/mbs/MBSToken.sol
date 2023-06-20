// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MBSToken
 * @dev This contract implements a standard ERC20 token with burning and permit functionality,
 * with the addition of an ownership concept for minting new tokens.
 */
contract MBSToken is ERC20, ERC20Permit, ERC20Burnable, Ownable {
    /**
     * @dev Constructor that gives msg.sender all of existing tokens.
     */
    constructor() ERC20("MBSToken", "MBS") ERC20Permit("MBSToken") {
        _mint(msg.sender, 1000000000 * 10 ** decimals());
    }

    /**
     * @notice Allows the owner to mint new tokens
     * @dev Can only be called by the current owner
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }
}
