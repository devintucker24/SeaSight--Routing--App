// Configuration constants for SeaSight application

// ============================================================================
// Router Configuration
// These settings define the fundamental parameters for the underlying routing algorithm
// which calculates optimal paths based on grid resolution, sampling, and nominal vessel speed.
// ============================================================================

export const ROUTER_CONFIG = {
  // Defines the geographic boundaries for the routing grid.
  GRID_BOUNDS: {
    LAT_MIN: -90,
    LAT_MAX: 90,
    LON_MIN: -180,
    LON_MAX: 180,
  },
  // The resolution of the routing grid in degrees. Smaller values increase accuracy but also computational cost.
  GRID_RESOLUTION: 0.5,
  // Distance (in kilometers) used for sampling intermediate points along an edge to check for obstacles or environment changes.
  EDGE_SAMPLING_KM: 3,
  // The assumed base speed (in knots) used for initial path estimations and certain routing calculations.
  NOMINAL_SPEED_KTS: 12,
} as const;

// ============================================================================
// Default Safety Configuration
// These parameters define global safety thresholds for vessel operation, 
// influencing route feasibility and hazard avoidance.
// ============================================================================

export const DEFAULT_SAFETY_CAPS = {
  // Maximum wave height (in meters) a vessel can safely operate in. Routes will avoid areas exceeding this.
  maxWaveHeight: 8.0,
  // Maximum allowed heading change (in degrees) per routing step. Limits sharp turns for smoother navigation.
  maxHeadingChange: 30,
  // Minimum water depth (in meters) required for safe passage. Considers vessel draft and safety buffer.
  minWaterDepth: 15,
} as const;

// ============================================================================
// Map Layer Configuration
// Defines the various map layers available in the UI, including their display properties.
// ============================================================================

export const MAP_LAYERS = [
  { id: 'nautical', icon: '🌊', label: 'Nautical Charts' },
  { id: 'weather', icon: '🌤️', label: 'Weather' },
  { id: 'ais', icon: '🚢', label: 'AIS Ships' },
  { id: 'ports', icon: '⚓', label: 'Ports' },
] as const;

// ============================================================================
// Default Isochrone Options
// These settings are specific to the Isochrone routing mode, defining how
// the solver explores possibilities and how the resulting path is simplified.
// ============================================================================

export const DEFAULT_ISOCHRONE_OPTIONS = {
  // Time in minutes for each simulation step. Smaller steps increase accuracy but also computation time.
  timeStepMinutes: 30,
  // Number of discrete headings (bearings) the ship can take at each step. Higher count improves path smoothness but increases complexity.
  headingCount: 64,
  // Radius (in nautical miles) within which nearby states in the frontier are merged to reduce computational load.
  mergeRadiusNm: 5,
  // Radius (in nautical miles) around the goal point within which the route is considered complete.
  goalRadiusNm: 10,
  // Maximum total hours the router will search for a path before stopping.
  maxHours: 240,
  // Douglas-Peucker simplification tolerance in nautical miles. Higher values result in fewer waypoints and straighter paths.
  // This setting primarily affects the *displayed* route, not the raw solver output.
  simplifyToleranceNm: 25,
  // Minimum length (in nautical miles) a segment must have after simplification. Shorter segments will be removed.
  // This applies as a secondary filter after the main Douglas-Peucker simplification.
  minLegNm: 4.0,
  // Minimum change in heading (in degrees) between consecutive segments after simplification. Smaller changes will be smoothed out.
  // This applies as a secondary filter after the main Douglas-Peucker simplification.
  minHeadingDeg: 5,
  // Bearing window (in degrees) for pruning heading exploration. Only headings within ±bearingWindowDeg of the great-circle bearing to goal are explored.
  // This dramatically reduces computation time by eliminating illogical paths while maintaining route quality.
  bearingWindowDeg: 110,
  // Beam width for limiting frontier size. After each time step, only the top beamWidth states by cost are kept in the search frontier.
  // This prevents exponential growth of the search space while maintaining route quality. Set to 0 to disable beam search.
  beamWidth: 3000,
  // Adaptive sampling parameters for dynamic time step adjustment based on environmental complexity.
  // The router will use smaller time steps in complex areas (high waves, shallow water) and larger steps in calm conditions.
  minTimeStepMinutes: 10,  // Minimum time step for complex/coastal areas
  maxTimeStepMinutes: 60,  // Tighter maximum for more precise coastal refinement
  complexityThreshold: 0.45, // Slightly lower threshold to favor smaller timesteps near complexity
  enableAdaptiveSampling: true, // Enable/disable adaptive time step adjustment

  // Hierarchical Routing Parameters
  enableHierarchicalRouting: true, // Master switch for this feature
  longRouteThresholdNm: 300.0, // Routes longer than this will use hierarchical search
  coarseGridResolutionDeg: 1.0, // Grid resolution for the coarse pass
  corridorWidthNm: 100.0,       // Wider corridor to allow safe coastal alternates

  // Default ship model parameters used for Isochrone calculations.
  ship: { 
    calmSpeedKts: 14, 
    maxHeadingChange: 90,
    maxWaveHeight: 8,
  },
  // Default safety caps applied during Isochrone routing.
  safetyCaps: DEFAULT_SAFETY_CAPS,
} as const;

// ============================================================================
// Map Style Configuration
// Defines available map styles that can be selected in the UI.
// ============================================================================

export const MAP_STYLES = {
  // Configuration for the OpenFreeMap Liberty map style.
  'openfreemap-liberty': {
    url: 'https://tiles.openfreemap.org/styles/liberty',
    name: 'OpenFreeMap Liberty',
    icon: '🆓',
    attribution: '© OpenStreetMap contributors'
  },
  // Configuration for the custom Dark Maritime map style.
  'dark-maritime': {
    url: '/dark.json',
    name: 'Dark Maritime',
    icon: '🌙',
    attribution: '© OpenStreetMap contributors'
  }
} as const;

// ============================================================================
// UI Configuration
// General settings for the user interface, including map defaults and styling.
// ============================================================================

export const UI_CONFIG = {
  // Default geographic coordinates [longitude, latitude] for the map center on initial load.
  DEFAULT_MAP_CENTER: [-70.9, 42.35] as [number, number],
  // Default zoom level for the map on initial load.
  DEFAULT_ZOOM: 6,
  // Maximum allowable zoom level for the map.
  MAX_ZOOM: 18,
  // Minimum allowable zoom level for the map.
  MIN_ZOOM: 1,
  // Radii (in pixels) for different types of waypoints displayed on the map.
  WAYPOINT_RADIUS: {
    start: 10,
    destination: 10,
    waypoint: 7,
  },
  // Visual styling parameters for the route line drawn on the map.
  ROUTE_STYLE: {
    color: '#38bdf8',
    width: 3.5,
    opacity: 0.92,
  },
} as const;

// ============================================================================
// Vessel Profiles
// Predefined profiles for different types of vessels, each with specific physical
// characteristics and default safety settings. These can be selected by the user.
// ============================================================================

export const VESSEL_PROFILES = {
  // Profile for a Cargo Vessel.
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
  // Profile for a Tanker vessel.
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
  // Profile for a Yacht.
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
