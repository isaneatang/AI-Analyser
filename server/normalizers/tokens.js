/**
 * Token normalizer.
 * Converts Moralis token balance data into stable application format.
 * Merges with CoinGecko market data where available.
 */

/**
 * Normalize raw Moralis token balance data.
 * @param {Array} rawTokens - Raw token balances from Moralis.
 * @returns {Array} Normalized token list.
 */
export function normalizeTokens(rawTokens) {
  if (!Array.isArray(rawTokens)) return [];

  return rawTokens.map((token) => ({
    name: token.name || token.token_name || 'Unknown',
    symbol: token.symbol || token.token_symbol || '???',
    balance: token.balance || '0',
    decimals: Number(token.decimals) || 18,
    contractAddress: token.address || token.token_address || null,
    price: null,
    priceUsd: null,
    change24h: null,
    usdValue: null,
    _raw: token,
  }));
}

/**
 * Merge price data from CoinGecko into normalized tokens.
 *
 * CoinGecko does not list BOT Chain token contracts (its token_price
 * lookup is per-Ethereum-address), so after the on-chain lookups fail we
 * fall back to deterministic pricing rules instead of leaving every
 * holding unvalued:
 * - stablecoins are priced at their $1 peg
 * - wrapped/native-BOT variants use the live BOT price
 * @param {Array} tokens - Normalized tokens.
 * @param {Object} priceData - Map of contract address to price data from CoinGecko.
 * @param {Object|null} nativePrice - {price, change24h} for BOT itself.
 * @returns {Array} Tokens with price data filled in.
 */
const STABLECOIN_SYMBOLS = new Set([
  'USDT', 'USDC', 'DAI', 'TUSD', 'USDD', 'FDUSD', 'PYUSD', 'BUSD', 'USD1',
]);

const WRAPPED_NATIVE_SYMBOLS = new Set(['WBOT', 'WBNB', 'WETH']);

export function mergeTokenPrices(tokens, priceData, nativePrice = null) {
  return tokens.map((token) => {
    if (!token.contractAddress) return token;

    const cgPrice = priceData[token.contractAddress];
    let priceNum = cgPrice?.price || null;
    let change24h = cgPrice?.change24h ?? null;
    let source = cgPrice ? 'coingecko' : null;

    // Deterministic fallbacks when CoinGecko has no listing.
    const sym = String(token.symbol || '').toUpperCase();
    if (priceNum === null && STABLECOIN_SYMBOLS.has(sym)) {
      priceNum = 1;
      change24h = null;
      source = 'stablecoin-peg';
    } else if (
      priceNum === null &&
      WRAPPED_NATIVE_SYMBOLS.has(sym) &&
      nativePrice?.price
    ) {
      priceNum = nativePrice.price;
      change24h = nativePrice.change24h ?? null;
      source = 'native-price';
    }

    if (priceNum !== null) {
      const balanceNum = Number(token.balance) / Math.pow(10, token.decimals);
      return {
        ...token,
        price: priceNum,
        priceUsd: priceNum,
        change24h,
        usdValue: balanceNum * priceNum,
        _priceSource: source,
      };
    }

    return token;
  });
}

/**
 * Calculate total USD value of all tokens.
 * @param {Array} tokens - Tokens with price data.
 * @returns {number|null} Total USD value or null if no prices available.
 */
export function calculateTotalTokenValue(tokens) {
  const values = tokens
    .filter((t) => t.usdValue !== null)
    .map((t) => t.usdValue);

  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0);
}
