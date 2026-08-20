/**
 * Markdown - Renders AI-generated text as styled markdown.
 * Gemini returns markdown (bold, headings, lists, code). Rendering it raw
 * exposes the literal ** markers, so we pass it through react-markdown with
 * the terminal theme applied via the .markdown CSS class.
 *
 * Used by: AIProfile, AskWallet, and transaction explanations.
 */

import ReactMarkdown from 'react-markdown';

export default function Markdown({ children }) {
  return (
    <div className="markdown">
      <ReactMarkdown>{String(children || '')}</ReactMarkdown>
    </div>
  );
}