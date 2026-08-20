/**
 * AskWallet - Chat interface for asking questions about the investigated wallet.
 * Scoped to the current wallet. Uses structured evidence, not live blockchain data.
 * Suggested questions appear when chat is empty.
 */

import { useState } from 'react';
import Markdown from './Markdown';

const SUGGESTED_QUESTIONS = [
  'WHAT HAPPENED RECENTLY?',
  'WHAT IS THIS WALLET MAINLY USED FOR?',
  'SHOW THE LARGEST TRANSACTIONS',
  'WHAT CONTRACTS DOES IT USE MOST?',
  'ARE THERE UNUSUAL TRANSACTIONS?',
];

/**
 * @param {Object} props
 * @param {Object} props.investigation - Current investigation data.
 * @param {boolean} props.embedded - Render inside an existing card (no own wrapper).
 */
export default function AskWallet({ investigation, embedded = false }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendQuestion(question) {
    if (!question.trim() || loading) return;

    const userMsg = { role: 'user', content: question.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question.trim(), investigation }),
        signal: AbortSignal.timeout(120000),
      });

      const data = await res.json();
      const aiMsg = { role: 'ai', content: data.answer || 'No response received.' };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'ai', content: 'AI service is temporarily unavailable. Please try again later, or contact the developer if this persists.' },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendQuestion(input);
  }

  const content = (
    <>
      {/* Chat messages */}
      {messages.length > 0 && (
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: 'var(--space-md)' }}>
          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                padding: 'var(--space-sm) var(--space-md)',
                marginBottom: 'var(--space-sm)',
                borderRadius: 'var(--radius-md)',
                background: msg.role === 'user' ? 'var(--bg-primary)' : 'var(--bg-elevated)',
                borderLeft: msg.role === 'ai' ? '2px solid var(--green-muted)' : 'none',
              }}
            >
              <p
                className="mono"
                style={{
                  fontSize: '10px',
                  color: msg.role === 'user' ? 'var(--orange-bright)' : 'var(--green-bright)',
                  marginBottom: '4px',
                  textTransform: 'uppercase',
                }}
              >
                {msg.role === 'user' ? 'You' : 'AI'}
              </p>
              <Markdown>{msg.content}</Markdown>
            </div>
          ))}
          {loading && (
            <div style={{ padding: 'var(--space-sm) var(--space-md)', color: 'var(--text-muted)' }}>
              <span className="mono" style={{ fontSize: 'var(--font-size-xs)' }}>
                Analyzing blockchain evidence...
              </span>
            </div>
          )}
        </div>
      )}

      {/* Suggested questions */}
      {messages.length === 0 && (
        <div style={{ marginBottom: 'var(--space-md)' }}>
          <p className="mono text-muted" style={{ fontSize: 'var(--font-size-xs)', marginBottom: 'var(--space-sm)' }}>
            Suggested questions:
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-sm)' }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                className="btn btn-secondary btn-sm"
                onClick={() => sendQuestion(q)}
                disabled={loading}
                style={{ fontSize: '10px' }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 'var(--space-sm)' }}>
        <input
          type="text"
          className="input"
          placeholder="Ask about this wallet..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          style={{ flex: 1 }}
        />
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !input.trim()}
        >
          {loading ? '...' : 'Ask'}
        </button>
      </form>
    </>
  );

  return embedded ? content : <div className="card">{content}</div>;
}
