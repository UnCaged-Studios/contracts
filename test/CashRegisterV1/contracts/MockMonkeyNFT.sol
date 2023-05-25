// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockMonkeyNFT is ERC721 {
    constructor() ERC721("MockMonkeyNFT", "MNK") {}

    function mint(address to, uint256 tokenId) public {
        _safeMint(to, tokenId);
    }
}
