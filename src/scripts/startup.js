#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🚀 LMS Backend Startup Check');
console.log('============================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '..', '.env');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found!');
  console.log('📝 Please copy .env.example to .env and configure your environment variables');
  process.exit(1);
}

// Load environment variables
require('dotenv').config({ path: envPath });

// Check required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT'];

let missingVars = [];
requiredEnvVars.forEach((varName) => {
  if (!process.env[varName]) {
    missingVars.push(varName);
  }
});

if (missingVars.length > 0) {
  console.log('❌ Missing required environment variables:');
  missingVars.forEach((varName) => {
    console.log(`   - ${varName}`);
  });
  console.log('\n📝 Please check your .env file and add the missing variables');
  process.exit(1);
}

console.log('✅ Environment variables configured');

// Check MongoDB connection
const mongoose = require('mongoose');

const checkMongoDB = async () => {
  try {
    console.log('🔍 Checking MongoDB connection...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000 // 5 second timeout
    });
    console.log('✅ MongoDB connection successful');
    await mongoose.connection.close();

    console.log('\n🎉 All checks passed! Starting the server...\n');

    // Start the main server
    require('../server');
  } catch (error) {
    console.log('❌ MongoDB connection failed:');
    console.log(`   Error: ${error.message}`);
    console.log('\n💡 Possible solutions:');
    console.log('   1. Make sure MongoDB is running on your system');
    console.log('   2. Check your MONGODB_URI in the .env file');
    console.log('   3. Verify MongoDB is accessible at the specified URI');
    console.log('\n🐛 For local MongoDB, try: mongod --dbpath /path/to/data');
    process.exit(1);
  }
};

checkMongoDB();
