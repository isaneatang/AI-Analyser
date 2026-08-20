/**
 * Attention signal detector.
 * Identifies measurable unusual wallet behavior from blockchain evidence.
 * All signals are deterministic and evidence-based.
 * Gemini may explain a signal but must NOT invent one.
 *
 * Signal types:
 * - LARGE_TRANSFER: Outgoing transfer significantly above average
 * - ACTIVITY_SPIKE: Sudden increase in transaction frequency
 * - NEW_CONTRACT: First interaction with a contract address
 * - RAPID_MOVEMENT: Multiple transactions in short time window
 * - FAILED_SPIKE: Unusually high failed transaction rate
 * - UNKNOWN_CONTRACT: Interaction with unclassified contract
 */

/**
 * Detect attention signals from classified transactions.
 * @param {Object} params
 * @param {Array} params.transactions - Classified transactions.
 * @param {string} params.walletAddress - The investigated wallet.
 * @param {Object} params.activityScore - Activity score data.
 * @returns {Array} Array of signal objects sorted by severity.
 */
export function detectAttentionSignals({ transactions, walletAddress, activityScore }) {
  const signals = [];
  const lowerWallet = walletAddress.toLowerCase();

  // --- Large Transfer Detection ---
  const outgoingNative = transactions.filter(
    (tx) =>
      tx.direction === 'outgoing' &&
      !tx.isTokenTransfer &&
      Number(tx.value) > 0
  );

  if (outgoingNative.length >= 2) {
    const values = outgoingNative.map((tx) => Number(tx.value));
    const avg = values.reduce((s, v) => s + v, 0) / values.length;
    const maxVal = Math.max(...values);
    const maxTx = outgoingNative.find((tx) => Number(tx.value) === maxVal);

    if (maxVal > avg * 3 && maxVal > 1e18) {
      signals.push({
        type: 'LARGE_TRANSFER',
        severity: maxVal > avg * 10 ? 'HIGH' : 'MEDIUM',
        reason: `This transaction (${formatEth(maxVal)} BOT) is significantly larger than the wallet's average outgoing transfer (${formatEth(avg)} BOT).`,
        evidenceType: 'transaction',
        evidenceHash: maxTx?.hash || null,
        timestamp: maxTx?.timestamp || null,
      });
    }
  }

  // --- Activity Spike Detection ---
  // Check if recent 24h has more txs than average daily rate
  const now = Date.now() / 1000;
  const last24h = transactions.filter(
    (tx) => tx.timestamp && now - Number(tx.timestamp) < 86400
  );
  const last7d = transactions.filter(
    (tx) => tx.timestamp && now - Number(tx.timestamp) < 604800
  );

  if (last7d.length > 0) {
    const avgDaily = last7d.length / 7;
    if (last24h.length > avgDaily * 3 && last24h.length >= 5) {
      signals.push({
        type: 'ACTIVITY_SPIKE',
        severity: last24h.length > avgDaily * 5 ? 'HIGH' : 'MEDIUM',
        reason: `The wallet had ${last24h.length} transactions in the last 24 hours, compared to an average of ${avgDaily.toFixed(1)} per day over the past week.`,
        evidenceType: 'metric',
        evidenceHash: null,
        timestamp: null,
      });
    }
  }

  // --- New Contract Interaction ---
  const contractAddresses = new Map();
  transactions.forEach((tx) => {
    if (tx.to && tx.type === 'CONTRACT_INTERACTION') {
      const addr = tx.to.toLowerCase();
      if (!contractAddresses.has(addr)) {
        contractAddresses.set(addr, tx);
      }
    }
  });

  // Check for contracts only interacted with very recently
  for (const [addr, firstTx] of contractAddresses) {
    if (firstTx.timestamp && now - Number(firstTx.timestamp) < 86400 * 3) {
      const totalInteractions = transactions.filter(
        (tx) => tx.to?.toLowerCase() === addr
      ).length;
      if (totalInteractions <= 2) {
        signals.push({
          type: 'NEW_CONTRACT',
          severity: 'LOW',
          reason: `New contract interaction detected: ${firstTx.to}. First interaction within the last 3 days with only ${totalInteractions} total calls.`,
          evidenceType: 'transaction',
          evidenceHash: firstTx.hash || null,
          timestamp: firstTx.timestamp || null,
        });
      }
    }
  }

  // --- Rapid Fund Movement ---
  // Multiple outgoing transactions within 1 hour
  const outgoingAll = transactions
    .filter((tx) => tx.direction === 'outgoing' && tx.timestamp)
    .sort((a, b) => Number(a.timestamp) - Number(b.timestamp));

  for (let i = 0; i < outgoingAll.length - 2; i++) {
    const window = outgoingAll.slice(i, i + 3);
    const timeSpan = Number(window[2].timestamp) - Number(window[0].timestamp);
    if (timeSpan < 3600 && timeSpan > 0) {
      const totalMoved = window.reduce((s, tx) => s + Number(tx.value), 0);
      signals.push({
        type: 'RAPID_MOVEMENT',
        severity: totalMoved > 10e18 ? 'HIGH' : 'MEDIUM',
        reason: `3 outgoing transactions within ${Math.round(timeSpan / 60)} minutes, moving a total of ${formatEth(totalMoved)} BOT.`,
        evidenceType: 'transaction',
        evidenceHash: window[0].hash || null,
        timestamp: window[0].timestamp || null,
      });
      break; // Only report once
    }
  }

  // --- Failed Transaction Spike ---
  const failedTxs = transactions.filter((tx) => tx.status === '0x0' || tx.status === 'failed');
  if (transactions.length >= 5 && failedTxs.length >= 3) {
    const failRate = (failedTxs.length / transactions.length) * 100;
    if (failRate > 20) {
      signals.push({
        type: 'FAILED_SPIKE',
        severity: failRate > 50 ? 'HIGH' : 'MEDIUM',
        reason: `${failedTxs.length} out of ${transactions.length} transactions failed (${failRate.toFixed(0)}% failure rate).`,
        evidenceType: 'metric',
        evidenceHash: null,
        timestamp: null,
      });
    }
  }

  // --- Unknown Contract Interaction ---
  const unknownContracts = transactions.filter(
    (tx) => tx.to && tx.type === 'CONTRACT_INTERACTION' && !tx.tokenSymbol
  );
  if (unknownContracts.length > 0) {
    const uniqueUnknown = new Set(unknownContracts.map((tx) => tx.to.toLowerCase()));
    if (uniqueUnknown.size >= 2) {
      signals.push({
        type: 'UNKNOWN_CONTRACT',
        severity: 'LOW',
        reason: `The wallet interacted with ${uniqueUnknown.size} contract addresses that could not be identified as known tokens or protocols.`,
        evidenceType: 'transaction',
        evidenceHash: unknownContracts[0]?.hash || null,
        timestamp: unknownContracts[0]?.timestamp || null,
      });
    }
  }

  // Sort by severity: HIGH first
  const severityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return signals.sort((a, b) => (severityOrder[a.severity] || 2) - (severityOrder[b.severity] || 2));
}

/**
 * Format wei value to human-readable ETH/BOT string.
 * @param {number|string} wei - Value in wei.
 * @returns {string} Formatted string.
 */
function formatEth(wei) {
  const val = Number(wei) / 1e18;
  if (val >= 1000) return val.toFixed(0);
  if (val >= 1) return val.toFixed(2);
  return val.toFixed(4);
}
