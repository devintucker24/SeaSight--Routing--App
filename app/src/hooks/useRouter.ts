import { useState, useEffect, useCallback } from 'react';
import { routerService, type RouterConfig, type SafetyCaps, type RouteNode, type LatLonPosition } from '../services/RouterService';

export interface UseRouterReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  initializeRouter: (config: RouterConfig) => Promise<void>;
  solveRoute: (start: LatLonPosition, goal: LatLonPosition, startTime?: number) => Promise<LatLonPosition[]>;
  setSafetyCaps: (caps: SafetyCaps) => void;
  calculateDistance: (start: LatLonPosition, goal: LatLonPosition) => number;
  normalizeLongitude: (lon: number) => number;
  crossesAntiMeridian: (lon1: number, lon2: number) => boolean;
}

export const useRouter = (): UseRouterReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeRouter = useCallback(async (config: RouterConfig) => {
    setIsLoading(true);
    setError(null);
    
    try {
      await routerService.initialize(config);
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize router';
      setError(errorMessage);
      console.error('Router initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const solveRoute = useCallback(async (
    start: LatLonPosition, 
    goal: LatLonPosition, 
    startTime: number = 0
  ): Promise<LatLonPosition[]> => {
    if (!isInitialized) {
      throw new Error('Router not initialized');
    }

    try {
      // Convert lat/lon to grid coordinates
      const startGrid = routerService.latLonToGrid(start.lat, start.lon);
      const goalGrid = routerService.latLonToGrid(goal.lat, goal.lon);

      // Solve route
      const routeNodes = routerService.solveRoute(
        startGrid.i, 
        startGrid.j, 
        goalGrid.i, 
        goalGrid.j, 
        startTime
      );

      // Convert route nodes back to lat/lon
      return routerService.routeNodesToLatLon(routeNodes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to solve route';
      setError(errorMessage);
      throw err;
    }
  }, [isInitialized]);

  const setSafetyCaps = useCallback((caps: SafetyCaps) => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot set safety caps');
      return;
    }
    routerService.setSafetyCaps(caps);
  }, [isInitialized]);

  const calculateDistance = useCallback((start: LatLonPosition, goal: LatLonPosition): number => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot calculate distance');
      return 0;
    }
    return routerService.greatCircleDistance(start.lat, start.lon, goal.lat, goal.lon);
  }, [isInitialized]);

  const normalizeLongitude = useCallback((lon: number): number => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot normalize longitude');
      return lon;
    }
    return routerService.normalizeLongitude(lon);
  }, [isInitialized]);

  const crossesAntiMeridian = useCallback((lon1: number, lon2: number): boolean => {
    if (!isInitialized) {
      console.warn('Router not initialized, cannot check anti-meridian crossing');
      return false;
    }
    return routerService.crossesAntiMeridian(lon1, lon2);
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
