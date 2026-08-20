/**
 * api/index.js - Vercel serverless function entry point.
 * Imports the Express app from server.js and exports it as the default handler.
 * Vercel routes all /api/* requests to this function.
 */

import app from '../server.js';

export default app;
