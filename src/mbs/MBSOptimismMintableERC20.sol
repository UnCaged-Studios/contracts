// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {OptimismMintableERC20} from "optimism-bedrock/universal/OptimismMintableERC20.sol";

/**
 * @title MBSOptimismMintableERC20
 * @notice This contract extends the OptimismMintableERC20 contract and the ERC20Permit contract to create a mintable and burnable ERC20 token with permit functionality on the Optimism network.
 */
contract MBSOptimismMintableERC20 is OptimismMintableERC20, ERC20Permit {
    /**
     * @notice Constructs the MBSOptimismMintableERC20 contract.
     * @param _bridge The address of the L2 standard bridge.
     * @param _remoteToken The address of the corresponding L1 token.
     */
    constructor(address _bridge, address _remoteToken)
        OptimismMintableERC20(_bridge, _remoteToken, "MonkeyLeague", "MBS")
        ERC20Permit("MonkeyLeague")
    {}

    /**
     * @notice Burns tokens from a given address. If the sender is the bridge, the tokens are burnt directly. If the sender is not the bridge, the sender must have enough allowance to burn the tokens.
     * @dev Overrides OptimismMintableERC20's burn function.
     * @param _from The address to burn tokens from.
     * @param _amount The amount of tokens to burn.
     */
    function burn(address _from, uint256 _amount) external override {
        if (msg.sender == BRIDGE) {
            _burn(_from, _amount);
        } else {
            uint256 currentAllowance = allowance(_from, msg.sender);
            require(currentAllowance >= _amount, "ERC20: burn amount exceeds allowance");
            _burn(_from, _amount);
            _approve(_from, msg.sender, currentAllowance - _amount);
        }
        emit Burn(_from, _amount);
    }
}
