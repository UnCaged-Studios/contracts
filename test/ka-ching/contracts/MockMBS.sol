// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/draft-ERC20Permit.sol";

contract MockMBS is ERC20, ERC20Permit {
    constructor() ERC20("Mock MBS", "MBS") ERC20Permit("Mock MBS") {}

    function mint(address _to, uint256 _amount) external {
        _mint(_to, _amount);
    }
}
