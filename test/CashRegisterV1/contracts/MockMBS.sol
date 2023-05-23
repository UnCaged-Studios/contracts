// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockMBS is ERC20 {
    constructor() ERC20("Mock MBS", "MBS") {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
