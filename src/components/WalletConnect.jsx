/**
 * WalletConnect - Wallet connection button and status display.
 * Uses wallet context for real connection state.
 * When Reown is configured: shows the AppKit modal button.
 * When Reown is NOT configured: shows a fallback message.
 * Handles: Connected, Wrong Network, Switching, Disconnected states.
 */

import { useWallet } from '../context/WalletContext';
import { shortenAddress } from '../utils/address';
import { isReownConfigured } from '../config/reown';

/**
 * Wallet connection button with real wallet state.
 * Renders the Reown AppKit button for connection and shows status.
 */
export default function WalletConnect() {
  const {
    address,
    isConnected,
    isWrongNetwork,
    isSwitchingNetwork,
    networkError,
    switchToBotChain,
    disconnect,
  } = useWallet();

  // Wrong network state
  if (isConnected && isWrongNetwork) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span
          className="network-badge"
          style={{ borderColor: 'var(--status-warning)', color: 'var(--status-warning)' }}
        >
          Wrong Network
        </span>
        <button
          className="btn btn-primary btn-sm"
          onClick={switchToBotChain}
          disabled={isSwitchingNetwork}
          aria-label="Switch to BOT Chain"
        >
          {isSwitchingNetwork ? 'Switching...' : 'Switch Network'}
        </button>
      </div>
    );
  }

  // Connected state
  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
        <span className="mono text-green" style={{ fontSize: 'var(--font-size-sm)' }}>
          {shortenAddress(address)}
        </span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  // Disconnected state
  if (!isReownConfigured) {
    return (
      <span
        className="btn btn-secondary btn-sm"
        style={{ cursor: 'default', opacity: 0.6 }}
        title="Set VITE_REOWN_PROJECT_ID in .env to enable wallet connection"
      >
        Connect Wallet
      </span>
    );
  }

  // Reown is configured, show the AppKit button
  return (
    <div>
      <appkit-button />
      {networkError && (
        <p
          role="alert"
          style={{
            fontSize: 'var(--font-size-xs)',
            color: 'var(--status-warning)',
            marginTop: 'var(--space-xs)',
            maxWidth: '250px',
          }}
        >
          {networkError}
        </p>
      )}
    </div>
  );
}
