// Development utilities for SeaSight application

import { DEBUG } from '../config/env';
import type { LatLonPosition } from '../types';

// ============================================================================
// Logger
// ============================================================================

export const logger = {
  info: (message: string, ...args: unknown[]) => {
    if (DEBUG.ENABLED) {
      console.log(`[SeaSight] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    if (DEBUG.ENABLED) {
      console.warn(`[SeaSight] ${message}`, ...args);
    }
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[SeaSight] ${message}`, ...args);
  },
  debug: (message: string, ...args: unknown[]) => {
    if (DEBUG.ENABLED) {
      console.debug(`[SeaSight] ${message}`, ...args);
    }
  },
};

// ============================================================================
// Router Debug Utilities
// ============================================================================

export const debugRouter = {
  logRouteCalculation: (start: LatLonPosition, end: LatLonPosition, mode?: string) => {
    if (DEBUG.LOG_ROUTER_CALLS) {
      logger.info('Route calculation started', { start, end, mode });
    }
  },
  
  logRouteResult: (result: any, duration: number) => {
    if (DEBUG.LOG_ROUTER_CALLS) {
      logger.info('Route calculation completed', { 
        waypointCount: result?.waypoints?.length || 0,
        duration: `${duration}ms`,
        success: !!result
      });
    }
  },
  
  logRouterError: (error: unknown) => {
    if (DEBUG.LOG_ROUTER_CALLS) {
      logger.error('Route calculation failed', error);
    }
  },
};

// ============================================================================
// Map Debug Utilities
// ============================================================================

export const debugMap = {
  logMapInteraction: (action: string, data?: any) => {
    if (DEBUG.LOG_MAP_INTERACTIONS) {
      logger.info(`Map interaction: ${action}`, data);
    }
  },
  
  logWaypointAdded: (waypoint: LatLonPosition) => {
    if (DEBUG.LOG_MAP_INTERACTIONS) {
      logger.info('Waypoint added', waypoint);
    }
  },
  
  logWaypointRemoved: (id: string) => {
    if (DEBUG.LOG_MAP_INTERACTIONS) {
      logger.info('Waypoint removed', { id });
    }
  },
  
  logMapStyleChange: (style: string) => {
    if (DEBUG.LOG_MAP_INTERACTIONS) {
      logger.info('Map style changed', { style });
    }
  },
};

// ============================================================================
// Performance Monitoring
// ============================================================================

export const performanceMonitor = {
  startTimer: (name: string) => {
    if (DEBUG.LOG_PERFORMANCE) {
      performance.mark(`${name}-start`);
    }
  },
  
  endTimer: (name: string) => {
    if (DEBUG.LOG_PERFORMANCE) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name)[0];
      if (measure) {
        logger.debug(`Performance: ${name} took ${measure.duration.toFixed(2)}ms`);
      }
    }
  },
  
  measureAsync: async <T>(name: string, operation: () => Promise<T>): Promise<T> => {
    performanceMonitor.startTimer(name);
    try {
      const result = await operation();
      return result;
    } finally {
      performanceMonitor.endTimer(name);
    }
  },
};

// ============================================================================
// State Debugging
// ============================================================================

export const debugState = {
  logStateChange: (component: string, state: any) => {
    if (DEBUG.ENABLED) {
      logger.debug(`State change in ${component}`, state);
    }
  },
  
  logPropsChange: (component: string, props: any) => {
    if (DEBUG.ENABLED) {
      logger.debug(`Props change in ${component}`, props);
    }
  },
};

// ============================================================================
// Development Helpers
// ============================================================================

export const devHelpers = {
  // Generate test waypoints
  generateTestWaypoints: (): LatLonPosition[] => [
    { lat: 40.7128, lon: -74.0060 }, // New York
    { lat: 41.8781, lon: -87.6298 }, // Chicago
  ],
  
  // Simulate slow network
  simulateSlowNetwork: (delay: number = 2000) => {
    return new Promise(resolve => setTimeout(resolve, delay));
  },
  
  // Log component lifecycle
  logLifecycle: (component: string, phase: 'mount' | 'unmount' | 'update') => {
    if (DEBUG.ENABLED) {
      logger.debug(`Component ${phase}: ${component}`);
    }
  },
};

// ============================================================================
// Debug Panel (for development)
// ============================================================================

export const debugPanel = {
  isEnabled: DEBUG.ENABLED,
  
  toggle: () => {
    // This would toggle a debug panel in the UI
    logger.info('Debug panel toggled');
  },
  
  logCurrentState: (state: any) => {
    if (DEBUG.ENABLED) {
      logger.info('Current application state', state);
    }
  },
};
