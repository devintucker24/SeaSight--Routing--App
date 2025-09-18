// Error handling utilities for SeaSight application

// ============================================================================
// Custom Error Classes
// ============================================================================

export class SeaSightError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SeaSightError';
  }
}

export class RouterError extends SeaSightError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'ROUTER_ERROR', context);
    this.name = 'RouterError';
  }
}

export class MapError extends SeaSightError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'MAP_ERROR', context);
    this.name = 'MapError';
  }
}

export class ValidationError extends SeaSightError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

// ============================================================================
// Error Handlers
// ============================================================================

export const handleRouterError = (error: unknown): RouterError => {
  if (error instanceof RouterError) return error;
  
  if (error instanceof Error) {
    return new RouterError(
      `Router operation failed: ${error.message}`,
      { originalError: error.message, stack: error.stack }
    );
  }
  
  return new RouterError(
    'Router operation failed',
    { originalError: error }
  );
};

export const handleMapError = (error: unknown): MapError => {
  if (error instanceof MapError) return error;
  
  if (error instanceof Error) {
    return new MapError(
      `Map operation failed: ${error.message}`,
      { originalError: error.message, stack: error.stack }
    );
  }
  
  return new MapError(
    'Map operation failed',
    { originalError: error }
  );
};

export const handleValidationError = (error: unknown): ValidationError => {
  if (error instanceof ValidationError) return error;
  
  if (error instanceof Error) {
    return new ValidationError(
      `Validation failed: ${error.message}`,
      { originalError: error.message }
    );
  }
  
  return new ValidationError(
    'Validation failed',
    { originalError: error }
  );
};

// ============================================================================
// Error Logger
// ============================================================================

export const logError = (error: SeaSightError, context?: Record<string, unknown>) => {
  console.error(`[SeaSight ${error.code}] ${error.message}`, {
    ...error.context,
    ...context,
    timestamp: new Date().toISOString(),
  });
};

// ============================================================================
// Error Boundary Utilities
// ============================================================================

export const isSeaSightError = (error: unknown): error is SeaSightError => {
  return error instanceof SeaSightError;
};

export const getErrorMessage = (error: unknown): string => {
  if (error instanceof SeaSightError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unknown error occurred';
};

export const getErrorCode = (error: unknown): string => {
  if (error instanceof SeaSightError) {
    return error.code;
  }
  
  return 'UNKNOWN_ERROR';
};

// ============================================================================
// Retry Utilities
// ============================================================================

export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw lastError!;
};

// ============================================================================
// Error Recovery
// ============================================================================

export const createErrorRecovery = <T>(
  fallbackValue: T,
  onError?: (error: Error) => void
) => {
  return (operation: () => T): T => {
    try {
      return operation();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err);
      return fallbackValue;
    }
  };
};
