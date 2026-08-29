/**
 * server.js - Express API server.
 * Handles all server-side API routes for blockchain data, AI, and market data.
 * Secret provider keys are only used by server-side services.
 *
 * In development, Vite runs on port 5173 and this server on port 3001.
 * On Vercel, this file is imported as a serverless function.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import investigateRouter from './server/investigate.js';
import chatRouter from './server/chat.js';
import crosschainRouter from './server/crosschain.js';
import registryRouter from './server/registry.js';
import { BOT_CHAIN_ID, BOT_CHAIN_NAME } from './server/config/network.js';
import { getChainId } from './server/services/rpc.js';

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const rpcChainId = Number.parseInt(await getChainId(), 16);
    const healthy = rpcChainId === BOT_CHAIN_ID;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'error',
      chain: BOT_CHAIN_NAME,
      chainId: BOT_CHAIN_ID,
      rpc: healthy ? 'online' : 'wrong_chain',
    });
  } catch {
    res.status(503).json({
      status: 'error',
      chain: BOT_CHAIN_NAME,
      chainId: BOT_CHAIN_ID,
      rpc: 'offline',
    });
  }
});

// API routes
app.use('/api', investigateRouter);
app.use('/api', chatRouter);
app.use('/api', crosschainRouter);
app.use('/api', registryRouter);

// Error handler
app.use((err, req, res, next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel serverless (imported by api/index.js)
export default app;

// Start server in development (not on Vercel)
const PORT = process.env.PORT || 3001;

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`[server] API running on http://localhost:${PORT}`);
    console.log(`[server] ${BOT_CHAIN_NAME} (chain ${BOT_CHAIN_ID})`);
  });
}
