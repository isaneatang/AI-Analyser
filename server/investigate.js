/**
 * /api/investigate - Main investigation endpoint.
 * Receives a wallet address, fetches blockchain data, normalizes it,
 * runs analysis, and returns a structured investigation object.
 *
 * Flow: Validate -> Fetch -> Normalize -> Analyze -> Cache -> Return
 */

import { Router } from 'express';
import { getWalletBalance, getTokenBalances, getWalletTransactions, getTokenTransfers, getFirstActivity } from './services/moralis.js';
import { getBotPrice, getTokenPrices } from './services/coingecko.js';
import { BOT_CHAIN_ID, BOT_CHAIN_NAME } from './config/network.js';
import { normalizeTransaction, normalizeTokenTransfer, normalizeWalletOverview } from './normalizers/wallet.js';
import { normalizeTokens, mergeTokenPrices } from './normalizers/tokens.js';
import { mergeAndClassifyTransactions, getTransactionSummary } from './normalizers/transactions.js';
import { calculateActivityScore } from './analysis/activityScore.js';
import { extractCounterparties } from './analysis/counterparties.js';
import { detectAttentionSignals } from './analysis/attentionSignals.js';

const router = Router();

/**
 * POST /api/investigate
 * Body: { address: string }
 * Returns: Structured investigation object with all wallet data and analysis.
 */
router.post('/investigate', async (req, res) => {
  try {
    const { address } = req.body;

    // Validate address format
    if (!address || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid EVM address' });
    }

    console.log(`[investigate] Starting investigation for ${address}`);

    // Step 1: Fetch all data in parallel where possible
    const [balanceData, rawTokens, txData, transferData, firstActivityData] = await Promise.allSettled([
      getWalletBalance(address),
      getTokenBalances(address),
      getWalletTransactions(address, 200000),
      getTokenTransfers(address, 200000),
      getFirstActivity(address),
    ]);

    // Log any failures for debugging
    if (balanceData.status === 'rejected') console.error('[investigate] Balance fetch failed:', balanceData.reason?.message);
    if (rawTokens.status === 'rejected') console.error('[investigate] Token fetch failed:', rawTokens.reason?.message);
    if (txData.status === 'rejected') console.error('[investigate] Transaction fetch failed:', txData.reason?.message);
    if (transferData.status === 'rejected') console.error('[investigate] Transfer fetch failed:', transferData.reason?.message);
    if (firstActivityData.status === 'rejected') console.error('[investigate] First activity fetch failed:', firstActivityData.reason?.message);

    // Extract results, use empty defaults on failure
    const balance = balanceData.status === 'fulfilled' ? balanceData.value : { balance: '0', balanceFormatted: '0' };
    const rawTokenList = rawTokens.status === 'fulfilled' ? rawTokens.value : [];
    const transactions = txData.status === 'fulfilled' ? txData.value.transactions : [];
    const tokenTransfers = transferData.status === 'fulfilled' ? transferData.value.transfers : [];

    console.log(`[investigate] Fetched: ${transactions.length} txs, ${tokenTransfers.length} transfers, ${rawTokenList.length} tokens`);

    // Step 2: Normalize data
    const normalizedTxs = transactions.map(normalizeTransaction);
    const normalizedTransfers = tokenTransfers.map(normalizeTokenTransfer);
    const normalizedTokens = normalizeTokens(rawTokenList);

    // Step 3: Merge and classify transactions
    const classifiedTxs = mergeAndClassifyTransactions(normalizedTxs, normalizedTransfers, address);

    // Step 4: Get market data for tokens
    const tokenAddresses = normalizedTokens
      .map((t) => t.contractAddress)
      .filter(Boolean);

    const [priceData, botPrice] = await Promise.all([
      tokenAddresses.length > 0
        ? getTokenPrices(tokenAddresses).catch(() => ({}))
        : Promise.resolve({}),
      getBotPrice().catch(() => null),
    ]);

    const tokensWithPrices = mergeTokenPrices(normalizedTokens, priceData, botPrice);

    // Step 5: Run analysis
    const balanceFormattedNum = Number(balance.balanceFormatted);
    const overview = normalizeWalletOverview(
      address,
      balance,
      normalizedTxs,
      normalizedTransfers,
      tokensWithPrices,
      firstActivityData.status === 'fulfilled' ? firstActivityData.value : null,
    );
    // USD value of the native BOT balance (null when CoinGecko unavailable).
    overview.balanceUsd =
      botPrice?.price && Number.isFinite(balanceFormattedNum)
        ? balanceFormattedNum * botPrice.price
        : null;
    const activityScore = calculateActivityScore({ transactions: classifiedTxs, walletAddress: address });
    const counterparties = extractCounterparties(classifiedTxs, address);
    const attentionSignals = detectAttentionSignals({ transactions: classifiedTxs, walletAddress: address, activityScore });
    const txSummary = getTransactionSummary(classifiedTxs);

    // Step 6: Build investigation object
    const investigation = {
      wallet: address,
      network: BOT_CHAIN_NAME,
      chainId: BOT_CHAIN_ID,
      overview,
      tokens: tokensWithPrices,
      transactions: classifiedTxs,
      transactionSummary: txSummary,
      counterparties: counterparties.slice(0, 20), // Top 20
      activityScore,
      attentionSignals,
      fetchedAt: Date.now(),
    };

    console.log(`[investigate] Complete: score=${activityScore.total}, ${counterparties.length} counterparties`);

    res.json(investigation);
  } catch (err) {
    console.error('[investigate] Error:', err);
    res.status(500).json({
      error: 'Investigation failed',
      message: err.message,
    });
  }
});

export default router;
