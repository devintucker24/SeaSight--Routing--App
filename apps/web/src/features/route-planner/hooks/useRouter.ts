import { useState, useCallback, useRef } from 'react';
import {
  routerService,
  type RouterConfig,
  type SafetyCaps,
  type LatLonPosition,
  type RouteResponse,
  type SolveRouteOptions,
} from '../services/RouterService';

export interface UseRouterReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initializeRouter: (config: RouterConfig) => Promise<void>;
  solveRoute: (
    start: LatLonPosition,
    goal: LatLonPosition,
    startTime?: number,
    options?: SolveRouteOptions
  ) => Promise<RouteResponse>;
  setSafetyCaps: (caps: SafetyCaps) => void;
  calculateDistance: (start: LatLonPosition, goal: LatLonPosition) => Promise<number>;
  normalizeLongitude: (lon: number) => Promise<number>;
  crossesAntiMeridian: (lon1: number, lon2: number) => Promise<boolean>;
}

export const useRouter = (): UseRouterReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pendingSafetyCapsRef = useRef<SafetyCaps | null>(null);

  const initializeRouter = useCallback(async (config: RouterConfig) => {
    console.log('🔧 [USE ROUTER] Starting initialization with config:', config);
    console.log('🔧 [USE ROUTER] Current state - isLoading:', isLoading, 'isInitialized:', isInitialized);
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔧 [USE ROUTER] Calling routerService.initialize...');
      await routerService.initialize(config);
      console.log('🔧 [USE ROUTER] routerService.initialize completed');
      
      console.log('🔧 [USE ROUTER] Setting isInitialized to true...');
      setIsInitialized(true);
      console.log('🔧 [USE ROUTER] isInitialized set to true');

      // Apply any pending safety caps queued before initialization completed
      if (pendingSafetyCapsRef.current) {
        try {
          routerService.setSafetyCaps(pendingSafetyCapsRef.current);
          console.log('🔧 [USE ROUTER] Applied pending safety caps');
        } finally {
          pendingSafetyCapsRef.current = null;
        }
      }
      
      console.log('🔧 [USE ROUTER] Router initialization completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize router';
      setError(errorMessage);
      console.error('🔧 [USE ROUTER] Router initialization error:', err);
      console.error('🔧 [USE ROUTER] Error stack:', err instanceof Error ? err.stack : 'No stack trace');
    } finally {
      console.log('🔧 [USE ROUTER] Setting isLoading to false...');
      setIsLoading(false);
      console.log('🔧 [USE ROUTER] Final state - isLoading:', false, 'isInitialized:', isInitialized);
    }
  }, []);

  const solveRoute = useCallback(async (
    start: LatLonPosition,
    goal: LatLonPosition,
    startTime: number = 0,
    options: SolveRouteOptions = {}
  ): Promise<RouteResponse> => {
    if (!isInitialized) {
      throw new Error('Router not initialized');
    }

    try {
      // Convert lat/lon to grid coordinates
      const startGrid = await routerService.latLonToGrid(start.lat, start.lon);
      const goalGrid = await routerService.latLonToGrid(goal.lat, goal.lon);

      // Solve route
      const response = routerService.solveRoute(
        startGrid.i, 
        startGrid.j, 
        goalGrid.i, 
        goalGrid.j, 
        startTime,
        { ...options, start, goal }
      );
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to solve route';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const setSafetyCaps = useCallback((caps: SafetyCaps) => {
    if (!isInitialized) {
      // Queue caps to be applied immediately after initialization completes
      pendingSafetyCapsRef.current = caps;
      return;
    }
    routerService.setSafetyCaps(caps);
  }, [isInitialized]);

  const calculateDistance = useCallback(async (start: LatLonPosition, goal: LatLonPosition): Promise<number> => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot calculate distance');
      return 0;
    }
    return await routerService.greatCircleDistance(start.lat, start.lon, goal.lat, goal.lon);
  }, [isInitialized]);

  const normalizeLongitude = useCallback(async (lon: number): Promise<number> => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot normalize longitude');
      return lon;
    }
    return await routerService.normalizeLongitude(lon);
  }, [isInitialized]);

  const crossesAntiMeridian = useCallback(async (lon1: number, lon2: number): Promise<boolean> => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot check anti-meridian crossing');
      return false;
    }
    return await routerService.crossesAntiMeridian(lon1, lon2);
  }, [isInitialized]);

  return {
    isInitialized,
    isLoading,
    error,
    initializeRouter,
    solveRoute,
    setSafetyCaps,
    calculateDistance,
    normalizeLongitude,
    crossesAntiMeridian,
  };
};
