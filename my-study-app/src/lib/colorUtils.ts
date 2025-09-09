/**
 * Color Utilities for My Study App
 *
 * This file provides utility functions for consistent color usage across the app.
 * All colors are defined in globals.css and can be used with Tailwind classes.
 */

// Flash Card Color Utilities
export const getCardColors = (variant: 'front' | 'back') => {
  const baseClasses = 'rounded-lg shadow-lg border';

  if (variant === 'front') {
    return `${baseClasses} bg-card-front border-card-border`;
  }

  return `${baseClasses} bg-card-back border-card-border`;
};

// Button Color Utilities
export const getButtonColors = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error') => {
  const baseClasses = 'font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  switch (variant) {
    case 'primary':
      return `${baseClasses} bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500`;
    case 'secondary':
      return `${baseClasses} bg-gray-200 hover:bg-gray-300 text-gray-800 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-200 focus:ring-gray-500`;
    case 'success':
      return `${baseClasses} bg-success-500 hover:bg-success-600 text-white focus:ring-success-500`;
    case 'warning':
      return `${baseClasses} bg-warning-500 hover:bg-warning-600 text-white focus:ring-warning-500`;
    case 'error':
      return `${baseClasses} bg-error-500 hover:bg-error-600 text-white focus:ring-error-500`;
    default:
      return baseClasses;
  }
};

// Input Color Utilities
export const getInputColors = (state: 'default' | 'error' | 'success' = 'default') => {
  const baseClasses = 'w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200';

  switch (state) {
    case 'error':
      return `${baseClasses} border-error-300 bg-error-50 focus:ring-error-500 focus:border-error-500 dark:border-error-600 dark:bg-error-900/20`;
    case 'success':
      return `${baseClasses} border-success-300 bg-success-50 focus:ring-success-500 focus:border-success-500 dark:border-success-600 dark:bg-success-900/20`;
    default:
      return `${baseClasses} border-gray-300 bg-white focus:ring-primary-500 focus:border-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white`;
  }
};

// Card Variant Color Utilities (for different card types)
export const getCardVariantColors = (variant: 'default' | 'success' | 'warning' | 'error' | 'info') => {
  const baseClasses = 'rounded-lg shadow-md border p-6';

  switch (variant) {
    case 'success':
      return `${baseClasses} bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800`;
    case 'warning':
      return `${baseClasses} bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800`;
    case 'error':
      return `${baseClasses} bg-error-50 border-error-200 dark:bg-error-900/20 dark:border-error-800`;
    case 'info':
      return `${baseClasses} bg-primary-50 border-primary-200 dark:bg-primary-900/20 dark:border-primary-800`;
    default:
      return `${baseClasses} bg-white border-gray-200 dark:bg-gray-800 dark:border-gray-700`;
  }
};

// Text Color Utilities
export const getTextColors = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted') => {
  switch (variant) {
    case 'primary':
      return 'text-gray-900 dark:text-white';
    case 'secondary':
      return 'text-gray-600 dark:text-gray-300';
    case 'success':
      return 'text-success-600 dark:text-success-400';
    case 'warning':
      return 'text-warning-600 dark:text-warning-400';
    case 'error':
      return 'text-error-600 dark:text-error-400';
    case 'muted':
      return 'text-gray-500 dark:text-gray-400';
    default:
      return 'text-gray-900 dark:text-white';
  }
};

// Background Color Utilities
export const getBackgroundColors = (variant: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted') => {
  switch (variant) {
    case 'primary':
      return 'bg-primary-50 dark:bg-primary-900/20';
    case 'secondary':
      return 'bg-gray-50 dark:bg-gray-800';
    case 'success':
      return 'bg-success-50 dark:bg-success-900/20';
    case 'warning':
      return 'bg-warning-50 dark:bg-warning-900/20';
    case 'error':
      return 'bg-error-50 dark:bg-error-900/20';
    case 'muted':
      return 'bg-gray-100 dark:bg-gray-700';
    default:
      return 'bg-white dark:bg-gray-800';
  }
};

// Export color constants for direct use
export const colors = {
  primary: {
    50: 'var(--color-primary-50)',
    100: 'var(--color-primary-100)',
    500: 'var(--color-primary-500)',
    600: 'var(--color-primary-600)',
    700: 'var(--color-primary-700)',
  },
  gray: {
    50: 'var(--color-gray-50)',
    100: 'var(--color-gray-100)',
    200: 'var(--color-gray-200)',
    500: 'var(--color-gray-500)',
    700: 'var(--color-gray-700)',
    900: 'var(--color-gray-900)',
  },
  success: {
    100: 'var(--color-success-100)',
    500: 'var(--color-success-500)',
  },
  warning: {
    100: 'var(--color-warning-100)',
    500: 'var(--color-warning-500)',
  },
  error: {
    100: 'var(--color-error-100)',
    500: 'var(--color-error-500)',
  },
} as const;

export type ColorVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'muted';
export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error';
export type CardVariant = 'default' | 'success' | 'warning' | 'error' | 'info';
