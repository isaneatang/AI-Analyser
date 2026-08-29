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
import { Link } from 'react-router-dom';

export default function Home() {
  const [recent] = useState(() => getRecentInvestigations());
  const [serverStatus, setServerStatus] = useState(null);

  // Check server health on mount
  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((data) => setServerStatus(data))
      .catch(() => setServerStatus({ status: 'offline' }));
  }, []);

  return (
    <main className="page-home">
      <div className="home-hero">
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
          Trace wallet activity, inspect evidence, and publish verifiable reports on BOT Chain.
        </p>
        {serverStatus && (
          <div
            className="mono"
            style={{
              marginTop: 'var(--space-md)',
               fontSize: 'var(--font-size-xs)',
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

      <div className="home-capabilities" aria-label="Investigation workflow">
        <div><span>01 / TRACE</span><p>Collect activity, holdings, and counterparties from chain evidence.</p></div>
        <div><span>02 / INTERPRET</span><p>Use deterministic metrics and evidence-scoped AI analysis.</p></div>
        <div><span>03 / VERIFY</span><p>Download a report or publish its hash and snapshot on-chain.</p></div>
      </div>

      {/* Recent Investigations */}
      {recent.length > 0 && (
        <div style={{ width: '100%', maxWidth: '640px', marginTop: 'var(--space-2xl)' }}>
          <h2 className="section-title">Recent Investigations</h2>
          <div className="recent-list">
            {recent.slice(0, 5).map((item) => (
              <Link
                key={item.address}
                to={`/investigate/${item.address}`}
                className="recent-item"
                aria-label={`Investigate ${item.address}`}
              >
                <span className="recent-item-address">
                  {shortenAddress(item.address)}
                </span>
                <span className="recent-item-time">{timeAgo(item.timestamp)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
