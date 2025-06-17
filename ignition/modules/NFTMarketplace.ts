import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const FEE_PERCENTAGE = 2; // 2%

const NFTMarketplaceModule = buildModule("NFTMarketplaceModule", (m) => {
  const feePercentage = m.getParameter("feePercentage", FEE_PERCENTAGE);

  const marketplace = m.contract("NFTMarketplace", [feePercentage]);

  return { marketplace };
});

export default NFTMarketplaceModule; 