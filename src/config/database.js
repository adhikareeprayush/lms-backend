const mongoose = require('mongoose');
const logger = require('./logger');

function isServerless() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/**
 * Connect to MongoDB. Safe for long-running servers and Vercel serverless
 * (reuses an established connection when readyState is connected).
 */
async function connectDB() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  if (!process.env.MONGODB_URI) {
    const err = new Error('MONGODB_URI is not defined');
    logger.error(err.message);
    if (isServerless()) {
      throw err;
    }
    console.error('❌', err.message);
    process.exit(1);
  }

  try {
    const parsedSelectionMs = parseInt(process.env.MONGODB_SERVER_SELECTION_MS, 10);
    const serverSelectionTimeoutMS =
      Number.isFinite(parsedSelectionMs) && parsedSelectionMs > 0
        ? parsedSelectionMs
        : isServerless()
          ? 8000
          : 30000;

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS,
      maxPoolSize: isServerless() ? 10 : undefined
    });
    logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
    if (!isServerless()) {
      console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
    }
    return mongoose.connection;
  } catch (error) {
    logger.error('Database connection error:', error);
    if (isServerless()) {
      throw error;
    }
    console.error('❌ Database connection error:', error);
    process.exit(1);
  }
}

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
  if (!isServerless()) {
    console.log('⚠️ MongoDB disconnected');
  }
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
  if (!isServerless()) {
    console.log('✅ MongoDB reconnected');
  }
});

mongoose.connection.on('error', (err) => {
  logger.error('MongoDB error:', err);
  if (!isServerless()) {
    console.error('❌ MongoDB error:', err);
  }
});

module.exports = { connectDB };
