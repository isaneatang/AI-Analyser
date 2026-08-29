/**
 * Investigate - Main investigation dashboard page.
 * Fetches real blockchain data via the investigate API.
 * Displays: overview, activity score, AI analysis, Ask the Wallet chat,
 * attention signals, token holdings (incl. cross-chain), counterparties,
 * fund flow, and transactions.
 */

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useInvestigation } from '../context/InvestigationContext';
import { isValidEvmAddress, shortenAddress } from '../utils/address';
import { formatTokenAmount, formatNumber, formatUsd, timeAgo, formatDate } from '../utils/format';
import InvestigationLoader from '../components/InvestigationLoader';
import EmptyState from '../components/EmptyState';
import AIProfile from '../components/AIProfile';
import AskWallet from '../components/AskWallet';
import CrossChainTokens from '../components/CrossChainTokens';
import Markdown from '../components/Markdown';
import RegistryVerify from '../components/RegistryVerify';
import { downloadReport } from '../utils/report';
import { saveRecentInvestigation } from '../utils/storage';

/** Transaction type filter options */
const TX_FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'TRANSFER', label: 'Transfers' },
  { key: 'TOKEN_TRANSFER', label: 'Tokens' },
  { key: 'CONTRACT_INTERACTION', label: 'Contracts' },
  { key: 'SWAP', label: 'Swaps' },
  { key: 'UNKNOWN', label: 'Other' },
];

/** Time filter options */
const TIME_FILTERS = [
  { key: '24h', label: '24h', ms: 86400000 },
  { key: '7d', label: '7d', ms: 604800000 },
  { key: '30d', label: '30d', ms: 2592000000 },
  { key: '90d', label: '90d', ms: 7776000000 },
  { key: 'all', label: 'All', ms: Infinity },
];

/** Severity color mapping for attention signals */
const SEVERITY_COLORS = {
  HIGH: 'var(--status-error)',
  MEDIUM: 'var(--orange-bright)',
  LOW: 'var(--text-secondary)',
};

