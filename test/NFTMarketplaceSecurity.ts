import { expect } from 'chai';
import hre from 'hardhat';
import { parseEther } from 'viem';

describe('NFTMarketplace Security', function () {
    const feePercentage = 2n;

    async function deployContractsFixture() {
        const [owner, seller, buyer] = await hre.viem.getWalletClients();

        const mockNFT = await hre.viem.deployContract('MockNFT');
        const marketplace = await hre.viem.deployContract('NFTMarketplace', [2n, owner.account.address]);

        return { marketplace, mockNFT, owner, seller, buyer };
    }

    it('Should prevent reentrancy attacks on purchase', async function () {
        const { marketplace, mockNFT } = await deployContractsFixture();

        const attacker = await hre.viem.deployContract('ReentrancyAttacker', [marketplace.address]);

        await mockNFT.write.mint([attacker.address]);
        const tokenId = 0n;
        const price = parseEther('1.0');

        await attacker.write.listNFT([mockNFT.address, tokenId, price]);

        // The attack should be rejected. The re-entrancy is not caught by the ReentrancyGuard,
        // but by the checks-effects-interactions pattern. The inner purchase fails,
        // which causes the attacker's receive() function to revert, which in turn causes the
        // seller.call.value() to fail, reverting the outer purchase with "TransferFailed".
        await expect(
            attacker.write.startAttack([price], {
                value: price,
            })
        ).to.be.rejectedWith("TransferFailed");
    });
}); 