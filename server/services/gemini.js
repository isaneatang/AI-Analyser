/**
 * AI service.
 * Primary: Google Gemini. Optional fallback: Groq (free tier, OpenAI-
 * compatible, much faster) when GROQ_API_KEY is set. Gemini timeouts/503s
 * used to surface as dead ends; now they transparently retry on Groq.
 * Server-side only. Handles all communication with the providers.
 * Does NOT contain blockchain retrieval logic.
 * Receives structured evidence and returns AI interpretation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 45000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/**
 * Friendly message shown to users when the AI service fails.
 * Never exposes API keys, quotas, or raw provider errors.
 */
export const GEMINI_UNAVAILABLE =
  'AI service is temporarily unavailable. Please try again later, or contact the developer if this persists.';

let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL });
} else {
  console.warn('[gemini] GEMINI_API_KEY not set. AI features disabled.');
}

function isGroqConfigured() {
  return !!GROQ_API_KEY;
}

/**
 * Send a prompt to Groq's OpenAI-compatible endpoint.
 * @param {string} systemPrompt - System instruction.
 * @param {string} userMessage - User message.
 * @returns {Promise<string>} AI response text.
 */
async function askGroq(systemPrompt, userMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Groq HTTP ${res.status}`);
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a prompt to Gemini and get a text response.
 * Falls back to Groq when configured and Gemini fails or stalls.
 * @param {string} systemPrompt - System instruction.
 * @param {string} userMessage - User message.
 * @returns {Promise<string>} AI response text.
 */
export async function askGemini(systemPrompt, userMessage) {
  if (!model && !isGroqConfigured()) {
    return GEMINI_UNAVAILABLE;
  }

  if (model) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const result = await model.generateContent({
        systemInstruction: systemPrompt,
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        requestOptions: { signal: controller.signal },
      });
      const text = result.response.text();
      if (text) return text;
    } catch (err) {
      console.error('[gemini] Error:', err.message);
    } finally {
      clearTimeout(timer);
    }
  }

  // Fallback provider.
  if (isGroqConfigured()) {
    try {
      const text = await askGroq(systemPrompt, userMessage);
      if (text) return text;
    } catch (err) {
      console.error('[groq] Error:', err.message);
    }
  }

  return GEMINI_UNAVAILABLE;
}

/**
 * Check if any AI provider is configured and available.
 * @returns {boolean}
 */
export function isGeminiAvailable() {
  return !!(model || isGroqConfigured());
}
