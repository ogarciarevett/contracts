import { expect } from 'chai';
import hre from 'hardhat';
import { parseEther, getAddress } from 'viem';

describe('NFTMarketplace', function () {
    const feePercentage = 2n;

    async function deployContractsFixture() {
        const [owner, feeManager, seller, buyer, otherUser] = await hre.viem.getWalletClients();

        const mockNFT = await hre.viem.deployContract('MockNFT');
        const marketplace = await hre.viem.deployContract('NFTMarketplace', [feePercentage, getAddress(feeManager.account.address)]);

        const publicClient = await hre.viem.getPublicClient();

        return { marketplace, mockNFT, owner, feeManager, seller, buyer, otherUser, publicClient };
    }

    describe('Roles and Ownership', function () {
        it('Should set the right roles on deployment', async function () {
            const { marketplace, owner, feeManager } = await deployContractsFixture();
            const FEE_MANAGER_ROLE = await marketplace.read.FEE_MANAGER_ROLE();
            const PAUSER_ROLE = await marketplace.read.PAUSER_ROLE();
            expect(await marketplace.read.hasRole([FEE_MANAGER_ROLE, getAddress(feeManager.account.address)])).to.be.true;
            expect(await marketplace.read.hasRole([PAUSER_ROLE, getAddress(owner.account.address)])).to.be.true;
        });
    });

    describe('Pausability', function () {
        it('Should allow pauser to pause and unpause', async function () {
            const { marketplace, owner } = await deployContractsFixture();
            await marketplace.write.pause({ account: owner.account });
            expect(await marketplace.read.paused()).to.be.true;
            await marketplace.write.unpause({ account: owner.account });
            expect(await marketplace.read.paused()).to.be.false;
        });

        it('Should prevent non-pausers from pausing', async function () {
            const { marketplace, otherUser } = await deployContractsFixture();
            await expect(marketplace.write.pause({ account: otherUser.account })).to.be.rejectedWith("AccessControlUnauthorizedAccount");
        });

        it('Should prevent listing when paused', async function () {
            const { marketplace, mockNFT, seller, owner } = await deployContractsFixture();
            await marketplace.write.pause({ account: owner.account });
            await mockNFT.write.mint([seller.account.address]);
            await expect(marketplace.write.list([mockNFT.address, 0n, 1n], { account: seller.account })).to.be.rejectedWith("EnforcedPause");
        });
    });

    it('Should fail to list if price is zero', async function () {
        const { marketplace, mockNFT, seller } = await deployContractsFixture();
        const price = 0n;
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });

        await expect(
            marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account })
        ).to.be.rejectedWith("PriceMustBeGreaterThanZero");
    });

    it('Should fail to list if not the owner', async function () {
        const { marketplace, mockNFT, seller, otherUser } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });

        await expect(
            marketplace.write.list([mockNFT.address, tokenId, price], { account: otherUser.account })
        ).to.be.rejectedWith("NotNFTOwner");
    });

    it('Should fail to list an already listed NFT', async function () {
        const { marketplace, mockNFT, seller } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        await expect(
            marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account })
        ).to.be.rejectedWith("AlreadyListed");
    });

    it('Should fail to list if marketplace is not approved', async function () {
        const { marketplace, mockNFT, seller } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        // No approval
        await expect(
            marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account })
        ).to.be.rejectedWith("MarketplaceNotApproved");
    });

    it('Should list an NFT for sale and emit a Listed event', async function () {
        const { marketplace, mockNFT, seller, publicClient } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });

        const hash = await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        const logs = receipt.logs;
        expect(logs).to.have.lengthOf(1);
        const event = await marketplace.getEvents.Listed();
        expect(event[0].args.seller).to.equal(getAddress(seller.account.address));
    });

    it('Should list with isApprovedForAll', async function () {
        const { marketplace, mockNFT, seller } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.setApprovalForAll([marketplace.address, true], { account: seller.account });

        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        const listing = await marketplace.read.listings([mockNFT.address, tokenId]);
        expect(listing[0]).to.equal(getAddress(seller.account.address));
        expect(listing[1]).to.equal(price);
    });

    it('Should allow a user to purchase a listed NFT and emit a Purchased event', async function () {
        const { marketplace, mockNFT, seller, buyer, publicClient } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        const hash = await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        const event = await marketplace.getEvents.Purchased();
        expect(event[0].args.buyer).to.equal(getAddress(buyer.account.address));
    });

    it('Should fail to purchase with insufficient payment', async function () {
        const { marketplace, mockNFT, seller, buyer } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        await expect(
            marketplace.write.purchase([mockNFT.address, tokenId], { value: parseEther('0.5'), account: buyer.account })
        ).to.be.rejectedWith("InsufficientPayment");
    });

    it('Should handle purchases with zero fees', async function () {
        const { marketplace, mockNFT, seller, buyer, feeManager } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await marketplace.write.updateFee([0n], { account: feeManager.account });
        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });

        const newOwner = await mockNFT.read.ownerOf([tokenId]);
        expect(newOwner).to.equal(getAddress(buyer.account.address));
    });

    it('Should refund excess payment to the buyer', async function () {
        const { marketplace, mockNFT, seller, buyer, publicClient } = await deployContractsFixture();
        const price = parseEther('1.0');
        const excessPayment = parseEther('0.5');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        const sellerInitialBalance = await publicClient.getBalance({ address: seller.account.address });
        const buyerInitialBalance = await publicClient.getBalance({ address: buyer.account.address });

        const hash = await marketplace.write.purchase([mockNFT.address, tokenId], { value: price + excessPayment, account: buyer.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });
        const gasUsed = receipt.gasUsed * receipt.effectiveGasPrice;

        const sellerFinalBalance = await publicClient.getBalance({ address: seller.account.address });
        const buyerFinalBalance = await publicClient.getBalance({ address: buyer.account.address });

        const fee = (price * feePercentage) / 100n;
        const sellerProceeds = price - fee;

        expect(sellerFinalBalance).to.equal(sellerInitialBalance + sellerProceeds);
        expect(buyerFinalBalance).to.equal(buyerInitialBalance - price - gasUsed);
    });

    it('Should allow a seller to cancel a listing and emit a Canceled event', async () => {
        const { marketplace, mockNFT, seller, publicClient } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        const hash = await marketplace.write.cancel([mockNFT.address, tokenId], { account: seller.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        const event = await marketplace.getEvents.Canceled();
        expect(event[0].args.seller).to.equal(getAddress(seller.account.address));
    });

    it('Should fail to cancel a listing if not the seller', async () => {
        const { marketplace, mockNFT, seller, otherUser } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });

        await expect(
            marketplace.write.cancel([mockNFT.address, tokenId], { account: otherUser.account })
        ).to.be.rejectedWith("NotSeller");
    });

    it('Should allow a fee manager to update the fee and emit a FeeUpdated event', async () => {
        const { marketplace, feeManager, publicClient } = await deployContractsFixture();
        const newFee = 5n;

        const hash = await marketplace.write.updateFee([newFee], { account: feeManager.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        const event = await marketplace.getEvents.FeeUpdated();
        expect(event[0].args.newFeePercentage).to.equal(newFee);
    });

    it('Should fail to update the fee if not a fee manager', async () => {
        const { marketplace, otherUser } = await deployContractsFixture();
        const newFee = 5n;

        await expect(
            marketplace.write.updateFee([newFee], { account: otherUser.account })
        ).to.be.rejectedWith("AccessControlUnauthorizedAccount");
    });

    it('Should allow a withdrawer to withdraw fees and emit a FeeWithdrawn event', async function () {
        const { marketplace, mockNFT, owner, seller, buyer, publicClient } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });
        await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });

        const hash = await marketplace.write.withdrawFees({ account: owner.account });
        const receipt = await publicClient.getTransactionReceipt({ hash });

        const event = await marketplace.getEvents.FeeWithdrawn();
        expect(event[0].args.owner).to.equal(getAddress(owner.account.address));
        
        const fee = (price * feePercentage) / 100n;
        expect(event[0].args.amount).to.equal(fee);
    });

    it('Should fail to withdraw fees if not a withdrawer', async () => {
        const { marketplace, mockNFT, seller, buyer, otherUser } = await deployContractsFixture();
        const price = parseEther('1.0');
        const tokenId = 0n;

        await mockNFT.write.mint([seller.account.address]);
        await mockNFT.write.approve([marketplace.address, tokenId], { account: seller.account });
        await marketplace.write.list([mockNFT.address, tokenId, price], { account: seller.account });
        await marketplace.write.purchase([mockNFT.address, tokenId], { value: price, account: buyer.account });

        await expect(
            marketplace.write.withdrawFees({ account: otherUser.account })
        ).to.be.rejectedWith("AccessControlUnauthorizedAccount");
    });

    it('Should fail to withdraw fees if there are no fees', async () => {
        const { marketplace, owner } = await deployContractsFixture();
        await expect(
            marketplace.write.withdrawFees({ account: owner.account })
        ).to.be.rejectedWith("NoFeesToWithdraw");
    });
}); 