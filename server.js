/**
 * server.js - Express API server.
 * Handles all server-side API routes for blockchain data, AI, and market data.
 * Secret API keys (Moralis, CoinGecko, Gemini) are only used here.
 *
 * In development, Vite runs on port 5173 and this server on port 3001.
 * Vite proxies /api requests to this server.
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import investigateRouter from './api/investigate.js';
import chatRouter from './api/chat.js';
import crosschainRouter from './api/crosschain.js';
import registryRouter from './api/registry.js';
import { BOT_CHAIN_ID, BOT_CHAIN_NAME } from './api/config/network.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    chain: BOT_CHAIN_NAME,
    chainId: BOT_CHAIN_ID,
  });
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

// Start server
app.listen(PORT, () => {
  console.log(`[server] API running on http://localhost:${PORT}`);
  console.log(`[server] ${BOT_CHAIN_NAME} (chain ${BOT_CHAIN_ID})`);
});
