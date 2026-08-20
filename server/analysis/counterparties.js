/**
 * Counterparty analyzer.
 * Extracts addresses that the wallet interacts with.
 * Classifies them by interaction pattern (wallet, contract, DEX, etc.).
 * Never claims an address belongs to a specific protocol without evidence.
 */

/**
 * Extract counterparties from a list of classified transactions.
 * @param {Array} transactions - Classified transactions.
 * @param {string} walletAddress - The investigated wallet address.
 * @returns {Array} Array of counterparty objects sorted by interaction count.
 */
export function extractCounterparties(transactions, walletAddress) {
  const map = new Map();
  const lowerWallet = walletAddress.toLowerCase();

  for (const tx of transactions) {
    // Process 'from' address
    if (tx.from && tx.from.toLowerCase() !== lowerWallet) {
      const addr = tx.from.toLowerCase();
      if (!map.has(addr)) {
        map.set(addr, {
          address: tx.from,
          interactions: 0,
          firstInteraction: tx.timestamp,
          lastInteraction: tx.timestamp,
          incoming: 0,
          outgoing: 0,
          assets: new Set(),
          isContract: false,
        });
      }
      const cp = map.get(addr);
      cp.interactions++;
      cp.outgoing++;
      if (tx.tokenSymbol) cp.assets.add(tx.tokenSymbol);
      // Update timestamps
      if (tx.timestamp && (!cp.firstInteraction || tx.timestamp < cp.firstInteraction)) {
        cp.firstInteraction = tx.timestamp;
      }
      if (tx.timestamp && (!cp.lastInteraction || tx.timestamp > cp.lastInteraction)) {
        cp.lastInteraction = tx.timestamp;
      }
    }

    // Process 'to' address
    if (tx.to && tx.to.toLowerCase() !== lowerWallet) {
      const addr = tx.to.toLowerCase();
      if (!map.has(addr)) {
        map.set(addr, {
          address: tx.to,
          interactions: 0,
          firstInteraction: tx.timestamp,
          lastInteraction: tx.timestamp,
          incoming: 0,
          outgoing: 0,
          assets: new Set(),
          isContract: false,
        });
      }
      const cp = map.get(addr);
      cp.interactions++;
      cp.incoming++;
      if (tx.tokenSymbol) cp.assets.add(tx.tokenSymbol);
      if (tx.timestamp && (!cp.firstInteraction || tx.timestamp < cp.firstInteraction)) {
        cp.firstInteraction = tx.timestamp;
      }
      if (tx.timestamp && (!cp.lastInteraction || tx.timestamp > cp.lastInteraction)) {
        cp.lastInteraction = tx.timestamp;
      }
    }
  }

  // Classify and convert Sets to arrays
  const result = Array.from(map.values())
    .map((cp) => ({
      ...cp,
      assets: Array.from(cp.assets),
      classification: classifyCounterparty(cp),
    }))
    .sort((a, b) => b.interactions - a.interactions);

  return result;
}

/**
 * Classify a counterparty by interaction pattern.
 * Evidence-based only. Never guesses protocol names.
 * @param {Object} counterparty - Counterparty data.
 * @returns {string} Classification label.
 */
function classifyCounterparty(cp) {
  // Contracts typically receive many interactions and have no outgoing transfers
  if (cp.incoming > 5 && cp.outgoing === 0) return 'Contract';
  if (cp.interactions >= 3 && cp.assets.length === 0) return 'Contract';

  // Default to Unknown for EOAs
  return 'Unknown';
}
