const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('./src/models/User');

async function resetPassword(email, newPassword) {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      console.log(`❌ User with email ${email} not found`);
      process.exit(1);
    }

    // Update password
    user.password = newPassword;
    await user.save();

    console.log(`✅ Password updated successfully for ${email}`);
    console.log(`🔑 New password: ${newPassword}`);

    // Test the new password
    const updatedUser = await User.findOne({ email }).select('+password');
    const isMatch = await updatedUser.matchPassword(newPassword);
    console.log(`🧪 Password verification test: ${isMatch ? '✅ PASS' : '❌ FAIL'}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Get command line arguments
const args = process.argv.slice(2);
if (args.length !== 2) {
  console.log('Usage: node reset-password.js <email> <new-password>');
  console.log('Example: node reset-password.js adhikareeprayush@gmail.com NewPassword123');
  process.exit(1);
}

const [email, newPassword] = args;

// Validate password
if (newPassword.length < 6) {
  console.log('❌ Password must be at least 6 characters long');
  process.exit(1);
}

if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
  console.log(
    '❌ Password must contain at least one lowercase letter, one uppercase letter, and one number'
  );
  process.exit(1);
}

resetPassword(email, newPassword);
