/**
 * Wallet data normalizer.
 * Converts Moralis/RPC wallet data into stable application structures.
 * Handles both Moralis format (from_address) and raw RPC format (from).
 */

/**
 * Convert a raw timestamp into unix seconds.
 * Accepts unix seconds, unix milliseconds, ISO date strings, and numeric
 * strings (as produced by the RPC service). Returns null when unparseable.
 * This prevents NaN timestamps and the "wallets shown as created today" bug.
 * @param {number|string} value - Raw timestamp from Moralis or RPC.
 * @returns {number|null} Unix seconds or null.
 */
export function toSeconds(value) {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return Math.floor(value >= 1e12 ? value / 1000 : value);
  }

  const str = String(value).trim();
  // Plain numeric string (seconds or milliseconds)
  if (/^\d+$/.test(str)) {
    const num = Number(str);
    if (!Number.isFinite(num)) return null;
    return Math.floor(num >= 1e12 ? num / 1000 : num);
  }

  const date = new Date(str);
  if (isNaN(date.getTime())) return null;
  return Math.floor(date.getTime() / 1000);
}

/**
 * Normalize raw transaction data into application format.
 * Works with both Moralis API and raw RPC transaction objects.
 * @param {Object} raw - Raw transaction from Moralis or RPC.
 * @returns {Object} Normalized transaction.
 */
export function normalizeTransaction(raw) {
  return {
    hash: raw.hash || raw.transaction_hash || null,
    from: (raw.from_address || raw.from || '').toLowerCase(),
    to: (raw.to_address || raw.to || '').toLowerCase(),
    value: raw.value || '0',
    gasUsed: raw.gas || raw.gas_used || raw.receipt_gas_used || null,
    gasPrice: raw.gas_price || null,
    blockNumber: raw.block_number || raw.blockNumber || null,
    timestamp: toSeconds(raw.block_timestamp || raw.timestamp),
    status: raw.receipt_status || raw.status || null,
    nonce: raw.nonce || null,
    _raw: raw,
  };
}

/**
 * Normalize raw token transfer data.
 * @param {Object} raw - Raw token transfer from Moralis or RPC logs.
 * @returns {Object} Normalized token transfer.
 */
export function normalizeTokenTransfer(raw) {
  return {
    hash: raw.transaction_hash || raw.hash || null,
    from: (raw.from_address || raw.from || '').toLowerCase(),
    to: (raw.to_address || raw.to || '').toLowerCase(),
    value: raw.value || '0',
    tokenName: raw.token_name || raw.name || null,
    tokenSymbol: raw.token_symbol || raw.symbol || null,
    tokenDecimals: raw.token_decimals || raw.decimals || '18',
    tokenAddress: raw.address || raw.contract_address || raw.token_address || null,
    blockNumber: raw.block_number || raw.blockNumber || null,
    timestamp: toSeconds(raw.block_timestamp || raw.timestamp),
    _raw: raw,
  };
}

/**
 * Create a normalized wallet overview from collected data.
 * @param {string} address - The wallet address.
 * @param {Object} balanceData - Native balance data.
 * @param {Array} transactions - Normalized transactions.
 * @param {Array} tokenTransfers - Normalized token transfers.
 * @param {Array} tokens - Token balances.
 * @param {number|null} earliestActivity - Optional chain-wide first activity
 *   (unix seconds) from a full-chain search. Used to correct the wallet age
 *   when the recent block scan misses very old history.
 * @returns {Object} Normalized wallet overview.
 */
export function normalizeWalletOverview(address, balanceData, transactions, tokenTransfers, tokens, earliestActivity = null) {
  const allTimestamps = [
    ...transactions.map((t) => t.timestamp).filter(Boolean),
    ...tokenTransfers.map((t) => t.timestamp).filter(Boolean),
  ];

  // Sort numerically, not lexicographically. String sort broke the first/last
  // activity order because timestamps were being compared as text.
  allTimestamps.sort((a, b) => a - b);
  const scannedFirst = allTimestamps.length > 0 ? allTimestamps[0] : null;
  const lastActivity = allTimestamps.length > 0 ? allTimestamps[allTimestamps.length - 1] : null;

  // Prefer the earliest known activity: chain-wide search wins over the
  // recent-block scan whenever it finds something older.
  const firstActivity = earliestActivity && scannedFirst
    ? Math.min(Number(earliestActivity), Number(scannedFirst))
    : (earliestActivity ?? scannedFirst);

  const counterparties = new Set();
  transactions.forEach((t) => {
    if (t.from && t.from !== address.toLowerCase()) counterparties.add(t.from);
    if (t.to && t.to !== address.toLowerCase()) counterparties.add(t.to);
  });
  tokenTransfers.forEach((t) => {
    if (t.from && t.from !== address.toLowerCase()) counterparties.add(t.from);
    if (t.to && t.to !== address.toLowerCase()) counterparties.add(t.to);
  });

  return {
    address,
    balance: balanceData.balance,
    balanceFormatted: balanceData.balanceFormatted,
    transactionCount: transactions.length,
    tokenTransferCount: tokenTransfers.length,
    tokenCount: tokens.length,
    contractInteractions: counterparties.size,
    firstActivity: firstActivity !== null && firstActivity !== undefined ? Number(firstActivity) : null,
    lastActivity: lastActivity !== null && lastActivity !== undefined ? Number(lastActivity) : null,
    // null (not 0) means "no activity found", which the UI renders as Unknown
    // instead of incorrectly claiming the wallet was created today.
    walletAgeDays: firstActivity
      ? Math.max(0, Math.floor((Date.now() / 1000 - Number(firstActivity)) / 86400))
      : null,
  };
}
