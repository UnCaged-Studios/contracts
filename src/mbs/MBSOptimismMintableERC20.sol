// SPDX-License-Identifier: MIT
pragma solidity 0.8.15;

import {ERC20Permit} from "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";
import {OptimismMintableERC20} from "optimism-bedrock/universal/OptimismMintableERC20.sol";

contract MBSOptimismMintableERC20 is OptimismMintableERC20, ERC20Permit {
    constructor(address _bridge, address _remoteToken)
        OptimismMintableERC20(_bridge, _remoteToken, "MonkeyBuck", "MBS")
        ERC20Permit("MonkeyBuck")
    {}
}
