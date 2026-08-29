/**
 * AI service.
 * Supports OpenRouter, Groq, and Gemini. OpenRouter is preferred when its key
 * is configured so slow Gemini requests do not block the user first.
 * Server-side only. Handles all communication with the providers.
 * Does NOT contain blockchain retrieval logic.
 * Receives structured evidence and returns AI interpretation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const REQUEST_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS) || 8000;

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'inclusionai/ling-3.0-flash-fin:free';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Friendly message shown to users when the AI service fails.
 * Never exposes API keys, quotas, or raw provider errors.
 */
export const GEMINI_UNAVAILABLE =
  'AI service is temporarily unavailable. Please try again later.';

let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: MODEL });
} else if (!OPENROUTER_API_KEY && !GROQ_API_KEY) {
  console.warn('[ai] No AI provider key set. AI features disabled.');
}

function isGroqConfigured() {
  return !!GROQ_API_KEY;
}

function isOpenRouterConfigured() {
  return !!OPENROUTER_API_KEY;
}

async function askOpenAiCompatible({ url, apiKey, model: providerModel, provider }, systemPrompt, userMessage) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...(provider === 'openrouter' ? {
          'HTTP-Referer': process.env.APP_URL || process.env.CLIENT_URL || 'http://localhost:5173',
          'X-Title': 'AI Wallet Investigator',
        } : {}),
      },
      body: JSON.stringify({
        model: providerModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`${provider} HTTP ${res.status}`);
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Send a prompt to Groq's OpenAI-compatible endpoint.
 * @param {string} systemPrompt - System instruction.
 * @param {string} userMessage - User message.
 * @returns {Promise<string>} AI response text.
 */
async function askGroq(systemPrompt, userMessage) {
  return askOpenAiCompatible(
    { url: GROQ_URL, apiKey: GROQ_API_KEY, model: GROQ_MODEL, provider: 'groq' },
    systemPrompt,
    userMessage
  );
}

async function askOpenRouter(systemPrompt, userMessage) {
  return askOpenAiCompatible(
    { url: OPENROUTER_URL, apiKey: OPENROUTER_API_KEY, model: OPENROUTER_MODEL, provider: 'openrouter' },
    systemPrompt,
    userMessage
  );
}

/**
 * Send a prompt to Gemini and get a text response.
 * Falls back to Groq when configured and Gemini fails or stalls.
 * @param {string} systemPrompt - System instruction.
 * @param {string} userMessage - User message.
 * @returns {Promise<string>} AI response text.
 */
export async function askGemini(systemPrompt, userMessage) {
  if (!model && !isGroqConfigured() && !isOpenRouterConfigured()) {
    return GEMINI_UNAVAILABLE;
  }

  if (isOpenRouterConfigured()) {
    try {
      const text = await askOpenRouter(systemPrompt, userMessage);
      if (text) return text;
    } catch (err) {
      console.error('[openrouter] Error:', err.message);
    }
  }

  if (isGroqConfigured()) {
    try {
      const text = await askGroq(systemPrompt, userMessage);
      if (text) return text;
    } catch (err) {
      console.error('[groq] Error:', err.message);
    }
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

  return GEMINI_UNAVAILABLE;
}

/**
 * Check if any AI provider is configured and available.
 * @returns {boolean}
 */
export function isGeminiAvailable() {
  return !!(model || isGroqConfigured() || isOpenRouterConfigured());
}
