/**
 * Address validation and formatting utilities.
 * Used by WalletSearch for input validation and by components that display addresses.
 */

/**
 * Validate an EVM address string.
 * @param {string} address - The address to validate.
 * @returns {boolean} True if the address is a valid EVM address.
 */
export function isValidEvmAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return /^0x[0-9a-fA-F]{40}$/.test(address.trim());
}

/**
 * Shorten an address for display: 0x1234...5678
 * @param {string} address - The full address.
 * @param {number} chars - Characters to show on each side (default 4).
 * @returns {string} Shortened address or original if too short.
 */
export function shortenAddress(address, chars = 4) {
  if (!address) return '';
  if (address.length <= chars * 2 + 4) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
