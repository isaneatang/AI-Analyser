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
 * @param {Array} tokens - Normalized tokens.
 * @param {Object} priceData - Map of contract address to price data from CoinGecko.
 * @returns {Array} Tokens with price data filled in.
 */
export function mergeTokenPrices(tokens, priceData) {
  return tokens.map((token) => {
    if (!token.contractAddress) return token;

    const price = priceData[token.contractAddress];
    if (price) {
      const priceNum = price.price || null;
      const change24h = price.change24h || null;
      const balanceNum = Number(token.balance) / Math.pow(10, token.decimals);
      const usdValue = priceNum ? balanceNum * priceNum : null;

      return {
        ...token,
        price: priceNum,
        priceUsd: priceNum,
        change24h,
        usdValue,
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
