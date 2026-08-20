/**
 * InvestigationLoader - Shows loading progress during investigation.
 * Displays a progress bar that fills over a ~30 second window, with the
 * analysis steps laid out horizontally underneath, blinking one by one.
 * The real investigation stage (from context) still drives completion, so
 * progress never lags behind an early finish.
 */

import { useState, useEffect } from 'react';

/** All possible investigation stages in order */
const ALL_STAGES = [
  'INITIALIZING',
  'CONNECTING',
  'FETCHING WALLET DATA',
  'LOADING TRANSACTIONS',
  'ANALYZING CONTRACTS',
  'MAPPING COUNTERPARTIES',
  'CALCULATING METRICS',
  'GENERATING AI ANALYSIS',
  'READY',
];

/** Target wall-clock time for the full sequence, in seconds */
const TARGET_SECONDS = 15;

/**
 * @param {Object} props
 * @param {string} props.stage - Current loading stage string from context.
 */
export default function InvestigationLoader({ stage = '' }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Real stage reported by the API (if known), else -1
  const realIndex = ALL_STAGES.findIndex((s) => s === stage);

  // Time-based index: advances evenly across the 30 second window
  const timeIndex = Math.min(
    ALL_STAGES.length - 1,
    Math.floor((elapsed / TARGET_SECONDS) * ALL_STAGES.length)
  );

  // Show whichever is further along, so real completion always wins
  const currentIndex = Math.max(timeIndex, realIndex);

  // Bar fills to 95% during the window, then snaps to 100%
  const progress = Math.min(95, (elapsed / TARGET_SECONDS) * 100);

  return (
    <div className="investigation-loader">
      <div className="loader-terminal">
        <div className="loader-terminal-header">
          <span className="loader-terminal-dot" />
          <span className="loader-terminal-dot" />
          <span className="loader-terminal-dot" />
          <span className="loader-terminal-title">investigating</span>
        </div>

        {/* Main status */}
        <div className="loader-status">
          <p className="mono text-green" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-xs)' }}>
            ANALYSING WALLET
          </p>
          <p className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            {ALL_STAGES[currentIndex]}
          </p>
        </div>

        {/* Progress bar */}
        <div className="loader-progress">
          <div className="loader-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* Horizontal step chips, blinking one by one */}
        <div className="loader-steps" role="list" aria-label="Investigation steps">
          {ALL_STAGES.map((s, i) => {
            let status = 'pending';
            if (i < currentIndex) status = 'complete';
            else if (i === currentIndex) status = 'active';
            return (
              <span key={s} className={`loader-step ${status}`} role="listitem">
                <span className="loader-step-icon" aria-hidden="true" />
                <span className="loader-step-label">{s}</span>
              </span>
            );
          })}
        </div>
      </div>

      <style>{`
        .investigation-loader {
          display: flex;
          justify-content: center;
          padding: var(--space-2xl) 0;
        }

        .loader-terminal {
          width: 100%;
          max-width: 640px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          box-shadow: var(--shadow-card);
          position: relative;
        }

        .loader-terminal::before {
          content: '';
          position: absolute;
          inset: -1px;
          border-radius: var(--radius-lg);
          background: linear-gradient(135deg, var(--green-glow) 0%, transparent 50%, var(--orange-glow) 100%);
          z-index: -1;
          opacity: 0.5;
        }

        .loader-terminal-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--border-subtle);
        }

        .loader-terminal-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--green-muted);
        }

        .loader-terminal-dot:nth-child(2) {
          background: var(--orange-muted);
        }

        .loader-terminal-dot:nth-child(3) {
          background: var(--text-muted);
        }

        .loader-terminal-title {
          font-family: var(--font-mono);
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          margin-left: var(--space-sm);
        }

        .loader-status {
          text-align: center;
          margin-bottom: var(--space-md);
        }

        .loader-progress {
          width: 100%;
          height: 6px;
          background: var(--bg-surface);
          border-radius: 3px;
          margin-bottom: var(--space-lg);
          overflow: hidden;
          border: 1px solid var(--border-subtle);
        }

        .loader-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--green-muted), var(--green-bright));
          border-radius: 3px;
          transition: width 1s linear;
          box-shadow: 0 0 12px var(--green-glow);
        }

        /* Horizontal step chips */
        .loader-steps {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-md);
        }

        .loader-step {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 10px;
          letter-spacing: 0.04em;
          padding: 4px 10px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          background: var(--bg-surface);
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .loader-step-icon {
          width: 8px;
          height: 8px;
          border-radius: 2px;
          background: var(--border-default);
          flex-shrink: 0;
        }

        .loader-step.complete {
          color: var(--text-secondary);
          border-color: var(--green-muted);
        }

        .loader-step.complete .loader-step-icon {
          background: var(--status-success);
        }

        .loader-step.complete .loader-step-icon::after {
          content: '✓';
          color: var(--bg-primary);
          font-size: 8px;
          line-height: 8px;
          display: block;
          text-align: center;
        }

        .loader-step.active {
          color: var(--green-bright);
          border-color: var(--green-muted);
          box-shadow: 0 0 10px var(--green-glow);
          animation: step-blink 0.8s ease-in-out infinite;
        }

        .loader-step.active .loader-step-icon {
          background: var(--green-bright);
        }

        @keyframes step-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}