export default function Investigate() {
  const { address } = useParams();
  const isValid = isValidEvmAddress(address);
  const { investigation, loading, error, loadingStage, investigate } = useInvestigation();
  const investigatedRef = useRef(null);

  // Section navigation
  const [activeSection, setActiveSection] = useState('overview');
  const sectionRefs = useRef({});

  const registerSection = useCallback((id, el) => {
    sectionRefs.current[id] = el;
  }, []);

  const scrollToSection = useCallback((id) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setActiveSection(id);
    }
  }, []);

  // Track which section is in view
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.dataset.section);
          }
        }
      },
      { rootMargin: '-80px 0px -60% 0px', threshold: 0 }
    );
    Object.values(sectionRefs.current).forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [investigation]);

  // Transaction filter state
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txTimeFilter, setTxTimeFilter] = useState('all');
  const [expandedTx, setExpandedTx] = useState(null);
  const [explainingTx, setExplainingTx] = useState(null);
  const [txExplanation, setTxExplanation] = useState({});
  // Fund flow tab: outgoing expanded by default
  const [fundTab, setFundTab] = useState('outgoing');
  // Copy address feedback
  const [copied, setCopied] = useState(false);
  const [visibleTxCount, setVisibleTxCount] = useState(50);

  // Start investigation exactly once per address
  useEffect(() => {
    if (isValid && address && investigatedRef.current !== address) {
      investigatedRef.current = address;
      investigate(address);
    }
  }, [address, isValid]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setActiveSection('overview');
    setTxTypeFilter('ALL');
    setTxTimeFilter('all');
    setExpandedTx(null);
    setExplainingTx(null);
    setTxExplanation({});
    setFundTab('outgoing');
    setCopied(false);
    setVisibleTxCount(50);
  }, [address]);

  const hasCurrentInvestigation = investigation?.wallet?.toLowerCase() === address?.toLowerCase();

  useEffect(() => {
    if (hasCurrentInvestigation) saveRecentInvestigation(address, investigation.network);
  }, [address, hasCurrentInvestigation, investigation?.network]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    if (!investigation) return [];
    let txs = investigation.transactions;

    // Type filter
    if (txTypeFilter !== 'ALL') {
      txs = txs.filter((tx) => tx.type === txTypeFilter);
    }

    // Time filter
    if (txTimeFilter !== 'all') {
      const cutoff = Date.now() / 1000 - TIME_FILTERS.find((f) => f.key === txTimeFilter).ms / 1000;
      txs = txs.filter((tx) => tx.timestamp && Number(tx.timestamp) >= cutoff);
    }

    return txs;
  }, [investigation, txTypeFilter, txTimeFilter]);

  // Build fund flow data from counterparties
  const fundFlow = useMemo(() => {
    if (!investigation) return { incoming: [], outgoing: [] };
    const { transactions } = investigation;
    const incoming = [];
    const outgoing = [];

    for (const tx of transactions) {
      if (tx.direction === 'incoming' && tx.from) {
        incoming.push({
          address: tx.from,
          value: tx.isTokenTransfer ? tx.value : tx.value,
          token: tx.tokenSymbol || 'BOT',
          hash: tx.hash,
          timestamp: tx.timestamp,
        });
      } else if (tx.direction === 'outgoing' && tx.to) {
        outgoing.push({
          address: tx.to,
          value: tx.isTokenTransfer ? tx.value : tx.value,
          token: tx.tokenSymbol || 'BOT',
          hash: tx.hash,
          timestamp: tx.timestamp,
        });
      }
    }

    // Aggregate by address
    const aggregate = (items) => {
      const map = new Map();
      for (const item of items) {
        const key = item.address.toLowerCase();
        if (!map.has(key)) {
          map.set(key, { address: item.address, totalValue: 0, token: item.token, count: 0, lastTx: item });
        }
        const entry = map.get(key);
        entry.totalValue += Number(item.value) || 0;
        entry.count++;
        if (item.timestamp > (entry.lastTx?.timestamp || 0)) entry.lastTx = item;
      }
      return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 5);
    };

    return { incoming: aggregate(incoming), outgoing: aggregate(outgoing) };
  }, [investigation]);

  if (!isValid) {
    return (
      <main className="page-investigate container">
        <EmptyState
          icon="?"
          text="Invalid wallet address"
          sub="The address in the URL is not a valid EVM address."
        />
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <Link to="/" className="btn btn-primary">Back to Home</Link>
        </div>
      </main>
    );
  }

  if (loading || (!hasCurrentInvestigation && !error)) {
    return (
      <main className="page-investigate container">
        <InvestigationLoader stage={loadingStage} />
      </main>
    );
  }

  if (error) {
    return (
      <main className="page-investigate container">
        <EmptyState
          icon="!"
          text="Investigation failed"
          sub={error}
        />
        <div style={{ textAlign: 'center', marginTop: 'var(--space-lg)' }}>
          <button className="btn btn-primary" onClick={() => {
            investigatedRef.current = null;
            investigate(address);
          }}>
            Retry
          </button>
          <Link to="/" className="btn btn-secondary" style={{ marginLeft: 'var(--space-sm)' }}>
            Back to Home
          </Link>
        </div>
      </main>
    );
  }

  if (!hasCurrentInvestigation) return null;

  const { overview, tokens, transactions, counterparties, activityScore, attentionSignals } = investigation;

  const SECTIONS = [
    { id: 'overview', label: 'OVERVIEW' },
    { id: 'score', label: 'SCORE' },
    { id: 'ai', label: 'AI ANALYSIS' },
    { id: 'signals', label: 'SIGNALS' },
    { id: 'tokens', label: 'TOKENS' },
    { id: 'counterparties', label: 'COUNTERPARTIES' },
    { id: 'fundflow', label: 'FUND FLOW' },
    { id: 'transactions', label: 'TRANSACTIONS' },
    { id: 'registry', label: 'REGISTRY' },
  ];

  const visibleSections = SECTIONS.filter((s) => {
    if (s.id === 'signals') return attentionSignals && attentionSignals.length > 0;
    if (s.id === 'counterparties') return counterparties.length > 0;
    if (s.id === 'fundflow') return fundFlow.incoming.length > 0 || fundFlow.outgoing.length > 0;
    if (s.id === 'transactions') return transactions.length > 0;
    return true;
  });

  function handleCopyAddress() {
    navigator.clipboard.writeText(address).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <main className="page-investigate container">
      {/* Target Wallet Header */}
      <div className="investigate-header">
        <p className="eyebrow">ACTIVE CASE / BOT CHAIN</p>
        <h1 className="investigate-wallet">{shortenAddress(address, 8)}</h1>
        <button
          className="mono"
          onClick={handleCopyAddress}
          style={{
            background: 'none',
            border: 'none',
            fontSize: 'var(--font-size-xs)',
            color: copied ? 'var(--green-bright)' : 'var(--text-muted)',
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: 'var(--radius-sm)',
            transition: 'color 0.15s ease',
          }}
          title="Copy full address"
          aria-label="Copy investigated wallet address"
        >
          {copied ? 'COPIED' : address}
        </button>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-sm)', marginTop: 'var(--space-md)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => downloadReport(investigation)}>
            DOWNLOAD REPORT
          </button>
        </div>
      </div>

      {/* Section Navigation Sidebar */}
      <nav className="section-nav" aria-label="Section navigation">
        {visibleSections.map((s) => (
          <button
            key={s.id}
            className={`section-nav-btn ${activeSection === s.id ? 'section-nav-active' : ''}`}
            onClick={() => scrollToSection(s.id)}
            aria-current={activeSection === s.id ? 'location' : undefined}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {/* Wallet Overview */}
      <section className="section" aria-label="Wallet overview" ref={(el) => registerSection('overview', el)} data-section="overview">
        <h2 className="section-title">Wallet Overview</h2>
        <div className="stat-grid">
          <div className="stat-item">
            <p className="stat-label">Balance</p>
            <p className="stat-value green">{formatTokenAmount(overview.balance)} BOT</p>
            {overview.balanceUsd !== null && overview.balanceUsd !== undefined && (
              <p className="mono text-muted" style={{ fontSize: '10px', marginTop: '2px' }}>
                ≈ ${formatUsd(overview.balanceUsd).replace('$', '')}
              </p>
            )}
          </div>
          <div className="stat-item">
            <p className="stat-label">Transactions</p>
            <p className="stat-value">{formatNumber(overview.transactionCount)}</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Token Transfers</p>
            <p className="stat-value">{formatNumber(overview.tokenTransferCount)}</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Tokens</p>
            <p className="stat-value">{formatNumber(overview.tokenCount)}</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Counterparties</p>
            <p className="stat-value">{formatNumber(counterparties.length)}</p>
          </div>
          <div className="stat-item">
            <p className="stat-label">Wallet Age</p>
            <p className="stat-value">
              {overview.walletAgeDays === null || overview.walletAgeDays === undefined
                ? 'Unknown'
                : overview.walletAgeDays === 0
                  ? 'Less than a day'
                  : `${overview.walletAgeDays} days`}
            </p>
          </div>
        </div>
      </section>

      {/* Activity Score */}
      <section className="section" aria-label="Activity score" ref={(el) => registerSection('score', el)} data-section="score">
        <h2 className="section-title">Activity Score</h2>
        <div className="card">
          <p className="metric-note">Measures observed activity, not safety or reputation.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-lg)', marginBottom: 'var(--space-md)' }}>
            <span
              className="mono activity-score"
              style={{
                color: activityScore.total >= 50 ? 'var(--green-bright)' : 'var(--text-primary)',
              }}
            >
              {activityScore.total}
            </span>
            <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>/ 100</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {activityScore.factors.map((factor) => (
              <div key={factor.label} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <span className="mono" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', width: '180px', flexShrink: 0 }}>
                  {factor.label}
                </span>
                <div style={{ flex: 1, height: '6px', background: 'var(--bg-primary)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(factor.score / factor.max) * 100}%`,
                      background: 'var(--green-muted)',
                      borderRadius: '3px',
                      transition: 'width 0.5s ease',
                    }}
                  />
                </div>
                <span className="mono" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', width: '40px', textAlign: 'right' }}>
                  {factor.score}/{factor.max}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Analysis + Ask the Wallet */}
      <section className="section" aria-label="AI analysis" ref={(el) => registerSection('ai', el)} data-section="ai">
        <h2 className="section-title">AI Analysis</h2>
        <div className="card">
          <AIProfile key={`profile-${address}`} investigation={investigation} embedded />
          <div
            style={{
              borderTop: '1px solid var(--border-subtle)',
              margin: 'var(--space-md) 0 0',
              paddingTop: 'var(--space-md)',
            }}
          >
            <AskWallet key={`chat-${address}`} investigation={investigation} embedded />
          </div>
        </div>
      </section>

      {/* Attention Signals */}
      {attentionSignals && attentionSignals.length > 0 && (
        <section className="section" aria-label="Attention signals" ref={(el) => registerSection('signals', el)} data-section="signals">
          <h2 className="section-title">Attention Signals</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)' }}>
            {attentionSignals.map((signal, i) => (
              <div
                key={i}
                className="card"
                style={{ borderLeftColor: SEVERITY_COLORS[signal.severity], borderLeftWidth: '3px', borderLeftStyle: 'solid' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-xs)' }}>
                  <span
                    className="mono"
                    style={{
                      fontSize: '10px',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)',
                      background: `${SEVERITY_COLORS[signal.severity]}20`,
                      color: SEVERITY_COLORS[signal.severity],
                    }}
                  >
                    {signal.severity}
                  </span>
                  <span className="mono" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    {signal.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', lineHeight: '1.5' }}>
                  {signal.reason}
                </p>
                {signal.evidenceHash && (
                  <p className="mono text-muted" style={{ fontSize: '10px', marginTop: 'var(--space-xs)' }}>
                    TX: {signal.evidenceHash.slice(0, 16)}...
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Token Holdings + Cross-Chain */}
      <section className="section" aria-label="Token holdings" ref={(el) => registerSection('tokens', el)} data-section="tokens">
        <h2 className="section-title">Token Holdings</h2>
        <div className="card">
          <h3 className="card-title" style={{ color: 'var(--green-bright)', marginBottom: 'var(--space-sm)' }}>
            BOT Chain
          </h3>
          {tokens.length === 0 ? (
            <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
              No BOT Chain tokens held.
            </p>
          ) : (
            tokens.map((token) => (
              <div
                key={token.contractAddress || token.symbol}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div>
                  <span className="mono" style={{ fontSize: 'var(--font-size-sm)' }}>{token.symbol}</span>
                  <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'var(--space-sm)' }}>{token.name}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span className="mono" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {formatTokenAmount(token.balance, token.decimals)}
                  </span>
                  {token.usdValue !== null && (
                    <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'var(--space-sm)' }}>
                      ${token.usdValue.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}

          <div style={{ borderTop: '1px solid var(--border-subtle)', margin: 'var(--space-md) 0', paddingTop: 'var(--space-md)' }} />

          <h3 className="card-title" style={{ color: 'var(--orange-bright)', marginBottom: 'var(--space-sm)' }}>
            Cross-Chain
          </h3>
          <CrossChainTokens key={`chains-${address}`} address={address} embedded />
        </div>
      </section>

      {/* Top Counterparties */}
      {counterparties.length > 0 && (
        <section className="section" aria-label="Counterparties" ref={(el) => registerSection('counterparties', el)} data-section="counterparties">
          <h2 className="section-title">Counterparties</h2>
          <div className="card">
            {counterparties.slice(0, 10).map((cp) => (
              <div
                key={cp.address}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 'var(--space-sm) 0',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                  <Link
                    to={`/investigate/${cp.address}`}
                    className="mono text-green"
                    style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}
                    title={`Investigate ${cp.address}`}
                  >
                    {shortenAddress(cp.address)}
                  </Link>
                  <span
                    className="text-muted"
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      marginLeft: 'var(--space-sm)',
                      padding: '2px 6px',
                      background: 'var(--bg-primary)',
                      borderRadius: 'var(--radius-sm)',
                    }}
                  >
                    {cp.classification}
                  </span>
                </div>
                <span className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                  {cp.interactions} interactions
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fund Flow */}
      {(fundFlow.incoming.length > 0 || fundFlow.outgoing.length > 0) && (
        <section className="section" aria-label="Fund flow" ref={(el) => registerSection('fundflow', el)} data-section="fundflow">
          <h2 className="section-title">Fund Flow</h2>

          {/* Tabs: outgoing expanded by default */}
          <div className="fund-tabs" aria-label="Fund flow direction">
            <button
              aria-pressed={fundTab === 'incoming'}
              className={`fund-tab ${fundTab === 'incoming' ? 'fund-tab-in' : ''}`}
              onClick={() => setFundTab('incoming')}
            >
              INCOMING ({fundFlow.incoming.length})
            </button>
            <button
              aria-pressed={fundTab === 'outgoing'}
              className={`fund-tab ${fundTab === 'outgoing' ? 'fund-tab-out' : ''}`}
              onClick={() => setFundTab('outgoing')}
            >
              OUTGOING ({fundFlow.outgoing.length})
            </button>
          </div>

          <div className="card">
            {fundTab === 'incoming' ? (
              fundFlow.incoming.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>No incoming flows detected</p>
              ) : (
                fundFlow.incoming.map((item) => (
                  <div
                    key={item.address}
                    style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link
                        to={`/investigate/${item.address}`}
                        className="mono"
                        style={{ fontSize: '10px', color: 'var(--green-bright)' }}
                      >
                        {shortenAddress(item.address)}
                      </Link>
                      <span className="mono text-green" style={{ fontSize: '10px' }}>
                        +{item.count} txs
                      </span>
                    </div>
                  </div>
                ))
              )
            ) : (
              fundFlow.outgoing.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>No outgoing flows detected</p>
              ) : (
                fundFlow.outgoing.map((item) => (
                  <div
                    key={item.address}
                    style={{ padding: 'var(--space-xs) 0', borderBottom: '1px solid var(--border-subtle)' }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Link
                        to={`/investigate/${item.address}`}
                        className="mono"
                        style={{ fontSize: '10px', color: 'var(--orange-bright)' }}
                      >
                        {shortenAddress(item.address)}
                      </Link>
                      <span className="mono text-orange" style={{ fontSize: '10px' }}>
                        -{item.count} txs
                      </span>
                    </div>
                  </div>
                ))
              )
            )}
          </div>
        </section>
      )}

      {/* Recent Transactions with Filters */}
      <section className="section" aria-label="Transactions" ref={(el) => registerSection('transactions', el)} data-section="transactions">
        <h2 className="section-title">Transactions</h2>
        {transactions.length === 0 ? (
          <EmptyState icon="~" text="No transactions found" sub="BOT Chain RPC returned no transaction history for this wallet in the scanned range." />
        ) : (
          <>
            {/* Filters */}
            <div className="tx-filters">
              <div className="tx-filter-group" role="group" aria-label="Transaction type">
                {TX_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`btn btn-sm ${txTypeFilter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTxTypeFilter(f.key)}
                    aria-pressed={txTypeFilter === f.key}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="tx-filter-group" role="group" aria-label="Time range">
                {TIME_FILTERS.map((f) => (
                  <button
                    key={f.key}
                    className={`btn btn-sm ${txTimeFilter === f.key ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setTxTimeFilter(f.key)}
                    aria-pressed={txTimeFilter === f.key}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction List */}
            <div className="card">
              {filteredTransactions.length === 0 ? (
                <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)', textAlign: 'center', padding: 'var(--space-lg)' }}>
                  No transactions match the selected filters.
                </p>
              ) : (
                filteredTransactions.slice(0, visibleTxCount).map((tx) => (
                  <div key={tx.hash}>
                    {/* Transaction row */}
                    <div
                      className="tx-row"
                      onClick={() => setExpandedTx(expandedTx === tx.hash ? null : tx.hash)}
                      role="button"
                      tabIndex={0}
                      aria-expanded={expandedTx === tx.hash}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedTx(expandedTx === tx.hash ? null : tx.hash); } }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                          <span
                            className="mono"
                            style={{
                              fontSize: 'var(--font-size-xs)',
                              color: tx.direction === 'incoming' ? 'var(--green-bright)' : 'var(--orange-bright)',
                              fontWeight: '600',
                            }}
                          >
                            {tx.direction === 'incoming' ? 'IN' : tx.direction === 'outgoing' ? 'OUT' : 'N/A'}
                          </span>
                          <span className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {tx.type?.replace(/_/g, ' ')}
                          </span>
                          {tx.tokenSymbol && (
                            <span className="text-orange mono" style={{ fontSize: 'var(--font-size-xs)' }}>
                              {tx.tokenSymbol}
                            </span>
                          )}
                        </div>
                        <div className="mono text-muted" style={{ fontSize: '10px', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {shortenAddress(tx.from || tx.to || '', 6)}
                          {tx.hash && ` | ${tx.hash.slice(0, 14)}...`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 'var(--space-sm)' }}>
                        <span className="mono" style={{ fontSize: 'var(--font-size-xs)' }}>
                          {tx.isTokenTransfer
                            ? formatTokenAmount(tx.value, Number(tx.tokenDecimals))
                            : formatTokenAmount(tx.value)}
                        </span>
                        <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginLeft: 'var(--space-sm)' }}>
                          {tx.timestamp ? timeAgo(Number(tx.timestamp) * 1000) : ''}
                        </span>
                      </div>
                      <span className="tx-expand-icon" aria-hidden="true">
                        {expandedTx === tx.hash ? '-' : '+'}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {expandedTx === tx.hash && (
                      <div className="tx-detail">
                        <div className="tx-detail-grid">
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">Hash</span>
                            <span className="mono" style={{ fontSize: '10px', color: 'var(--green-bright)', wordBreak: 'break-all' }}>{tx.hash}</span>
                          </div>
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">From</span>
                            <span className="mono" style={{ fontSize: '10px', wordBreak: 'break-all' }}>{tx.from}</span>
                          </div>
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">To</span>
                            <span className="mono" style={{ fontSize: '10px', wordBreak: 'break-all' }}>{tx.to || 'Contract creation'}</span>
                          </div>
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">Value</span>
                            <span className="mono" style={{ fontSize: '10px' }}>
                              {tx.isTokenTransfer
                                ? `${formatTokenAmount(tx.value, Number(tx.tokenDecimals))} ${tx.tokenSymbol || ''}`
                                : `${formatTokenAmount(tx.value)} BOT`}
                            </span>
                          </div>
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">Status</span>
                            <span className="mono" style={{ fontSize: '10px', color: tx.status === '0x1' ? 'var(--status-success)' : 'var(--status-error)' }}>
                              {tx.status === '0x1' ? 'Success' : 'Failed'}
                            </span>
                          </div>
                          <div className="tx-detail-item">
                            <span className="tx-detail-label">Time</span>
                            <span className="mono" style={{ fontSize: '10px' }}>
                              {tx.timestamp ? formatDate(Number(tx.timestamp) * 1000) : 'Unknown'}
                            </span>
                          </div>
                        </div>

                        {/* Explain Transaction Button */}
                        <div style={{ marginTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)', paddingTop: 'var(--space-md)' }}>
                          {!txExplanation[tx.hash] && explainingTx !== tx.hash && (
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                setExplainingTx(tx.hash);
                                try {
                                  const res = await fetch('/api/explain-transaction', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ transaction: tx, investigation }),
                                    signal: AbortSignal.timeout(60000),
                                  });
                                  const data = await res.json();
                                  setTxExplanation((prev) => ({ ...prev, [tx.hash]: data.explanation || 'No explanation available.' }));
                                } catch {
                                  setTxExplanation((prev) => ({ ...prev, [tx.hash]: 'AI service is temporarily unavailable. Please try again later, or contact the developer if this persists.' }));
                                } finally {
                                  setExplainingTx(null);
                                }
                              }}
                            >
                              EXPLAIN TRANSACTION
                            </button>
                          )}

                          {explainingTx === tx.hash && (
                            <div className="tx-explaining">
                              <span className="tx-explaining-dot" />
                              <span className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                                Analyzing transaction...
                              </span>
                            </div>
                          )}

                          {txExplanation[tx.hash] && (
                            <div className="tx-explanation">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)', marginBottom: 'var(--space-sm)' }}>
                                <span className="mono" style={{ fontSize: '10px', color: 'var(--green-bright)', textTransform: 'uppercase' }}>
                                  AI Analysis
                                </span>
                              </div>
                              <Markdown>{txExplanation[tx.hash]}</Markdown>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
              {filteredTransactions.length > visibleTxCount && (
                <div className="list-more">
                  <span className="mono text-muted">Showing {visibleTxCount} of {filteredTransactions.length}</span>
                  <button className="btn btn-secondary btn-sm" onClick={() => setVisibleTxCount((count) => count + 50)}>
                    SHOW 50 MORE
                  </button>
                </div>
              )}
            </div>
          </>
        )}
      </section>

      {/* On-Chain Registry */}
      <div ref={(el) => registerSection('registry', el)} data-section="registry">
        <RegistryVerify key={`registry-${address}`} investigation={investigation} />
      </div>
    </main>
  );
}
