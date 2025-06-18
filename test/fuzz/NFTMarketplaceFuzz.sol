// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NFTMarketplace} from "contracts/NFTMarketplace.sol";
import {MockNFT} from "contracts/mocks/MockNFT.sol";

contract NFTMarketplaceFuzzTest {
    NFTMarketplace internal marketplace;
    MockNFT internal nft;
    uint256 internal constant TOKEN_ID = 0; // First minted token will have ID 0
    uint256 internal constant PRICE = 1 ether;
    uint256 internal constant FEE_PERCENTAGE = 10;

    constructor() {
        address feeManager = address(this);
        marketplace = new NFTMarketplace(FEE_PERCENTAGE, feeManager);
        nft = new MockNFT();

        // Mint NFT directly to this contract so it can test listing/canceling
        nft.mint(address(this));
    }

    function echidna_list_and_cancel_is_consistent() public {
        // This contract owns the NFT and can approve and list it
        nft.approve(address(marketplace), TOKEN_ID);

        marketplace.list(address(nft), TOKEN_ID, PRICE);

        (address seller, ) = marketplace.listings(address(nft), TOKEN_ID);
        assert(seller == address(this));

        marketplace.cancel(address(nft), TOKEN_ID);

        (seller, ) = marketplace.listings(address(nft), TOKEN_ID);
        assert(seller == address(0));
    }
} 