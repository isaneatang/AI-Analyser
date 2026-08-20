/**
 * api/services/registry.js - InvestigationRegistry on-chain service.
 * Reads anchored report hashes from the deployed InvestigationRegistry
 * contract via eth_call, and anchors new hashes using a funded private key.
 *
 * Env vars:
 *   REGISTRY_CONTRACT - deployed contract address (optional until deployed)
 *   BOT_PRIVATE_KEY    - funded BOT Chain key that pays anchor gas fees
 *
 * Every function degrades gracefully (returns null / friendly errors) when
 * the contract is not configured yet.
 */

import { defineChain, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { REGISTRY_ABI } from '../../shared/registryAbi.js';
import { BOT_RPC_URL, BOT_CHAIN_ID, BOT_CHAIN_NAME, BOT_CURRENCY } from '../config/network.js';

const RPC_URL = BOT_RPC_URL;
const REGISTRY_ADDRESS = process.env.REGISTRY_CONTRACT || '';
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY || '';

const botChain = defineChain({
  id: BOT_CHAIN_ID,
  name: BOT_CHAIN_NAME,
  nativeCurrency: BOT_CURRENCY,
  rpcUrls: { default: { http: [RPC_URL] } },
});

const publicClient = RPC_URL
  ? createPublicClient({ chain: botChain, transport: http(RPC_URL) })
  : null;

/** @returns {string|null} Deployed registry address, or null. */
export function getRegistryAddress() {
  return /^0x[0-9a-fA-F]{40}$/.test(REGISTRY_ADDRESS) ? REGISTRY_ADDRESS : null;
}

/** @returns {boolean} True when the contract address is configured. */
export function isRegistryConfigured() {
  return !!getRegistryAddress() && !!publicClient;
}

/**
 * Read all anchored reports for a wallet.
 * @param {string} wallet - Wallet address.
 * @returns {Promise<Array|null>} Reports or null when not configured/errored.
 */
export async function getReports(wallet) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !publicClient) return null;

  try {
    const reports = await publicClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getReports',
      args: [wallet],
    });

    return (reports || []).map((r) => ({
      summaryHash: r.summaryHash,
      timestamp: Number(r.timestamp),
      investigator: r.investigator,
    }));
  } catch (err) {
    console.error('[registry] getReports error:', err.message);
    return null;
  }
}

/**
 * Read all snapshot tokens minted for a wallet.
 * @param {string} wallet - Wallet address.
 * @returns {Promise<Array|null>} Snapshots or null when not configured/errored.
 */
export async function getSnapshots(wallet) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !publicClient) return null;

  try {
    const tokenIds = await publicClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'snapshotsOf',
      args: [wallet],
    });

    const results = await Promise.allSettled(
      (tokenIds || []).map((id) =>
        publicClient.readContract({
          address: registryAddress,
          abi: REGISTRY_ABI,
          functionName: 'snapshotOf',
          args: [id],
        })
      )
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => normalizeSnapshot(r.value));
  } catch (err) {
    console.error('[registry] getSnapshots error:', err.message);
    return null;
  }
}

/**
 * Find the snapshot at or before a given timestamp ("what was known at time T").
 * @param {number} timestamp - Unix seconds.
 * @returns {Promise<Object|null>} { snapshot, found } or null when unconfigured.
 */
export async function getSnapshotAtOrBefore(timestamp) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !publicClient) return null;

  try {
    const [snapshot, found] = await publicClient.readContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'getSnapshotAtOrBefore',
      args: [timestamp],
    });
    return { snapshot: normalizeSnapshot(snapshot), found };
  } catch (err) {
    console.error('[registry] getSnapshotAtOrBefore error:', err.message);
    return null;
  }
}

/**
 * Mint a snapshot NFT for a report.
 * @param {string} wallet - Wallet address to mint to (becomes owner).
 * @param {string} summaryHash - keccak256 hash of the report (0x + 64 hex).
 * @param {string} dataRef - Reference to the full data (e.g. the report text).
 * @returns {Promise<Object|null>} { hash, tokenId } or null when unconfigured.
 */
export async function mintSnapshot(wallet, summaryHash, dataRef = '') {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !publicClient || !PRIVATE_KEY) return null;

  try {
    const walletClient = createWalletClient({
      account: privateKeyToAccount(PRIVATE_KEY),
      chain: botChain,
      transport: http(RPC_URL),
    });

    const hash = await walletClient.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'mintSnapshot',
      args: [wallet, summaryHash, dataRef],
      // BOT Chain RPC rejects EIP-1559 transactions; use legacy (type 0x0).
      type: 'legacy',
    });

    // Wait for confirmation before reading the new total supply.
    await publicClient.waitForTransactionReceipt({ hash });

    // Determine the minted token id: the newest token is the one just minted.
    let tokenId = null;
    try {
      tokenId = await publicClient.readContract({
        address: registryAddress,
        abi: REGISTRY_ABI,
        functionName: 'totalSupply',
      });
    } catch {
      tokenId = null;
    }

    console.log(`[registry] Minted snapshot ${tokenId} for ${wallet} tx=${hash}`);
    return { hash, tokenId: tokenId ? tokenId.toString() : null };
  } catch (err) {
    console.error('[registry] mintSnapshot error:', err.message);
    throw new Error('Snapshot minting failed. Check BOT_PRIVATE_KEY funding and REGISTRY_CONTRACT.');
  }
}

/** Convert a viem snapshot tuple into a plain object. */
function normalizeSnapshot(s) {
  if (!s) return null;
  return {
    tokenId: s.tokenId !== undefined ? s.tokenId.toString() : null,
    wallet: s.wallet,
    summaryHash: s.summaryHash,
    timestamp: Number(s.timestamp),
    investigator: s.investigator,
    dataRef: s.dataRef || '',
  };
}

/**
 * Anchor a report hash on-chain using the configured private key.
 * @param {string} wallet - Wallet address the report is about.
 * @param {string} summaryHash - keccak256 hash of the report (0x + 64 hex).
 * @returns {Promise<Object|null>} { hash } or null when not configured.
 */
export async function anchorReport(wallet, summaryHash) {
  const registryAddress = getRegistryAddress();
  if (!registryAddress || !publicClient || !PRIVATE_KEY) return null;

  try {
    const walletClient = createWalletClient({
      account: privateKeyToAccount(PRIVATE_KEY),
      chain: botChain,
      transport: http(RPC_URL),
    });

    const hash = await walletClient.writeContract({
      address: registryAddress,
      abi: REGISTRY_ABI,
      functionName: 'anchorReport',
      args: [wallet, summaryHash],
      // BOT Chain RPC rejects EIP-1559 transactions; use legacy (type 0x0).
      type: 'legacy',
    });

    console.log(`[registry] Anchored report for ${wallet} tx=${hash}`);
    return { hash };
  } catch (err) {
    console.error('[registry] anchorReport error:', err.message);
    throw new Error('On-chain anchoring failed. Check BOT_PRIVATE_KEY funding and REGISTRY_CONTRACT.');
  }
}