/**
 * /api/crosschain - Cross-chain token balance endpoint.
 * Fetches token balances from Ethereum, BSC, and Polygon.
 * Requires MORALIS_API_KEY to be configured server-side.
 */

import { Router } from 'express';
import { getCrossChainBalances, isMoralisConfigured } from './services/crosschain.js';

const router = Router();

/**
 * GET /api/crosschain/:address
 * Returns token balances from Ethereum, BSC, and Polygon.
 * @param {string} address - Wallet address in URL path.
 * @returns {Object} Cross-chain balance data.
 */
router.get('/crosschain/:address', async (req, res) => {
  try {
    const { address } = req.params;

    // Validate address format
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid EVM address' });
    }

    if (!isMoralisConfigured()) {
      return res.json({
        chains: [],
        error: 'MORALIS_API_KEY not configured. Set it in .env to enable cross-chain data.',
      });
    }

    console.log(`[crosschain] Request for ${address}`);

    const result = await getCrossChainBalances(address);

    res.json(result);
  } catch (err) {
    console.error('[crosschain] Error:', err);
    res.status(500).json({
      error: 'Cross-chain fetch failed',
      message: err.message,
    });
  }
});

export default router;
