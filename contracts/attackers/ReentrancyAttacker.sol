// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "../NFTMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReentrancyAttacker is IERC721Receiver {
    NFTMarketplace private immutable _marketplace;
    address private _nftAddress;
    uint256 private _tokenId;

    constructor(address _marketplaceAddress) {
        _marketplace = NFTMarketplace(_marketplaceAddress);
    }
    
    function listNFT(address _nftAddress, uint256 _tokenId, uint256 _price) external {
        IERC721(_nftAddress).approve(address(_marketplace), _tokenId);
        _marketplace.list(_nftAddress, _tokenId, _price);
        _nftAddress = _nftAddress;
        _tokenId = _tokenId;
    }
    
    function _attack(uint256 _price) internal {
        _marketplace.purchase{value: _price}(_nftAddress, _tokenId);
    }

    function startAttack(uint256 _price) external payable {
        _attack(_price);
    }

    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    receive() external payable {
        _attack(msg.value);
    }
} 