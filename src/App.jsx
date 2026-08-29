/**
 * App - Root component.
 * Sets up routing, wallet providers, investigation provider, and shared layout.
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { WalletProvider, WalletProviderMock } from './context/WalletContext';
import { InvestigationProvider } from './context/InvestigationContext';
import { isReownConfigured, wagmiAdapter } from './config/reown';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Investigate from './pages/Investigate';
import Snapshot from './pages/Snapshot';

const queryClient = new QueryClient();

export default function App() {
  const content = (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/snapshot" element={<Snapshot />} />
        <Route path="/snapshot/:wallet" element={<Snapshot />} />
        <Route path="/investigate/:address" element={
          <InvestigationProvider>
            <Investigate />
          </InvestigationProvider>
        } />
        <Route
          path="*"
          element={
            <main className="page-home">
              <div className="empty-state">
                <div className="empty-state-icon" aria-hidden="true">404</div>
                <p className="empty-state-text">Page not found</p>
                <Link to="/" className="btn btn-primary" style={{ marginTop: 'var(--space-lg)' }}>
                  Back to Home
                </Link>
              </div>
            </main>
          }
        />
      </Routes>
    </BrowserRouter>
  );

  return (
    <QueryClientProvider client={queryClient}>
      {isReownConfigured && wagmiAdapter ? (
        <WagmiProvider config={wagmiAdapter.wagmiConfig} reconnectOnMount>
          <WalletProvider>
            {content}
          </WalletProvider>
        </WagmiProvider>
      ) : (
        <WalletProviderMock>
          {content}
        </WalletProviderMock>
      )}
    </QueryClientProvider>
  );
}
