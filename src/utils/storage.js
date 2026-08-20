/**
 * localStorage utilities for storing recent investigations.
 * Used by the Home page to display and manage investigation history.
 * V1 only. No database required.
 */

const STORAGE_KEY = 'ai-wallet-investigator-recent';
const MAX_RECENT = 20;

/**
 * Get all recent investigations from localStorage.
 * @returns {Array<{address: string, network: string, timestamp: number}>}
 */
export function getRecentInvestigations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

/**
 * Save an investigation to recent history.
 * Moves duplicates to the top and trims to max entries.
 * @param {string} address - The wallet address investigated.
 * @param {string} network - The network name.
 */
export function saveRecentInvestigation(address, network = 'BOT Chain Testnet') {
  try {
    const recent = getRecentInvestigations().filter(
      (r) => r.address.toLowerCase() !== address.toLowerCase()
    );
    recent.unshift({
      address,
      network,
      timestamp: Date.now(),
    });
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(recent.slice(0, MAX_RECENT))
    );
  } catch {
    // localStorage may be unavailable. Fail silently.
  }
}

/**
 * Clear all recent investigations.
 */
export function clearRecentInvestigations() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Fail silently.
  }
}
