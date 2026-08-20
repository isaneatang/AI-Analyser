/**
 * Blockchain data service for BOT Chain.
 * Uses eth_getLogs as primary data source.
 * Includes token metadata fetching (name, symbol, decimals).
 */

import { BOT_RPC_URL } from '../config/network.js';

const RPC_URL = BOT_RPC_URL;
let rpcId = 1;

async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(`RPC: ${data.error.message}`);
  return data.result;
}

/**
 * RPC call with retries. The BOT Chain RPC is occasionally flaky and
 * returning [] on a single failed call made wallets look empty (which in
 * turn made old wallets report "Unknown" age). Retrying smooths this out.
 * @param {string} method - JSON-RPC method.
 * @param {Array} params - JSON-RPC params.
 * @param {number} retries - Number of extra attempts after the first failure.
 * @returns {Promise<any>} The RPC result.
 */
async function rpcWithRetry(method, params = [], retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await rpc(method, params);
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
}

async function getLatestBlock() {
  const hex = await rpc('eth_blockNumber');
  return parseInt(hex, 16);
}

function padAddress(address) {
  return '0x' + address.toLowerCase().slice(2).padStart(64, '0');
}

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

const tsCache = new Map();
async function getBlockTimestamp(blockNum) {
  if (tsCache.has(blockNum)) return tsCache.get(blockNum);
  // Retry once; a failed timestamp should never be cached as "null" because
  // a null timestamp makes wallet age report "Unknown".
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const block = await rpc('eth_getBlockByNumber', [`0x${blockNum.toString(16)}`, false]);
      const ts = block?.timestamp ? parseInt(block.timestamp, 16).toString() : null;
      if (ts !== null) {
        tsCache.set(blockNum, ts);
        return ts;
      }
    } catch {
      // fall through to retry
    }
    if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return null;
}

/**
 * Fetch token metadata (name, symbol, decimals) from a contract.
 * @param {string} tokenAddr - Token contract address.
 * @returns {Promise<{name: string, symbol: string, decimals: number}>}
 */
const metadataCache = new Map();
async function getTokenMetadata(tokenAddr) {
  if (metadataCache.has(tokenAddr)) return metadataCache.get(tokenAddr);
  try {
    const nameSig = '0x06fdde03'; // name()
    const symbolSig = '0x95d89b41'; // symbol()
    const decimalsSig = '0x313ce567'; // decimals()

    const [nameRes, symbolRes, decimalsRes] = await Promise.all([
      rpc('eth_call', [{ to: tokenAddr, data: nameSig }, 'latest']).catch(() => null),
      rpc('eth_call', [{ to: tokenAddr, data: symbolSig }, 'latest']).catch(() => null),
      rpc('eth_call', [{ to: tokenAddr, data: decimalsSig }, 'latest']).catch(() => null),
    ]);

    const name = nameRes && nameRes !== '0x' ? decodeAbiString(nameRes) : '';
    const symbol = symbolRes && symbolRes !== '0x' ? decodeAbiString(symbolRes) : '';
    let decimals = 18;
    if (decimalsRes && decimalsRes !== '0x' && decimalsRes.length >= 66) {
      decimals = parseInt(decimalsRes.slice(-64), 16);
    }
    if (isNaN(decimals) || decimals < 0 || decimals > 36) decimals = 18;

    const meta = { name, symbol, decimals: isNaN(decimals) ? 18 : decimals };
    metadataCache.set(tokenAddr, meta);
    return meta;
  } catch {
    const fallback = { name: 'Unknown Token', symbol: '???', decimals: 18 };
    metadataCache.set(tokenAddr, fallback);
    return fallback;
  }
}

/**
 * Decode an ABI-encoded string from eth_call response.
 */
function decodeAbiString(hex) {
  try {
    if (!hex || hex === '0x' || hex.length < 130) return '';
    // ABI-encoded string: offset (32 bytes) + length (32 bytes) + data
    // First 2 chars are 0x, then 64 chars per 32-byte word
    const offsetWords = parseInt(hex.slice(2, 66), 16);
    const dataStart = 2 + (offsetWords * 2) + 64; // skip offset word + length word
    const length = parseInt(hex.slice(dataStart - 64, dataStart), 16);
    const rawData = hex.slice(dataStart, dataStart + length * 2);
    let str = '';
    for (let i = 0; i < rawData.length; i += 2) {
      const code = parseInt(rawData.slice(i, i + 2), 16);
      if (code === 0) break;
      str += String.fromCharCode(code);
    }
    return str.trim();
  } catch {
    return '';
  }
}

