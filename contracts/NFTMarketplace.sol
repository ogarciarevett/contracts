// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

error NotOwner();
error NotListed(address nftAddress, uint256 tokenId);
error AlreadyListed(address nftAddress, uint256 tokenId);
error PriceMustBeGreaterThanZero();
error NotNFTOwner(address sender, address nftAddress, uint256 tokenId);
error MarketplaceNotApproved(address nftAddress, uint256 tokenId);
error InsufficientPayment(uint256 required, uint256 sent);
error TransferFailed();
error RefundFailed();
error NotSeller(address sender, address nftAddress, uint256 tokenId);
error NoFeesToWithdraw();

/**
 * @title NFTMarketplace
 * @author 0xmar
 * @notice A basic NFT marketplace to list, buy, and cancel ERC721 token sales.
 */
contract NFTMarketplace is ReentrancyGuard {
    /**
     * @notice Represents a listed NFT, including its price and seller.
     * @param seller The address of the user who listed the NFT.
     * @param price The price of the NFT in wei.
     */
    struct Listing {
        address seller;
        uint256 price;
    }

    /// @notice Maps from NFT contract address to token ID to its listing details.
    mapping(address => mapping(uint256 => Listing)) public listings;

    /// @notice Maps from an address to the amount of fees collected for them.
    mapping(address => uint256) public marketplaceFees;

    /// @notice The owner of the marketplace, who can collect fees.
    address public owner;

    /// @notice The percentage of each sale that goes to the marketplace owner.
    uint256 public feePercentage;

    /// @dev Emitted when an NFT is listed for sale.
    event Listed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    /// @dev Emitted when an NFT is purchased.
    event Purchased(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );

    /// @dev Emitted when a listing is canceled.
    event Canceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId
    );

    /// @dev Emitted when the marketplace fee percentage is updated.
    event FeeUpdated(uint256 newFeePercentage);

    /// @dev Emitted when the owner withdraws collected fees.
    event FeeWithdrawn(address indexed owner, uint256 amount);

    /// @dev Throws if called by any account other than the owner.
    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    /// @dev Throws if the NFT is not listed for sale.
    modifier isListed(address nftAddress, uint256 tokenId) {
        if (listings[nftAddress][tokenId].price == 0) revert NotListed(nftAddress, tokenId);
        _;
    }

    /// @dev Throws if the NFT is already listed for sale.
    modifier isNotListed(address nftAddress, uint256 tokenId) {
        if (listings[nftAddress][tokenId].price > 0) revert AlreadyListed(nftAddress, tokenId);
        _;
    }

    /**
     * @notice Sets the initial owner and fee percentage for the marketplace.
     * @param _feePercentage The initial fee percentage for sales.
     */
    constructor(uint256 _feePercentage) {
        owner = msg.sender;
        feePercentage = _feePercentage;
    }

    /**
     * @notice Lists an NFT for sale at a given price.
     * @dev The caller must be the owner of the NFT and must have approved the marketplace.
     * @param nftAddress The address of the ERC721 contract.
     * @param tokenId The ID of the token to list.
     * @param price The selling price in wei.
     */
    function list(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external isNotListed(nftAddress, tokenId) {
        if (price == 0) revert PriceMustBeGreaterThanZero();
        IERC721 nft = IERC721(nftAddress);
        if (nft.ownerOf(tokenId) != msg.sender) revert NotNFTOwner(msg.sender, nftAddress, tokenId);
        if (nft.isApprovedForAll(msg.sender, address(this)) || nft.getApproved(tokenId) == address(this)) {
            // approved
        } else {
            revert MarketplaceNotApproved(nftAddress, tokenId);
        }

        listings[nftAddress][tokenId] = Listing(msg.sender, price);

        emit Listed(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * @notice Purchases a listed NFT.
     * @dev The buyer must send enough ETH to cover the price. Reentrancy safe.
     * @param nftAddress The address of the ERC721 contract.
     * @param tokenId The ID of the token to purchase.
     */
    function purchase(
        address nftAddress,
        uint256 tokenId
    ) external payable isListed(nftAddress, tokenId) nonReentrant {
        Listing storage listing = listings[nftAddress][tokenId];
        uint256 price = listing.price;

        if (msg.value < price) revert InsufficientPayment(price, msg.value);

        uint256 fee = (price * feePercentage) / 100;
        uint256 sellerProceeds = price - fee;

        marketplaceFees[owner] += fee;

        address seller = listing.seller;
        delete listings[nftAddress][tokenId];

        IERC721(nftAddress).safeTransferFrom(seller, msg.sender, tokenId);

        (bool success, ) = seller.call{value: sellerProceeds}("");
        if (!success) revert TransferFailed();

        // Refund any excess payment
        if (msg.value > price) {
            (bool refundSuccess, ) = msg.sender.call{value: msg.value - price}("");
            if (!refundSuccess) revert RefundFailed();
        }

        emit Purchased(msg.sender, nftAddress, tokenId, price);
    }

    /**
     * @notice Cancels an active NFT listing.
     * @dev Only the original seller can cancel their listing.
     * @param nftAddress The address of the ERC721 contract.
     * @param tokenId The ID of the token to cancel.
     */
    function cancel(
        address nftAddress,
        uint256 tokenId
    ) external isListed(nftAddress, tokenId) {
        if (listings[nftAddress][tokenId].seller != msg.sender) revert NotSeller(msg.sender, nftAddress, tokenId);

        delete listings[nftAddress][tokenId];

        emit Canceled(msg.sender, nftAddress, tokenId);
    }

    /**
     * @notice Updates the marketplace fee percentage.
     * @dev Only callable by the owner.
     * @param _feePercentage The new fee percentage.
     */
    function updateFee(uint256 _feePercentage) external onlyOwner {
        feePercentage = _feePercentage;
        emit FeeUpdated(_feePercentage);
    }

    /**
     * @notice Allows the owner to withdraw accumulated fees.
     * @dev Only callable by the owner when there are fees to withdraw.
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = marketplaceFees[owner];
        if (balance == 0) revert NoFeesToWithdraw();

        marketplaceFees[owner] = 0;

        (bool success, ) = owner.call{value: balance}("");
        if (!success) revert TransferFailed();

        emit FeeWithdrawn(owner, balance);
    }
} 