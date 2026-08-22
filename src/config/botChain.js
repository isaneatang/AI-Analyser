/**
 * BOT Chain network configuration.
 * Single source of truth for BOT Chain network details on the client.
 * No other client file should define chain ID, RPC URL, or network parameters.
 *
 * ONE-SWITCH: flip ACTIVE_NETWORK_KEY between 'testnet' and 'mainnet' and the
 * entire app (wallet connect, network switching, configs) follows. On mainnet,
 * fill in the real chain id / RPC / explorer values below.
 */

export const BOT_NETWORKS = {
  testnet: {
    key: 'testnet',
    chainId: 968,
    chainName: 'BOT Chain Testnet',
    rpcUrl: 'https://rpc.bohr.life',
    nativeCurrency: {
      name: 'BOT',
      symbol: 'BOT',
      decimals: 18,
    },
    // No verified explorer yet. Abeg do not invent URLs.
    blockExplorerUrl: 'https://scan.bohr.life',
  },
  mainnet: {
    key: 'mainnet',
    chainId: 677,
    chainName: 'BOT Chain Mainnet',
    rpcUrl: 'https://rpc.botchain.ai',
    nativeCurrency: {
      name: 'BOT',
      symbol: 'BOT',
      decimals: 18,
    },
    blockExplorerUrl: 'https://scan.botchain.ai',
  },
};

//this toggles greatness
export const ACTIVE_NETWORK_KEY = 'mainnet'; // 'testnet' | 'mainnet'

/** Active network object. All app code reads this. */
export const BOT_CHAIN = BOT_NETWORKS[ACTIVE_NETWORK_KEY];

/**
 * Get a specific network config by key (useful for network switchers).
 * @param {string} key - 'testnet' or 'mainnet'.
 * @returns {Object} Network config.
 */
export function getBotChain(key) {
  return BOT_NETWORKS[key] || BOT_NETWORKS.testnet;
}

/**
 * Parameters for wallet_addEthereumChain (EIP-3085).
 * Used when the wallet does not already have the active network configured.
 */
export const ADD_CHAIN_PARAMS = {
  chainId: `0x${BOT_CHAIN.chainId.toString(16)}`, // 0x3C8 for testnet
  chainName: BOT_CHAIN.chainName,
  rpcUrls: [BOT_CHAIN.rpcUrl],
  nativeCurrency: BOT_CHAIN.nativeCurrency,
  blockExplorerUrls: BOT_CHAIN.blockExplorerUrl
    ? [BOT_CHAIN.blockExplorerUrl]
    : [],
};

/**
 * Check whether a given chain ID matches the active BOT network.
 * @param {number|string|bigint} chainId - The chain ID to check.
 * @returns {boolean} True if the chain ID is the active BOT network.
 */
export function isBotChainId(chainId) {
  return Number(chainId) === BOT_CHAIN.chainId;
}
