#!/usr/bin/env node

/**
 * SeaSight Environment Setup Script
 * Helps users create a .env file with proper configuration
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envTemplate = `# SeaSight Maritime Routing App - Environment Variables
# IMPORTANT: This file contains sensitive information - never commit to version control!

# MapTiler API Key (for enhanced map styles)
# Get your free key at: https://www.maptiler.com/
VITE_MAPTILER_KEY={maptilerKey}

# AISStream.io API Key (for live AIS vessel data)
# Get your dev key at: https://aisstream.io/
VITE_AISSTREAM_TOKEN={aisstreamToken}

# Open-Meteo API (free, no key required for basic usage)
# For enhanced features, get key at: https://open-meteo.com/
VITE_OPENMETEO_API_KEY={openmeteoKey}

# Cloudflare Workers (for production backend)
# Get from Cloudflare dashboard
VITE_CF_ACCOUNT_ID={cfAccountId}
VITE_CF_API_TOKEN={cfApiToken}

# Sentry DSN (for error tracking)
# Get from Sentry dashboard
VITE_SENTRY_DSN={sentryDsn}

# Development/Testing
NODE_ENV=development
VITE_APP_VERSION=0.2.0
VITE_APP_NAME=SeaSight
`;

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupEnvironment() {
  console.log('🌊 SeaSight Environment Setup');
  console.log('================================\n');
  console.log('This script will help you create a .env file with your API keys.');
  console.log('You can press Enter to skip any optional keys.\n');

  const maptilerKey = await question('MapTiler API Key (recommended): ');
  const aisstreamToken = await question('AISStream.io Token (optional): ');
  const openmeteoKey = await question('Open-Meteo API Key (optional): ');
  const cfAccountId = await question('Cloudflare Account ID (optional): ');
  const cfApiToken = await question('Cloudflare API Token (optional): ');
  const sentryDsn = await question('Sentry DSN (optional): ');

  const envContent = envTemplate
    .replace('{maptilerKey}', maptilerKey || '')
    .replace('{aisstreamToken}', aisstreamToken || '')
    .replace('{openmeteoKey}', openmeteoKey || '')
    .replace('{cfAccountId}', cfAccountId || '')
    .replace('{cfApiToken}', cfApiToken || '')
    .replace('{sentryDsn}', sentryDsn || '');

  const envPath = path.join(process.cwd(), '.env');
  
  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');
    console.log('📁 Location:', envPath);
    console.log('\n🔒 Security reminder:');
    console.log('   - Never commit .env files to version control');
    console.log('   - Keep your API keys secure');
    console.log('   - Rotate keys regularly');
    console.log('\n🚀 You can now run: npm run dev');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }

  rl.close();
}

// Check if .env already exists
const envPath = path.join(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  question('Do you want to overwrite it? (y/N): ').then((answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      setupEnvironment();
    } else {
      console.log('Setup cancelled.');
      rl.close();
    }
  });
} else {
  setupEnvironment();
}
