/**
 * CrossChainTokens - Displays token balances from other chains.
 * Fetches from multiple networks via the crosschain API.
 * Standalone mode renders a full section; embedded mode renders a compact
 * chain-chip picker inside an existing card.
 */

import { useState, useEffect } from 'react';
import { formatTokenAmount, formatUsd } from '../utils/format';
import { shortenAddress } from '../utils/address';

/** Chain color map for visual badges */
const CHAIN_COLORS = {
  ethereum: '#627EEA',
  bsc: '#F3BA2F',
  polygon: '#8247E5',
  arbitrum: '#28A0F0',
  optimism: '#FF0420',
  base: '#0052FF',
  avalanche: '#E84142',
};

const getChainColor = (chain) => CHAIN_COLORS[chain] || '#666';

/**
 * @param {Object} props
 * @param {string} props.address - Wallet address to fetch cross-chain data for.
 * @param {boolean} props.embedded - Render inside an existing card (compact).
 */
export default function CrossChainTokens({ address, embedded = false }) {
  const [chains, setChains] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fetched, setFetched] = useState(false);
  const [activeChain, setActiveChain] = useState(null);
  const [rateLimited, setRateLimited] = useState(false);

  useEffect(() => {
    if (!address || fetched) return;

    async function fetchCrossChain() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/crosschain/${address}`, {
          signal: AbortSignal.timeout(30000),
        });
        const data = await res.json();

        if (data.error && !data.chains?.length) {
          setError(data.error);
          if (data.error.includes('429') || data.error.includes('rate') || data.error.includes('limit')) {
            setRateLimited(true);
          }
        } else {
          const list = data.chains || [];
          setChains(list);
          setActiveChain((prev) => prev || (list.find((c) => c.tokens.length > 0) || list[0] || null)?.chain || null);
        }
      } catch (err) {
        const msg = err.message || '';
        if (msg.includes('429') || msg.includes('rate') || msg.includes('limit')) {
          setRateLimited(true);
          setError('API rate limit reached. Cross-chain data will be available again shortly.');
        } else {
          setError('Cross-chain data temporarily unavailable.');
        }
      } finally {
        setLoading(false);
        setFetched(true);
      }
    }

    fetchCrossChain();
  }, [address, fetched]);

  // Don't show anything if not fetched yet or loading with no data
  if (!fetched && !loading) return null;

  const active = chains.find((c) => c.chain === activeChain) || null;

  const content = (
    <>
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
          <span className="crosschain-dot" />
          <span className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            Fetching balances from multiple networks...
          </span>
        </div>
      )}

      {error && !chains.length && (
        <div className="crosschain-unavailable">
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            {error}
          </p>
          {rateLimited && (
            <p className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: 'var(--space-xs)' }}>
              Tip: Cross-chain data requires a Moralis API key with sufficient quota.
            </p>
          )}
        </div>
      )}

      {!loading && chains.length === 0 && !error && (
        <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
          No cross-chain tokens found for this address.
        </p>
      )}

      {chains.length > 0 && (
        <>
          {/* Chain picker chips */}
          <div className="crosschain-chips" role="tablist" aria-label="Chain picker">
            {chains.map((chain) => {
              const color = getChainColor(chain.chain);
              const isActive = chain.chain === activeChain;
              return (
                <button
                  key={chain.chain}
                  role="tab"
                  aria-selected={isActive}
                  className={`crosschain-chip ${isActive ? 'crosschain-chip-active' : ''}`}
                  onClick={() => setActiveChain(chain.chain)}
                  style={{ borderColor: isActive ? color : 'var(--border-subtle)', color }}
                >
                  <span>{chain.chainName}</span>
                  {chain.totalUsd && (
                    <span className="mono text-muted" style={{ fontSize: '10px', marginLeft: '6px' }}>
                      {formatUsd(chain.totalUsd)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected chain tokens */}
          {active && (
            <div className="crosschain-tokens" style={{ marginTop: 'var(--space-sm)' }}>
              {active.tokens.slice(0, 10).map((token, i) => (
                <div key={token.contractAddress || `native-${i}`} className="crosschain-token-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="mono" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {token.symbol}
                    </span>
                    {token.isNative && (
                      <span className="text-muted" style={{ fontSize: '10px', marginLeft: '4px' }}>(native)</span>
                    )}
                    {token.contractAddress && (
                      <span className="text-muted" style={{ fontSize: '10px', marginLeft: '4px' }}>
                        {shortenAddress(token.contractAddress, 4)}
                      </span>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span className="mono" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {formatTokenAmount(token.balance, token.decimals)}
                    </span>
                    {token.usdValue && token.usdValue > 0 && (
                      <span className="text-muted" style={{ fontSize: '10px', marginLeft: '4px' }}>
                        ${token.usdValue.toFixed(2)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {active.tokens.length > 10 && (
                <p className="text-muted" style={{ fontSize: '10px', textAlign: 'center', padding: '4px' }}>
                  +{active.tokens.length - 10} more tokens
                </p>
              )}
            </div>
          )}
        </>
      )}

      <style>{`
        .crosschain-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--green-muted);
          animation: pulse-dot 1s ease-in-out infinite;
        }

        .crosschain-chips {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
        }

        .crosschain-chip {
          font-family: var(--font-mono);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          padding: 3px 10px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: transparent;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .crosschain-chip:hover {
          border-color: var(--text-secondary);
        }

        .crosschain-chip-active {
          background: color-mix(in srgb, currentColor 12%, transparent);
        }

        .crosschain-tokens {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .crosschain-token-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
        }

        .crosschain-unavailable {
          padding: var(--space-sm);
          background: rgba(245, 158, 11, 0.05);
          border: 1px solid rgba(245, 158, 11, 0.15);
          border-radius: var(--radius-md);
        }
      `}</style>
    </>
  );

  if (embedded) {
    return content;
  }

  return (
    <section className="section" aria-label="Cross-chain tokens">
      <h2 className="section-title">Cross-Chain Holdings</h2>
      {content}
    </section>
  );
}