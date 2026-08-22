/**
 * BOT Chain RPC service.
 * Direct RPC communication with BOT Chain.
 * Used when Moralis doesn't provide required data:
 * - specific transaction receipt
 * - contract information
 * - logs/events
 * - direct blockchain verification
 */

import { BOT_RPC_URL } from '../config/network.js';

const RPC_URL = BOT_RPC_URL;

let requestId = 1;

/**
 * Make a JSON-RPC request to BOT Chain.
 * @param {string} method - RPC method name.
 * @param {Array} params - Method parameters.
 * @returns {Promise<any>} RPC response result.
 */
async function rpcRequest(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: requestId++,
      method,
      params,
    }),
  });

  const data = await res.json();

  if (data.error) {
    throw new Error(`RPC error: ${data.error.message}`);
  }

  return data.result;
}

/**
 * Get the current block number.
 * @returns {Promise<string>} Hex-encoded block number.
 */
export async function getBlockNumber() {
  return rpcRequest('eth_blockNumber');
}

/**
 * Get a transaction receipt by hash.
 * @param {string} txHash - Transaction hash.
 * @returns {Promise<Object|null>} Transaction receipt or null.
 */
export async function getTransactionReceipt(txHash) {
  try {
    return await rpcRequest('eth_getTransactionReceipt', [txHash]);
  } catch {
    return null;
  }
}

/**
 * Get a block by number with full transaction details.
 * @param {string} blockNumber - Hex-encoded block number.
 * @returns {Promise<Object|null>} Block data.
 */
export async function getBlock(blockNumber) {
  try {
    return await rpcRequest('eth_getBlockByNumber', [blockNumber, true]);
  } catch {
    return null;
  }
}

/**
 * Get the chain ID from the RPC node.
 * Useful for verifying we're connected to the right network.
 * @returns {Promise<string>} Hex-encoded chain ID.
 */
export async function getChainId() {
  return rpcRequest('eth_chainId');
}

/**
 * Get transaction count (nonce) for an address.
 * @param {string} address - Wallet address.
 * @returns {Promise<string>} Hex-encoded transaction count.
 */
export async function getTransactionCount(address) {
  return rpcRequest('eth_getTransactionCount', [address, 'latest']);
}
