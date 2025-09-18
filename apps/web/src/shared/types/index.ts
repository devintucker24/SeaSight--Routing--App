// Global type definitions for SeaSight application

// ============================================================================
// Core Navigation Types
// ============================================================================

export interface LatLonPosition {
  lat: number;
  lon: number;
}

export interface Waypoint {
  id: string;
  lat: number;
  lon: number;
  name: string;
}

export interface GridPosition {
  i: number;
  j: number;
}

// ============================================================================
// Map Configuration Types
// ============================================================================

export type MapStyle = 'openfreemap-liberty' | 'dark-maritime';

export interface MapLayer {
  id: string;
  icon: string;
  label: string;
  active: boolean;
  onToggle: (id: string) => void;
}

// ============================================================================
// Routing Types
// ============================================================================

export type RoutingMode = 'ASTAR' | 'ISOCHRONE';

export interface SafetyCaps {
  maxWaveHeight: number;
  maxHeadingChange: number;
  minWaterDepth: number;
}

export interface IsochroneOptions {
  timeStepMinutes: number;
  headingCount: number;
  mergeRadiusNm: number;
  goalRadiusNm: number;
  maxHours: number;
  ship: {
    calmSpeedKts: number;
    maxHeadingChange: number;
  };
  safetyCaps: SafetyCaps;
}

// ============================================================================
// Vessel Types
// ============================================================================

export interface VesselProfile {
  id: string;
  name: string;
  type: 'cargo' | 'tanker' | 'yacht' | 'custom';
  length: number;
  beam: number;
  draft: number;
  maxSpeed: number;
  safetyCaps: SafetyCaps;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface AppState {
  waypoints: Waypoint[];
  route: LatLonPosition[];
  routeResult: RouteResponse | null;
  lastSolveKey: string | null;
  isCalculating: boolean;
  rightPanelOpen: boolean;
  mapStyle: MapStyle;
  showOpenSeaMap: boolean;
  routingMode: RoutingMode;
  isochroneOpts: IsochroneOptions;
  layers: MapLayer[];
}

// ============================================================================
// Route Response Types (re-exported from RouterService)
// ============================================================================

export interface RouteResponse {
  mode: RoutingMode;
  waypoints: Array<LatLonPosition & { time?: number }>;
  etaHours: number;
  diagnostics?: {
    totalDistanceNm: number;
    averageSpeedKts: number;
    maxWaveHeightM: number;
    stepCount: number;
    frontierCount: number;
    reachedGoal: boolean;
    finalDistanceToGoalNm: number;
    etaHours: number;
    hazardFlags?: number;
  };
}

// ============================================================================
// Utility Types
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;
