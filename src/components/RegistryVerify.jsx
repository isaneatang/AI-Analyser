/**
 * RegistryVerify - On-chain report anchoring for the InvestigationRegistry.
 * Uses the user's connected wallet (wagmi) to sign anchor/mint transactions.
 * Shows the report hash, lets the user anchor it to BOT Chain (timestamp
 * proof), and lists previously anchored hashes for the wallet.
 */

import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useWallet } from '../context/WalletContext';
import { getReportHash, buildReportMarkdown } from '../utils/report';
import { shortenAddress } from '../utils/address';
import { formatDate } from '../utils/format';
import { REGISTRY_ABI } from '../../shared/registryAbi';
import { BOT_CHAIN } from '../config/botChain';

/**
 * @param {Object} props
 * @param {Object} props.investigation - Current investigation data.
 */
export default function RegistryVerify({ investigation }) {
  const [status, setStatus] = useState(null);
  const [reports, setReports] = useState([]);
  const [message, setMessage] = useState(null);
  const [mintResult, setMintResult] = useState(null);
  const [pendingAction, setPendingAction] = useState(null); // 'anchor' | 'mint'
  const [fallbackConfirmed, setFallbackConfirmed] = useState(false);

  const { address: connectedAddress, isConnected } = useWallet();

  const wallet = investigation?.wallet;

  const reportHash = useMemo(
    () => (investigation ? getReportHash(investigation) : ''),
    [investigation]
  );

  // wagmi write contract hooks
  const { writeContract, data: txHash, isPending, error: txError } = useWriteContract();

  // Wait for transaction confirmation. chainId is pinned to BOT Chain so the
  // receipt is polled on the right public client even if wagmi's tracked
  // connected chain differs.
  const { isLoading: isConfirming, isSuccess: hookConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
    chainId: BOT_CHAIN.chainId,
  });
  const isConfirmed = hookConfirmed || fallbackConfirmed;

  // Fallback receipt polling straight against the BOT RPC. The wagmi hook
  // depends on the app-side transport; if it ever stalls again this still
  // resolves the UI once the transaction has actually mined.
  useEffect(() => {
    if (!txHash || isConfirmed) return undefined;
    let cancelled = false;
    const startedAt = Date.now();
    const timer = setInterval(async () => {
      if (cancelled) return;
      if (Date.now() - startedAt > 120000) {
        cancelled = true;
        clearInterval(timer);
        return;
      }
      try {
        const res = await fetch(BOT_CHAIN.rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'eth_getTransactionReceipt',
            params: [txHash],
          }),
        });
        const data = await res.json();
        if (!cancelled && data?.result?.blockNumber) setFallbackConfirmed(true);
      } catch {
        // keep polling
      }
    }, 5000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [txHash, isConfirmed]);

  // Load registry status + existing reports
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/registry/status');
        const data = await res.json();
        if (!cancelled) setStatus(data);
      } catch {
        if (!cancelled) setStatus({ configured: false, address: null });
      }

      if (!wallet) return;
      try {
        const res = await fetch(`/api/registry/reports/${wallet}`);
        const data = await res.json();
        if (!cancelled && data.reports) setReports(data.reports);
      } catch {
        // Registry may not be deployed yet; leave reports empty.
      }
    }

    load();
    return () => { cancelled = true; };
  }, [wallet]);

  // After transaction is confirmed, show the result
  useEffect(() => {
    if (isConfirmed && txHash && pendingAction) {
      if (pendingAction === 'anchor') {
        setMessage({ type: 'ok', text: `Anchored on-chain. TX: ${txHash}` });
        setReports((prev) => [
          ...prev,
          {
            summaryHash: reportHash,
            timestamp: Math.floor(Date.now() / 1000),
            investigator: connectedAddress || 'you',
          },
        ]);
      } else if (pendingAction === 'mint') {
        setMessage({ type: 'ok', text: `Snapshot minted successfully.` });
        setMintResult({
          tokenId: 'confirmed',
          hash: txHash,
          timestamp: Math.floor(Date.now() / 1000),
          summaryHash: reportHash,
          wallet,
        });
        // Refresh reports
        if (wallet) {
          fetch(`/api/registry/reports/${wallet}`)
            .then((r) => r.json())
            .then((data) => { if (data.reports) setReports(data.reports); })
            .catch(() => {});
        }
      }
      setPendingAction(null);
    }
  }, [isConfirmed, txHash, pendingAction]);

  // Handle transaction errors
  useEffect(() => {
    if (txError) {
      const msg = txError.message || '';
      if (msg.includes('User rejected') || msg.includes('user rejected')) {
        setMessage({ type: 'error', text: 'Transaction was rejected by your wallet.' });
      } else {
        setMessage({ type: 'error', text: `Transaction failed: ${msg.slice(0, 120)}` });
      }
      setPendingAction(null);
    }
  }, [txError]);

  function handleAnchor() {
    if (!isConnected) {
      setMessage({ type: 'error', text: 'Connect your wallet first.' });
      return;
    }
    setMessage(null);
    setPendingAction('anchor');
    setFallbackConfirmed(false);
    // BOT Chain RPC rejects EIP-1559 (type 0x2); force legacy (type 0x0).
    writeContract({
      address: status.address,
      abi: REGISTRY_ABI,
      functionName: 'anchorReport',
      args: [wallet, reportHash],
      type: '0x0',
    });
  }

  function handleMint() {
    if (!isConnected) {
      setMessage({ type: 'error', text: 'Connect your wallet first.' });
      return;
    }
    setMessage(null);
    setPendingAction('mint');
    setMintResult(null);
    setFallbackConfirmed(false);
    // BOT Chain RPC rejects EIP-1559 (type 0x2); force legacy (type 0x0).
    writeContract({
      address: status.address,
      abi: REGISTRY_ABI,
      functionName: 'mintSnapshot',
      args: [wallet, reportHash, buildReportMarkdown(investigation)],
      type: '0x0',
    });
  }

  const busy = isPending || isConfirming;

  return (
    <section className="section" aria-label="On-chain registry">
      <h2 className="section-title">On-Chain Registry</h2>
      <div className="card">
        <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', lineHeight: 1.6 }}>
          Anchors a hash of this report to BOT Chain, proving the report existed
          at a specific block timestamp. Anyone can recompute the hash from the
          downloaded report and verify it on-chain.
        </p>

        {/* Report hash */}
        <div
          className="mono"
          style={{
            margin: 'var(--space-md) 0',
            padding: 'var(--space-sm)',
            background: 'var(--bg-primary)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10px',
            color: 'var(--green-bright)',
            wordBreak: 'break-all',
          }}
        >
          {reportHash}
        </div>

        {status && !status.configured ? (
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            Registry not configured yet. Deploy the contract (npm run deploy:registry)
            and set REGISTRY_CONTRACT in .env.
          </p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleAnchor}
              disabled={busy || !isConnected}
            >
              {busy && pendingAction === 'anchor'
                ? (isConfirming ? 'CONFIRMING...' : 'SIGNING...')
                : 'ANCHOR REPORT ON-CHAIN'}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={handleMint}
              disabled={busy || !isConnected}
            >
              {busy && pendingAction === 'mint'
                ? (isConfirming ? 'CONFIRMING...' : 'SIGNING...')
                : 'MINT SNAPSHOT'}
            </button>
            <Link to={`/snapshot/${wallet}`} className="btn btn-ghost btn-sm">
              TIMESTAMP PAGE
            </Link>
          </div>
        )}

        {!isConnected && status?.configured && (
          <p className="mono" style={{ fontSize: '10px', marginTop: 'var(--space-sm)', color: 'var(--status-warning)' }}>
            Connect your wallet to anchor or mint on-chain.
          </p>
        )}

        {status?.address && (
          <p className="mono text-muted" style={{ fontSize: '10px', marginTop: 'var(--space-sm)' }}>
            Registry: {shortenAddress(status.address, 8)}
          </p>
        )}

        {message && (
          <p
            style={{
              marginTop: 'var(--space-sm)',
              fontSize: 'var(--font-size-xs)',
              color: message.type === 'ok' ? 'var(--green-bright)' : 'var(--status-error)',
              wordBreak: 'break-all',
            }}
          >
            {message.text}
          </p>
        )}

        {/* Minted snapshot result details */}
        {mintResult && (
          <div
            className="card"
            style={{
              marginTop: 'var(--space-md)',
              borderLeft: '3px solid var(--green-bright)',
              background: 'var(--bg-primary)',
            }}
          >
            <p className="mono text-green" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, marginBottom: 'var(--space-sm)' }}>
              SNAPSHOT MINTED
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-xs)', fontSize: 'var(--font-size-xs)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Timestamp</span>
                <span className="mono text-green">{formatDate(mintResult.timestamp * 1000)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Summary Hash</span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--green-bright)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>
                  {mintResult.summaryHash.slice(0, 18)}...
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Transaction</span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--orange-bright)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>
                  {mintResult.hash?.slice(0, 18)}...
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="text-muted">Minted To</span>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                  {shortenAddress(mintResult.wallet, 8)}
                </span>
              </div>
            </div>
            <div style={{ marginTop: 'var(--space-sm)', display: 'flex', gap: 'var(--space-sm)' }}>
              <Link to={`/snapshot/${wallet}`} className="btn btn-ghost btn-sm" style={{ fontSize: '10px' }}>
                VIEW ON TIMESTAMP PAGE
              </Link>
            </div>
          </div>
        )}

        {/* Previously anchored reports */}
        {reports.length > 0 && (
          <div style={{ marginTop: 'var(--space-md)' }}>
            <p className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-sm)' }}>
              Anchored reports ({reports.length})
            </p>
            {reports.map((r, i) => (
              <div
                key={`${r.summaryHash}-${i}`}
                style={{
                  padding: 'var(--space-xs) 0',
                  borderBottom: '1px solid var(--border-subtle)',
                  fontSize: '10px',
                }}
              >
                <div className="mono text-green" style={{ wordBreak: 'break-all' }}>{r.summaryHash}</div>
                <div className="mono text-muted">
                  {r.timestamp ? formatDate(Number(r.timestamp) * 1000) : 'Unknown'} · by {shortenAddress(r.investigator || '')}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
