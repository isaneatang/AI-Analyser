/**
 * CoinGecko market data service.
 * Server-side only. Handles token prices, market data, 24h changes, USD valuation.
 * BOT Chain tokens may not exist in CoinGecko.
 * If unavailable, returns null instead of fabricating prices.
 *
 * Endpoint selection: CoinGecko DEMO keys ('CG-...', free tier) MUST use
 * api.coingecko.com with the x-cg-demo-api-key header - calling
 * pro-api.coingecko.com with them fails every request (error 10011),
 * which silently disabled all prices before. Paid Pro keys use the pro
 * endpoint; force with COINGECKO_PLAN=pro.
 */

const API_KEY = process.env.COINGECKO_API_KEY;
const IS_PRO_PLAN = process.env.COINGECKO_PLAN === 'pro';
const BASE_URL =
  API_KEY && IS_PRO_PLAN
    ? 'https://pro-api.coingecko.com/api/v3'
    : 'https://api.coingecko.com/api/v3';

/**
 * Make a request to the CoinGecko API.
 * @param {string} path - API path.
 * @returns {Promise<any>} Response data.
 */
async function coingeckoRequest(path) {
  const url = `${BASE_URL}${path}`;
  const headers = { accept: 'application/json' };

  if (API_KEY) {
    headers[IS_PRO_PLAN ? 'x-cg-pro-api-key' : 'x-cg-demo-api-key'] = API_KEY;
  }

  const res = await fetch(url, { headers });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

/**
 * Get the current price of BOT token in USD.
 * @returns {Promise<number|null>} Price in USD or null if unavailable.
 */
export async function getBotPrice() {
  try {
    const data = await coingeckoRequest(
      '/simple/price?ids=bohr&vs_currencies=usd&include_24hr_change=true'
    );
    if (data?.bohr) {
      return {
        price: data.bohr.usd || null,
        change24h: data.bohr.usd_24h_change || null,
      };
    }
    return null;
  } catch {
    return null;
  }
}
