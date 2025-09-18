// Test setup configuration for SeaSight application

import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// Cleanup after each test case
afterEach(() => {
  cleanup();
});

// Mock environment variables for testing
Object.defineProperty(import.meta, 'env', {
  value: {
    VITE_MAPTILER_KEY: 'test-maptiler-key',
    VITE_AISSTREAM_TOKEN: 'test-aisstream-token',
    VITE_OPENMETEO_API_KEY: 'test-openmeteo-key',
    VITE_CF_ACCOUNT_ID: 'test-cf-account-id',
    VITE_CF_API_TOKEN: 'test-cf-api-token',
    VITE_SENTRY_DSN: 'test-sentry-dsn',
    VITE_APP_VERSION: '0.1.0-test',
    VITE_APP_NAME: 'SeaSight Test',
    DEV: true,
    PROD: false,
    MODE: 'test',
  },
  writable: true,
});

// Mock WebAssembly
Object.defineProperty(window, 'WebAssembly', {
  value: {
    instantiate: vi.fn(),
    Module: vi.fn(),
  },
  writable: true,
});

// Mock performance API
Object.defineProperty(window, 'performance', {
  value: {
    mark: vi.fn(),
    measure: vi.fn(),
    getEntriesByName: vi.fn(() => []),
    now: vi.fn(() => Date.now()),
  },
  writable: true,
});

// Mock console methods in test environment
const originalConsole = { ...console };
beforeEach(() => {
  console.log = vi.fn();
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});
