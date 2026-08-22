/**
 * scripts/deploy-registry.js - Compile and deploy InvestigationRegistry.sol
 * to BOT Chain Mainnet.
 *
 * Usage:
 *   1. Set BOT_RPC_URL and BOT_PRIVATE_KEY (a funded BOT Chain key) in .env.
 *   2. Run:  npm run deploy:registry
 *   3. Copy the printed contract address into .env as REGISTRY_CONTRACT.
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import solc from 'solc';
import { defineChain, createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const RPC_URL = process.env.BOT_RPC_URL;
const PRIVATE_KEY = process.env.BOT_PRIVATE_KEY;

if (!PRIVATE_KEY) {
  console.error('Missing BOT_PRIVATE_KEY in .env (a funded BOT Chain key).');
  process.exit(1);
}

// 1. Compile the contract
const sourcePath = path.join(__dirname, '..', 'contracts', 'InvestigationRegistry.sol');
const source = readFileSync(sourcePath, 'utf8');

const input = {
  language: 'Solidity',
  sources: { 'contracts/InvestigationRegistry.sol': { content: source } },
  settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } },
};

const output = JSON.parse(solc.compile(JSON.stringify(input)));

if (output.errors) {
  for (const err of output.errors) {
    if (err.severity === 'error') console.error('Compile error:', err.formattedMessage);
  }
  if (output.errors.some((e) => e.severity === 'error')) process.exit(1);
}

const contract = output.contracts['contracts/InvestigationRegistry.sol'].InvestigationRegistry;
const bytecode = `0x${contract.evm.bytecode.object}`;
console.log(`[deploy] Compiled InvestigationRegistry.sol (${bytecode.length / 2} bytes)`);

// 2. Deploy
const botChain = defineChain({
  id: 677,
  name: 'BOT Chain Mainnet',
  nativeCurrency: { name: 'BOT', symbol: 'BOT', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.botchain.ai'] } },
});

const walletClient = createWalletClient({
  account: privateKeyToAccount(PRIVATE_KEY),
  chain: botChain,
  transport: http(RPC_URL),
});
const publicClient = createPublicClient({ chain: botChain, transport: http(RPC_URL) });

console.log('[deploy] Sending deploy transaction...');
const hash = await walletClient.deployContract({
  abi: contract.abi,
  bytecode,
  args: [],
  // BOT Chain RPC rejects EIP-1559 (type 0x2) transactions, so force a
  // legacy transaction (type 0x0) using eth_gasPrice.
  type: 'legacy',
});
const receipt = await publicClient.waitForTransactionReceipt({ hash });

console.log(`[deploy] Deployed at: ${receipt.contractAddress}`);
console.log('[deploy] Add to .env: REGISTRY_CONTRACT=' + receipt.contractAddress);