/**
 * AIProfile - Displays AI-generated wallet analysis.
 * Fetches the AI report on mount. Handles slow responses gracefully.
 */

import { useState, useEffect, useRef } from 'react';
import Markdown from './Markdown';

/**
 * @param {Object} props
 * @param {Object} props.investigation - Current investigation data.
 * @param {boolean} props.embedded - Render inside an existing card (no own wrapper).
 */
export default function AIProfile({ investigation, embedded = false }) {
  const [report, setReport] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!investigation || fetchedRef.current) return;
    fetchedRef.current = true;

    async function fetchReport() {
      setLoading(true);

      try {
        const res = await fetch('/api/investigate/report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ investigation }),
          signal: AbortSignal.timeout(120000), // 2 min timeout
        });
        const data = await res.json();
        setReport(data.report || 'No analysis available.');
      } catch {
        setError('AI analysis is temporarily unavailable. Please try again later, or contact the developer if this persists.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [investigation]);

  const wrap = (node) => (embedded ? node : <div className="card">{node}</div>);

  if (loading) {
    return wrap(
      <div>
        <div className="ai-generating">
          <span className="ai-generating-dots" aria-hidden="true">
            <span className="ai-generating-dot" />
            <span className="ai-generating-dot" />
            <span className="ai-generating-dot" />
          </span>
          <p className="mono text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            Generating AI analysis...
          </p>
        </div>
        <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 'var(--space-xs)' }}>
          Gemini is analyzing the wallet evidence.
        </p>
      </div>
    );
  }

  if (error) {
    return wrap(
      <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>{error}</p>
    );
  }

  if (!report) return null;

  return wrap(<Markdown>{report}</Markdown>);
}
