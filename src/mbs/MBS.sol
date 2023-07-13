// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";

/**
 * @title MBS
 * @dev This contract implements a standard ERC20 token with burning and permit functionality,
 * with the addition of an ownership concept for minting new tokens.
 */
contract MBS is ERC20, ERC20Permit, ERC20Burnable, Ownable {
    /**
     * @dev Creates a new token and mints its initial supply to the deployer.
     */
    constructor() ERC20("MBS", "MBS") ERC20Permit("MBS") {
        _mint(msg.sender, 200_000_000 * 10 ** decimals());
    }

    /**
     * @notice Allows the owner to mint new tokens
     * @dev Can only be called by the current owner
     * @param _to The address that will receive the minted tokens
     * @param _amount The amount of tokens to mint
     */
    function mint(address _to, uint256 _amount) external onlyOwner {
        _mint(_to, _amount);
    }
}
