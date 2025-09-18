// Environment configuration for SeaSight application

// ============================================================================
// Environment Variables
// ============================================================================

export const ENV = {
  MAPTILER_KEY: import.meta.env.VITE_MAPTILER_KEY || '',
  AISSTREAM_TOKEN: import.meta.env.VITE_AISSTREAM_TOKEN || '',
  OPENMETEO_API_KEY: import.meta.env.VITE_OPENMETEO_API_KEY || '',
  CF_ACCOUNT_ID: import.meta.env.VITE_CF_ACCOUNT_ID || '',
  CF_API_TOKEN: import.meta.env.VITE_CF_API_TOKEN || '',
  SENTRY_DSN: import.meta.env.VITE_SENTRY_DSN || '',
  APP_VERSION: import.meta.env.VITE_APP_VERSION || '0.1.0',
  APP_NAME: import.meta.env.VITE_APP_NAME || 'SeaSight',
} as const;

// ============================================================================
// Environment Checks
// ============================================================================

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const isPreview = import.meta.env.MODE === 'preview';

// ============================================================================
// API Configuration
// ============================================================================

export const API_CONFIG = {
  AISSTREAM: {
    BASE_URL: 'https://aisstream.io',
    RATE_LIMIT: 100, // requests per day
  },
  OPENMETEO: {
    BASE_URL: 'https://api.open-meteo.com',
    RATE_LIMIT: 10000, // requests per day
  },
  MAPTILER: {
    BASE_URL: 'https://api.maptiler.com',
    RATE_LIMIT: 100000, // requests per month
  },
} as const;

// ============================================================================
// Feature Flags
// ============================================================================

export const FEATURES = {
  AIS_INTEGRATION: !!ENV.AISSTREAM_TOKEN,
  WEATHER_INTEGRATION: !!ENV.OPENMETEO_API_KEY,
  ENHANCED_MAPS: !!ENV.MAPTILER_KEY,
  ERROR_TRACKING: !!ENV.SENTRY_DSN,
  CLOUDFLARE_INTEGRATION: !!(ENV.CF_ACCOUNT_ID && ENV.CF_API_TOKEN),
} as const;

// ============================================================================
// Debug Configuration
// ============================================================================

export const DEBUG = {
  ENABLED: isDevelopment,
  LOG_ROUTER_CALLS: isDevelopment,
  LOG_MAP_INTERACTIONS: isDevelopment,
  LOG_PERFORMANCE: isDevelopment,
} as const;
