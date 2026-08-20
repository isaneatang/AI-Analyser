/**
 * Navbar - Top navigation bar.
 * Displays the app logo, navigation links, BOT Chain network status,
 * and wallet connection.
 */

import { Link, useLocation } from 'react-router-dom';
import NetworkStatus from './NetworkStatus';
import WalletConnect from './WalletConnect';

const NAV_LINKS = [
  { to: '/', label: 'HOME' },
  { to: '/snapshot', label: 'SNAPSHOTS' },
];

export default function Navbar() {
  const { pathname } = useLocation();

  return (
    <nav className="navbar" role="navigation" aria-label="Main navigation">
      <div className="navbar-brand">
        <a href="/" className="navbar-logo" aria-label="AI Wallet Investigator home">
          <span className="navbar-logo-icon" aria-hidden="true">ai</span>
          <span className="navbar-logo-text">WALLET INVESTIGATOR</span>
        </a>
      </div>

      <div className="navbar-nav" role="menubar">
        {NAV_LINKS.map((link) => {
          const isActive = link.to === '/' ? pathname === '/' : pathname.startsWith(link.to);
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`navbar-nav-link ${isActive ? 'navbar-nav-active' : ''}`}
              role="menuitem"
            >
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="navbar-right">
        <NetworkStatus />
        <WalletConnect />
      </div>
    </nav>
  );
}
