// Router Service for SeaSight Router WASM Integration
// import { loadPack, createEnvironmentSampler } from '../../../workers/PackLoader';
import type { PackData, EnvironmentSamplerOptions } from '../../../workers/PackLoader';
import { DEFAULT_ISOCHRONE_OPTIONS } from '@shared/constants';
import type { IsochroneEnvironmentSample, EnvironmentSampler } from '@shared/types';

export interface RouterConfig {
  lat0: number;
  lat1: number;
  lon0: number;
  lon1: number;
  dLat: number;
  dLon: number;
}

export interface SafetyCaps {
  maxWaveHeight: number;
  maxHeadingChange: number;
  minWaterDepth: number;
}

export interface GridPosition {
  i: number;
  j: number;
}

export interface LatLonPosition {
  lat: number;
  lon: number;
}

export interface RouteNode {
  i: number;
  j: number;
  t: number;
  g_cost: number;
  f_cost: number;
}

export type RoutingMode = 'ASTAR' | 'ISOCHRONE';

export interface RouteWaypoint extends LatLonPosition {
  time?: number;
}

export interface IsochroneDiagnostics {
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

export interface LandMaskData {
  loaded: boolean;
  lat0: number;
  lat1: number;
  lon0: number;
  lon1: number;
  d_lat: number;
  d_lon: number;
  rows: number;
  cols: number;
  cells: Uint8Array;
}

export interface RouteResponse {
  mode: RoutingMode;
  waypoints: RouteWaypoint[];
  waypointsRaw?: RouteWaypoint[];
  indexMap?: number[];
  etaHours: number;
  diagnostics?: IsochroneDiagnostics;
  isCoarseRoute?: boolean;
}

export interface IsochroneShipOptions {
  calmSpeedKts?: number;
  draft?: number;
  safetyDepthBuffer?: number;
  maxWaveHeight?: number;
  maxHeadingChange?: number;
  minSpeed?: number;
  waveDragCoefficient?: number;
}

export interface IsochroneSafetyCaps {
  maxWaveHeight?: number;
  maxHeadingChange?: number;
  minWaterDepth?: number;
}

export interface IsochroneOptions {
  timeStepMinutes?: number;
  headingCount?: number;
  mergeRadiusNm?: number;
  goalRadiusNm?: number;
  maxHours?: number;
  simplifyToleranceNm?: number;
  minLegNm?: number;
  minHeadingDeg?: number;
  bearingWindowDeg?: number;
  beamWidth?: number;
  minTimeStepMinutes?: number;
  maxTimeStepMinutes?: number;
  complexityThreshold?: number;
  enableAdaptiveSampling?: boolean;
  
  // Hierarchical Routing
  enableHierarchicalRouting?: boolean;
  longRouteThresholdNm?: number;
  coarseGridResolutionDeg?: number;
  corridorWidthNm?: number;

  ship?: IsochroneShipOptions;
  safetyCaps?: IsochroneSafetyCaps;
}


export interface SolveRouteOptions {
  mode?: RoutingMode;
  isochrone?: IsochroneOptions;
  environmentSampler?: EnvironmentSampler;
  start?: LatLonPosition;
  goal?: LatLonPosition;
}

export interface EdgeData {
  from_i: number;
  from_j: number;
  to_i: number;
  to_j: number;
  distance_nm: number;
  time_hours: number;
  effective_speed_kts: number;
  sample_points: LatLonPosition[];
}

export interface MaskData {
  land: boolean;
  shallow: boolean;
  restricted: boolean;
}

export interface RouteComparisonResult {
  isochroneDistanceNm: number;
  straightDistanceNm: number;
  distanceDifferenceNm: number;
  distanceDifferencePercent: number;
  isochroneEtaHours: number;
  straightEtaHours: number;
  timeDifferenceHours: number;
  timeDifferencePercent: number;
}

class RouterService {
  private packWorker: Worker;
  private routerWorker: Worker;
  private packWorkerReady: boolean = false;
  // private routerWorkerReady: boolean = false; // Removed since router worker is optional
  private isInitialized = false;
  // private environmentSampler: EnvironmentSampler | null = null;
  private initializationPromise: Promise<void> | null = null;

  private workerMessageId = 0;
  private pendingWorkerPromises = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

