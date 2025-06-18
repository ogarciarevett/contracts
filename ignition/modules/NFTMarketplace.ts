import { buildModule } from '@nomicfoundation/hardhat-ignition/modules';

const FEE_PERCENTAGE = 2; // 2%
const FEE_MANAGER_ADDRESS = '0xB83a590E604beCaDF71D6fC94C6cf600BBFc29Be';

const NFTMarketplaceModule = buildModule('NFTMarketplaceModule', (m) => {
    const feePercentage = m.getParameter('feePercentage', FEE_PERCENTAGE);
    const feeManager = m.getParameter('feeManager', FEE_MANAGER_ADDRESS);

    const mockNft = m.contract('MockNFT');
    const marketplace = m.contract('NFTMarketplace', [feePercentage, feeManager], {
        after: [mockNft],
    });

    return { marketplace, mockNft };
});

export default NFTMarketplaceModule;
