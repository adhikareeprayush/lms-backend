/**
 * Vercel serverless entry — export the Express app (see Vercel Express docs).
 * Rewrites in vercel.json route all traffic here.
 */
module.exports = require('../src/app');