/**
 * Get native BOT balance.
 */
export async function getWalletBalance(address) {
  try {
    const hex = await rpc('eth_getBalance', [address, 'latest']);
    const wei = BigInt(hex).toString();
    return { balance: wei, balanceFormatted: (Number(wei) / 1e18).toString() };
  } catch (err) {
    console.error('[rpc] getBalance error:', err.message);
    return { balance: '0', balanceFormatted: '0' };
  }
}

/**
 * Get transactions involving the address using eth_getLogs.
 */
export async function getWalletTransactions(address, maxBlocks = 50000) {
  try {
    const latest = await getLatestBlock();
    const padded = padAddress(address);
    const txHashes = new Set();
    const chunkSize = 5000;

    for (let offset = chunkSize; offset < maxBlocks; offset += chunkSize) {
      const end = latest - offset + chunkSize;
      const start = Math.max(0, latest - offset);
      const fromHex = `0x${start.toString(16)}`;
      const toHex = `0x${end.toString(16)}`;

      const [incoming, outgoing] = await Promise.all([
        rpcWithRetry('eth_getLogs', [{ fromBlock: fromHex, toBlock: toHex, topics: [TRANSFER_TOPIC, null, padded] }]).catch(() => []),
        rpcWithRetry('eth_getLogs', [{ fromBlock: fromHex, toBlock: toHex, topics: [TRANSFER_TOPIC, padded, null] }]).catch(() => []),
      ]);

      for (const log of [...(incoming || []), ...(outgoing || [])]) {
        if (log.transactionHash) txHashes.add(log.transactionHash);
      }

      if (txHashes.size >= 100) break;
    }

    const hashes = [...txHashes].slice(0, 60);
    const transactions = [];

    // Fetch all transaction details in parallel (batches of 10)
    for (let i = 0; i < hashes.length; i += 10) {
      const batch = hashes.slice(i, i + 10);
      const results = await Promise.allSettled(
        batch.map(async (hash) => {
          const [txData, receipt] = await Promise.all([
            rpc('eth_getTransactionByHash', [hash]),
            rpc('eth_getTransactionReceipt', [hash]),
          ]);
          if (!txData) return null;

          let ts = null;
          if (receipt?.blockNumber) {
            ts = await getBlockTimestamp(parseInt(receipt.blockNumber, 16));
          }

          const input = txData.input || '0x';
          const isContractCall = input.length > 10 && input !== '0x';

          let toIsContract = false;
          if (txData.to) {
            const code = await rpc('eth_getCode', [txData.to, 'latest']).catch(() => '0x');
            toIsContract = code && code !== '0x' && code !== '0x0';
          }

          let tokenInfo = null;
          if (receipt?.logs) {
            for (const log of receipt.logs) {
              if (log.topics?.[0] === TRANSFER_TOPIC) {
                tokenInfo = await getTokenMetadata(log.address);
                break;
              }
            }
          }

          return {
            hash: txData.hash,
            from: (txData.from || '').toLowerCase(),
            to: txData.to ? txData.to.toLowerCase() : null,
            value: txData.value || '0x0',
            gas: txData.gas || null,
            gasPrice: txData.gasPrice || null,
            blockNumber: txData.blockNumber ? parseInt(txData.blockNumber, 16).toString() : null,
            nonce: txData.nonce || null,
            timestamp: ts,
            status: receipt?.status || null,
            input,
            isContractCall,
            toIsContract,
            contractCreation: !txData.to,
            tokenInfo,
            logCount: receipt?.logs?.length || 0,
          };
        })
      );

      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) transactions.push(r.value);
      }
    }

    transactions.sort((a, b) => Number(b.blockNumber || 0) - Number(a.blockNumber || 0));
    return { transactions, cursor: null };
  } catch (err) {
    console.error('[rpc] getTransactions error:', err.message);
    return { transactions: [], cursor: null };
  }
}

/**
 * Get ERC-20 token transfers via Transfer event logs.
 * Includes token metadata (name, symbol, decimals).
 */
