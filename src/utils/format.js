/**
 * Display formatting utilities.
 * Used by components to format numbers, dates, and values for presentation.
 */

/**
 * Format a large number with commas and optional abbreviation.
 * @param {number} num - The number to format.
 * @returns {string} Formatted number string.
 */
export function formatNumber(num) {
  if (num === null || num === undefined) return '0';
  return Number(num).toLocaleString('en-US');
}

/**
 * Format a wei value to human-readable BOT amount.
 * @param {string|number|bigint} wei - Value in wei.
 * @param {number} decimals - Token decimals (default 18 for native).
 * @returns {string} Formatted amount.
 */
export function formatTokenAmount(wei, decimals = 18) {
  if (!wei) return '0';
  const value = Number(wei) / Math.pow(10, decimals);
  if (value === 0) return '0';
  if (value < 0.0001) return '<0.0001';
  if (value < 1) return value.toFixed(4);
  if (value < 1000) return value.toFixed(2);
  return formatNumber(Math.floor(value));
}

/**
 * Format a USD value.
 * @param {number} value - Dollar amount.
 * @returns {string} Formatted USD string.
 */
export function formatUsd(value) {
  if (value === null || value === undefined) return 'Data unavailable';
  if (value === 0) return '$0.00';
  if (value < 0.01) return '<$0.01';
  return `$${Number(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a timestamp to a readable date string.
 * @param {number|string|Date} timestamp - Unix timestamp or date.
 * @returns {string} Formatted date.
 */
export function formatDate(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format a timestamp to a readable date and time string.
 * @param {number|string|Date} timestamp - Unix timestamp or date.
 * @returns {string} Formatted date and time.
 */
export function formatDateTime(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Get a human-readable relative time string.
 * @param {number|string|Date} timestamp - Unix timestamp or date.
 * @returns {string} Relative time like "2 hours ago" or "just now".
 */
export function timeAgo(timestamp) {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return 'Unknown';
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(timestamp);
}
