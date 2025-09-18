// Utility functions for SeaSight application

import type { Waypoint, LatLonPosition } from '../types';
import { ROUTER_CONFIG } from '../constants';

// ============================================================================
// Waypoint Utilities
// ============================================================================

export const normalizeWaypoints = (items: Waypoint[]): Waypoint[] =>
  items.map((wp, idx) => ({
    ...wp,
    name: idx === 0 ? 'Departure' : idx === 1 ? 'Destination' : `Waypoint ${idx + 1}`
  }));

export const isValidWaypoint = (lat: number, lon: number): boolean => {
  return (
    lat >= ROUTER_CONFIG.GRID_BOUNDS.LAT_MIN &&
    lat <= ROUTER_CONFIG.GRID_BOUNDS.LAT_MAX &&
    lon >= ROUTER_CONFIG.GRID_BOUNDS.LON_MIN &&
    lon <= ROUTER_CONFIG.GRID_BOUNDS.LON_MAX
  );
};

export const createWaypoint = (coords: LatLonPosition, label?: string): Waypoint => {
  const nextId = `wp-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
  return {
    id: nextId,
    lat: coords.lat,
    lon: coords.lon,
    name: label ?? 'Waypoint'
  };
};

// ============================================================================
// Time and Duration Utilities
// ============================================================================

export const formatDuration = (hours: number | undefined): string | undefined => {
  if (hours === undefined || Number.isNaN(hours)) return undefined;
  const totalMinutes = Math.max(0, Math.round(hours * 60));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${m}m`;
};

export const formatEta = (etaHours: number | undefined): string | undefined => {
  if (etaHours === undefined) return undefined;
  return `${etaHours.toFixed(1)} hrs`;
};

export const formatDistance = (distanceNm: number | undefined): string | undefined => {
  if (distanceNm === undefined) return undefined;
  return `${distanceNm.toFixed(1)} nm`;
};

// ============================================================================
// Route Key Generation
// ============================================================================

export const generateRouteKey = (start: LatLonPosition, destination: LatLonPosition): string => {
  return `${start.lat.toFixed(4)},${start.lon.toFixed(4)}|${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`;
};

// ============================================================================
// Map Utilities
// ============================================================================

export const getMapStyleUrl = (style: 'openfreemap-liberty' | 'dark-maritime'): string => {
  return style === 'dark-maritime' ? '/dark.json' : 'https://tiles.openfreemap.org/styles/liberty';
};

export const createMapLayer = (id: string, icon: string, label: string, active: boolean, onToggle: (id: string) => void) => ({
  id,
  icon,
  label,
  active,
  onToggle,
});

// ============================================================================
// Validation Utilities
// ============================================================================

export const validateCoordinates = (lat: number, lon: number): { valid: boolean; error?: string } => {
  if (isNaN(lat) || isNaN(lon)) {
    return { valid: false, error: 'Invalid coordinates' };
  }
  
  if (lat < -90 || lat > 90) {
    return { valid: false, error: 'Latitude must be between -90 and 90' };
  }
  
  if (lon < -180 || lon > 180) {
    return { valid: false, error: 'Longitude must be between -180 and 180' };
  }
  
  if (!isValidWaypoint(lat, lon)) {
    return { 
      valid: false, 
      error: `Coordinates must be within router bounds (${ROUTER_CONFIG.GRID_BOUNDS.LAT_MIN}°-${ROUTER_CONFIG.GRID_BOUNDS.LAT_MAX}°N, ${ROUTER_CONFIG.GRID_BOUNDS.LON_MIN}°-${ROUTER_CONFIG.GRID_BOUNDS.LON_MAX}°W)` 
    };
  }
  
  return { valid: true };
};

// ============================================================================
// Array Utilities
// ============================================================================

export const removeItemById = <T extends { id: string }>(items: T[], id: string): T[] => {
  return items.filter(item => item.id !== id);
};

export const updateItemById = <T extends { id: string }>(items: T[], id: string, updates: Partial<T>): T[] => {
  return items.map(item => item.id === id ? { ...item, ...updates } : item);
};

// ============================================================================
// String Utilities
// ============================================================================

export const truncateString = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

export const capitalizeFirst = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// ============================================================================
// Number Utilities
// ============================================================================

export const roundToDecimals = (num: number, decimals: number): number => {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};
