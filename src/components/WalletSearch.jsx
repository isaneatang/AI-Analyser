/**
 * WalletSearch - Investigation input component.
 * Allows users to paste any BOT Chain wallet address to investigate.
 * Validates the address before submission.
 * Does not fetch blockchain data itself; navigates to investigation page.
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { isValidEvmAddress } from '../utils/address';

/**
 * Address input with validation and navigation to investigation page.
 * @param {Function} onInvestigate - Optional callback instead of navigation.
 */
export default function WalletSearch({ onInvestigate }) {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = address.trim();

    if (!trimmed) {
      setError('Enter a wallet address.');
      return;
    }

    if (!isValidEvmAddress(trimmed)) {
      setError('Invalid EVM address. Must start with 0x and be 42 characters.');
      return;
    }

    setError('');

    if (onInvestigate) {
      onInvestigate(trimmed);
    } else {
      navigate(`/investigate/${trimmed}`);
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-label="Wallet investigation search">
      <div className="input-group">
        <label htmlFor="wallet-search" className="sr-only">
          Wallet address to investigate
        </label>
        <input
          id="wallet-search"
          type="text"
          className={`input ${error ? 'input-error' : ''}`}
          placeholder="Enter BOT Chain wallet address (0x...)"
          value={address}
          onChange={(e) => {
            setAddress(e.target.value);
            if (error) setError('');
          }}
          spellCheck={false}
          autoComplete="off"
          aria-describedby={error ? 'wallet-search-error' : undefined}
          aria-invalid={!!error}
        />
        <button type="submit" className="btn btn-primary">
          INVESTIGATE
        </button>
      </div>
      {error && (
        <p id="wallet-search-error" className="input-error-text" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
