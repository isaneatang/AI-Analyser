/**
 * /api/chat - Chat endpoint for Ask the Wallet feature.
 * Receives a wallet address, question, and investigation context.
 * Returns AI answer with evidence references.
 */

import { Router } from 'express';
import { answerWalletQuestion, generateInvestigationReport, explainTransaction } from './ai/investigator.js';

const router = Router();

/**
 * POST /api/chat
 * Body: { question: string, investigation: object }
 * Returns: { answer: string }
 */
router.post('/chat', async (req, res) => {
  try {
    const { question, investigation } = req.body;

    if (!question || !investigation) {
      return res.status(400).json({ error: 'Question and investigation data required' });
    }

    console.log(`[chat] Question: "${question.slice(0, 80)}..."`);

    const answer = await answerWalletQuestion(question, investigation);

    res.json({ answer });
  } catch (err) {
    console.error('[chat] Error:', err);
    res.status(500).json({ error: 'Chat failed', message: err.message });
  }
});

/**
 * POST /api/investigate/report
 * Body: { investigation: object }
 * Returns: { report: string }
 */
router.post('/investigate/report', async (req, res) => {
  try {
    const { investigation } = req.body;

    if (!investigation) {
      return res.status(400).json({ error: 'Investigation data required' });
    }

    console.log(`[report] Generating AI report for ${investigation.wallet}`);

    const report = await generateInvestigationReport(investigation);

    res.json({ report });
  } catch (err) {
    console.error('[report] Error:', err);
    res.status(500).json({ error: 'Report generation failed', message: err.message });
  }
});

/**
 * POST /api/explain-transaction
 * Body: { transaction: object, investigation: object }
 * Returns: { explanation: string }
 */
router.post('/explain-transaction', async (req, res) => {
  try {
    const { transaction, investigation } = req.body;

    if (!transaction) {
      return res.status(400).json({ error: 'Transaction data required' });
    }

    const explanation = await explainTransaction(transaction, investigation);

    res.json({ explanation });
  } catch (err) {
    console.error('[explain] Error:', err);
    res.status(500).json({ error: 'Explanation failed', message: err.message });
  }
});

export default router;
