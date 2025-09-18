# SeaSight Security Setup Guide

## 🔐 Environment Variables Configuration

### Required API Keys

To use all features of SeaSight, you'll need to obtain the following API keys:

#### 1. AISStream.io API Key (For Live AIS Data)
- **Purpose**: Real-time vessel tracking and AIS data
- **Get Key**: https://aisstream.io/
- **Free Tier**: 100 requests/day
- **Variable**: `VITE_AISSTREAM_TOKEN`

#### 2. Open-Meteo API Key (Optional)
- **Purpose**: Enhanced weather data features
- **Get Key**: https://open-meteo.com/
- **Free Tier**: 10,000 requests/day
- **Variable**: `VITE_OPENMETEO_API_KEY`

#### 3. Cloudflare Workers (Production Backend)
- **Purpose**: Production API endpoints and data serving
- **Get Keys**: Cloudflare Dashboard
- **Variables**: `VITE_CF_ACCOUNT_ID`, `VITE_CF_API_TOKEN`

#### 4. Sentry DSN (Error Tracking)
- **Purpose**: Production error monitoring
- **Get DSN**: https://sentry.io/
- **Free Tier**: 5,000 errors/month
- **Variable**: `VITE_SENTRY_DSN`

## 🛡️ Security Setup

### Step 1: Create .env File
Create a `.env` file in the `app/` directory with the following structure:

```bash
# SeaSight Maritime Routing App - Environment Variables
# IMPORTANT: This file contains sensitive information - never commit to version control!

# AISStream.io API Key (for live AIS vessel data)
VITE_AISSTREAM_TOKEN=your_actual_aisstream_token_here

# Open-Meteo API (free, no key required for basic usage)
VITE_OPENMETEO_API_KEY=your_actual_openmeteo_key_here

# Cloudflare Workers (for production backend)
VITE_CF_ACCOUNT_ID=your_actual_cloudflare_account_id
VITE_CF_API_TOKEN=your_actual_cloudflare_api_token

# Sentry DSN (for error tracking)
VITE_SENTRY_DSN=your_actual_sentry_dsn_here

# Development/Testing
NODE_ENV=development
VITE_APP_VERSION=0.2.0
VITE_APP_NAME=SeaSight
```

### Step 2: Verify .gitignore
Ensure your `.gitignore` file includes:
```gitignore
# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# API keys and secrets
*.key
*.pem
secrets/
```

### Step 3: Test Configuration
Run the development server to test your configuration:
```bash
cd app
npm run dev
```

## 🔒 Security Best Practices

### API Key Management
1. **Never commit .env files** to version control
2. **Use different keys** for development, staging, and production
3. **Rotate keys regularly** (every 90 days)
4. **Monitor usage** through API provider dashboards
5. **Use environment-specific keys** for different deployments

### Development vs Production
- **Development**: Use free tier keys or test keys
- **Staging**: Use separate staging keys
- **Production**: Use production keys with proper rate limits

### Key Rotation Process
1. Generate new API key from provider
2. Update .env file with new key
3. Test application functionality
4. Deploy to production
5. Revoke old key after successful deployment

## 🚀 Quick Start (Minimal Setup)

For basic functionality, you only need:

```bash
# Minimal .env file
# MapTiler is no longer required as OpenFreeMap is the default free provider.
VITE_AISSTREAM_TOKEN=your_aisstream_token_here # Optional for live AIS data
NODE_ENV=development
VITE_APP_VERSION=0.2.0
VITE_APP_NAME=SeaSight
```

This will give you:
- ✅ OpenFreeMap Liberty base maps
- ✅ OpenSeaMap nautical charts
- ✅ Route planning interface
- ✅ Vessel profile management
- ❌ Live AIS data (requires AISStream key)
- ❌ Enhanced weather data (requires Open-Meteo key)

## 🔧 Troubleshooting

### Common Issues
1. **Map not loading**: Ensure internet connectivity and check console for errors. OpenFreeMap does not require an API key.
2. **AIS data not showing**: Verify AISStream token
3. **Weather data missing**: Check Open-Meteo key
4. **Build errors**: Ensure all required keys are set

### Testing Keys
You can test the application without API keys - it will fall back to:
- OpenStreetMap for base maps (if OpenFreeMap has issues)
- Demo data for weather/AIS (if not provided)
- Basic functionality for all features

## 📞 Support

If you need help with API key setup:
1. Check the provider documentation
2. Verify key permissions and limits
3. Test with minimal configuration first
4. Contact support if issues persist
