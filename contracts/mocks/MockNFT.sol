// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockNFT is ERC721 {
    uint256 private _nextTokenId;

    constructor() ERC721("MockNFT", "MFT") {}

    function mint(address to) public {
        _safeMint(to, _nextTokenId);
        _nextTokenId++;
    }
} 