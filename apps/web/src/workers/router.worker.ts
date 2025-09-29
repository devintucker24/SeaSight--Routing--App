
import SeaSightRouterModule from '@seasight/router-wasm';
import type { RouteResponse, RouterConfig, SolveRouteOptions } from '../features/route-planner/services/RouterService';
import type { IsochroneEnvironmentSample } from '@shared/types';
import { createEnvironmentSampler } from './PackLoader';
import type { PackData, EnvironmentSamplerOptions } from './PackLoader';

let routerModule: any = null;
let routerInstance: any = null;
let synchronousEnvironmentSampler: ((lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample) | null = null;

// Function to initialize the WASM router
async function initializeRouter(config: RouterConfig, packData: PackData, packLoadOptions: EnvironmentSamplerOptions) {
  if (routerModule === null) {
    routerModule = await SeaSightRouterModule();
  }
  routerInstance = new routerModule.RouterWrapper(
    config.lat0,
    config.lat1,
    config.lon0,
    config.lon1,
    config.dLat,
    config.dLon
  );
  synchronousEnvironmentSampler = createEnvironmentSampler(packData, packLoadOptions);
  console.log('WASM router initialized in router worker');
}

// Function to solve the route
function solveRoute(
  startLatGrid: number,
  startLonGrid: number,
  goalLatGrid: number,
  goalLonGrid: number,
  startTimeHours: number,
  options: SolveRouteOptions
): RouteResponse {
  if (routerInstance === null) {
    throw new Error('Router not initialized in worker');
  }

  const { mode = 'ISOCHRONE', isochrone, start, goal } = options;

  if (mode === 'ISOCHRONE') {
    if (!synchronousEnvironmentSampler) {
      throw new Error('Environment sampler not set in router worker.');
    }
    const environmentSamplerWrapper = synchronousEnvironmentSampler;

    const request: Record<string, unknown> = {
      // ... (replicate the request object from RouterService.ts)
      start: start,
      destination: goal,
      departTimeHours: startTimeHours,
      timeStepMinutes: isochrone?.timeStepMinutes,
      headingCount: isochrone?.headingCount,
      mergeRadiusNm: isochrone?.mergeRadiusNm,
      goalRadiusNm: isochrone?.goalRadiusNm,
      maxHours: isochrone?.maxHours,
      simplifyToleranceNm: isochrone?.simplifyToleranceNm,
      minLegNm: isochrone?.minLegNm,
      minHeadingDeg: isochrone?.minHeadingDeg,
      bearingWindowDeg: isochrone?.bearingWindowDeg,
      beamWidth: isochrone?.beamWidth,
      minTimeStepMinutes: isochrone?.minTimeStepMinutes,
      maxTimeStepMinutes: isochrone?.maxTimeStepMinutes,
      complexityThreshold: isochrone?.complexityThreshold,
      enableAdaptiveSampling: isochrone?.enableAdaptiveSampling,
      enableHierarchicalRouting: isochrone?.enableHierarchicalRouting,
      longRouteThresholdNm: isochrone?.longRouteThresholdNm,
      coarseGridResolutionDeg: isochrone?.coarseGridResolutionDeg,
      corridorWidthNm: isochrone?.corridorWidthNm,
      ship: isochrone?.ship,
      safetyCaps: isochrone?.safetyCaps,
    };

    // This direct call will likely fail as it expects a synchronous JS function
    // that might need to block or use SharedArrayBuffer.
    const response = routerInstance.solveIsochrone(request, environmentSamplerWrapper);
    return response;
  }

  const routeNodes: any[] = routerInstance.solve(startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours);

  const waypoints: any[] = routeNodes.map((node: any) => {
    const latLon = routerInstance.gridToLatLon(node.i, node.j);
    return { ...latLon, time: node.t };
  });

  const etaHours = routeNodes.length > 0 ? routeNodes[routeNodes.length - 1].t : startTimeHours;
  
  // Placeholder for diagnostics, as routerInstance.solve doesn't return it directly
  const diagnostics = {
    totalDistanceNm: 0,
    averageSpeedKts: 0,
    maxWaveHeightM: 0,
    stepCount: routeNodes.length,
    frontierCount: 0,
    reachedGoal: routeNodes.length > 0,
    finalDistanceToGoalNm: 0,
    etaHours: etaHours,
    hazardFlags: 0,
  };

  return {
    mode: 'ASTAR',
    waypoints,
    etaHours,
    diagnostics,
  };
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload, id } = event.data;

  try {
    if (type === 'INITIALIZE') {
      const { config, packData, packLoadOptions } = payload;
      await initializeRouter(config, packData, packLoadOptions);
      self.postMessage({ type: 'INITIALIZED', id });
    } else if (type === 'SOLVE_ROUTE') {
      const result = solveRoute(
        payload.startLatGrid,
        payload.startLonGrid,
        payload.goalLatGrid,
        payload.goalLonGrid,
        payload.startTimeHours,
        payload.options
      );
      self.postMessage({ type: 'ROUTE_SOLVED', payload: result, id });
    } else if (type === 'SET_SAFETY_CAPS') {
      if (routerInstance) {
        routerInstance.setSafetyCaps(payload.maxWaveHeight, payload.maxHeadingChange, payload.minWaterDepth);
      }
    } else if (type === 'ADD_MASK_DATA') {
      if (routerInstance) {
        routerInstance.addMaskData(payload.i, payload.j, [
          payload.mask.land ? 1 : 0,
          payload.mask.shallow ? 1 : 0,
          payload.mask.restricted ? 1 : 0,
        ]);
      }
    } else if (type === 'GRID_TO_LATLON') {
      const result = routerInstance.gridToLatLon(payload.i, payload.j);
      self.postMessage({ type: 'GRID_TO_LATLON_RESULT', payload: result, id });
    } else if (type === 'LATLON_TO_GRID') {
      const result = routerInstance.latLonToGrid(payload.lat, payload.lon);
      self.postMessage({ type: 'LATLON_TO_GRID_RESULT', payload: result, id });
    } else if (type === 'GREAT_CIRCLE_DISTANCE') {
      const result = routerInstance.greatCircleDistance(payload.lat1, payload.lon1, payload.lat2, payload.lon2);
      self.postMessage({ type: 'GREAT_CIRCLE_DISTANCE_RESULT', payload: result, id });
    } else if (type === 'NORMALIZE_LONGITUDE') {
      const result = routerInstance.normalizeLongitude(payload.lon);
      self.postMessage({ type: 'NORMALIZE_LONGITUDE_RESULT', payload: result, id });
    } else if (type === 'CROSSES_ANTI_MERIDIAN') {
      const result = routerInstance.crossesAntiMeridian(payload.lon1, payload.lon2);
      self.postMessage({ type: 'CROSSES_ANTI_MERIDIAN_RESULT', payload: result, id });
    } else if (type === 'CREATE_EDGE') {
      const result = routerInstance.createEdge(payload.fromI, payload.fromJ, payload.toI, payload.toJ);
      self.postMessage({ type: 'CREATE_EDGE_RESULT', payload: result, id });
    }
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', payload: error.message, id });
  }
};
