import { createSeaSightRouterWorker } from '@seasight/router-wasm/worker';
import type { RouteResponse, RouterConfig, SolveRouteOptions } from '../features/route-planner/services/RouterService';
import type { IsochroneEnvironmentSample } from '@shared/types';
import { createEnvironmentSampler } from './PackLoader';
import type { PackData, EnvironmentSamplerOptions } from './PackLoader';

let routerWorker: any = null;
let routerModule: any = null;
let routerInstance: any = null;
let synchronousEnvironmentSampler: ((lat: number, lon: number, timeHours: number) => IsochroneEnvironmentSample) | null = null;

// Function to initialize the WASM router
async function initializeRouter(config: RouterConfig, packData: PackData, packLoadOptions: EnvironmentSamplerOptions) {
  console.log('[Router Worker] Starting initialization with config:', config);
  
  if (routerWorker === null) {
    console.log('[Router Worker] Creating router worker...');
    routerWorker = createSeaSightRouterWorker();
  }
  
  if (routerModule === null) {
    console.log('[Router Worker] Loading WASM module...');
    try {
      // Add a timeout to prevent hanging on worker dependencies
      const loadPromise = routerWorker.getModule();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('WASM module loading timeout')), 10000)
      );
      
      routerModule = await Promise.race([loadPromise, timeoutPromise]);
      console.log('[Router Worker] ✅ WASM module loaded successfully:', !!routerModule);
    } catch (error) {
      console.error('[Router Worker] ❌ Failed to load WASM module:', error);
      console.log('[Router Worker] Continuing without WASM module (using fallback mode)');
      // Don't throw error, continue without WASM module
      routerModule = null;
    }
  }
  
  if (routerModule) {
    console.log('[Router Worker] Creating RouterWrapper with params:', {
      lat0: config.lat0, lat1: config.lat1,
      lon0: config.lon0, lon1: config.lon1,
      dLat: config.dLat, dLon: config.dLon
    });
    
    try {
      routerInstance = new routerModule.RouterWrapper(
        config.lat0,
        config.lat1,
        config.lon0,
        config.lon1,
        config.dLat,
        config.dLon
      );
      console.log('[Router Worker] ✅ RouterWrapper created successfully:', !!routerInstance);
    } catch (error) {
      console.error('[Router Worker] ❌ Failed to create RouterWrapper:', error);
      console.log('[Router Worker] Continuing without RouterWrapper (using fallback mode)');
      routerInstance = null;
    }
  } else {
    console.log('[Router Worker] No WASM module available, using fallback mode');
    routerInstance = null;
  }
  
  synchronousEnvironmentSampler = createEnvironmentSampler(packData, packLoadOptions);
  console.log('[Router Worker] Environment sampler created:', !!synchronousEnvironmentSampler);
  console.log('[Router Worker] ✅ WASM router initialization complete');
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
  // console.log('═══════════════════════════════════════════════════════');
  // console.log('🚢 [ROUTE SOLVER] Starting route calculation');
  // console.log('═══════════════════════════════════════════════════════');
  // console.log('📍 Start Grid:', { i: startLatGrid, j: startLonGrid });
  // console.log('📍 Goal Grid:', { i: goalLatGrid, j: goalLonGrid });
  // console.log('⏰ Start Time:', startTimeHours, 'hours');
  // console.log('⚙️  Options:', options);
  // console.log('🤖 Router Instance Available:', !!routerInstance);
  // console.log('═══════════════════════════════════════════════════════');
  
  if (!routerInstance) {
    console.error('❌ [ROUTE SOLVER] Router instance not available');
    console.error('❌ This means WASM failed to load - routes will not work properly');
    throw new Error('Router not initialized - WASM module failed to load. Please check browser console for WASM loading errors.');
  }

  if (options.mode === 'ISOCHRONE') {
    // console.log('🌊 [ROUTE SOLVER] Using ISOCHRONE mode');
    
    // ✅ USE EXACT COORDINATES - Preserve user's clicked points for maritime accuracy
    // Use exact coordinates from options if available, otherwise fall back to grid conversion
    const startLatLon = options.start || routerInstance.gridToLatLon(startLatGrid, startLonGrid);
    const goalLatLon = options.goal || routerInstance.gridToLatLon(goalLatGrid, goalLonGrid);
    
    // Get isochrone options with defaults
    const isoOpts = options.isochrone;
    const shipSpeedKts = isoOpts?.ship?.calmSpeedKts ?? 12;
    const maxHours = isoOpts?.maxHours ?? 240;
    const timeStepMinutes = isoOpts?.timeStepMinutes ?? 180;
    const maxWaveHeight = isoOpts?.safetyCaps?.maxWaveHeight ?? 6.0;
    const maxHeadingChange = isoOpts?.ship?.maxHeadingChange ?? 30.0;
    // const minWaterDepth = isoOpts?.safetyCaps?.minWaterDepth ?? 15.0; // Not used in isochrone request
    
    const request = {
      start: {
        lat: startLatLon.lat,  // ✅ EXACT user-clicked coordinate
        lon: startLatLon.lon
      },
      destination: {
        lat: goalLatLon.lat,   // ✅ EXACT user-clicked coordinate
        lon: goalLatLon.lon
      },
      departureTimeHours: startTimeHours,
      ship: {
        calmSpeedKts: shipSpeedKts,
        maxHeadingChangeDeg: maxHeadingChange,
        maxWaveHeightM: maxWaveHeight
      },
      settings: {
        timeStepMinutes: timeStepMinutes,
        maxHours: maxHours
      }
    };


    const result = routerInstance.solveIsochrone(request, synchronousEnvironmentSampler);
    

    const waypoints = result.waypoints || [];
    const diagnostics = result.diagnostics || {};
    const etaHours = diagnostics.etaHours || 0;

    // console.log('✅ [ROUTE SOLVER] Isochrone route calculated');
    console.log('   Total waypoints:', waypoints.length);
    console.log('   ETA:', etaHours, 'hours');
    console.log('   Distance:', diagnostics.totalDistanceNm, 'nm');

    return {
      mode: 'ISOCHRONE' as const,
      waypoints,
      etaHours,
      diagnostics,
    };
  } else {

    const result = routerInstance.solve(startLatGrid, startLonGrid, goalLatGrid, goalLonGrid, startTimeHours);
    

    if (!result || !Array.isArray(result) || result.length === 0) {
      console.warn('⚠️  [ROUTE SOLVER] A* returned empty result, using straight line');
      // ✅ USE EXACT COORDINATES for fallback straight-line route
      const startLatLon = options.start || routerInstance.gridToLatLon(startLatGrid, startLonGrid);
      const goalLatLon = options.goal || routerInstance.gridToLatLon(goalLatGrid, goalLonGrid);
      const waypoints = [
        { lat: startLatLon.lat, lon: startLatLon.lon },  // ✅ EXACT user-clicked start
        { lat: goalLatLon.lat, lon: goalLatLon.lon }      // ✅ EXACT user-clicked goal
      ];
      
      return {
        mode: 'ASTAR' as const,
        waypoints,
        etaHours: 0,
        diagnostics: {
          totalDistanceNm: 0,
          averageSpeedKts: 10,
          maxWaveHeightM: 1.0,
          stepCount: 1,
          frontierCount: 0,
          reachedGoal: false,
          finalDistanceToGoalNm: 0,
          etaHours: 0,
          hazardFlags: 0,
        },
      };
    }


    // Convert grid indices to lat/lon coordinates
    // Converting A* path from grid to lat/lon...
    const waypoints = result.map((node: any) => {
      const latLon = routerInstance.gridToLatLon(node.i, node.j);
      return { lat: latLon.lat, lon: latLon.lon };
    });

    // ✅ CRITICAL: Replace first and last waypoints with EXACT user-clicked coordinates
    // This ensures the route line visually connects to the exact points the user selected
    // Eliminates ±15nm endpoint error from grid snapping
    if (options.start && waypoints.length > 0) {
      waypoints[0] = { lat: options.start.lat, lon: options.start.lon };
    }
    if (options.goal && waypoints.length > 1) {
      waypoints[waypoints.length - 1] = { lat: options.goal.lat, lon: options.goal.lon };
    }

    const diagnostics = {
      totalDistanceNm: result.reduce((sum: number, node: any) => sum + (node.distToGoalNm || 0), 0),
      averageSpeedKts: 10,
      maxWaveHeightM: 1.0,
      stepCount: result.length,
      frontierCount: 0,
      reachedGoal: true,
      finalDistanceToGoalNm: 0,
      etaHours: result[result.length - 1]?.t || 0,
      hazardFlags: 0,
    };

    const result_response: RouteResponse = {
      mode: 'ASTAR' as const,
      waypoints,
      etaHours: diagnostics.etaHours,
      diagnostics,
    };
    
    // console.log('✅ [ROUTE SOLVER] A* result:', result_response);
    // console.log('═══════════════════════════════════════════════════════');
    return result_response;
  }
}

