// Tests for shared utility functions

import { describe, it, expect } from 'vitest';
import {
  normalizeWaypoints,
  isValidWaypoint,
  createWaypoint,
  formatDuration,
  formatEta,
  formatDistance,
  generateRouteKey,
  validateCoordinates,
  removeItemById,
  updateItemById,
  truncateString,
  capitalizeFirst,
  roundToDecimals,
  clamp,
} from '@shared/utils';
import type { Waypoint, LatLonPosition } from '@shared/types';

describe('Waypoint Utilities', () => {
  describe('normalizeWaypoints', () => {
    it('should normalize waypoints with correct names', () => {
      const waypoints: Waypoint[] = [
        { id: '1', lat: 40.7128, lon: -74.0060, name: 'Start' },
        { id: '2', lat: 41.8781, lon: -87.6298, name: 'End' },
        { id: '3', lat: 42.3601, lon: -71.0589, name: 'Waypoint' },
      ];

      const normalized = normalizeWaypoints(waypoints);

      expect(normalized[0].name).toBe('Departure');
      expect(normalized[1].name).toBe('Destination');
      expect(normalized[2].name).toBe('Waypoint 3');
    });

    it('should handle empty array', () => {
      expect(normalizeWaypoints([])).toEqual([]);
    });
  });

  describe('isValidWaypoint', () => {
    it('should return true for valid coordinates within bounds', () => {
      expect(isValidWaypoint(40.7128, -74.0060)).toBe(true);
      expect(isValidWaypoint(30, -80)).toBe(true);
      expect(isValidWaypoint(50, -60)).toBe(true);
    });

    it('should return false for coordinates outside bounds', () => {
      expect(isValidWaypoint(20, -74.0060)).toBe(false); // Too far south
      expect(isValidWaypoint(60, -74.0060)).toBe(false); // Too far north
      expect(isValidWaypoint(40.7128, -90)).toBe(false); // Too far west
      expect(isValidWaypoint(40.7128, -50)).toBe(false); // Too far east
    });
  });

  describe('createWaypoint', () => {
    it('should create waypoint with generated ID', () => {
      const coords: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const waypoint = createWaypoint(coords, 'Test Waypoint');

      expect(waypoint.lat).toBe(40.7128);
      expect(waypoint.lon).toBe(-74.0060);
      expect(waypoint.name).toBe('Test Waypoint');
      expect(waypoint.id).toMatch(/^wp-\d+-\d+$/);
    });

    it('should use default name when not provided', () => {
      const coords: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const waypoint = createWaypoint(coords);

      expect(waypoint.name).toBe('Waypoint');
    });
  });
});

describe('Time and Duration Utilities', () => {
  describe('formatDuration', () => {
    it('should format hours correctly', () => {
      expect(formatDuration(1.5)).toBe('1h 30m');
      expect(formatDuration(2.25)).toBe('2h 15m');
      expect(formatDuration(0.5)).toBe('0h 30m');
      expect(formatDuration(24)).toBe('24h 0m');
    });

    it('should handle undefined and NaN', () => {
      expect(formatDuration(undefined)).toBeUndefined();
      expect(formatDuration(NaN)).toBeUndefined();
    });
  });

  describe('formatEta', () => {
    it('should format ETA correctly', () => {
      expect(formatEta(1.5)).toBe('1.5 hrs');
      expect(formatEta(24.75)).toBe('24.8 hrs');
    });

    it('should handle undefined', () => {
      expect(formatEta(undefined)).toBeUndefined();
    });
  });

  describe('formatDistance', () => {
    it('should format distance correctly', () => {
      expect(formatDistance(1.5)).toBe('1.5 nm');
      expect(formatDistance(24.75)).toBe('24.8 nm');
    });

    it('should handle undefined', () => {
      expect(formatDistance(undefined)).toBeUndefined();
    });
  });
});

describe('Route Key Generation', () => {
  describe('generateRouteKey', () => {
    it('should generate consistent route keys', () => {
      const start: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const destination: LatLonPosition = { lat: 41.8781, lon: -87.6298 };

      const key1 = generateRouteKey(start, destination);
      const key2 = generateRouteKey(start, destination);

      expect(key1).toBe(key2);
      expect(key1).toBe('40.7128,-74.0060|41.8781,-87.6298');
    });
  });
});

describe('Validation Utilities', () => {
  describe('validateCoordinates', () => {
    it('should validate correct coordinates', () => {
      const result = validateCoordinates(40.7128, -74.0060);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid latitude', () => {
      const result = validateCoordinates(91, -74.0060);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Latitude must be between -90 and 90');
    });

    it('should reject invalid longitude', () => {
      const result = validateCoordinates(40.7128, 181);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Longitude must be between -180 and 180');
    });

    it('should reject coordinates outside router bounds', () => {
      const result = validateCoordinates(20, -74.0060);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Coordinates must be within router bounds');
    });
  });
});

describe('Array Utilities', () => {
  describe('removeItemById', () => {
    it('should remove item by ID', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
        { id: '3', name: 'Item 3' },
      ];

      const result = removeItemById(items, '2');

      expect(result).toHaveLength(2);
      expect(result.find(item => item.id === '2')).toBeUndefined();
    });

    it('should return same array if ID not found', () => {
      const items = [{ id: '1', name: 'Item 1' }];
      const result = removeItemById(items, '2');

      expect(result).toBe(items);
    });
  });

  describe('updateItemById', () => {
    it('should update item by ID', () => {
      const items = [
        { id: '1', name: 'Item 1' },
        { id: '2', name: 'Item 2' },
      ];

      const result = updateItemById(items, '2', { name: 'Updated Item 2' });

      expect(result[1].name).toBe('Updated Item 2');
      expect(result[0].name).toBe('Item 1');
    });

    it('should return same array if ID not found', () => {
      const items = [{ id: '1', name: 'Item 1' }];
      const result = updateItemById(items, '2', { name: 'Updated' });

      expect(result).toBe(items);
    });
  });
});

describe('String Utilities', () => {
  describe('truncateString', () => {
    it('should truncate long strings', () => {
      expect(truncateString('Hello World', 8)).toBe('Hello...');
      expect(truncateString('Short', 10)).toBe('Short');
    });
  });

  describe('capitalizeFirst', () => {
    it('should capitalize first letter', () => {
      expect(capitalizeFirst('hello')).toBe('Hello');
      expect(capitalizeFirst('HELLO')).toBe('HELLO');
    });
  });
});

describe('Number Utilities', () => {
  describe('roundToDecimals', () => {
    it('should round to specified decimals', () => {
      expect(roundToDecimals(1.23456, 2)).toBe(1.23);
      expect(roundToDecimals(1.23456, 3)).toBe(1.235);
    });
  });

  describe('clamp', () => {
    it('should clamp values within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-1, 0, 10)).toBe(0);
      expect(clamp(11, 0, 10)).toBe(10);
    });
  });
});
