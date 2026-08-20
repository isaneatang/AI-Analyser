/**
 * Transaction normalizer.
 * Merges native transactions and token transfers into a unified timeline.
 * Applies deterministic classification to each transaction.
 */

import { classifyTransaction } from '../analysis/transactionClassifier.js';

/**
 * Merge native transactions and token transfers into a single sorted list.
 * @param {Array} transactions - Normalized native transactions.
 * @param {Array} tokenTransfers - Normalized token transfers.
 * @param {string} walletAddress - The investigated wallet address.
 * @returns {Array} Merged and sorted transaction list with classifications.
 */
export function mergeAndClassifyTransactions(transactions, tokenTransfers, walletAddress) {
  const merged = [];

  // Process native transactions
  for (const tx of transactions) {
    const isIncoming = tx.to && tx.to.toLowerCase() === walletAddress.toLowerCase();
    const isOutgoing = tx.from && tx.from.toLowerCase() === walletAddress.toLowerCase();

    merged.push({
      ...tx,
      direction: isIncoming ? 'incoming' : isOutgoing ? 'outgoing' : 'unknown',
      valueUsd: null, // Filled later if price data available
    });
  }

  // Process token transfers
  for (const transfer of tokenTransfers) {
    const isIncoming = transfer.to && transfer.to.toLowerCase() === walletAddress.toLowerCase();
    const isOutgoing = transfer.from && transfer.from.toLowerCase() === walletAddress.toLowerCase();

    merged.push({
      hash: transfer.hash,
      from: transfer.from,
      to: transfer.to,
      value: transfer.value,
      tokenName: transfer.tokenName,
      tokenSymbol: transfer.tokenSymbol,
      tokenDecimals: transfer.tokenDecimals,
      tokenAddress: transfer.tokenAddress,
      blockNumber: transfer.blockNumber,
      timestamp: transfer.timestamp,
      direction: isIncoming ? 'incoming' : isOutgoing ? 'outgoing' : 'unknown',
      isTokenTransfer: true,
      _raw: transfer._raw,
    });
  }

  // Sort by timestamp (newest first)
  merged.sort((a, b) => {
    const timeA = Number(a.timestamp) || 0;
    const timeB = Number(b.timestamp) || 0;
    return timeB - timeA;
  });

  // Apply deterministic classification
  for (const tx of merged) {
    tx.type = classifyTransaction(tx, walletAddress);
  }

  return merged;
}

/**
 * Get summary stats from a transaction list.
 * @param {Array} transactions - Classified transactions.
 * @returns {Object} Summary statistics.
 */
export function getTransactionSummary(transactions) {
  let incoming = 0;
  let outgoing = 0;
  let tokenTransfers = 0;
  let contractInteractions = 0;

  for (const tx of transactions) {
    if (tx.direction === 'incoming') incoming++;
    if (tx.direction === 'outgoing') outgoing++;
    if (tx.isTokenTransfer) tokenTransfers++;
    if (tx.type === 'CONTRACT_INTERACTION') contractInteractions++;
  }

  return {
    total: transactions.length,
    incoming,
    outgoing,
    tokenTransfers,
    contractInteractions,
  };
}