export async function getTokenTransfers(address, maxBlocks = 50000) {
  try {
    const latest = await getLatestBlock();
    const padded = padAddress(address);
    const transfers = [];
    const chunkSize = 5000;

    for (let offset = chunkSize; offset < maxBlocks; offset += chunkSize) {
      const end = latest - offset + chunkSize;
      const start = Math.max(0, latest - offset);
      const fromHex = `0x${start.toString(16)}`;
      const toHex = `0x${end.toString(16)}`;

      const [incoming, outgoing] = await Promise.all([
        rpcWithRetry('eth_getLogs', [{ fromBlock: fromHex, toBlock: toHex, topics: [TRANSFER_TOPIC, null, padded] }]).catch(() => []),
        rpcWithRetry('eth_getLogs', [{ fromBlock: fromHex, toBlock: toHex, topics: [TRANSFER_TOPIC, padded, null] }]).catch(() => []),
      ]);

      for (const log of [...(incoming || []), ...(outgoing || [])]) {
        const blockNum = parseInt(log.blockNumber, 16);
        const ts = await getBlockTimestamp(blockNum);

        // Fetch token metadata
        const meta = await getTokenMetadata(log.address);

        transfers.push({
          transaction_hash: log.transactionHash,
          from: log.topics[1] ? '0x' + log.topics[1].slice(26) : null,
          to: log.topics[2] ? '0x' + log.topics[2].slice(26) : null,
          value: (log.data && log.data !== '0x') ? BigInt(log.data).toString() : '0',
          address: log.address,
          block_number: blockNum.toString(),
          block_timestamp: ts,
          token_name: meta.name,
          token_symbol: meta.symbol,
          token_decimals: meta.decimals.toString(),
        });
      }

      if (transfers.length >= 50) break;
    }

    return { transfers, cursor: null };
  } catch (err) {
    console.error('[rpc] getTokenTransfers error:', err.message);
    return { transfers: [], cursor: null };
  }
}

/**
 * Probe one block range for any ERC-20 Transfer logs involving the address.
 * Retries once so a flaky RPC response isn't mistaken for "no activity".
 * @returns {Promise<Array>} Matching logs (empty when none found).
 */
async function probeChunkLogs(padded, k, CHUNK, latest) {
  const lo = k * CHUNK;
  const hi = Math.min((k + 1) * CHUNK - 1, latest);
  const range = { fromBlock: `0x${lo.toString(16)}`, toBlock: `0x${hi.toString(16)}` };
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const [incoming, outgoing] = await Promise.all([
        rpc('eth_getLogs', [{ ...range, topics: [TRANSFER_TOPIC, null, padded] }]),
        rpc('eth_getLogs', [{ ...range, topics: [TRANSFER_TOPIC, padded, null] }]),
      ]);
      return [...(incoming || []), ...(outgoing || [])];
    } catch {
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  return [];
}

/**
 * Find the earliest block where the address SENT any transaction.
 * Uses eth_getTransactionCount (the nonce), which grows monotonically with
 * block number and counts native transfers and contract calls too — activity
 * that produces no ERC-20 Transfer logs and is invisible to log scans.
 * @param {string} address - Wallet address.
 * @returns {Promise<number|null>} Earliest sent-transaction block, or null.
 */
const sentBlockCache = new Map();
export async function getEarliestSentBlock(address) {
  const key = address.toLowerCase();
  if (sentBlockCache.has(key)) return sentBlockCache.get(key);

  const result = await (async () => {
    try {
      const latest = await getLatestBlock();

      async function countAt(b) {
        const hex = await rpcWithRetry('eth_getTransactionCount', [key, `0x${b.toString(16)}`]);
        return hex ? parseInt(hex, 16) : 0;
      }

      // Never sent anything -> no native activity to date.
      if ((await countAt(latest)) === 0) return null;

      // Coarse binary search over ~16k-block boundaries...
      const STEP = 16000;
      let lo = 0;
      let hi = Math.ceil(latest / STEP);
      let coarse = latest;
      while (lo <= hi) {
        const mid = Math.floor((lo + hi) / 2);
        const b = Math.min(mid * STEP, latest);
        if ((await countAt(b)) > 0) {
          coarse = b;
          hi = mid - 1;
        } else {
          lo = mid + 1;
        }
      }

      // ...then a fine binary search inside that boundary block.
      let fineLo = Math.max(0, coarse - STEP);
      let fineHi = coarse;
      let block = coarse;
      while (fineLo <= fineHi) {
        const mid = Math.floor((fineLo + fineHi) / 2);
        if ((await countAt(mid)) > 0) {
          block = mid;
          fineHi = mid - 1;
        } else {
          fineLo = mid + 1;
        }
      }
      return block;
    } catch (err) {
      console.error('[rpc] getEarliestSentBlock error:', err.message);
      return null;
    }
  })();

  sentBlockCache.set(key, result);
  return result;
}

