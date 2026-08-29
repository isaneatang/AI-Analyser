/**
 * InvestigationLoader - Shows loading progress during investigation.
 * Displays only stages reported by the request lifecycle. The animated rail
 * is indeterminate because the server does not expose measurable progress.
 */

const STAGES = [
  { key: 'CONNECTING', label: 'Establishing BOT Chain connection' },
  { key: 'FETCHING WALLET DATA', label: 'Collecting wallet activity' },
  { key: 'PROCESSING EVIDENCE', label: 'Normalizing and scoring evidence' },
];

/**
 * @param {Object} props
 * @param {string} props.stage - Current loading stage string from context.
 */
export default function InvestigationLoader({ stage = '' }) {
  const currentIndex = Math.max(0, STAGES.findIndex((item) => item.key === stage));

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
        <div className="loader-status" role="status" aria-live="polite">
          <p className="mono text-green" style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-xs)' }}>
            ANALYZING WALLET
          </p>
          <p className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
            {STAGES[currentIndex].label}
          </p>
        </div>

        {/* Progress bar */}
        <div className="loader-progress" aria-hidden="true">
          <div className="loader-progress-fill" />
        </div>

        {/* Horizontal step chips, blinking one by one */}
        <div className="loader-steps" role="list" aria-label="Investigation steps">
          {STAGES.map((item, i) => {
            let status = 'pending';
            if (i < currentIndex) status = 'complete';
            else if (i === currentIndex) status = 'active';
            return (
              <span key={item.key} className={`loader-step ${status}`} role="listitem">
                <span className="loader-step-icon" aria-hidden="true" />
                <span className="loader-step-label">{item.label}</span>
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
          width: 38%;
          background: linear-gradient(90deg, var(--green-muted), var(--green-bright));
          border-radius: 3px;
          box-shadow: 0 0 12px var(--green-glow);
          animation: loader-scan 1.4s ease-in-out infinite;
        }

        @keyframes loader-scan {
          from { transform: translateX(-110%); }
          to { transform: translateX(270%); }
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
          font-size: var(--font-size-xs);
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
        }

        .loader-step.active .loader-step-icon {
          background: var(--green-bright);
        }
      `}</style>
    </div>
  );
}
