// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockCapsuleSFT is ERC1155 {
    constructor() ERC1155("https://example.com/{id}.json") {} // Replace this with your metadata API

    function mint(address to, uint256 tokenId, uint256 amount, bytes memory data) public {
        _mint(to, tokenId, amount, data);
    }
}
