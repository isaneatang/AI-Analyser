/**
 * Snapshot - Timestamp page for the on-chain InvestigationRegistry.
 * Browse snapshot NFTs minted for a wallet and query the latest snapshot
 * published at or before a selected time.
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { isValidEvmAddress, shortenAddress } from '../utils/address';
import { formatDateTime } from '../utils/format';
import { keccak256, toHex } from 'viem';

function SnapshotCard({ s, onSelect }) {
  const computedHash = s.dataRef ? keccak256(toHex(s.dataRef)) : null;
  const contentMatches = computedHash
    ? computedHash.toLowerCase() === s.summaryHash?.toLowerCase()
    : null;

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
            {formatDateTime(Number(s.timestamp) * 1000)}
          </span>
        )}
      </div>
      <div style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.8 }}>
        <div className="mono" style={{ color: 'var(--green-bright)', wordBreak: 'break-all' }}>
          {s.summaryHash}
        </div>
        <p className={`snapshot-proof ${contentMatches === true ? 'verified' : contentMatches === false ? 'mismatch' : ''}`}>
          {contentMatches === true
            ? 'CONTENT HASH VERIFIED'
            : contentMatches === false
              ? 'CONTENT HASH MISMATCH'
              : 'NO EMBEDDED CONTENT TO VERIFY'}
        </p>
        <div className="text-muted">
          Wallet: <span className="mono">{shortenAddress(s.wallet, 6)}</span>
          {s.investigator && (
            <> · by <span className="mono">{shortenAddress(s.investigator, 6)}</span></>
          )}
        </div>
        {s.dataRef && (
          <details style={{ marginTop: 'var(--space-sm)' }}>
            <summary className="mono text-muted" style={{ fontSize: '10px', cursor: 'pointer' }}>
               view on-chain report ({s.dataRef.length} chars)
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

  // Timestamp lookup - separate date/time so mobile wallet browsers
  // don't need to render a native date picker (which often fails).
  const [snapshotDate, setSnapshotDate] = useState('');
  const [snapshotTime, setSnapshotTime] = useState('');
  const [lookup, setLookup] = useState(null);
  const [looking, setLooking] = useState(false);
  const [lookupError, setLookupError] = useState(null);

  const wallet = walletParam && isValidEvmAddress(walletParam) ? walletParam.toLowerCase() : null;
  const invalidWalletParam = Boolean(walletParam && !wallet);

  useEffect(() => {
    setAddressInput(walletParam || '');
  }, [walletParam]);

  useEffect(() => {
    fetch('/api/registry/status')
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Registry status unavailable.');
        return data;
      })
      .catch(() => ({ configured: false, address: null }))
      .then((data) => setStatus(data));
  }, []);

  useEffect(() => {
    setSnapshots([]);
    setSnapError(null);
    setLookup(null);
    setLookupError(null);
    setLoadedFor(null);
    if (!wallet) return;
    let cancelled = false;
    fetch(`/api/registry/snapshots/${wallet}`)
      .then(async (r) => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to load snapshots.');
        return data;
      })
      .then((data) => {
        if (cancelled) return;
        setSnapshots((data.snapshots || []).sort((a, b) => Number(b.timestamp) - Number(a.timestamp)));
      })
      .catch((err) => !cancelled && setSnapError(err.message || 'Failed to load snapshots.'))
      .finally(() => { if (!cancelled) setLoadedFor(wallet); });
    return () => { cancelled = true; };
  }, [wallet]);

  // Loading is derived: true until the fetch for the current wallet resolves.
  const loadingSnaps = !!wallet && loadedFor !== wallet;

  function handleAddressSubmit(e) {
    e.preventDefault();
    const addr = addressInput.trim();
    if (isValidEvmAddress(addr)) {
      setSnapError(null);
      navigate(`/snapshot/${addr}`);
    } else {
      setSnapError('Invalid EVM address.');
    }
  }

  async function handleTimestampLookup(e) {
    e?.preventDefault();
    setLooking(true);
    setLookupError(null);
    setLookup(null);
    try {
      if (!wallet) throw new Error('Load a wallet before searching its publication history.');
      const combined = `${snapshotDate}T${snapshotTime || '00:00'}`;
      const ts = Math.floor(new Date(combined).getTime() / 1000);
      if (!Number.isFinite(ts) || ts <= 0) throw new Error('Enter a date (YYYY-MM-DD) and optional time (HH:MM).');
      const res = await fetch(`/api/registry/snapshot-at?ts=${ts}&wallet=${wallet}`);
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
        <p className="eyebrow">ON-CHAIN RECORDS / BOT CHAIN</p>
        <h1 className="snapshot-title">Snapshot Registry</h1>
        <p className="snapshot-intro">Inspect published investigation records and verify embedded report content against its on-chain hash.</p>
        <p className="text-muted mono" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)' }}>
          {!status ? 'Checking registry...' : status.address ? `Registry: ${shortenAddress(status.address, 8)}` : 'Registry unavailable'}
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
        <form onSubmit={handleAddressSubmit} className="snapshot-form">
          <label htmlFor="snapshot-wallet" className="sr-only">Wallet address</label>
          <input
            id="snapshot-wallet"
            type="text"
            className="input"
            placeholder="0x... wallet address"
            value={addressInput}
            onChange={(e) => setAddressInput(e.target.value)}
            style={{ flex: 1, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={loadingSnaps}>
            {loadingSnaps ? 'LOADING...' : 'LOAD'}
          </button>
        </form>

        {(snapError || invalidWalletParam) && (
          <p role="alert" className="input-error-text">
            {snapError || 'The wallet address in this URL is invalid.'}
          </p>
        )}

        {loadingSnaps && <p role="status" className="snapshot-status">Reading snapshot records from BOT Chain...</p>}

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
        <h2 className="section-title">Latest Published Snapshot</h2>
        <p className="metric-note">Find the newest snapshot published at or before a local date and time. Publication proves that the content hash was recorded then, not that its claims are true or endorsed by the investigated wallet.</p>
        <form className="snapshot-form" onSubmit={handleTimestampLookup}>
          <label htmlFor="snapshot-date" className="sr-only">Date YYYY-MM-DD</label>
          <input
            id="snapshot-date"
            type="text"
            className="input"
            placeholder="YYYY-MM-DD"
            value={snapshotDate}
            onChange={(e) => setSnapshotDate(e.target.value)}
            style={{ flex: 1, minWidth: '140px', fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}
          />
          <label htmlFor="snapshot-time" className="sr-only">Time HH:MM (optional)</label>
          <input
            id="snapshot-time"
            type="text"
            className="input"
            placeholder="HH:MM"
            value={snapshotTime}
            onChange={(e) => setSnapshotTime(e.target.value)}
            style={{ width: '100px', flexShrink: 0, fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)' }}
          />
          <button type="submit" className="btn btn-primary" disabled={looking || !snapshotDate || !wallet}>
            {looking ? 'SEARCHING...' : 'FIND SNAPSHOT'}
          </button>
        </form>

        {lookupError && (
          <p role="alert" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-sm)', color: 'var(--status-error)' }}>
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
