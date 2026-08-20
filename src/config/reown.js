/**
 * Reown AppKit + Wagmi configuration.
 * Sets up wallet connection with BOT Chain Testnet as the primary network.
 * When VITE_REOWN_PROJECT_ID is missing, exports null values and logs a warning.
 * The app continues to work; wallet connection just won't be available.
 */

import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { createAppKit } from '@reown/appkit/react';
import { BOT_CHAIN } from './botChain';

const projectId = import.meta.env.VITE_REOWN_PROJECT_ID;

const botChainNetwork = {
  id: BOT_CHAIN.chainId,
  name: BOT_CHAIN.chainName,
  currency: BOT_CHAIN.nativeCurrency.name,
  explorerUrl: BOT_CHAIN.blockExplorerUrl || '',
  rpcUrl: BOT_CHAIN.rpcUrl,
  imageUrl: '',
};

export const isReownConfigured = !!projectId;
export let wagmiAdapter = null;
export let appKit = null;
export { botChainNetwork };

if (!projectId) {
  console.warn(
    '[reown] VITE_REOWN_PROJECT_ID not set. Wallet connection disabled.\n' +
    'Get a key at https://cloud.reown.com'
  );
  // Export early, skip initialization
} else {
  try {
    wagmiAdapter = new WagmiAdapter({
      networks: [botChainNetwork],
      projectId,
      customRpcUrls: {
        [BOT_CHAIN.chainId]: [BOT_CHAIN.rpcUrl],
      },
    });

    appKit = createAppKit({
      adapters: [wagmiAdapter],
      networks: [botChainNetwork],
      defaultNetwork: botChainNetwork,
      projectId,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-accent': '#3a8a3a',
        '--w3m-border-radius-master': '2px',
      },
      enableAnalytics: false,
      features: {
        // EVM-only connect modal: no social logins (Google, X, Farcaster),
        // no email login, and no "All wallets" tab.
        socials: false,
        email: false,
        emailShowWallets: false,
        allWallets: false,
        analytics: false,
      },
    });
  } catch (err) {
    console.error('[reown] Failed to initialize:', err.message);
    wagmiAdapter = null;
    appKit = null;
  }
}
