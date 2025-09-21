// Router Service for SeaSight Router WASM Integration
import SeaSightRouterModule from '@seasight/router-wasm';
import { loadPack, createEnvironmentSampler } from './PackLoader';
import { DEFAULT_ISOCHRONE_OPTIONS } from '@shared/constants'; // Add this import

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

export interface IsochroneEnvironmentSample {
  current_east_kn?: number;
  current_north_kn?: number;
  wave_height_m?: number;
  depth_m?: number;
}

export type EnvironmentSampler = (lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample;

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
  private module: any = null;
  private router: any = null;
  private isInitialized = false;
  private environmentSampler: EnvironmentSampler | null = null;
  private initializationPromise: Promise<void> | null = null;

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
        // Load the WASM module
        this.module = await SeaSightRouterModule();

        // Create router instance
        this.router = new this.module.RouterWrapper(
          config.lat0,
          config.lat1,
          config.lon0,
          config.lon1,
          config.dLat,
          config.dLon
        );
        await this.loadLandMask();
        await this.loadDefaultPack();

        this.isInitialized = true;
        console.log('Router service initialized successfully');
      } catch (error) {
        console.error('Failed to initialize router service:', error);
        throw error;
      }
    })();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  private async loadLandMask(): Promise<void> {
    try {
      console.log('Starting land mask load...');
      const response = await fetch('/land_mask.bin');
      console.log('Land mask fetch response:', response.status, response.statusText);
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        console.log('Land mask buffer size:', buffer.byteLength);
        this.logMaskHeader(buffer);
        const bytes = new Uint8Array(buffer);
        console.log('Calling router.loadLandMask with', bytes.length, 'bytes');
        
        // For large arrays, we need to process in chunks to avoid Emscripten binding limits
        const CHUNK_SIZE = 1000000; // 1MB chunks
        const chunks = [];
        
        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
          const chunk = Array.from(bytes.slice(i, i + CHUNK_SIZE));
          chunks.push(chunk);
        }
        
        console.log(`Split into ${chunks.length} chunks of max ${CHUNK_SIZE} bytes each`);
        
        // Use the correct vector type we found
        console.log('Creating vector with full land mask data...');
        const vector = new this.module['vector$uint8_t$']();
        
        // Add ALL data to the vector (not just 1000 bytes)
        for (let i = 0; i < bytes.length; i++) {
          vector.push_back(bytes[i]);
        }
        
        console.log('Vector created with', vector.size(), 'elements');
        this.router.loadLandMask(vector);
        console.log('Land mask loaded successfully');
      } else {
        console.warn('Land mask fetch failed with status', response.status);
      }
    } catch (maskErr) {
      console.warn('Unable to load land mask:', maskErr);
    }
  }

  private logMaskHeader(buffer: ArrayBuffer): void {
    if (buffer.byteLength < 56) {
      console.warn('Land mask buffer too small to read header');
      return;
    }
    const view = new DataView(buffer);
    const lat0 = view.getFloat64(0, true);
    const lat1 = view.getFloat64(8, true);
    const lon0 = view.getFloat64(16, true);
    const lon1 = view.getFloat64(24, true);
    const dLat = view.getFloat64(32, true);
    const dLon = view.getFloat64(40, true);
    const rows = view.getUint32(48, true);
    const cols = view.getUint32(52, true);
    console.log(
      `[Land mask] lat:[${lat0}, ${lat1}] lon:[${lon0}, ${lon1}] resolution=${dLat}°x${dLon}° grid=${rows}x${cols}`
    );
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.router) {
      throw new Error('Router service not initialized. Call initialize() first.');
    }
  }

  setSafetyCaps(caps: SafetyCaps): void {
    this.ensureInitialized();
    this.router.setSafetyCaps(caps.maxWaveHeight, caps.maxHeadingChange, caps.minWaterDepth);
  }

  addMaskData(i: number, j: number, mask: MaskData): void {
    this.ensureInitialized();
    this.router.addMaskData(i, j, [
      mask.land ? 1 : 0,
      mask.shallow ? 1 : 0,
      mask.restricted ? 1 : 0,
    ]);
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
    if (!this.module || !this.router || !this.environmentSampler) {
      throw new Error('Router not initialized or environment sampler not set.');
    }

    const { mode = 'ISOCHRONE', isochrone, start, goal } = options;

    if (mode === 'ISOCHRONE') {
      const isoOpts = { ...DEFAULT_ISOCHRONE_OPTIONS, ...isochrone };
      console.log('RouterService - Effective Isochrone Options:', isoOpts);

      const startPosition = start ?? this.gridToLatLon(startLatGrid, startLonGrid);
      const goalPosition = goal ?? this.gridToLatLon(goalLatGrid, goalLonGrid);

      const request: Record<string, unknown> = {
        start: startPosition,
        destination: goalPosition,
        departTimeHours: startTimeHours,
        timeStepMinutes: isoOpts.timeStepMinutes,
        headingCount: isoOpts.headingCount,
        mergeRadiusNm: isoOpts.mergeRadiusNm,
        goalRadiusNm: isoOpts.goalRadiusNm,
        maxHours: isoOpts.maxHours,
        simplifyToleranceNm: isoOpts.simplifyToleranceNm,
        minLegNm: isoOpts.minLegNm,
        minHeadingDeg: isoOpts.minHeadingDeg,
        bearingWindowDeg: isoOpts.bearingWindowDeg,
        beamWidth: isoOpts.beamWidth,
        minTimeStepMinutes: isoOpts.minTimeStepMinutes,
        maxTimeStepMinutes: isoOpts.maxTimeStepMinutes,
        complexityThreshold: isoOpts.complexityThreshold,
        enableAdaptiveSampling: isoOpts.enableAdaptiveSampling,
        enableHierarchicalRouting: isoOpts.enableHierarchicalRouting,
        longRouteThresholdNm: isoOpts.longRouteThresholdNm,
        coarseGridResolutionDeg: isoOpts.coarseGridResolutionDeg,
        corridorWidthNm: isoOpts.corridorWidthNm,
        ship: {
          calmSpeedKts: (isoOpts.ship as IsochroneShipOptions)?.calmSpeedKts ?? 14,
          draft: (isoOpts.ship as IsochroneShipOptions)?.draft ?? 5.0,
          safetyDepthBuffer: (isoOpts.ship as IsochroneShipOptions)?.safetyDepthBuffer ?? 10.0,
          maxWaveHeight: (isoOpts.ship as IsochroneShipOptions)?.maxWaveHeight ?? isoOpts.safetyCaps?.maxWaveHeight ?? 8.0,
          maxHeadingChange: (isoOpts.ship as IsochroneShipOptions)?.maxHeadingChange ?? isoOpts.safetyCaps?.maxHeadingChange ?? 30.0,
          minSpeed: (isoOpts.ship as IsochroneShipOptions)?.minSpeed ?? 3.0,
          waveDragCoefficient: (isoOpts.ship as IsochroneShipOptions)?.waveDragCoefficient ?? 0.1,
        },
        safetyCaps: {
          maxWaveHeight: isoOpts.safetyCaps?.maxWaveHeight ?? isoOpts.ship?.maxWaveHeight,
          maxHeadingChange: isoOpts.safetyCaps?.maxHeadingChange ?? isoOpts.ship?.maxHeadingChange,
          minWaterDepth: isoOpts.safetyCaps?.minWaterDepth,
        },
      };

      const sampler = options.environmentSampler;
      const response = sampler
        ? this.router.solveIsochrone(request, sampler)
        : this.router.solveIsochrone(request, undefined);

      const waypoints: RouteWaypoint[] = (response.waypoints ?? []).map((wp: any) => ({
        lat: wp.lat,
        lon: wp.lon,
        time: wp.time,
      }));

      const waypointsRaw: RouteWaypoint[] = (response.waypointsRaw ?? []).map((wp: any) => ({
        lat: wp.lat,
        lon: wp.lon,
        time: wp.time,
      }));

      const indexMap: number[] = response.indexMap ?? [];

      const diagnostics: IsochroneDiagnostics | undefined = response.diagnostics
        ? {
            totalDistanceNm: response.diagnostics.totalDistanceNm ?? 0,
            averageSpeedKts: response.diagnostics.averageSpeedKts ?? 0,
            maxWaveHeightM: response.diagnostics.maxWaveHeightM ?? 0,
            stepCount: response.diagnostics.stepCount ?? 0,
            frontierCount: response.diagnostics.frontierCount ?? 0,
            reachedGoal: Boolean(response.diagnostics.reachedGoal),
            finalDistanceToGoalNm: response.diagnostics.finalDistanceToGoalNm ?? 0,
            etaHours: response.diagnostics.etaHours ?? response.eta ?? startTimeHours,
            hazardFlags: response.diagnostics.hazardFlags ?? 0,
          }
        : undefined;

      const etaHours: number = response.eta ?? diagnostics?.etaHours ?? startTimeHours;

      if (waypoints.length === 0) {
        throw new Error('ISOCHRONE_NO_ROUTE');
      }

      const routeResult: RouteResponse = {
        mode: 'ISOCHRONE' as RoutingMode,
        waypoints: waypoints,
        waypointsRaw: waypointsRaw,
        indexMap: indexMap,
        etaHours: etaHours,
        diagnostics: diagnostics,
        isCoarseRoute: response.isCoarseRoute,
      };

      console.log('Full Route Response:', routeResult);
      return routeResult;
    }

    const routeNodes: RouteNode[] = this.router.solve(startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours);
    const waypoints: RouteWaypoint[] = routeNodes.map((node) => {
      const latLon = this.gridToLatLon(node.i, node.j);
      return { ...latLon, time: node.t };
    });

    const etaHours = routeNodes.length > 0 ? routeNodes[routeNodes.length - 1].t : startTimeHours;

    const totalDistanceNm = this.calculateRouteDistance(routeNodes);
    const travelDuration = routeNodes.length > 0 ? routeNodes[routeNodes.length - 1].t - routeNodes[0].t : 0;
    const diagnostics: IsochroneDiagnostics = {
      totalDistanceNm,
      averageSpeedKts: travelDuration > 0 ? totalDistanceNm / travelDuration : 0,
      maxWaveHeightM: 0,
      stepCount: routeNodes.length,
      frontierCount: 0,
      reachedGoal: routeNodes.length > 0,
      finalDistanceToGoalNm: 0,
      etaHours,
    };

    return {
      mode: 'ASTAR' as RoutingMode,
      waypoints,
      etaHours,
      diagnostics,
    };
  }

  /**
   * Compares an Isochrone route with a straight-line great-circle route
   * between the same start and end points.
   *
   * @param isochroneRoute The result of an Isochrone route calculation.
   * @returns An object containing comparison metrics (distances and times for both routes, and their differences).
   */
  public compareWithStraightRoute(isochroneRoute: RouteResponse): RouteComparisonResult {
    if (!this.module || !this.router) {
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
    return this.router.createEdge(fromI, fromJ, toI, toJ);
  }

  gridToLatLon(i: number, j: number): LatLonPosition {
    this.ensureInitialized();
    return this.router.gridToLatLon(i, j);
  }

  latLonToGrid(lat: number, lon: number): GridPosition {
    this.ensureInitialized();
    return this.router.latLonToGrid(lat, lon);
  }

  greatCircleDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    this.ensureInitialized();
    return this.router.greatCircleDistance(lat1, lon1, lat2, lon2);
  }

  normalizeLongitude(lon: number): number {
    this.ensureInitialized();
    return this.router.normalizeLongitude(lon);
  }

  crossesAntiMeridian(lon1: number, lon2: number): boolean {
    this.ensureInitialized();
    return this.router.crossesAntiMeridian(lon1, lon2);
  }

  // Helper method to calculate total route distance
  calculateRouteDistance(route: RouteNode[]): number {
    if (route.length < 2) return 0;
    
    let totalDistance = 0;
    for (let i = 1; i < route.length; i++) {
      const prev = this.gridToLatLon(route[i - 1].i, route[i - 1].j);
      const curr = this.gridToLatLon(route[i].i, route[i].j);
      totalDistance += this.greatCircleDistance(prev.lat, prev.lon, curr.lat, curr.lon);
    }
    return totalDistance;
  }

  // Helper method to calculate total route time
  calculateRouteTime(route: RouteNode[]): number {
    if (route.length === 0) return 0;
    return route[route.length - 1].t - route[0].t;
  }

  sampleEnvironment(lat: number, lon: number, timeHours = 0): IsochroneEnvironmentSample | null {
    if (this.router && typeof this.router.sampleEnvironment === 'function') {
      try {
        return this.router.sampleEnvironment(lat, lon, timeHours);
      } catch (err) {
        console.warn('WASM environment sampling failed, falling back to JS sampler:', err);
      }
    }
    if (!this.environmentSampler) {
      return null;
    }
    return this.environmentSampler(lat, lon, timeHours);
  }

  private async loadDefaultPack(): Promise<void> {
    try {
      const pack = await loadPack('/packs/NATL_050_test');
      this.environmentSampler = createEnvironmentSampler(pack, { defaultWaveHeight: 1.0, defaultDepth: 5000 });
      console.log(`[Pack] Loaded NATL_050_test grid ${pack.grid.rows}x${pack.grid.cols} at ${pack.grid.d}°`);

      if (this.router && typeof this.router.loadEnvironmentPack === 'function') {
        const meta = {
          lat0: pack.grid.lat0,
          lon0: pack.grid.lon0,
          spacingDeg: pack.grid.d,
          rows: pack.grid.rows,
          cols: pack.grid.cols,
          defaultDepth: 5000,
          shallowDepth: 5,
          defaultWaveHeight: 1.0
        };
        try {
          this.router.loadEnvironmentPack(
            meta,
            pack.fields.cur_u ?? new Float32Array(),
            pack.fields.cur_v ?? new Float32Array(),
            pack.fields.wave_hs ?? new Float32Array(),
            pack.masks?.mask_land ?? new Uint8Array(),
            pack.masks?.mask_shallow ?? new Uint8Array()
          );
        } catch (err) {
          console.warn('Failed to transfer environment pack to WASM router:', err);
        }
      } else {
        console.warn('[Router] loadEnvironmentPack not available on WASM module. Rebuild router-wasm to enable pack-backed sampling.');
      }
    } catch (err) {
      console.warn('Failed to load default pack:', err);
    }
  }

  async getLandMaskData(): Promise<LandMaskData | null> {
    if (!this.router) {
      console.error('Router not initialized');
      return null;
    }

    try {
      console.log('Calling router.getLandMaskData()...');
      const landMaskData = this.router.getLandMaskData();
      console.log('Raw land mask data from router:', landMaskData);
      
      const result = {
        loaded: landMaskData.loaded,
        lat0: landMaskData.lat0,
        lat1: landMaskData.lat1,
        lon0: landMaskData.lon0,
        lon1: landMaskData.lon1,
        d_lat: landMaskData.d_lat,
        d_lon: landMaskData.d_lon,
        rows: landMaskData.rows,
        cols: landMaskData.cols,
        cells: new Uint8Array(landMaskData.cells)
      };
      
      console.log('Processed land mask data:', result);
      return result;
    } catch (error) {
      console.error('Failed to get land mask data:', error);
      return null;
    }
  }
}

// Export singleton instance
export const routerService = new RouterService();
export default routerService;

if (typeof window !== 'undefined') {
  (window as any).routerService = routerService;
}
