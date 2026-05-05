/**
 * Vercel serverless entry: exports the Express app.
 * Routing is configured in vercel.json (all paths → this function).
 */
module.exports = require('../src/app');
