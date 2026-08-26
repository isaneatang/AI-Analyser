/**
 * api/config/network.js - Server-side BOT Chain network configuration.
 * Mirrors src/config/botChain.js for the backend. The active network is chosen
 * by the BOT_NETWORK env var ('mainnet' default, or 'testnet'). Set BOT_NETWORK
 * to 'testnet' in .env to switch. Individual values can be overridden
 * with BOT_RPC_URL / BOT_TESTNET_RPC_URL / BOT_MAINNET_RPC_URL.
 */

const NETWORKS = {
  testnet: {
    key: 'testnet',
    chainId: 968,
    chainName: 'BOT Chain Testnet',
    rpcUrl: process.env.BOT_TESTNET_RPC_URL || 'https://rpc.bohr.life',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  },
  mainnet: {
    key: 'mainnet',
    chainId: 677,
    chainName: 'BOT Chain Mainnet',
    rpcUrl: process.env.BOT_MAINNET_RPC_URL || 'https://rpc.botchain.ai',
    nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  },
};

/** Active network key: 'testnet' | 'mainnet'. Override via BOT_NETWORK. */
export const NETWORK_KEY = process.env.BOT_NETWORK === 'testnet' ? 'testnet' : 'mainnet';

export const NETWORK_CONFIG = NETWORKS[NETWORK_KEY];

/** RPC URL used by all server-side chain services. */
export const BOT_RPC_URL = process.env.BOT_RPC_URL || NETWORK_CONFIG.rpcUrl;

export const BOT_CHAIN_ID = NETWORK_CONFIG.chainId;
export const BOT_CHAIN_NAME = NETWORK_CONFIG.chainName;
export const BOT_CURRENCY = NETWORK_CONFIG.nativeCurrency;
