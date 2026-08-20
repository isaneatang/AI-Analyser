/**
 * AI Investigator.
 * Takes normalized investigation data and creates compact evidence packages.
 * Sends relevant context to Gemini for interpretation.
 * Does NOT fetch blockchain data. Works only with what it receives.
 */

import { askGemini, isGeminiAvailable } from '../services/gemini.js';
import { INVESTIGATION_PROMPT, CHAT_PROMPT, TRANSACTION_PROMPT } from './prompts.js';

/**
 * Create a compact evidence summary for AI analysis.
 * Extracts only the relevant data, not the entire raw dataset.
 * @param {Object} investigation - Full investigation data.
 * @returns {string} Compact evidence string for Gemini.
 */
function createEvidencePackage(investigation) {
  const { overview, transactions, tokens, counterparties, activityScore } = investigation;

  const lines = [];

  lines.push(`Wallet: ${overview.address}`);
  lines.push(`Network: BOT Chain Testnet (chain 968)`);
  lines.push(`Balance: ${overview.balanceFormatted} BOT`);
  lines.push(`Transactions found: ${overview.transactionCount}`);
  lines.push(`Token transfers found: ${overview.tokenTransferCount}`);
  lines.push(`Active counterparties: ${overview.contractInteractions}`);

  if (activityScore) {
    lines.push(`\nActivity Score: ${activityScore.total}/100`);
    for (const f of activityScore.factors) {
      lines.push(`  ${f.label}: ${f.score}/${f.max} (${f.detail})`);
    }
  }

  if (tokens.length > 0) {
    lines.push(`\nToken Holdings:`);
    for (const t of tokens.slice(0, 10)) {
      lines.push(`  ${t.symbol} (${t.name}): ${t.balance} tokens`);
    }
  }

  if (counterparties.length > 0) {
    lines.push(`\nTop Counterparties:`);
    for (const cp of counterparties.slice(0, 10)) {
      lines.push(`  ${cp.address}: ${cp.interactions} interactions (${cp.classification})`);
    }
  }

  if (transactions.length > 0) {
    lines.push(`\nRecent Transactions:`);
    for (const tx of transactions.slice(0, 15)) {
      let ts = 'unknown date';
      if (tx.timestamp) {
        const t = Number(tx.timestamp);
        if (t > 0 && t < 9999999999) {
          const d = new Date(t * 1000);
          if (!isNaN(d.getTime())) ts = d.toISOString().split('T')[0];
        }
      }
      const val = tx.isTokenTransfer
        ? `${tx.value} ${tx.tokenSymbol || 'tokens'}`
        : `${Number(tx.value) / 1e18} BOT`;
      lines.push(`  ${tx.direction} ${val} | ${tx.type} | ${ts}`);
    }
  }

  return lines.join('\n');
}

/**
 * Generate an AI investigation report for a wallet.
 * @param {Object} investigation - Full investigation data.
 * @returns {Promise<string>} AI analysis text.
 */
export async function generateInvestigationReport(investigation) {
  if (!isGeminiAvailable()) {
    return 'AI analysis is not available. Set GEMINI_API_KEY to enable this feature.';
  }

  const evidence = createEvidencePackage(investigation);
  const userMessage = `Analyze this BOT Chain wallet based on the following blockchain evidence:\n\n${evidence}`;

  return askGemini(INVESTIGATION_PROMPT, userMessage);
}

/**
 * Answer a question about the investigated wallet.
 * Selects relevant evidence based on the question, then asks Gemini.
 * @param {string} question - User's question.
 * @param {Object} investigation - Full investigation data.
 * @returns {Promise<string>} AI answer with evidence references.
 */
export async function answerWalletQuestion(question, investigation) {
  if (!isGeminiAvailable()) {
    return 'AI chat is not available. Set GEMINI_API_KEY to enable this feature.';
  }

  // Create a focused evidence package based on the question
  const evidence = createEvidencePackage(investigation);
  const userMessage = `Question: ${question}\n\nWallet Evidence:\n${evidence}`;

  return askGemini(CHAT_PROMPT, userMessage);
}

/**
 * Explain a specific transaction.
 * @param {Object} transaction - Transaction data.
 * @param {Object} investigation - Investigation context.
 * @returns {Promise<string>} AI explanation.
 */
export async function explainTransaction(transaction, investigation) {
  if (!isGeminiAvailable()) {
    return 'AI explanation is not available. Set GEMINI_API_KEY to enable this feature.';
  }

  const txDetails = [
    `Hash: ${transaction.hash}`,
    `From: ${transaction.from}`,
    `To: ${transaction.to || 'contract creation'}`,
    `Value: ${Number(transaction.value) / 1e18} BOT`,
    `Type: ${transaction.type}`,
    `Status: ${transaction.status === '0x1' ? 'Success' : 'Failed'}`,
    `Timestamp: ${transaction.timestamp ? new Date(Number(transaction.timestamp) * 1000).toISOString() : 'unknown'}`,
    transaction.isTokenTransfer ? `Token: ${transaction.tokenSymbol} (${transaction.tokenName})` : '',
    transaction.isTokenTransfer ? `Token Value: ${transaction.value}` : '',
  ].filter(Boolean).join('\n');

  return askGemini(TRANSACTION_PROMPT, `Explain this transaction:\n\n${txDetails}`);
}
