/**
 * Transaction classifier.
 * Deterministic classification using on-chain evidence.
 * Uses input data, contract detection, and log analysis.
 */

/**
 * Classify a transaction into a deterministic type.
 * @param {Object} tx - Normalized transaction with enriched RPC data.
 * @param {string} walletAddress - The investigated wallet address.
 * @returns {string} Transaction type.
 */
export function classifyTransaction(tx, walletAddress) {
  // Token transfers are already identified by the normalizer
  if (tx.isTokenTransfer) {
    return 'TOKEN_TRANSFER';
  }

  // Has token info from logs
  if (tx.tokenInfo || tx.tokenAddress) {
    return 'TOKEN_TRANSFER';
  }

  // Contract creation (no 'to' address)
  if (tx.contractCreation || (!tx.to && !tx.toIsContract)) {
    return 'CONTRACT_INTERACTION';
  }

  // Has input data beyond just 0x = contract call
  if (tx.isContractCall || tx.toIsContract) {
    // Check log count for swap-like patterns
    if (tx.logCount >= 3) {
      return 'SWAP';
    }
    return 'CONTRACT_INTERACTION';
  }

  // Native value transfer (no contract involvement)
  const value = Number(tx.value) || 0;
  if (value > 0) {
    return 'TRANSFER';
  }

  // Zero value, no contract, no data
  if (tx.from && tx.to) {
    return 'TRANSFER';
  }

  return 'UNKNOWN';
}

/**
 * Get a human-readable label for a transaction type.
 * @param {string} type - Transaction type.
 * @returns {string} Display label.
 */
export function getTransactionTypeLabel(type) {
  const labels = {
    TRANSFER: 'Native Transfer',
    TOKEN_TRANSFER: 'Token Transfer',
    CONTRACT_INTERACTION: 'Contract Call',
    SWAP: 'Swap',
    NFT: 'NFT Activity',
    UNKNOWN: 'Transaction',
  };
  return labels[type] || 'Transaction';
}
