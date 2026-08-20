/**
 * EmptyState - Reusable empty state display.
 * Shown when a section has no data to display.
 * Used by transactions, assets, timeline, etc. once real data is implemented.
 */

/**
 * @param {Object} props
 * @param {string} props.icon - Emoji or character to display.
 * @param {string} props.text - Primary message.
 * @param {string} [props.sub] - Secondary message or hint.
 */
export default function EmptyState({ icon = '空', text = 'No data available', sub }) {
  return (
    <div className="empty-state" role="status">
      <div className="empty-state-icon" aria-hidden="true">{icon}</div>
      <p className="empty-state-text">{text}</p>
      {sub && <p className="empty-state-sub">{sub}</p>}
    </div>
  );
}