  constructor() {
    this.packWorker = new Worker(new URL('../../../workers/pack.worker.ts', import.meta.url), { type: 'module' });
    this.routerWorker = new Worker(new URL('../../../workers/router.worker.ts', import.meta.url), { type: 'module' });
    // this.routerWorker = null as any; // Temporarily disabled

    this.packWorker.onmessage = (event) => this.handlePackWorkerMessage(event);
    this.routerWorker.onmessage = (event) => this.handleRouterWorkerMessage(event);
    this.packWorker.onerror = (error) => console.error('Pack Worker error:', error);
    this.routerWorker.onerror = (error) => console.error('Router Worker error:', error);
  }

  private getNextMessageId(): number {
    return this.workerMessageId++;
  }

  private createWorkerPromise(worker: Worker, type: string, payload: any, transferable?: Transferable[]): Promise<any> {
    const id = this.getNextMessageId();
    // // console.log('🔧 [ROUTER SERVICE] createWorkerPromise called:', { type, id, hasWorker: !!worker });
    
    return new Promise((resolve, reject) => {
      this.pendingWorkerPromises.set(id, { resolve, reject });
      
      try {
        if (transferable) {
          // // console.log('🔧 [ROUTER SERVICE] Sending message with transferable:', { type, id });
          worker.postMessage({ type, payload, id }, transferable);
        } else {
          // // console.log('🔧 [ROUTER SERVICE] Sending message without transferable:', { type, id });
          worker.postMessage({ type, payload, id });
        }
        // // console.log('🔧 [ROUTER SERVICE] Message sent successfully');
      } catch (error) {
        console.error('🔧 [ROUTER SERVICE] Failed to send message to worker:', error);
        reject(error);
      }
    });
  }

  private handlePackWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;
    // // console.log('🔧 [ROUTER SERVICE] Pack worker message received:', { type, id, hasPayload: !!payload });
    
    const promiseHandlers = this.pendingWorkerPromises.get(id);
    if (promiseHandlers) {
      // // console.log('🔧 [ROUTER SERVICE] Found promise handlers for pack worker message:', id);
      this.pendingWorkerPromises.delete(id);
      if (type === 'PACK_LOADED') {
        this.packWorkerReady = payload.success;
        // console.log('🔧 [ROUTER SERVICE] Pack loaded, packWorkerReady set to:', this.packWorkerReady);
        promiseHandlers.resolve(payload);
      } else if (type === 'ERROR') {
        console.error('🔧 [ROUTER SERVICE] Pack worker error:', payload);
        promiseHandlers.reject(new Error(payload));
      } else {
        console.warn('🔧 [ROUTER SERVICE] Unknown message type from pack worker:', type);
      }
    } else {
      console.warn('🔧 [ROUTER SERVICE] No promise handlers found for pack worker message:', id);
    }
  }

  private handleRouterWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;
    // // console.log('🔧 [ROUTER SERVICE] Router worker message received:', { type, id, hasPayload: !!payload });
    
