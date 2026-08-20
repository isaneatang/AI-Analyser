/**
 * Gemini AI service.
 * Server-side only. Handles all communication with Google Gemini.
 * Does NOT contain blockchain retrieval logic.
 * Receives structured evidence and returns AI interpretation.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = 'gemini-3.6-flash';

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

/**
 * Send a prompt to Gemini and get a text response.
 * @param {string} systemPrompt - System instruction.
 * @param {string} userMessage - User message.
 * @returns {Promise<string>} AI response text.
 */
export async function askGemini(systemPrompt, userMessage) {
  if (!model) {
    return GEMINI_UNAVAILABLE;
  }

  try {
    const result = await model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
    });

    return result.response.text();
  } catch (err) {
    console.error('[gemini] Error:', err.message);
    return GEMINI_UNAVAILABLE;
  }
}

/**
 * Check if Gemini is configured and available.
 * @returns {boolean}
 */
export function isGeminiAvailable() {
  return !!model;
}
