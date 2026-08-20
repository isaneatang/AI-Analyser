/**
 * Activity score calculator.
 * Deterministic 0-100 score based on measurable wallet behavior.
 * The algorithm lives entirely in application code. Gemini does NOT calculate this.
 *
 * Factors:
 * - Transaction frequency (0-30)
 * - Active days (0-20)
 * - Contract interactions (0-15)
 * - Counterparty diversity (0-15)
 * - Recency of activity (0-10)
 * - Failed transaction penalty (-10 max)
 */

/**
 * Calculate the activity score for a wallet.
 * @param {Object} params
 * @param {Array} params.transactions - Classified transactions.
 * @param {string} params.walletAddress - The wallet address.
 * @returns {Object} Score breakdown with total and individual factors.
 */
export function calculateActivityScore({ transactions, walletAddress }) {
  const factors = [];

  // --- Transaction frequency (0-30) ---
  const txCount = transactions.length;
  let freqScore;
  if (txCount >= 100) freqScore = 30;
  else if (txCount >= 50) freqScore = 25;
  else if (txCount >= 20) freqScore = 20;
  else if (txCount >= 10) freqScore = 15;
  else if (txCount >= 5) freqScore = 10;
  else if (txCount >= 1) freqScore = 5;
  else freqScore = 0;

  factors.push({
    label: 'Transaction Frequency',
    score: freqScore,
    max: 30,
    detail: `${txCount} transactions`,
  });

  // --- Active days (0-20) ---
  const uniqueDays = new Set();
  transactions.forEach((tx) => {
    if (tx.timestamp) {
      const ts = Number(tx.timestamp);
      if (ts > 0 && ts < 9999999999) {
        const day = new Date(ts * 1000).toISOString().split('T')[0];
        uniqueDays.add(day);
      }
    }
  });
  const activeDays = uniqueDays.size;
  let daysScore;
  if (activeDays >= 30) daysScore = 20;
  else if (activeDays >= 14) daysScore = 16;
  else if (activeDays >= 7) daysScore = 12;
  else if (activeDays >= 3) daysScore = 8;
  else if (activeDays >= 1) daysScore = 4;
  else daysScore = 0;

  factors.push({
    label: 'Active Days',
    score: daysScore,
    max: 20,
    detail: `${activeDays} unique days`,
  });

  // --- Contract interactions (0-15) ---
  const contractTxs = transactions.filter((tx) => tx.type === 'CONTRACT_INTERACTION');
  const contractCount = contractTxs.length;
  let contractScore;
  if (contractCount >= 20) contractScore = 15;
  else if (contractCount >= 10) contractScore = 12;
  else if (contractCount >= 5) contractScore = 9;
  else if (contractCount >= 2) contractScore = 6;
  else if (contractCount >= 1) contractScore = 3;
  else contractScore = 0;

  factors.push({
    label: 'Contract Interactions',
    score: contractScore,
    max: 15,
    detail: `${contractCount} contract calls`,
  });

  // --- Counterparty diversity (0-15) ---
  const counterparties = new Set();
  transactions.forEach((tx) => {
    if (tx.from && tx.from.toLowerCase() !== walletAddress.toLowerCase()) {
      counterparties.add(tx.from.toLowerCase());
    }
    if (tx.to && tx.to.toLowerCase() !== walletAddress.toLowerCase()) {
      counterparties.add(tx.to.toLowerCase());
    }
  });
  const counterpartyCount = counterparties.size;
  let diversityScore;
  if (counterpartyCount >= 20) diversityScore = 15;
  else if (counterpartyCount >= 10) diversityScore = 12;
  else if (counterpartyCount >= 5) diversityScore = 9;
  else if (counterpartyCount >= 3) diversityScore = 6;
  else if (counterpartyCount >= 1) diversityScore = 3;
  else diversityScore = 0;

  factors.push({
    label: 'Counterparty Diversity',
    score: diversityScore,
    max: 15,
    detail: `${counterpartyCount} unique addresses`,
  });

  // --- Recency (0-10) ---
  const timestamps = transactions
    .map((tx) => Number(tx.timestamp))
    .filter((t) => t > 0 && t < 9999999999);
  let recencyScore = 0;
  if (timestamps.length > 0) {
    const latest = Math.max(...timestamps);
    const daysSinceLastTx = (Date.now() / 1000 - latest) / 86400;
    if (daysSinceLastTx <= 1) recencyScore = 10;
    else if (daysSinceLastTx <= 7) recencyScore = 8;
    else if (daysSinceLastTx <= 30) recencyScore = 6;
    else if (daysSinceLastTx <= 90) recencyScore = 3;
    else recencyScore = 1;
  }

  factors.push({
    label: 'Recent Activity',
    score: recencyScore,
    max: 10,
    detail: timestamps.length > 0
      ? `Last activity ${Math.floor((Date.now() / 1000 - Math.max(...timestamps)) / 86400)}d ago`
      : 'No activity',
  });

  // --- Total ---
  const total = factors.reduce((sum, f) => sum + f.score, 0);

  return {
    total: Math.min(100, Math.max(0, total)),
    factors,
  };
}