    const promiseHandlers = this.pendingWorkerPromises.get(id);
    if (promiseHandlers) {
      // // console.log('🔧 [ROUTER SERVICE] Found promise handlers for router worker message:', id);
      this.pendingWorkerPromises.delete(id);
      if (
        type === 'GRID_TO_LATLON_RESULT' ||
        type === 'LATLON_TO_GRID_RESULT' ||
        type === 'GREAT_CIRCLE_DISTANCE_RESULT' ||
        type === 'NORMALIZE_LONGITUDE_RESULT' ||
        type === 'CROSSES_ANTI_MERIDIAN_RESULT' ||
        type === 'CREATE_EDGE_RESULT'
      ) {
        // // console.log('🔧 [ROUTER SERVICE] Resolving utility function result:', type);
        promiseHandlers.resolve(payload);
      } else if (type === 'ROUTE_SOLVED') {
        // // console.log('🔧 [ROUTER SERVICE] Route solved, resolving promise');
        promiseHandlers.resolve(payload);
      } else if (type === 'ROUTER_INITIALIZED') {
        // console.log('🔧 [ROUTER SERVICE] Router initialized, resolving promise');
        promiseHandlers.resolve(payload);
      } else if (type === 'ERROR') {
        console.error('🔧 [ROUTER SERVICE] Router worker error:', payload);
        promiseHandlers.reject(new Error(payload));
      } else {
        console.warn('🔧 [ROUTER SERVICE] Unknown message type from router worker:', type);
      }
    } else {
      console.warn('🔧 [ROUTER SERVICE] No promise handlers found for router worker message:', id);
    }
  }

  async initialize(config: RouterConfig): Promise<void> {
    // console.log('🔧 [ROUTER SERVICE] initialize() called with config:', config);
    // console.log('🔧 [ROUTER SERVICE] Current state - isInitialized:', this.isInitialized);
    
    if (this.isInitialized) {
      // console.log('🔧 [ROUTER SERVICE] Already initialized; skipping.');
      return;
    }

    // If an initialization is already in progress, await it
    if (this.initializationPromise) {
      // console.log('🔧 [ROUTER SERVICE] Initialization already in progress, waiting...');
      await this.initializationPromise;
      return;
    }

    // console.log('🔧 [ROUTER SERVICE] Starting initialization promise...');
    this.initializationPromise = (async () => {
      try {
        // console.log('🔧 [ROUTER SERVICE] Inside initialization promise');
        
        // Initialize Pack Worker
        const packLoadOptions: EnvironmentSamplerOptions = { defaultWaveHeight: 1.0, defaultDepth: 5000 };
        let packData: PackData;
        
        try {
          // console.log('🔧 [ROUTER SERVICE] Attempting to load pack from /packs/NATL_050_test');
          const packLoadResult = await this.createWorkerPromise(this.packWorker, 'LOAD_PACK', { basePath: '/packs/NATL_050_test', options: packLoadOptions });
          packData = packLoadResult.packData;
          // console.log('🔧 [ROUTER SERVICE] Pack loaded successfully');
        } catch (packError) {
          console.warn('🔧 [ROUTER SERVICE] Pack loading failed, creating minimal pack data:', packError);
          // Create a minimal pack data structure
          packData = {
            grid: {
              lat0: config.lat0,
              lat1: config.lat1,
              lon0: config.lon0,
              lon1: config.lon1,
              d: config.dLat,
              rows: Math.round((config.lat1 - config.lat0) / config.dLat),
              cols: Math.round((config.lon1 - config.lon0) / config.dLon),
              timeCount: 1
            },
            times: ['2024-01-01T00:00:00Z'],
            fields: {},
            masks: {},
            buffers: {}
          };
          // console.log('🔧 [ROUTER SERVICE] Minimal pack data created:', packData);
        }

        // Initialize Router Worker, passing the loaded packData (which contains SharedArrayBuffers)
        if (this.routerWorker) {
          // console.log('🔧 [ROUTER SERVICE] Initializing router worker...');
          await this.createWorkerPromise(this.routerWorker, 'INITIALIZE', { config, packData, packLoadOptions });
          // console.log('🔧 [ROUTER SERVICE] Router worker initialized');
        } else {
          // console.log('🔧 [ROUTER SERVICE] Router worker not available, using fallback mode');
        }

        // console.log('🔧 [ROUTER SERVICE] Setting isInitialized to true...');
        this.isInitialized = true;
        // console.log('🔧 [ROUTER SERVICE] Router service and workers initialized successfully');
      } catch (error) {
        console.error('🔧 [ROUTER SERVICE] Failed to initialize router service:', error);
        console.error('🔧 [ROUTER SERVICE] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        throw error;
      } finally {
        // console.log('🔧 [ROUTER SERVICE] Clearing initialization promise...');
        this.initializationPromise = null;
      }
    })();

    try {
      // console.log('🔧 [ROUTER SERVICE] Awaiting initialization promise...');
      await this.initializationPromise;
      // console.log('🔧 [ROUTER SERVICE] Initialization promise completed');
    } finally {
      // console.log('🔧 [ROUTER SERVICE] Final cleanup - clearing initialization promise');
      this.initializationPromise = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.packWorkerReady) {
      throw new Error('Router service or pack worker not initialized. Call initialize() first.');
    }
    // Note: routerWorkerReady check removed since router worker is optional
  }

  setSafetyCaps(caps: SafetyCaps): void {
    this.ensureInitialized();
    if (this.routerWorker) {
      this.routerWorker.postMessage({ type: 'SET_SAFETY_CAPS', payload: caps });
    } else {
      console.warn('Router worker disabled, safety caps not applied');
    }
  }

  addMaskData(i: number, j: number, mask: MaskData): void {
    this.ensureInitialized();
    if (this.routerWorker) {
      this.routerWorker.postMessage({ type: 'ADD_MASK_DATA', payload: { i, j, mask } });
    } else {
      console.warn('Router worker disabled, mask data not applied');
    }
  }

  public async solveRoute(
    startLatGrid: number,
    startLonGrid: number,
    goalLatGrid: number,
    goalLonGrid: number,
    startTimeHours: number,
    options: SolveRouteOptions = {},
  ): Promise<RouteResponse> {
    // console.log('🔧 [ROUTER SERVICE] solveRoute called', {
    //   startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours, options,
    //   hasRouterWorker: !!this.routerWorker,
    //   isInitialized: this.isInitialized
    // });
    
    this.ensureInitialized();
    
    // Check if router worker is available
    if (this.routerWorker) {
      // // console.log('🔧 [ROUTER SERVICE] Using router worker');
      try {
        const response: RouteResponse = await this.createWorkerPromise(this.routerWorker, 'SOLVE_ROUTE', {
          startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours, options
        });
        // // console.log('🔧 [ROUTER SERVICE] Router worker returned:', response);
        return response;
      } catch (error) {
        console.error('🔧 [ROUTER SERVICE] Router worker failed:', error);
        throw error;
      }
    } else {
      // console.log('🔧 [ROUTER SERVICE] Using fallback straight-line route solver');
      
      const start = this.gridToLatLonSync(startLatGrid, startLonGrid);
      const goal = this.gridToLatLonSync(goalLatGrid, goalLonGrid);
      
      // Calculate great circle distance
      const distance = this.greatCircleDistanceSync(start.lat, start.lon, goal.lat, goal.lon);
      const etaHours = distance / 14; // Assume 14 knots average speed
      
      const waypoints = [
        { lat: start.lat, lon: start.lon, time: startTimeHours },
        { lat: goal.lat, lon: goal.lon, time: startTimeHours + etaHours }
      ];
      
      return {
        mode: options.mode || 'ASTAR',
        waypoints,
        etaHours,
        diagnostics: {
          totalDistanceNm: distance,
          averageSpeedKts: 14,
          maxWaveHeightM: 0,
          stepCount: 2,
          frontierCount: 0,
          reachedGoal: true,
          finalDistanceToGoalNm: 0,
          etaHours,
          hazardFlags: 0
        }
      };
    }
  }

  /**
   * Compares an Isochrone route with a straight-line great-circle route
   * between the same start and end points.
   *
   * @param isochroneRoute The result of an Isochrone route calculation.
   * @returns An object containing comparison metrics (distances and times for both routes, and their differences).
   */
  public async compareWithStraightRoute(isochroneRoute: RouteResponse): Promise<RouteComparisonResult> {
    if (!this.isInitialized) {
      throw new Error('Router not initialized');
    }

    const start = isochroneRoute.waypoints[0];
    const end = isochroneRoute.waypoints[isochroneRoute.waypoints.length - 1];

    if (!start || !end) {
      throw new Error('Isochrone result does not contain valid start and end waypoints for comparison.');
    }

    // Calculate straight-line great-circle distance
    const straightDistanceNm = await this.greatCircleDistance(start.lat, start.lon, end.lat, end.lon);

    // Estimate straight-line time (assuming constant calm speed from defaults)
    const calmSpeedKts = DEFAULT_ISOCHRONE_OPTIONS.ship?.calmSpeedKts ?? 14;
    const straightEtaHours = straightDistanceNm / calmSpeedKts;

    const isochroneDistanceNm = isochroneRoute.diagnostics?.totalDistanceNm ?? 0;
    const isochroneEtaHours = isochroneRoute.etaHours ?? 0;

    const distanceDifferenceNm = isochroneDistanceNm - straightDistanceNm;
    const distanceDifferencePercent = straightDistanceNm > 0 ? (distanceDifferenceNm / straightDistanceNm) * 100 : 0;

    const timeDifferenceHours = isochroneEtaHours - straightEtaHours;
    const timeDifferencePercent = straightEtaHours > 0 ? (timeDifferenceHours / straightEtaHours) * 100 : 0;

    return {
      isochroneDistanceNm,
      straightDistanceNm,
      distanceDifferenceNm,
      distanceDifferencePercent,
      isochroneEtaHours,
      straightEtaHours,
      timeDifferenceHours,
      timeDifferencePercent,
    };
  }

  async createEdge(fromI: number, fromJ: number, toI: number, toJ: number): Promise<EdgeData> {
    this.ensureInitialized();
    return this.createWorkerPromise(this.routerWorker, 'CREATE_EDGE', { fromI, fromJ, toI, toJ });
  }

  // Synchronous fallback methods for when router worker is disabled
  private gridToLatLonSync(i: number, j: number): LatLonPosition {
    // Grid configuration matches router-core defaults
    const lat0 = -90.0;
    const lon0 = -180.0;
    const dLat = 1.0; // 1 degree spacing (default from router-core)
    const dLon = 1.0;
    
    return {
      lat: lat0 + i * dLat,
      lon: lon0 + j * dLon
    };
  }

  private greatCircleDistanceSync(lat1: number, lon1: number, lat2: number, lon2: number): number {
    // Haversine formula for great circle distance
    const R = 3440; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async gridToLatLon(i: number, j: number): Promise<LatLonPosition> { 
    if (this.routerWorker) {
      return this.createWorkerPromise(this.routerWorker, 'GRID_TO_LATLON', { i, j });
    } else {
      return this.gridToLatLonSync(i, j);
    }
  }
  async latLonToGrid(lat: number, lon: number): Promise<GridPosition> { 
    if (this.routerWorker) {
      return this.createWorkerPromise(this.routerWorker, 'LATLON_TO_GRID', { lat, lon });
    } else {
      // Fallback grid conversion matching router-core defaults
      const lat0 = -90.0;
      const lon0 = -180.0;
      const dLat = 1.0; // 1 degree spacing
      const dLon = 1.0;
      
      // Normalize longitude first
      let normalizedLon = lon;
      while (normalizedLon >= 180.0) normalizedLon -= 360.0;
      while (normalizedLon < -180.0) normalizedLon += 360.0;
      
      return {
        i: Math.round((lat - lat0) / dLat),
        j: Math.round((normalizedLon - lon0) / dLon)
      };
    }
  }
  async greatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> { 
    if (this.routerWorker) {
      return this.createWorkerPromise(this.routerWorker, 'GREAT_CIRCLE_DISTANCE', { lat1, lon1, lat2, lon2 });
    } else {
      return this.greatCircleDistanceSync(lat1, lon1, lat2, lon2);
    }
  }
  async normalizeLongitude(lon: number): Promise<number> { 
    if (this.routerWorker) {
      return this.createWorkerPromise(this.routerWorker, 'NORMALIZE_LONGITUDE', { lon });
    } else {
      // Simple longitude normalization
      while (lon > 180) lon -= 360;
      while (lon < -180) lon += 360;
      return lon;
    }
  }
  async crossesAntiMeridian(lon1: number, lon2: number): Promise<boolean> { 
    if (this.routerWorker) {
      return this.createWorkerPromise(this.routerWorker, 'CROSSES_ANTI_MERIDIAN', { lon1, lon2 });
    } else {
      // Simple anti-meridian check
      return Math.abs(lon1 - lon2) > 180;
    }
  }

  // Helper method to calculate total route distance
  calculateRouteDistance(_route: RouteNode[]): number { throw new Error('calculateRouteDistance not yet implemented for worker architecture.'); }

  // Helper method to calculate total route time
  calculateRouteTime(_route: RouteNode[]): number { throw new Error('calculateRouteTime not yet implemented for worker architecture.'); }

  sampleEnvironment(_lat: number, _lon: number, _timeHours = 0): Promise<IsochroneEnvironmentSample | null> { throw new Error('sampleEnvironment is now internal to the router.worker.'); }

  async getLandMaskData(): Promise<LandMaskData | null> {
    // This method will now need to communicate with the router worker if land mask data is needed from WASM.
    // For now, returning null or throwing an error as it's not directly handled by the main thread anymore.
    console.warn('getLandMaskData not yet implemented for worker architecture.');
    return null;
  }
}

// Export singleton instance
export const routerService = new RouterService();
export default routerService;

if (typeof window !== 'undefined') {
  (window as any).routerService = routerService;
}
