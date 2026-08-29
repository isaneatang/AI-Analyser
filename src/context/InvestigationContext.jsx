/**
 * InvestigationContext - Maintains the active investigation state.
 * Stores wallet data, transactions, analysis, and loading state.
 */

import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';

const InvestigationContext = createContext(null);

/**
 * Investigation context provider.
 */
export function InvestigationProvider({ children }) {
  const [investigation, setInvestigation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingStage, setLoadingStage] = useState('');
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /**
   * Start a new investigation for a wallet address.
   * Aborts any in-progress investigation.
   */
  const investigate = useCallback(async (address) => {
    // Abort any previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    setInvestigation(null);
    setLoadingStage('CONNECTING');

    try {
      setLoadingStage('FETCHING WALLET DATA');

      const res = await fetch('/api/investigate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message || body.error || 'Investigation failed');
      }

      if (abortRef.current !== controller) return;
      setLoadingStage('PROCESSING EVIDENCE');

      const data = await res.json();
      if (abortRef.current !== controller) return;
      setInvestigation(data);
      setLoadingStage('READY');
    } catch (err) {
      if (err.name === 'AbortError') return; // Ignore aborted requests
      if (abortRef.current !== controller) return;
      console.error('[InvestigationContext]', err);
      setError(err.message || 'Failed to investigate wallet');
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  }, []);

  const clearInvestigation = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setInvestigation(null);
    setError(null);
    setLoading(false);
    setLoadingStage('');
  }, []);

  const value = {
    investigation,
    loading,
    error,
    loadingStage,
    investigate,
    clearInvestigation,
  };

  return (
    <InvestigationContext.Provider value={value}>
      {children}
    </InvestigationContext.Provider>
  );
}

export function useInvestigation() {
  const context = useContext(InvestigationContext);
  if (!context) {
    throw new Error('useInvestigation must be used inside InvestigationProvider');
  }
  return context;
}
