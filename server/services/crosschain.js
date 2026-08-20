/**
 * Cross-chain token balance service.
 * Fetches token balances from Ethereum, BSC, Polygon, Arbitrum, Optimism,
 * Base, and Avalanche using Moralis API.
 * Requires MORALIS_API_KEY to be configured.
 * Returns empty array if Moralis is not configured or fails.
 */

const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const MORALIS_BASE = 'https://deep-index.moralis.io/api/v2.2';

/** Supported chains and their Moralis chain identifiers */
const SUPPORTED_CHAINS = [
  { id: 'ethereum', name: 'Ethereum', chainId: 1, symbol: 'ETH', color: '#627EEA' },
  { id: 'bsc', name: 'BNB Smart Chain', chainId: 56, symbol: 'BNB', color: '#F3BA2F' },
  { id: 'polygon', name: 'Polygon', chainId: 137, symbol: 'POL', color: '#8247E5' },
  { id: 'arbitrum', name: 'Arbitrum', chainId: 42161, symbol: 'ETH', color: '#28A0F0' },
  { id: 'optimism', name: 'Optimism', chainId: 10, symbol: 'ETH', color: '#FF0420' },
  { id: 'base', name: 'Base', chainId: 8453, symbol: 'ETH', color: '#0052FF' },
  { id: 'avalanche', name: 'Avalanche', chainId: 43114, symbol: 'AVAX', color: '#E84142' },
];

/**
 * Check if Moralis API is configured.
 * @returns {boolean} True if API key is set.
 */
export function isMoralisConfigured() {
  return !!MORALIS_API_KEY;
}

/**
 * Fetch token balances for an address on a specific chain.
 * @param {string} address - Wallet address.
 * @param {string} chain - Moralis chain identifier (ethereum, bsc, polygon).
 * @returns {Promise<Array>} Array of token balance objects.
 */
async function fetchChainTokens(address, chain) {
  if (!MORALIS_API_KEY) return [];

  try {
    const url = `${MORALIS_BASE}/${address}/erc20?chain=${chain}&limit=50`;
    const res = await fetch(url, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'accept': 'application/json',
      },
    });

    if (!res.ok) {
      console.error(`[crosschain] Moralis ${chain} error: ${res.status}`);
      return [];
    }

    const data = await res.json();
    return (data.result || []).map((token) => ({
      chain,
      name: token.name || 'Unknown',
      symbol: token.symbol || '???',
      balance: token.balance || '0',
      decimals: Number(token.decimals) || 18,
      contractAddress: token.token_address || null,
      price: token.usd_price || null,
      usdValue: token.usd_value || null,
      change24h: token.usd_price_24h_percent_change || null,
    }));
  } catch (err) {
    console.error(`[crosschain] Fetch ${chain} failed:`, err.message);
    return [];
  }
}

/**
 * Fetch native token balance for an address on a specific chain.
 * @param {string} address - Wallet address.
 * @param {string} chain - Moralis chain identifier.
 * @returns {Promise<Object|null>} Native balance object or null.
 */
async function fetchNativeBalance(address, chain) {
  if (!MORALIS_API_KEY) return null;

  try {
    const url = `${MORALIS_BASE}/${address}/balance?chain=${chain}`;
    const res = await fetch(url, {
      headers: {
        'X-API-Key': MORALIS_API_KEY,
        'accept': 'application/json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return {
      chain,
      name: SUPPORTED_CHAINS.find((c) => c.id === chain)?.symbol || chain,
      symbol: SUPPORTED_CHAINS.find((c) => c.id === chain)?.symbol || '???',
      balance: data.balance || '0',
      decimals: 18,
      contractAddress: null,
      price: null,
      usdValue: null,
      change24h: null,
      isNative: true,
    };
  } catch (err) {
    console.error(`[crosschain] Native balance ${chain} failed:`, err.message);
    return null;
  }
}

/**
 * Fetch all cross-chain token balances for an address.
 * Queries Ethereum, BSC, and Polygon in parallel.
 * @param {string} address - Wallet address.
 * @returns {Promise<Object>} Object with chain results and errors.
 */
export async function getCrossChainBalances(address) {
  if (!MORALIS_API_KEY) {
    return {
      chains: [],
      error: 'MORALIS_API_KEY not configured. Cross-chain data unavailable.',
    };
  }

  console.log(`[crosschain] Fetching balances for ${address} on ${SUPPORTED_CHAINS.length} chains`);

  // Fetch all chains in parallel
  const results = await Promise.allSettled(
    SUPPORTED_CHAINS.map(async (chain) => {
      const [tokens, native] = await Promise.all([
        fetchChainTokens(address, chain.id),
        fetchNativeBalance(address, chain.id),
      ]);

      // Put native token first
      const allTokens = native ? [native, ...tokens] : tokens;

      // Calculate total USD value
      const totalUsd = allTokens.reduce((sum, t) => sum + (t.usdValue || 0), 0);

      return {
        chain: chain.id,
        chainName: chain.name,
        chainId: chain.chainId,
        symbol: chain.symbol,
        color: chain.color,
        tokens: allTokens,
        tokenCount: allTokens.length,
        totalUsd: totalUsd > 0 ? totalUsd : null,
      };
    })
  );

  const chains = results
    .filter((r) => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((c) => c.tokenCount > 0); // Only include chains with tokens

  const errors = results
    .filter((r) => r.status === 'rejected')
    .map((r) => r.reason?.message || 'Unknown error');

  console.log(`[crosschain] Results: ${chains.map((c) => `${c.chainName}:${c.tokenCount}`).join(', ')}`);

  return { chains, errors };
}

export { SUPPORTED_CHAINS };
