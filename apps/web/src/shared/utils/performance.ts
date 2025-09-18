// Performance monitoring utilities for SeaSight application

import { DEBUG } from '../config/env';

// ============================================================================
// Performance Timer
// ============================================================================

/**
 * Performance timer for measuring execution time
 */
export class PerformanceTimer {
  private startTime: number;
  private name: string;

  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }

  /**
   * End the timer and log the duration
   * @param logLevel - Log level for the performance measurement
   */
  end(logLevel: 'debug' | 'info' | 'warn' = 'debug'): number {
    const duration = performance.now() - this.startTime;
    
    if (DEBUG.LOG_PERFORMANCE) {
      const message = `Performance: ${this.name} took ${duration.toFixed(2)}ms`;
      
      switch (logLevel) {
        case 'debug':
          console.debug(message);
          break;
        case 'info':
          console.info(message);
          break;
        case 'warn':
          console.warn(message);
          break;
      }
    }

    return duration;
  }

  /**
   * Get the current elapsed time without ending the timer
   */
  getElapsed(): number {
    return performance.now() - this.startTime;
  }
}

// ============================================================================
// Performance Monitor
// ============================================================================

/**
 * Performance monitoring utilities
 */
export const performanceMonitor = {
  /**
   * Start a performance timer
   * @param name - Name of the performance measurement
   * @returns PerformanceTimer instance
   */
  startTimer: (name: string): PerformanceTimer => {
    return new PerformanceTimer(name);
  },

  /**
   * Measure the execution time of an async function
   * @param name - Name of the performance measurement
   * @param fn - Async function to measure
   * @returns Promise with the result of the function
   */
  measureAsync: async <T>(name: string, fn: () => Promise<T>): Promise<T> => {
    const timer = new PerformanceTimer(name);
    try {
      const result = await fn();
      return result;
    } finally {
      timer.end();
    }
  },

  /**
   * Measure the execution time of a synchronous function
   * @param name - Name of the performance measurement
   * @param fn - Function to measure
   * @returns Result of the function
   */
  measureSync: <T>(name: string, fn: () => T): T => {
    const timer = new PerformanceTimer(name);
    try {
      return fn();
    } finally {
      timer.end();
    }
  },

  /**
   * Create a performance mark
   * @param name - Name of the mark
   */
  mark: (name: string): void => {
    if (DEBUG.LOG_PERFORMANCE) {
      performance.mark(name);
    }
  },

  /**
   * Create a performance measure between two marks
   * @param name - Name of the measure
   * @param startMark - Start mark name
   * @param endMark - End mark name
   */
  measure: (name: string, startMark: string, endMark: string): void => {
    if (DEBUG.LOG_PERFORMANCE) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (error) {
        console.warn(`Failed to create performance measure: ${error}`);
      }
    }
  },

  /**
   * Get performance entries by name
   * @param name - Name of the entries to retrieve
   * @returns Array of performance entries
   */
  getEntries: (name: string): PerformanceEntry[] => {
    if (DEBUG.LOG_PERFORMANCE) {
      return performance.getEntriesByName(name);
    }
    return [];
  },

  /**
   * Clear performance entries
   * @param name - Optional name to clear specific entries
   */
  clearEntries: (name?: string): void => {
    if (DEBUG.LOG_PERFORMANCE) {
      if (name) {
        performance.clearMarks(name);
        performance.clearMeasures(name);
      } else {
        performance.clearMarks();
        performance.clearMeasures();
      }
    }
  },
};

// ============================================================================
// Memory Monitoring
// ============================================================================

/**
 * Memory monitoring utilities
 */
export const memoryMonitor = {
  /**
   * Get current memory usage (if available)
   * @returns Memory usage information or null if not available
   */
  getMemoryUsage: (): MemoryInfo | null => {
    if (DEBUG.LOG_PERFORMANCE && 'memory' in performance) {
      return (performance as any).memory;
    }
    return null;
  },

  /**
   * Log current memory usage
   */
  logMemoryUsage: (): void => {
    if (DEBUG.LOG_PERFORMANCE) {
      const memory = memoryMonitor.getMemoryUsage();
      if (memory) {
        console.debug('Memory Usage:', {
          used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        });
      }
    }
  },
};

// ============================================================================
// Route Performance Tracking
// ============================================================================

/**
 * Route-specific performance tracking
 */
export const routePerformance = {
  /**
   * Track route calculation performance
   * @param waypointCount - Number of waypoints
   * @param fn - Route calculation function
   * @returns Promise with the route result
   */
  trackRouteCalculation: async <T>(
    waypointCount: number,
    fn: () => Promise<T>
  ): Promise<T> => {
    const timer = performanceMonitor.startTimer(`route-calculation-${waypointCount}-waypoints`);
    
    try {
      const result = await fn();
      timer.end('info');
      return result;
    } catch (error) {
      timer.end('warn');
      throw error;
    }
  },

  /**
   * Track map rendering performance
   * @param operation - Map operation being performed
   * @param fn - Function to measure
   * @returns Result of the function
   */
  trackMapOperation: <T>(operation: string, fn: () => T): T => {
    return performanceMonitor.measureSync(`map-${operation}`, fn);
  },

  /**
   * Track waypoint operation performance
   * @param operation - Waypoint operation being performed
   * @param waypointCount - Number of waypoints
   * @param fn - Function to measure
   * @returns Result of the function
   */
  trackWaypointOperation: <T>(
    operation: string,
    waypointCount: number,
    fn: () => T
  ): T => {
    return performanceMonitor.measureSync(
      `waypoint-${operation}-${waypointCount}`,
      fn
    );
  },
};

// ============================================================================
// Performance Metrics Collection
// ============================================================================

/**
 * Performance metrics collector
 */
export class PerformanceMetrics {
  private metrics: Map<string, number[]> = new Map();

  /**
   * Record a performance metric
   * @param name - Name of the metric
   * @param value - Value to record
   */
  record(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  /**
   * Get statistics for a metric
   * @param name - Name of the metric
   * @returns Statistics object
   */
  getStats(name: string): {
    count: number;
    min: number;
    max: number;
    avg: number;
    median: number;
  } | null {
    const values = this.metrics.get(name);
    if (!values || values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const count = values.length;
    const min = sorted[0];
    const max = sorted[count - 1];
    const avg = values.reduce((sum, val) => sum + val, 0) / count;
    const median = count % 2 === 0
      ? (sorted[count / 2 - 1] + sorted[count / 2]) / 2
      : sorted[Math.floor(count / 2)];

    return { count, min, max, avg, median };
  }

  /**
   * Get all metrics
   * @returns Map of all metrics
   */
  getAllMetrics(): Map<string, number[]> {
    return new Map(this.metrics);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Export metrics as JSON
   * @returns JSON string of metrics
   */
  export(): string {
    const data: Record<string, number[]> = {};
    this.metrics.forEach((values, name) => {
      data[name] = values;
    });
    return JSON.stringify(data, null, 2);
  }
}

// Global metrics instance
export const globalMetrics = new PerformanceMetrics();
