const mongoose = require('mongoose');
const logger = require('./logger');

function isServerless() {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

/** One shared connect attempt for concurrent serverless invocations. */
let connectionPromise = null;

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

  if (!connectionPromise) {
    const parsedSelectionMs = parseInt(process.env.MONGODB_SERVER_SELECTION_MS, 10);
    const timeoutMs =
      Number.isFinite(parsedSelectionMs) && parsedSelectionMs > 0
        ? parsedSelectionMs
        : isServerless()
          ? 4000
          : 30000;

    connectionPromise = (async () => {
      try {
        await mongoose.connect(process.env.MONGODB_URI, {
          serverSelectionTimeoutMS: timeoutMs,
          connectTimeoutMS: timeoutMs,
          maxPoolSize: isServerless() ? 10 : undefined,
          bufferCommands: false
        });
        logger.info(`MongoDB Connected: ${mongoose.connection.host}`);
        if (!isServerless()) {
          console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
        }
        return mongoose.connection;
      } catch (error) {
        connectionPromise = null;
        logger.error('Database connection error:', error);
        if (isServerless()) {
          throw error;
        }
        console.error('❌ Database connection error:', error);
        process.exit(1);
      }
    })();
  }

  return connectionPromise;
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
