// Router Service for SeaSight Router WASM Integration
import SeaSightRouterModule from '@seasight/router-wasm';
import { loadPack, createEnvironmentSampler } from './PackLoader';

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

export interface RouteResponse {
  mode: RoutingMode;
  waypoints: RouteWaypoint[];
  etaHours: number;
  diagnostics?: IsochroneDiagnostics;
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
      const response = await fetch('/land_mask.bin');
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        this.logMaskHeader(buffer);
        const bytes = new Uint8Array(buffer);
        this.router.loadLandMask(bytes);
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

  solveRoute(
    startI: number,
    startJ: number,
    goalI: number,
    goalJ: number,
    startTime: number = 0,
    options: SolveRouteOptions = {}
  ): RouteResponse {
    this.ensureInitialized();

    const mode: RoutingMode = options.mode ?? 'ASTAR';

    if (mode === 'ISOCHRONE') {
      const startPosition = options.start ?? this.gridToLatLon(startI, startJ);
      const goalPosition = options.goal ?? this.gridToLatLon(goalI, goalJ);
      const iso = options.isochrone ?? {};
      const ship = iso.ship ?? {};
      const safetyCaps = iso.safetyCaps ?? {};

      const request: Record<string, unknown> = {
        start: startPosition,
        destination: goalPosition,
        departTimeHours: startTime,
        timeStepMinutes: iso.timeStepMinutes,
        headingCount: iso.headingCount,
        mergeRadiusNm: iso.mergeRadiusNm,
        goalRadiusNm: iso.goalRadiusNm,
        maxHours: iso.maxHours,
        ship: {
          calmSpeedKts: ship.calmSpeedKts,
          draft: ship.draft,
          safetyDepthBuffer: ship.safetyDepthBuffer,
          maxWaveHeight: ship.maxWaveHeight ?? safetyCaps.maxWaveHeight,
          maxHeadingChange: ship.maxHeadingChange ?? safetyCaps.maxHeadingChange,
          minSpeed: ship.minSpeed,
          waveDragCoefficient: ship.waveDragCoefficient,
        },
        safetyCaps: {
          maxWaveHeight: safetyCaps.maxWaveHeight ?? ship.maxWaveHeight,
          maxHeadingChange: safetyCaps.maxHeadingChange ?? ship.maxHeadingChange,
          minWaterDepth: safetyCaps.minWaterDepth,
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

      const diagnostics: IsochroneDiagnostics | undefined = response.diagnostics
        ? {
            totalDistanceNm: response.diagnostics.totalDistanceNm ?? 0,
            averageSpeedKts: response.diagnostics.averageSpeedKts ?? 0,
            maxWaveHeightM: response.diagnostics.maxWaveHeightM ?? 0,
            stepCount: response.diagnostics.stepCount ?? 0,
            frontierCount: response.diagnostics.frontierCount ?? 0,
            reachedGoal: Boolean(response.diagnostics.reachedGoal),
            finalDistanceToGoalNm: response.diagnostics.finalDistanceToGoalNm ?? 0,
            etaHours: response.diagnostics.etaHours ?? response.eta ?? startTime,
            hazardFlags: response.diagnostics.hazardFlags ?? 0,
          }
        : undefined;

      const etaHours: number = response.eta ?? diagnostics?.etaHours ?? startTime;

      if (waypoints.length === 0) {
        throw new Error('ISOCHRONE_NO_ROUTE');
      }

      return {
        mode: 'ISOCHRONE',
        waypoints,
        etaHours,
        diagnostics,
      };
    }

    const routeNodes: RouteNode[] = this.router.solve(startI, startJ, goalI, goalJ, startTime);
    const waypoints: RouteWaypoint[] = routeNodes.map((node) => {
      const latLon = this.gridToLatLon(node.i, node.j);
      return { ...latLon, time: node.t };
    });

    const etaHours = routeNodes.length > 0 ? routeNodes[routeNodes.length - 1].t : startTime;

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
      mode: 'ASTAR',
      waypoints,
      etaHours,
      diagnostics,
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
}

// Export singleton instance
export const routerService = new RouterService();
export default routerService;

if (typeof window !== 'undefined') {
  (window as any).routerService = routerService;
}
