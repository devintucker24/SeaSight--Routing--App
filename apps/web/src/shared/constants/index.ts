// Configuration constants for SeaSight application

// ============================================================================
// Router Configuration
// ============================================================================

export const ROUTER_CONFIG = {
  GRID_BOUNDS: {
    LAT_MIN: -90,
    LAT_MAX: 90,
    LON_MIN: -180,
    LON_MAX: 180,
  },
  GRID_RESOLUTION: 0.5,
  EDGE_SAMPLING_KM: 3,
  NOMINAL_SPEED_KTS: 12,
} as const;

// ============================================================================
// Default Safety Configuration
// ============================================================================

export const DEFAULT_SAFETY_CAPS = {
  maxWaveHeight: 8.0,
  maxHeadingChange: 30,
  minWaterDepth: 15,
} as const;

// ============================================================================
// Map Layer Configuration
// ============================================================================

export const MAP_LAYERS = [
  { id: 'nautical', icon: '🌊', label: 'Nautical Charts' },
  { id: 'weather', icon: '🌤️', label: 'Weather' },
  { id: 'ais', icon: '🚢', label: 'AIS Ships' },
  { id: 'ports', icon: '⚓', label: 'Ports' },
] as const;

// ============================================================================
// Default Isochrone Options
// ============================================================================

export const DEFAULT_ISOCHRONE_OPTIONS = {
  timeStepMinutes: 30,
  headingCount: 16,
  mergeRadiusNm: 5,
  goalRadiusNm: 10,
  maxHours: 240,
  ship: { 
    calmSpeedKts: 14, 
    maxHeadingChange: 30,
    maxWaveHeight: 8,
  },
  safetyCaps: DEFAULT_SAFETY_CAPS,
} as const;

// ============================================================================
// Map Style Configuration
// ============================================================================

export const MAP_STYLES = {
  'openfreemap-liberty': {
    url: 'https://tiles.openfreemap.org/styles/liberty',
    name: 'OpenFreeMap Liberty',
    icon: '🆓',
    attribution: '© OpenStreetMap contributors'
  },
  'dark-maritime': {
    url: '/dark.json',
    name: 'Dark Maritime',
    icon: '🌙',
    attribution: '© OpenStreetMap contributors'
  }
} as const;

// ============================================================================
// UI Configuration
// ============================================================================

export const UI_CONFIG = {
  DEFAULT_MAP_CENTER: [-70.9, 42.35] as [number, number],
  DEFAULT_ZOOM: 6,
  MAX_ZOOM: 18,
  MIN_ZOOM: 1,
  WAYPOINT_RADIUS: {
    start: 10,
    destination: 10,
    waypoint: 7,
  },
  ROUTE_STYLE: {
    color: '#38bdf8',
    width: 3.5,
    opacity: 0.92,
  },
} as const;

// ============================================================================
// Vessel Profiles
// ============================================================================

export const VESSEL_PROFILES = {
  cargo: {
    id: 'cargo',
    name: 'Cargo Vessel',
    type: 'cargo' as const,
    length: 200,
    beam: 32,
    draft: 12,
    maxSpeed: 14,
    safetyCaps: DEFAULT_SAFETY_CAPS,
  },
  tanker: {
    id: 'tanker',
    name: 'Tanker',
    type: 'tanker' as const,
    length: 250,
    beam: 44,
    draft: 15,
    maxSpeed: 12,
    safetyCaps: DEFAULT_SAFETY_CAPS,
  },
  yacht: {
    id: 'yacht',
    name: 'Yacht',
    type: 'yacht' as const,
    length: 50,
    beam: 10,
    draft: 3,
    maxSpeed: 20,
    safetyCaps: DEFAULT_SAFETY_CAPS,
  },
} as const;