/**
 * Find the timestamp of a wallet's earliest on-chain activity.
 * The recent-block scan in getWalletTransactions only covers the newest
 * ~200k blocks, so a wallet with no recent activity looks brand new. This
 * searches the entire chain with a binary search over fixed-size chunks to
 * locate the earliest ERC-20 Transfer event involving the wallet.
 *
 * When no transfer logs exist (e.g. the wallet only ever sent native BOT or
 * called contracts), it falls back to the nonce-based search so the wallet
 * still gets an accurate age instead of "Unknown".
 *
 * Results are cached per address so repeat investigations are instant.
 * @param {string} address - Wallet address.
 * @returns {Promise<string|null>} Unix seconds of first activity, or null.
 */
const firstActivityCache = new Map();
export async function getFirstActivity(address) {
  const key = address.toLowerCase();
  if (firstActivityCache.has(key)) return firstActivityCache.get(key);

  const result = await (async () => {
    try {
      const latest = await getLatestBlock();
      const padded = padAddress(address);
      const CHUNK = 100000;
      const maxChunk = Math.ceil(latest / CHUNK);

      // Binary search for the lowest chunk index that contains any activity.
      let loChunk = 0;
      let hiChunk = maxChunk - 1;
      let firstLogs = null;

      while (loChunk <= hiChunk) {
        const mid = Math.floor((loChunk + hiChunk) / 2);
        const logs = await probeChunkLogs(padded, mid, CHUNK, latest);
        if (logs.length > 0) {
          firstLogs = logs;
          hiChunk = mid - 1;
        } else {
          loChunk = mid + 1;
        }
      }

      let earliestSeconds = null;

      // Earliest block number among the logs in the found chunk.
      if (firstLogs && firstLogs.length > 0) {
        const earliestBlock = firstLogs.reduce(
          (min, log) => Math.min(min, parseInt(log.blockNumber, 16)),
          Infinity
        );
        earliestSeconds = await getBlockTimestamp(earliestBlock);
      }

      // Fallback: native-only wallets (no ERC-20 transfers). Use the nonce
      // binary search instead, and keep whichever timestamp is earlier.
      const earliestSentBlock = await getEarliestSentBlock(address);
      if (earliestSentBlock !== null) {
        const sentSeconds = await getBlockTimestamp(earliestSentBlock);
        if (sentSeconds && (!earliestSeconds || Number(sentSeconds) < Number(earliestSeconds))) {
          earliestSeconds = sentSeconds;
        }
      }

      return earliestSeconds;
    } catch (err) {
      console.error('[rpc] getFirstActivity error:', err.message);
      return null;
    }
  })();

  firstActivityCache.set(key, result);
  return result;
}

/**
 * Get ERC-20 token balances with metadata.
 */
export async function getTokenBalances(address) {
  try {
    const latest = await getLatestBlock();
    const padded = padAddress(address);
    const chunkSize = 5000;
    let tokenAddrs = [];

    for (let offset = chunkSize; offset < 50000; offset += chunkSize) {
      const end = latest - offset + chunkSize;
      const start = Math.max(0, latest - offset);

      const logs = await rpc('eth_getLogs', [{
        fromBlock: `0x${start.toString(16)}`,
        toBlock: `0x${end.toString(16)}`,
        topics: [TRANSFER_TOPIC, null, padded],
      }]).catch(() => []);

      if (logs && logs.length > 0) {
        tokenAddrs = [...new Set(logs.map((l) => l.address))];
        break;
      }
    }

    if (tokenAddrs.length === 0) return [];

    const balanceOfSig = '0x70a08231';
    const paddedWallet = padAddress(address);

    const results = await Promise.allSettled(
      tokenAddrs.map(async (tokenAddr) => {
        const [balanceRes, meta] = await Promise.all([
          rpc('eth_call', [{ to: tokenAddr, data: balanceOfSig + paddedWallet.slice(2) }, 'latest']).catch(() => null),
          getTokenMetadata(tokenAddr),
        ]);

        const balance = balanceRes ? BigInt(balanceRes).toString() : '0';
        return {
          address: tokenAddr,
          balance,
          name: meta.name,
          symbol: meta.symbol,
          decimals: meta.decimals,
        };
      })
    );

    return results
      .filter((r) => r.status === 'fulfilled' && r.value.balance !== '0')
      .map((r) => r.value);
  } catch (err) {
    console.error('[rpc] getTokenBalances error:', err.message);
    return [];
  }
}
