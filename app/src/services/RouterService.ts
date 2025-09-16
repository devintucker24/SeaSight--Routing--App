// Router Service for SeaSight Router WASM Integration
import SeaSightRouterModule from '../wasm/SeaSightRouter.js';

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

  async initialize(config: RouterConfig): Promise<void> {
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
      
      this.isInitialized = true;
      console.log('Router service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize router service:', error);
      throw error;
    }
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
    this.router.addMaskData(i, j, [mask.land, mask.shallow, mask.restricted]);
  }

  solveRoute(startI: number, startJ: number, goalI: number, goalJ: number, startTime: number = 0): RouteNode[] {
    this.ensureInitialized();
    return this.router.solve(startI, startJ, goalI, goalJ, startTime);
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

  // Helper method to convert route nodes to lat/lon coordinates
  routeNodesToLatLon(route: RouteNode[]): LatLonPosition[] {
    return route.map(node => this.gridToLatLon(node.i, node.j));
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
}

// Export singleton instance
export const routerService = new RouterService();
export default routerService;
