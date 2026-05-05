/**
 * Vercel serverless entry. Rewrites in vercel.json send all traffic here.
 * serverless-http adapts API Gateway-style requests to Express.
 */
const serverless = require('serverless-http');
const app = require('../src/app');

module.exports = serverless(app);
