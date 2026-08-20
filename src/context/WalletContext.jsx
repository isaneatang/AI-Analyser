/**
 * WalletContext - Manages wallet connection state for the application.
 *
 * When Reown is configured: uses wagmi hooks for real wallet state.
 * When Reown is NOT configured: provides static disconnected state.
 *
 * Provides:
 * - connected address, connection status, chain ID
 * - BOT Chain detection, network switching, disconnect
 *
 * Does NOT contain: Moralis calls, Gemini calls, analysis logic
 */

import { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { isBotChainId, ADD_CHAIN_PARAMS, BOT_CHAIN } from '../config/botChain';

const WalletContext = createContext(null);

/**
 * Provider using real wagmi hooks for wallet state.
 */
export function WalletProvider({ children }) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();

  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [networkError, setNetworkError] = useState(null);

  const chainId = chain?.id || null;
  const isOnBotChain = chainId ? isBotChainId(chainId) : false;
  const isWrongNetwork = isConnected && !isOnBotChain;

  /**
   * Detect the wallet's current network.
   * @returns {Promise<number|null>} Current chain ID as a number, or null.
   */
  const detectCurrentChainId = useCallback(async () => {
    try {
      if (window.ethereum?.chainId) return parseInt(window.ethereum.chainId, 16);
    } catch {
      // fall through
    }
    return null;
  }, []);

  /**
   * Switch the wallet to the active BOT network.
   * Strategy: if the network is missing from the wallet, add it first
   * (wallet_addEthereumChain), then switch (wallet_switchEthereumChain).
   * No retry loops. Shows user-facing messages on failure.
   */
  const switchToBotChain = useCallback(async () => {
    if (!window.ethereum) {
      setNetworkError('No wallet detected. Please install a wallet extension.');
      return false;
    }

    setIsSwitchingNetwork(true);
    setNetworkError(null);

    const switchChain = () =>
      window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ADD_CHAIN_PARAMS.chainId }],
      });

    try {
      const currentChainId = await detectCurrentChainId();
      if (currentChainId === BOT_CHAIN.chainId) {
        setIsSwitchingNetwork(false);
        return true;
      }

      try {
        // Fast path: the wallet already knows the network, just switch.
        await switchChain();
        setIsSwitchingNetwork(false);
        return true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          // Network not added to the wallet yet. Add it first, then switch.
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [ADD_CHAIN_PARAMS],
            });
            // Some wallets need a second switch call after adding.
            await switchChain().catch(() => {});
            setIsSwitchingNetwork(false);
            return true;
          } catch (addError) {
            setNetworkError(
              addError.code === 4001
                ? `Network switch was not approved. Switch to ${BOT_CHAIN.chainName} manually.`
                : `Could not add ${BOT_CHAIN.chainName}. Please add it manually in your wallet.`
            );
            setIsSwitchingNetwork(false);
            return false;
          }
        }

        setNetworkError(
          switchError.code === 4001
            ? `Network switch was not approved. Switch to ${BOT_CHAIN.chainName} manually.`
            : `Could not switch network. Please switch to ${BOT_CHAIN.chainName} manually.`
        );
        setIsSwitchingNetwork(false);
        return false;
      }
    } catch {
      setNetworkError('Could not detect the current network in your wallet.');
      setIsSwitchingNetwork(false);
      return false;
    }
  }, [detectCurrentChainId]);

  // Auto-switch to BOT Chain when connected to wrong network
  useEffect(() => {
    if (isConnected && isWrongNetwork && !isSwitchingNetwork && !networkError) {
      switchToBotChain();
    }
  }, [isConnected, isWrongNetwork]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clear error when on correct chain
  useEffect(() => {
    if (isOnBotChain) setNetworkError(null);
  }, [isOnBotChain]);

  const value = {
    address,
    isConnected,
    chainId,
    isOnBotChain,
    isWrongNetwork,
    isConnecting,
    isSwitchingNetwork,
    networkError,
    switchToBotChain,
    disconnect: () => {
      setNetworkError(null);
      disconnect();
    },
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Mock provider for when wagmi/Reown is not available.
 * Returns static disconnected state so the UI still renders.
 */
export function WalletProviderMock({ children }) {
  const value = {
    address: null,
    isConnected: false,
    chainId: null,
    isOnBotChain: false,
    isWrongNetwork: false,
    isConnecting: false,
    isSwitchingNetwork: false,
    networkError: null,
    switchToBotChain: async () => false,
    disconnect: () => {},
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context.
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used inside WalletProvider');
  }
  return context;
}
