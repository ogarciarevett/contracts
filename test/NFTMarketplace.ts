import { expect } from 'chai';
import hre from 'hardhat';
import { parseEther, getAddress } from 'viem';

describe('NFTMarketplace', function () {
    const feePercentage = 2n;

    async function deployContracts() {
        const [owner, seller, buyer] = await hre.viem.getWalletClients();

        const mockNFT = await hre.viem.deployContract('MockNFT');
        const marketplace = await hre.viem.deployContract('NFTMarketplace', [feePercentage]);
        
        const publicClient = await hre.viem.getPublicClient();

        return { marketplace, mockNFT, owner, seller, buyer, publicClient };
    }

    it('Should set the right owner and fee percentage', async function () {
        const { marketplace, owner } = await deployContracts();
        expect(getAddress(await marketplace.read.owner())).to.equal(getAddress(owner.account.address));
        expect(await marketplace.read.feePercentage()).to.equal(feePercentage);
    });

    it('Should list an NFT for sale', async function () {
        const { marketplace, mockNFT, seller } = await deployContracts();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        const [sellerAddress, priceListed] = await marketplace.read.listings([mockNFT.address, tokenId]) as [`0x${string}`, bigint];
        expect(getAddress(sellerAddress)).to.equal(getAddress(seller.account.address));
        expect(priceListed).to.equal(price);
    });
    
    it('Should allow a user to purchase a listed NFT', async function () {
        const { marketplace, mockNFT, seller, buyer, publicClient } = await deployContracts();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });
        
        const sellerInitialBalance = await publicClient.getBalance({address: seller.account.address});
        await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });
        
        const newOwner = await mockNFT.read.ownerOf([tokenId]);
        expect(getAddress(newOwner)).to.equal(getAddress(buyer.account.address));

        const fee = (price * feePercentage) / 100n;
        const sellerProceeds = price - fee;
        const sellerFinalBalance = await publicClient.getBalance({address: seller.account.address});
        expect(sellerFinalBalance).to.equal(sellerInitialBalance + sellerProceeds);
    });
    
    it('Should allow the owner to withdraw fees', async function () {
        const { marketplace, mockNFT, owner, seller, buyer, publicClient } = await deployContracts();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });
        await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });

        const fee = (price * feePercentage) / 100n;
        const ownerInitialBalance = await publicClient.getBalance({address: owner.account.address});
        const tx = await marketplace.write.withdrawFees({ account: owner.account });
        const receipt = await publicClient.getTransactionReceipt({hash: tx});
        const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;
        const ownerFinalBalance = await publicClient.getBalance({address: owner.account.address});
        const expectedBalance = ownerInitialBalance - gasUsed + fee;

        const tolerance = parseEther('0.001');
        expect(ownerFinalBalance > expectedBalance - tolerance && ownerFinalBalance < expectedBalance + tolerance).to.be.true;
    });
}); 