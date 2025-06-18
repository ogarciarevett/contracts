import type { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';
import '@nomicfoundation/hardhat-viem';
import { ChainId, ExplorerApiBaseUrl, NetworkName, rpcUrls } from './constants/networks';
import 'dotenv/config';

const { PRIVATE_KEY } = process.env;
if (!PRIVATE_KEY) {
    throw new Error('HardhatConfig: The private key is required');
}

const GAS_PRICE = 2000000000; // 2 gwei = 2 nsei

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.28',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        [NetworkName.Sei]: {
            url: rpcUrls[ChainId.Sei],
            accounts: [PRIVATE_KEY],
            chainId: ChainId.Sei,
            gasPrice: GAS_PRICE,
        },
        [NetworkName.SeiTestnet]: {
            url: rpcUrls[ChainId.SeiTestnet],
            accounts: [PRIVATE_KEY],
            chainId: ChainId.SeiTestnet,
            gasPrice: GAS_PRICE,
        },
        [NetworkName.Hardhat]: {
            chainId: ChainId.Hardhat,
        },
    },
    sourcify: {
        enabled: true,
    },
    etherscan: {
        apiKey: {
            [NetworkName.SeiTestnet]: 'ANY_STRING',
            [NetworkName.Sei]: 'ANY_STRING',
        },
        customChains: [
            {
                network: NetworkName.SeiTestnet,
                chainId: ChainId.SeiTestnet,
                urls: {
                    apiURL: `${ExplorerApiBaseUrl.SeiTestnet}/api`,
                    browserURL: ExplorerApiBaseUrl.SeiTestnet,
                },
            },
            {
                network: NetworkName.Sei,
                chainId: ChainId.Sei,
                urls: {
                    apiURL: `${ExplorerApiBaseUrl.Sei}/api`,
                    browserURL: ExplorerApiBaseUrl.Sei,
                },
            },
        ],
    },
};

export default config;
