// Custom hooks for SeaSight application state management

import { useState, useCallback, useMemo } from 'react';
import type { 
  Waypoint, 
  LatLonPosition, 
  MapStyle, 
  RoutingMode, 
  MapLayer,
  RouteResponse 
} from '../types';
import { 
  normalizeWaypoints, 
  createWaypoint, 
  generateRouteKey,
  createMapLayer 
} from '../utils';
import { MAP_LAYERS } from '../constants';

// ============================================================================
// Main App State Hook
// ============================================================================

export const useAppState = () => {
  // Core state
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [route, setRoute] = useState<LatLonPosition[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null);
  const [lastSolveKey, setLastSolveKey] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);
  
  // Map state
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark-maritime');
  const [showOpenSeaMap, setShowOpenSeaMap] = useState(true);
  
  // Routing state
  // ✅ ACCURACY ENHANCEMENT: Isochrone mode provides continuous coordinate accuracy
  // Isochrone: sub-mile precision without grid snapping (professional maritime standard)
  // A*: faster but limited by grid resolution (legacy fallback)
  const [routingMode, setRoutingMode] = useState<RoutingMode>('ISOCHRONE');
  
  // Layer state
  const [layers, setLayers] = useState<MapLayer[]>(() =>
    MAP_LAYERS.map(layer => createMapLayer(
      layer.id,
      layer.icon,
      layer.label,
      layer.id === 'nautical', // nautical charts active by default
      (id: string) => handleLayerToggle(id)
    ))
  );

  // ============================================================================
  // Waypoint Management
  // ============================================================================

  const addWaypoint = useCallback((coords: LatLonPosition, label?: string) => {
    setRoute([]);
    setRouteResult(null);
    setWaypoints(prev => {
      const newWaypoint = createWaypoint(coords, label);
      
      if (prev.length === 0) {
        return normalizeWaypoints([{ ...newWaypoint, name: 'Departure' }]);
      }
      
      if (prev.length === 1) {
        return normalizeWaypoints([
          prev[0],
          { ...newWaypoint, name: label ?? '' }
        ]);
      }
      
      return normalizeWaypoints([
        prev[0],
        { ...newWaypoint, name: label ?? '' }
      ]);
    });
  }, []);

  const removeWaypoint = useCallback((id: string) => {
    setWaypoints(prev => normalizeWaypoints(prev.filter(wp => wp.id !== id)));
    setRoute([]);
    setRouteResult(null);
    setLastSolveKey(null);
  }, []);

  const clearWaypoints = useCallback(() => {
    setWaypoints([]);
    setRoute([]);
    setRouteResult(null);
    setLastSolveKey(null);
  }, []);

  // ============================================================================
  // Route Management
  // ============================================================================

  const handleRouteSolved = useCallback((result: RouteResponse | null) => {
    setRouteResult(result);
    if (result && result.waypoints) {
      const coords = result.waypoints.map(({ lat, lon }) => ({ lat, lon }));
      
      // Ensure route starts and ends at the EXACT user-selected waypoints
      if (waypoints.length >= 2 && coords.length >= 2) {
        coords[0] = { lat: waypoints[0].lat, lon: waypoints[0].lon };
        coords[coords.length - 1] = { lat: waypoints[waypoints.length - 1].lat, lon: waypoints[waypoints.length - 1].lon };
      }
      
      setRoute(coords);
      if (waypoints.length >= 2) {
        const start = waypoints[0];
        const destination = waypoints[1];
        const key = generateRouteKey(start, destination);
        setLastSolveKey(key);
      }
    } else {
      setRoute([]);
    }
  }, [waypoints]);

  const clearRoute = useCallback(() => {
    setRoute([]);
    setRouteResult(null);
    setLastSolveKey(null);
  }, []);

  const recordSolveAttempt = useCallback((key: string | null) => {
    setLastSolveKey(key);
  }, []);

  // ============================================================================
  // Map Management
  // ============================================================================

  const handleMapStyleChange = useCallback((style: MapStyle) => {
    setMapStyle(style);
  }, []);

  const handleOpenSeaMapToggle = useCallback(() => {
    setShowOpenSeaMap(prev => !prev);
  }, []);

  const handleLayerToggle = useCallback((layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, active: !layer.active } : layer
    ));
  }, []);

  // ============================================================================
  // Computed Values
  // ============================================================================

  const waypointCount = useMemo(() => waypoints.length, [waypoints]);
  
  const mapWaypoints = useMemo(() => 
    waypoints.map(({ lat, lon }) => ({ lat, lon })), 
    [waypoints]
  );

  const hasRoute = useMemo(() => route.length > 0, [route]);

  const canCalculateRoute = useMemo(() => waypoints.length >= 2, [waypoints.length]);

  // ============================================================================
  // Return State and Actions
  // ============================================================================

  return {
    // State
    waypoints,
    route,
    routeResult,
    lastSolveKey,
    isCalculating,
    rightPanelOpen,
    mapStyle,
    showOpenSeaMap,
    routingMode,
    layers,
    
    // Computed
    waypointCount,
    mapWaypoints,
    hasRoute,
    canCalculateRoute,
    
    // Actions
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    handleRouteSolved,
    clearRoute,
    recordSolveAttempt,
    handleMapStyleChange,
    handleOpenSeaMapToggle,
    handleLayerToggle,
    setIsCalculating,
    setRightPanelOpen,
    setRoutingMode,
  };
};
