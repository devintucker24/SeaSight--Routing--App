// Router Service for SeaSight Router WASM Integration
import { loadPack, createEnvironmentSampler, PackData, EnvironmentSamplerOptions } from '../../../workers/PackLoader';
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
  etaHours?: number;
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
  private routerWorkerReady: boolean = false;
  private isInitialized = false;
  private environmentSampler: EnvironmentSampler | null = null;
  private initializationPromise: Promise<void> | null = null;

  private workerMessageId = 0;
  private pendingWorkerPromises = new Map<number, { resolve: (value: any) => void, reject: (reason?: any) => void }>();

  constructor() {
    this.packWorker = new Worker(new URL('../workers/pack.worker.ts', import.meta.url), { type: 'module' });
    this.routerWorker = new Worker(new URL('../workers/router.worker.ts', import.meta.url), { type: 'module' });

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
    return new Promise((resolve, reject) => {
      this.pendingWorkerPromises.set(id, { resolve, reject });
      worker.postMessage({ type, payload, id }, transferable);
    });
  }

  private handlePackWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;
    const promiseHandlers = this.pendingWorkerPromises.get(id);
    if (promiseHandlers) {
      this.pendingWorkerPromises.delete(id);
      if (type === 'PACK_LOADED') {
        this.packWorkerReady = payload.success;
        promiseHandlers.resolve(payload);
      } else if (type === 'ERROR') {
        promiseHandlers.reject(new Error(payload));
      } else {
        console.warn('Unknown message type from pack worker:', type);
      }
    }
  }

  private handleRouterWorkerMessage(event: MessageEvent): void {
    const { type, payload, id } = event.data;
    const promiseHandlers = this.pendingWorkerPromises.get(id);
    if (promiseHandlers) {
      this.pendingWorkerPromises.delete(id);
      if (
        type === 'GRID_TO_LATLON_RESULT' ||
        type === 'LATLON_TO_GRID_RESULT' ||
        type === 'GREAT_CIRCLE_DISTANCE_RESULT' ||
        type === 'NORMALIZE_LONGITUDE_RESULT' ||
        type === 'CROSSES_ANTI_MERIDIAN_RESULT'
      ) {
        promiseHandlers.resolve(payload);
      } else if (type === 'ROUTE_SOLVED') {
        promiseHandlers.resolve(payload);
      } else if (type === 'ERROR') {
        promiseHandlers.reject(new Error(payload));
      } else {
        console.warn('Unknown message type from router worker:', type);
      }
    }
  }

  async initialize(config: RouterConfig): Promise<void> {
    if (this.isInitialized) {
      console.log('Router service already initialized; skipping.');
      return;
    }

    // If an initialization is already in progress, await it
    if (this.initializationPromise) {
      await this.initializationPromise;
      return;
    }

    this.initializationPromise = (async () => {
      try {
        // Initialize Pack Worker
        const packLoadOptions: EnvironmentSamplerOptions = { defaultWaveHeight: 1.0, defaultDepth: 5000 };
        const packLoadResult = await this.createWorkerPromise(this.packWorker, 'LOAD_PACK', { basePath: '/packs/NATL_050_test', options: packLoadOptions });
        const packData: PackData = packLoadResult.packData;

        // Initialize Router Worker, passing the loaded packData (which contains SharedArrayBuffers)
        await this.createWorkerPromise(this.routerWorker, 'INITIALIZE', { config, packData, packLoadOptions });

        this.isInitialized = true;
        console.log('Router service and workers initialized successfully');
      } catch (error) {
        console.error('Failed to initialize router service:', error);
        throw error;
      } finally {
        this.initializationPromise = null;
      }
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.packWorkerReady || !this.routerWorkerReady) {
      throw new Error('Router service or workers not initialized. Call initialize() first.');
    }
  }

  setSafetyCaps(caps: SafetyCaps): void {
    this.ensureInitialized();
    this.routerWorker.postMessage({ type: 'SET_SAFETY_CAPS', payload: caps });
  }

  addMaskData(i: number, j: number, mask: MaskData): void {
    this.ensureInitialized();
    this.routerWorker.postMessage({ type: 'ADD_MASK_DATA', payload: { i, j, mask } });
  }

  public async solveRoute(
    startLatGrid: number,
    startLonGrid: number,
    goalLatGrid: number,
    goalLonGrid: number,
    startTimeHours: number,
    options: SolveRouteOptions = {},
  ): Promise<RouteResponse> {
    this.ensureInitialized();
    // Delegate solveRoute to the router worker
    const response: RouteResponse = await this.createWorkerPromise(this.routerWorker, 'SOLVE_ROUTE', {
      startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours, options
    });
    return response;
  }

  /**
   * Compares an Isochrone route with a straight-line great-circle route
   * between the same start and end points.
   *
   * @param isochroneRoute The result of an Isochrone route calculation.
   * @returns An object containing comparison metrics (distances and times for both routes, and their differences).
   */
  public compareWithStraightRoute(isochroneRoute: RouteResponse): RouteComparisonResult {
    if (!this.isInitialized) {
      throw new Error('Router not initialized');
    }

    const start = isochroneRoute.waypoints[0];
    const end = isochroneRoute.waypoints[isochroneRoute.waypoints.length - 1];

    if (!start || !end) {
      throw new Error('Isochrone result does not contain valid start and end waypoints for comparison.');
    }

    // Calculate straight-line great-circle distance
    const straightDistanceNm = this.greatCircleDistance(start.lat, start.lon, end.lat, end.lon);

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

  createEdge(fromI: number, fromJ: number, toI: number, toJ: number): EdgeData {
    this.ensureInitialized();
    return this.routerWorker.postMessage({ type: 'CREATE_EDGE', payload: { fromI, fromJ, toI, toJ } }) as Promise<EdgeData>;
  }

  async gridToLatLon(i: number, j: number): Promise<LatLonPosition> { return this.createWorkerPromise(this.routerWorker, 'GRID_TO_LATLON', { i, j }); }
  async latLonToGrid(lat: number, lon: number): Promise<GridPosition> { return this.createWorkerPromise(this.routerWorker, 'LATLON_TO_GRID', { lat, lon }); }
  async greatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): Promise<number> { return this.createWorkerPromise(this.routerWorker, 'GREAT_CIRCLE_DISTANCE', { lat1, lon1, lat2, lon2 }); }
  async normalizeLongitude(lon: number): Promise<number> { return this.createWorkerPromise(this.routerWorker, 'NORMALIZE_LONGITUDE', { lon }); }
  async crossesAntiMeridian(lon1: number, lon2: number): Promise<boolean> { return this.createWorkerPromise(this.routerWorker, 'CROSSES_ANTI_MERIDIAN', { lon1, lon2 }); }

  // Helper method to calculate total route distance
  calculateRouteDistance(route: RouteNode[]): number { throw new Error('calculateRouteDistance not yet implemented for worker architecture.'); }

  // Helper method to calculate total route time
  calculateRouteTime(route: RouteNode[]): number { throw new Error('calculateRouteTime not yet implemented for worker architecture.'); }

  sampleEnvironment(lat: number, lon: number, timeHours = 0): Promise<IsochroneEnvironmentSample | null> { throw new Error('sampleEnvironment is now internal to the router.worker.'); }

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