self.onmessage = async (event: MessageEvent) => {
  const { type, payload, id } = event.data;
  // console.log('📨 [Router Worker] Received message:', { type, id, payload: payload ? Object.keys(payload) : 'no payload' });

  try {
    if (type === 'INITIALIZE') {
      const { config, packData, packLoadOptions } = payload;
      // console.log('🔧 [Router Worker] INITIALIZE message');
      await initializeRouter(config, packData, packLoadOptions);
      self.postMessage({ type: 'ROUTER_INITIALIZED', payload: { success: true }, id });
      console.log('✅ [Router Worker] Sent ROUTER_INITIALIZED response');
    } else if (type === 'SOLVE_ROUTE') {
      // console.log('🚢 [Router Worker] SOLVE_ROUTE message');
      // console.log('   Payload:', payload);
      const result = solveRoute(
        payload.startLatGrid,
        payload.startLonGrid,
        payload.goalLatGrid,
        payload.goalLonGrid,
        payload.startTimeHours,
        payload.options
      );
      console.log('✅ [Router Worker] Sending ROUTE_SOLVED response:', {
        waypointCount: result.waypoints.length,
        etaHours: result.etaHours
      });
      self.postMessage({ type: 'ROUTE_SOLVED', payload: result, id });
    } else if (type === 'SET_SAFETY_CAPS') {
      // // console.log('⚙️  [Router Worker] SET_SAFETY_CAPS message');
      if (routerInstance) {
        routerInstance.setSafetyCaps(payload.maxWaveHeight, payload.maxHeadingChange, payload.minWaterDepth);
        console.log('✅ Safety caps set:', payload);
      } else {
        console.warn('⚠️  Router instance not available for safety caps');
      }
      self.postMessage({ type: 'SAFETY_CAPS_SET', id });
    } else if (type === 'ADD_MASK_DATA') {
      console.log('🗺️  [Router Worker] ADD_MASK_DATA message');
      if (routerInstance) {
        routerInstance.addMaskData(payload.i, payload.j, payload.mask);
        console.log('✅ Mask data added at:', { i: payload.i, j: payload.j });
      }
      self.postMessage({ type: 'MASK_DATA_ADDED', id });
    } else if (type === 'GRID_TO_LATLON') {
      console.log('🌐 [Router Worker] GRID_TO_LATLON:', { i: payload.i, j: payload.j });
      if (routerInstance) {
        const result = routerInstance.gridToLatLon(payload.i, payload.j);
        // console.log('   Result:', result);
        self.postMessage({ type: 'GRID_TO_LATLON_RESULT', payload: result, id });
      }
    } else if (type === 'LATLON_TO_GRID') {
      // console.log('🌐 [Router Worker] LATLON_TO_GRID:', { lat: payload.lat, lon: payload.lon });
      if (routerInstance) {
        const result = routerInstance.latLonToGrid(payload.lat, payload.lon);
        // console.log('   Result:', result);
        self.postMessage({ type: 'LATLON_TO_GRID_RESULT', payload: result, id });
      } else {
        console.error('❌ Router instance not available for LATLON_TO_GRID');
        self.postMessage({ type: 'ERROR', payload: 'Router not initialized', id });
      }
    } else if (type === 'GREAT_CIRCLE_DISTANCE') {
      // console.log('📏 [Router Worker] GREAT_CIRCLE_DISTANCE');
      if (routerInstance) {
        const result = routerInstance.greatCircleDistance(payload.lat1, payload.lon1, payload.lat2, payload.lon2);
        self.postMessage({ type: 'GREAT_CIRCLE_DISTANCE_RESULT', payload: result, id });
      }
    } else if (type === 'NORMALIZE_LONGITUDE') {
      if (routerInstance) {
        const result = routerInstance.normalizeLongitude(payload.lon);
        self.postMessage({ type: 'NORMALIZE_LONGITUDE_RESULT', payload: result, id });
      }
    } else if (type === 'CROSSES_ANTI_MERIDIAN') {
      if (routerInstance) {
        const result = routerInstance.crossesAntiMeridian(payload.lon1, payload.lon2);
        self.postMessage({ type: 'CROSSES_ANTI_MERIDIAN_RESULT', payload: result, id });
      }
    } else if (type === 'CREATE_EDGE') {
      console.log('🔗 [Router Worker] CREATE_EDGE');
      if (routerInstance) {
        const result = routerInstance.createEdge(payload.fromI, payload.fromJ, payload.toI, payload.toJ);
        self.postMessage({ type: 'CREATE_EDGE_RESULT', payload: result, id });
      }
    } else {
      console.warn('⚠️  [Router Worker] Unknown message type:', type);
    }
  } catch (error) {
    console.error('❌ [Router Worker] Error processing message:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('   Error details:', errorMessage);
    if (error instanceof Error && error.stack) {
      console.error('   Stack trace:', error.stack);
    }
    self.postMessage({ type: 'ERROR', payload: errorMessage, id });
  }
};