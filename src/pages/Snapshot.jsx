/**
 * Snapshot - Timestamp page for the on-chain InvestigationRegistry.
 * Browse snapshot NFTs minted for a wallet and query what was known at any
 * point in time (getSnapshotAtOrBefore).
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { isValidEvmAddress, shortenAddress } from '../utils/address';
import { formatDate } from '../utils/format';

function SnapshotCard({ s, onSelect }) {
  return (
    <div
      className="card"
      style={{ cursor: onSelect ? 'pointer' : 'default' }}
      onClick={() => onSelect?.(s)}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xs)' }}>
        <span className="mono text-green" style={{ fontSize: 'var(--font-size-sm)' }}>
          SNAPSHOT #{s.tokenId}
        </span>
        {s.timestamp && (
          <span className="mono text-muted" style={{ fontSize: '10px' }}>
            {formatDate(Number(s.timestamp) * 1000)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.8 }}>
        <div className="mono" style={{ color: 'var(--green-bright)', wordBreak: 'break-all' }}>
          {s.summaryHash}
        </div>
        <div className="text-muted">
          Wallet: <span className="mono">{shortenAddress(s.wallet, 6)}</span>
          {s.investigator && (
            <> · by <span className="mono">{shortenAddress(s.investigator, 6)}</span></>
          )}
        </div>
        {s.dataRef && (
          <details style={{ marginTop: 'var(--space-sm)' }}>
            <summary className="mono text-muted" style={{ fontSize: '10px', cursor: 'pointer' }}>
              view data ({s.dataRef.length} chars)
            </summary>
            <pre
              className="mono text-muted"
              style={{
                marginTop: 'var(--space-xs)',
                padding: 'var(--space-sm)',
                background: 'var(--bg-primary)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '10px',
                maxHeight: '240px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {s.dataRef}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}

export default function Snapshot() {
  const { wallet: walletParam } = useParams();
  const navigate = useNavigate();

  const [status, setStatus] = useState(null);
  const [addressInput, setAddressInput] = useState(walletParam || '');
  const [snapshots, setSnapshots] = useState([]);
  const [loadedFor, setLoadedFor] = useState(null);
  const [snapError, setSnapError] = useState(null);

  // Timestamp lookup
  const [timeValue, setTimeValue] = useState('');
  const [lookup, setLookup] = useState(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const wallet = walletParam && isValidEvmAddress(walletParam) ? walletParam.toLowerCase() : null;

  useEffect(() => {
    fetch('/api/registry/status')
      .then((r) => r.json())
      .catch(() => ({ configured: false, address: null }))
      .then((data) => setStatus(data));
  }, []);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;
    fetch(`/api/registry/snapshots/${wallet}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) setSnapError(data.error);
        else setSnapshots(data.snapshots || []);
      })
      .catch(() => !cancelled && setSnapError('Failed to load snapshots.'))
      .finally(() => { if (!cancelled) setLoadedFor(wallet); });
    return () => { cancelled = true; };
  }, [wallet]);

  // Loading is derived: true until the fetch for the current wallet resolves.
  const loadingSnaps = !!wallet && loadedFor !== wallet;

  function handleAddressSubmit(e) {
    e.preventDefault();
    const addr = addressInput.trim();
    if (isValidEvmAddress(addr)) {
      navigate(`/snapshot/${addr}`);
    } else {
      setSnapError('Invalid EVM address.');
    }
  }

  async function handleTimestampLookup() {
    setLooking(true);
    setLookupError(null);
    setLookup(null);
    try {
      // Accept both 'YYYY-MM-DDTHH:MM' and 'YYYY-MM-DD HH:MM' formats
      const normalized = timeValue.trim().replace(' ', 'T');
      const ts = Math.floor(new Date(normalized).getTime() / 1000);
      if (!Number.isFinite(ts) || ts <= 0) throw new Error('Pick a valid date/time (YYYY-MM-DD HH:MM).');
      const walletParam = wallet ? `&wallet=${wallet}` : '';
      const res = await fetch(`/api/registry/snapshot-at?ts=${ts}${walletParam}`);
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error || 'Lookup failed.');
      } else {
        setLookup(data);
      }
    } catch (err) {
      setLookupError(err.message || 'Lookup failed.');
    } finally {
      setLooking(false);
    }
  }

  return (
    <main className="page-investigate container">
      <div className="investigate-header">
        <p className="section-title" style={{ justifyContent: 'center' }}>Snapshot / Timestamp</p>
        <p className="text-muted mono" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)' }}>
          {status?.address ? `Registry: ${shortenAddress(status.address, 8)}` : 'Registry: not configured'}
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <Link to="/" className="btn btn-secondary btn-sm">Home</Link>
          {wallet && (
            <Link to={`/investigate/${wallet}`} className="btn btn-ghost btn-sm">Investigate {shortenAddress(wallet, 4)}</Link>
          )}
        </div>
      </div>

      {/* Wallet address input */}
      <section className="section" aria-label="Load snapshots">
        <h2 className="section-title">Load Snapshots</h2>
        <form onSubmit={handleAddressSubmit} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
          <input
            type="text"
            className="input"
            placeholder="0x... wallet address"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loadingSnaps}>
            {loadingSnaps ? '...' : 'Load'}
          </button>
        </form>

        {snapError && (
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)' }}>
            {snapError}
          </p>
        )}

        {snapshots.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginTop: 'var(--space-md)' }}>
            <p className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
              {snapshots.length} snapshot(s) for {shortenAddress(wallet, 6)}
            </p>
            {snapshots.map((s) => (
              <SnapshotCard key={s.tokenId} s={s} />
            ))}
          </div>
        )}

        {wallet && !loadingSnaps && !snapError && snapshots.length === 0 && (
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-md)' }}>
            No snapshots minted for this wallet yet.
          </p>
        )}
      </section>

      {/* Timestamp lookup */}
      <section className="section" aria-label="Timestamp lookup">
        <h2 className="section-title">What Was Known At a Time</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)', alignItems: 'center' }}>
          <input
            type="text"
            className="input"
            placeholder="YYYY-MM-DD HH:MM"
            value={timeValue}
            onChange={(e) => setTimeValue(e.target.value)}
            style={{ flex: 1, minWidth: '220px', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}
          />
          <button className="btn btn-primary" onClick={handleTimestampLookup} disabled={looking || !timeValue}>
            {looking ? 'SEARCHING...' : 'FIND SNAPSHOT'}
          </button>
        </div>

        {lookupError && (
          <p style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)', color: 'var(--status-error)' }}>
            {lookupError}
          </p>
        )}

        {lookup && lookup.found && lookup.snapshot && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <SnapshotCard s={lookup.snapshot} />
          </div>
        )}

        {lookup && !lookup.found && (
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-md)' }}>
            No snapshot exists at or before that time.
          </p>
        )}
      </section>
    </main>
  );
}