/**
 * NetworkStatus - Shows current network connection status.
 * Reflects real chain state from wallet context.
 * Shows BOT Chain Testnet when connected to chain 968.
 * Shows Wrong Network when connected to a different chain.
 * Shows Offline when no wallet is connected.
 */

import { useWallet } from '../context/WalletContext';
import { BOT_CHAIN } from '../config/botChain';

/**
 * BOT Chain network status badge.
 * Reads real chain state from wallet context.
 */
export default function NetworkStatus() {
  const { isConnected, isOnBotChain, isWrongNetwork } = useWallet();

  let status, label, dotClass;

  if (!isConnected) {
    status = 'offline';
    label = 'Not Connected';
    dotClass = 'network-badge-dot offline';
  } else if (isOnBotChain) {
    status = 'online';
    label = BOT_CHAIN.chainName;
    dotClass = 'network-badge-dot';
  } else if (isWrongNetwork) {
    status = 'wrong-network';
    label = 'Wrong Network';
    dotClass = 'network-badge-dot warning';
  } else {
    status = 'online';
    label = 'Connected';
    dotClass = 'network-badge-dot';
  }

  return (
    <div
      className="network-badge"
      role="status"
      aria-label={`Network status: ${label}`}
    >
      <span className={dotClass} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
