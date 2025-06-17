// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "../NFTMarketplace.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

contract ReentrancyAttacker {
    NFTMarketplace private marketplace;
    IERC721 private nft;
    address private owner;

    constructor(address _marketplaceAddress) {
        marketplace = NFTMarketplace(_marketplaceAddress);
        owner = msg.sender;
    }

    function listNFT(address _nftAddress, uint256 _tokenId, uint256 _price) external {
        nft = IERC721(_nftAddress);
        nft.approve(address(marketplace), _tokenId);
        marketplace.list(_nftAddress, _tokenId, _price);
    }

    function triggerAttack(address _nftAddress, uint256 _tokenId) external payable {
        marketplace.purchase{value: msg.value}(_nftAddress, _tokenId);
    }

    receive() external payable {
        // Re-enter the marketplace contract
        if (address(marketplace).balance > 0) {
            // This will fail because of the reentrancy guard
            // In a real attack, this might try to drain funds
            // but here we just test the guard.
            (bool success,) = address(marketplace).call(abi.encodeWithSignature("withdrawFees()"));
            require(success, "Re-entrant call failed");
        }
    }
} 