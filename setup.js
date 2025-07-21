#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Moniepoint Payment App...\n');

// Function to run commands
const runCommand = (command, description) => {
  console.log(`📦 ${description}...`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ ${description} completed!\n`);
  } catch (error) {
    console.error(`❌ Error during ${description}:`, error.message);
    process.exit(1);
  }
};

// Check if MongoDB is running (optional)
const checkMongoDB = () => {
  try {
    execSync('mongosh --eval "db.runCommand({ connectionStatus: 1 })"', { stdio: 'ignore' });
    console.log('✅ MongoDB is running\n');
  } catch (error) {
    console.log('⚠️  MongoDB connection check failed. Make sure MongoDB is installed and running.\n');
  }
};

// Create .env file if it doesn't exist
const createEnvFile = () => {
  const envPath = path.join(__dirname, 'server', '.env');
  if (!fs.existsSync(envPath)) {
    const envContent = `PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/payment_app
JWT_SECRET=your_jwt_secret_key_here_make_it_very_long_and_secure_${Math.random().toString(36).substring(2)}
JWT_EXPIRE=7d
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
PAYSTACK_SECRET_KEY=your_paystack_secret_key
FLUTTERWAVE_SECRET_KEY=your_flutterwave_secret_key
`;
    
    fs.writeFileSync(envPath, envContent);
    console.log('✅ Created .env file in server directory\n');
  } else {
    console.log('✅ .env file already exists\n');
  }
};

// Main setup process
const setup = async () => {
  try {
    // Install root dependencies
    runCommand('npm install', 'Installing root dependencies');
    
    // Install server dependencies
    runCommand('cd server && npm install', 'Installing server dependencies');
    
    // Install client dependencies
    runCommand('cd client && npm install', 'Installing client dependencies');
    
    // Create .env file
    createEnvFile();
    
    // Check MongoDB
    checkMongoDB();
    
    console.log('🎉 Setup completed successfully!\n');
    console.log('📋 Next steps:');
    console.log('1. Make sure MongoDB is running');
    console.log('2. Update the .env file in the server directory with your actual values');
    console.log('3. Run "npm run dev" to start both server and client');
    console.log('4. Visit http://localhost:3000 to see the app\n');
    console.log('📚 Check README.md for detailed documentation');
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
};

// Run setup
setup();