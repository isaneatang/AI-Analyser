/**
 * api/registry.js - Routes for the on-chain InvestigationRegistry.
 * GET  /api/registry/status              - contract config status
 * GET  /api/registry/reports/:wallet     - anchored report hashes for a wallet
 * POST /api/registry/anchor              - anchor a report hash on-chain
 * GET  /api/registry/snapshots/:wallet   - snapshot tokens minted for a wallet
 * GET  /api/registry/snapshot-at?ts=...  - snapshot at/before a timestamp
 * POST /api/registry/mint                - mint a snapshot NFT for a report
 */

import { Router } from 'express';
import {
  anchorReport,
  getReports,
  getRegistryAddress,
  getSnapshots,
  getSnapshotAtOrBefore,
  isRegistryConfigured,
  mintSnapshot,
} from './services/registry.js';

const router = Router();

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;
const BYTES32 = /^0x[0-9a-fA-F]{64}$/;

// GET /api/registry/status
router.get('/registry/status', (req, res) => {
  res.json({
    configured: isRegistryConfigured(),
    address: getRegistryAddress(),
  });
});

// GET /api/registry/reports/:wallet
router.get('/registry/reports/:wallet', async (req, res) => {
  const { wallet } = req.params;
  if (!EVM_ADDRESS.test(wallet)) {
    return res.status(400).json({ error: 'Invalid EVM address' });
  }
  if (!isRegistryConfigured()) {
    return res.status(503).json({ error: 'Registry contract not configured. Deploy and set REGISTRY_CONTRACT.' });
  }

  const reports = await getReports(wallet.toLowerCase());
  if (reports === null) {
    return res.status(500).json({ error: 'Failed to read the registry contract.' });
  }

  res.json({ address: getRegistryAddress(), reports });
});

// POST /api/registry/anchor
// Body: { wallet: string, summaryHash: string }
router.post('/registry/anchor', async (req, res) => {
  const { wallet, summaryHash } = req.body || {};
  if (!EVM_ADDRESS.test(wallet || '')) {
    return res.status(400).json({ error: 'Invalid EVM address' });
  }
  if (!BYTES32.test(summaryHash || '')) {
    return res.status(400).json({ error: 'summaryHash must be a 32-byte hex value (0x + 64 hex chars).' });
  }
  if (!isRegistryConfigured()) {
    return res.status(503).json({ error: 'Registry contract not configured. Deploy and set REGISTRY_CONTRACT.' });
  }

  try {
    const result = await anchorReport(wallet.toLowerCase(), summaryHash.toLowerCase());
    res.json({ address: getRegistryAddress(), ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Anchoring failed.' });
  }
});

// GET /api/registry/snapshots/:wallet
router.get('/registry/snapshots/:wallet', async (req, res) => {
  const { wallet } = req.params;
  if (!EVM_ADDRESS.test(wallet)) {
    return res.status(400).json({ error: 'Invalid EVM address' });
  }
  if (!isRegistryConfigured()) {
    return res.status(503).json({ error: 'Registry contract not configured. Deploy and set REGISTRY_CONTRACT.' });
  }

  const snapshots = await getSnapshots(wallet.toLowerCase());
  if (snapshots === null) {
    return res.status(500).json({ error: 'Failed to read snapshot tokens.' });
  }

  res.json({ address: getRegistryAddress(), snapshots });
});

// GET /api/registry/snapshot-at?ts=<unixSeconds>&wallet=<address>
// "Timestamp page": what was known about a wallet at or before the given time.
// Filters by wallet so snapshots from other wallets are excluded.
router.get('/registry/snapshot-at', async (req, res) => {
  const ts = Number(req.query.ts);
  if (!Number.isFinite(ts) || ts <= 0) {
    return res.status(400).json({ error: 'Provide a valid ts (unix seconds).' });
  }
  const wallet = (req.query.wallet || '').toLowerCase();
  if (wallet && !EVM_ADDRESS.test(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address.' });
  }
  if (!isRegistryConfigured()) {
    return res.status(503).json({ error: 'Registry contract not configured. Deploy and set REGISTRY_CONTRACT.' });
  }

  // If a wallet is specified, filter to only that wallet's snapshots
  // instead of using the global getSnapshotAtOrBefore which returns
  // the closest snapshot across ALL wallets.
  if (wallet) {
    const snapshots = await getSnapshots(wallet);
    if (snapshots === null) {
      return res.status(500).json({ error: 'Failed to query snapshots.' });
    }
    // Find the snapshot with the largest timestamp at or before ts
    let best = null;
    let bestDelta = Infinity;
    for (const s of snapshots) {
      if (s.timestamp <= ts) {
        const delta = ts - s.timestamp;
        if (delta < bestDelta) {
          bestDelta = delta;
          best = s;
        }
      }
    }
    return res.json({ address: getRegistryAddress(), snapshot: best, found: !!best });
  }

  // No wallet specified: fall back to global lookup (backwards compat)
  const result = await getSnapshotAtOrBefore(ts);
  if (result === null) {
    return res.status(500).json({ error: 'Failed to query snapshots.' });
  }

  res.json({ address: getRegistryAddress(), ...result });
});

// POST /api/registry/mint
// Body: { wallet: string, summaryHash: string, dataRef?: string }
router.post('/registry/mint', async (req, res) => {
  const { wallet, summaryHash, dataRef } = req.body || {};
  if (!EVM_ADDRESS.test(wallet || '')) {
    return res.status(400).json({ error: 'Invalid EVM address' });
  }
  if (!BYTES32.test(summaryHash || '')) {
    return res.status(400).json({ error: 'summaryHash must be a 32-byte hex value (0x + 64 hex chars).' });
  }
  if (typeof dataRef === 'string' && dataRef.length > 100000) {
    return res.status(400).json({ error: 'dataRef is too large (max 100k chars).' });
  }
  if (!isRegistryConfigured()) {
    return res.status(503).json({ error: 'Registry contract not configured. Deploy and set REGISTRY_CONTRACT.' });
  }

  try {
    const result = await mintSnapshot(wallet.toLowerCase(), summaryHash.toLowerCase(), dataRef || '');
    res.json({ address: getRegistryAddress(), ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Minting failed.' });
  }
});

export default router;