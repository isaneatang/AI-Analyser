/**
 * Home - Landing page and investigation entry point.
 * Contains: app branding, BOT Chain status, wallet investigation input,
 * recent investigations, and a brief explanation of the product.
 * This is the first screen the user sees.
 */

import { useState, useEffect } from 'react';
import WalletSearch from '../components/WalletSearch';
import { getRecentInvestigations } from '../utils/storage';
import { shortenAddress } from '../utils/address';
import { timeAgo } from '../utils/format';
import { BOT_CHAIN } from '../config/botChain';

export default function Home() {
  const [recent, setRecent] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);

  // Load recent investigations from localStorage on mount
  useEffect(() => {
    setRecent(getRecentInvestigations());
  }, []);

  // Check server health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setServerStatus(data))
      .catch(() => setServerStatus({ status: 'offline' }));
  }, []);

  return (
    <main className="page-home">
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
        <h1
          className="mono text-glow"
          style={{
            fontSize: 'var(--font-size-3xl)',
            color: 'var(--green-bright)',
            marginBottom: 'var(--space-sm)',
            letterSpacing: '-0.02em',
          }}
        >
          AI WALLET INVESTIGATOR
        </h1>
        <p
          style={{
            color: 'var(--text-secondary)',
            fontSize: 'var(--font-size-lg)',
            maxWidth: '500px',
            margin: '0 auto',
          }}
        >
          Paste a BOT Chain wallet address and get a full breakdown of its activity on-chain.
        </p>
        <div
          style={{
            marginTop: 'var(--space-lg)',
            maxWidth: '520px',
            margin: 'var(--space-lg) auto 0',
            textAlign: 'left',
          }}
        >
          <p className="mono" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--green-bright)', marginBottom: 'var(--space-sm)', textAlign: 'center' }}>
            HOW IT WORKS
          </p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', lineHeight: '1.7', textAlign: 'center' }}>
            Enter a wallet address and the app pulls its full transaction history, token holdings, and counterparties directly from BOT Chain. AI then analyzes the data and produces a profile with an activity score and attention signals. You can mint a snapshot of the investigation as a soulbound NFT on-chain, creating a permanent timestamped record tied to that wallet. The snapshot page lets you browse all minted snapshots for a wallet and look up what the latest investigation found at any point in time.
          </p>
        </div>
        {serverStatus && (
          <div
            className="mono"
            style={{
              marginTop: 'var(--space-md)',
              fontSize: '10px',
              color: serverStatus.status === 'ok' ? 'var(--green-bright)' : 'var(--status-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-xs)',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: serverStatus.status === 'ok' ? 'var(--green-bright)' : 'var(--status-warning)',
              }}
            />
            {serverStatus.status === 'ok'
              ? `SERVER ONLINE :: ${serverStatus.chain} :: chain ${serverStatus.chainId}`
              : 'SERVER OFFLINE'}
          </div>
        )}
      </div>

      {/* Investigation Terminal */}
      <div className="terminal" style={{ width: '100%', maxWidth: '640px' }}>
        <div className="terminal-header">
          <span className="terminal-header-dot" aria-hidden="true" />
          <span className="terminal-header-dot" aria-hidden="true" />
          <span className="terminal-header-dot" aria-hidden="true" />
          <span className="terminal-title">investigation terminal</span>
        </div>

        <p className="terminal-boot">
          <span className="ok">&gt; BOT CHAIN ONLINE</span> :: chain {BOT_CHAIN.chainId} :: {new URL(BOT_CHAIN.rpcUrl).hostname}
        </p>

        <WalletSearch />
      </div>

      {/* Recent Investigations */}
      {recent.length > 0 && (
        <div style={{ width: '100%', maxWidth: '640px', marginTop: 'var(--space-2xl)' }}>
          <h2 className="section-title">Recent Investigations</h2>
          <div className="recent-list">
            {recent.slice(0, 5).map((item) => (
              <a
                key={item.address}
                href={`/investigate/${item.address}`}
                className="recent-item"
                aria-label={`Investigate ${item.address}`}
              >
                <span className="recent-item-address">
                  {shortenAddress(item.address)}
                </span>
                <span className="recent-item-time">{timeAgo(item.timestamp)}</span>
              </a>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
