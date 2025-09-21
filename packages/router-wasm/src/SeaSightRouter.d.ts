export interface EdgeData {
  from_i: number;
  from_j: number;
  to_i: number;
  to_j: number;
  distance_nm: number;
  time_hours: number;
  effective_speed_kts: number;
  sample_points: { lat: number; lon: number }[];
}

export interface Waypoint {
  lat: number;
  lon: number;
  time?: number;
  headingDeg?: number;
  isCourseChange?: boolean;
  maxWaveHeightM?: number;
  hazardFlags?: number;
}

export interface Diagnostics {
  totalDistanceNm: number;
  averageSpeedKts: number;
  maxWaveHeightM: number;
  stepCount: number;
  frontierCount: number;
  reachedGoal: boolean;
  finalDistanceToGoalNm: number;
  etaHours: number;
  hazardFlags?: number;
}

export interface EnvironmentPackMeta {
  lat0: number;
  lon0: number;
  spacingDeg: number;
  rows: number;
  cols: number;
  defaultDepth?: number;
  shallowDepth?: number;
  defaultWaveHeight?: number;
}

export interface EnvironmentSample {
  current_east_kn: number;
  current_north_kn: number;
  wave_height_m: number;
  depth_m: number;
}

export interface IsochroneResult {
  mode: 'ISOCHRONE';
  waypoints: Waypoint[];
  waypointsRaw: Waypoint[];
  indexMap: number[];
  eta: number;
  diagnostics: Diagnostics;
}

export interface AStarNode {
  i: number;
  j: number;
  t: number;
  g_cost: number;
  f_cost: number;
}

export interface RouterWrapper {
  loadLandMask(bytes: Uint8Array): void;
  loadEnvironmentPack(
    meta: EnvironmentPackMeta,
    curU: Float32Array,
    curV: Float32Array,
    waveHs?: Float32Array,
    landMask?: Uint8Array,
    shallowMask?: Uint8Array
  ): void;
  setSafetyCaps(maxWaveHeight: number, maxHeadingChange: number, minWaterDepth: number): void;
  addMaskData(i: number, j: number, mask: number[]): void;
  solve(startI: number, startJ: number, goalI: number, goalJ: number, startTime?: number): AStarNode[];
  solveIsochrone(request: unknown, sampler?: unknown): IsochroneResult;
  createEdge(fromI: number, fromJ: number, toI: number, toJ: number): EdgeData;
  gridToLatLon(i: number, j: number): { lat: number; lon: number };
  latLonToGrid(lat: number, lon: number): { i: number; j: number };
  sampleEnvironment(lat: number, lon: number, timeHours?: number): EnvironmentSample;
  greatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number;
  normalizeLongitude(lon: number): number;
  crossesAntiMeridian(lon1: number, lon2: number): boolean;
}

export interface SeaSightRouterModule {
  RouterWrapper: new (
    lat0: number,
    lat1: number,
    lon0: number,
    lon1: number,
    dLat: number,
    dLon: number
  ) => RouterWrapper;
}

declare const SeaSightRouterModule: () => Promise<SeaSightRouterModule>;
export default SeaSightRouterModule;
