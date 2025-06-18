import dotenv from 'dotenv';

dotenv.config();

const { INFURA_API_KEY } = process.env;

export enum NETWORK_TYPE {
    MAINNET = 'MAINNET',
    TESTNET = 'TESTNET',
}

export enum ChainId {
    Ethereum = 1,
    Sepolia = 11155111,
    Sei = 1329,
    SeiTestnet = 1328,
    Hardhat = 31337,
}

export enum ExplorerApiBaseUrl {
    Sei = 'https://seitrace.com/pacific-1',
    SeiTestnet = 'https://seitrace.com/atlantic-2',
}

export enum NetworkName {
    Localhost = 'localhost',
    Ethereum = 'mainnet',
    Sepolia = 'sepolia',
    Sei = 'sei',
    SeiTestnet = 'seitestnet',
    Hardhat = 'hardhat',
}

export enum Currency {
    Localhost = 'ETH',
    Ethereum = 'ETH',
    Sepolia = 'ETH',
    Sei = 'SEI',
    SeiTestnet = 'SEI',
    Hardhat = 'ETH',
}

export enum NetworkExplorer {
    Localhost = 'http://localhost:8545',
    Ethereum = 'https://etherscan.io',
    Sepolia = 'https://sepolia.etherscan.io',
    Sei = 'https://seistream.app',
    SeiTestnet = 'https://testnet.seistream.app',
    Hardhat = 'https://etherscan.io',
}

export function getTransactionUrl(txHash: string, network: NetworkName): string {
    const explorerUrl = NetworkExplorer[network as unknown as keyof typeof NetworkExplorer];

    if (!explorerUrl) throw new Error(`Unsupported network: ${network}`);

    return `${explorerUrl}/tx/${txHash}`;
}

export const rpcUrls = {
    [ChainId.Ethereum]: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
    [ChainId.Sepolia]: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
    [ChainId.Sei]: 'https://evm-rpc.sei-apis.com',
    [ChainId.SeiTestnet]: 'https://evm-rpc-testnet.sei-apis.com',
    [ChainId.Hardhat]: 'http://localhost:8545',
};
