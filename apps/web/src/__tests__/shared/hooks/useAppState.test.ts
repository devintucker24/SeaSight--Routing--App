// Tests for useAppState hook

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppState } from '@shared/hooks/useAppState';
import type { LatLonPosition } from '@shared/types';

// Mock the debug utilities
vi.mock('@shared/dev', () => ({
  debugRouter: {
    logRouteCalculation: vi.fn(),
    logRouteResult: vi.fn(),
    logRouterError: vi.fn(),
  },
}));

describe('useAppState', () => {
  it('should initialize with default values', () => {
    const { result } = renderHook(() => useAppState());

    expect(result.current.waypoints).toEqual([]);
    expect(result.current.route).toEqual([]);
    expect(result.current.routeResult).toBeNull();
    expect(result.current.lastSolveKey).toBeNull();
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.rightPanelOpen).toBe(false);
    expect(result.current.mapStyle).toBe('dark-maritime');
    expect(result.current.showOpenSeaMap).toBe(true);
    expect(result.current.routingMode).toBe('ASTAR');
    expect(result.current.waypointCount).toBe(0);
    expect(result.current.mapWaypoints).toEqual([]);
    expect(result.current.hasRoute).toBe(false);
    expect(result.current.canCalculateRoute).toBe(false);
  });

  describe('waypoint management', () => {
    it('should add first waypoint as departure', () => {
      const { result } = renderHook(() => useAppState());
      const coords: LatLonPosition = { lat: 40.7128, lon: -74.0060 };

      act(() => {
        result.current.addWaypoint(coords, 'New York');
      });

      expect(result.current.waypoints).toHaveLength(1);
      expect(result.current.waypoints[0].name).toBe('Departure');
      expect(result.current.waypoints[0].lat).toBe(40.7128);
      expect(result.current.waypoints[0].lon).toBe(-74.0060);
    });

    it('should add second waypoint as destination', () => {
      const { result } = renderHook(() => useAppState());
      const coords1: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const coords2: LatLonPosition = { lat: 41.8781, lon: -87.6298 };

      act(() => {
        result.current.addWaypoint(coords1);
        result.current.addWaypoint(coords2, 'Chicago');
      });

      expect(result.current.waypoints).toHaveLength(2);
      expect(result.current.waypoints[0].name).toBe('Departure');
      expect(result.current.waypoints[1].name).toBe('Chicago');
    });

    it('should replace waypoints when adding third', () => {
      const { result } = renderHook(() => useAppState());
      const coords1: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const coords2: LatLonPosition = { lat: 41.8781, lon: -87.6298 };
      const coords3: LatLonPosition = { lat: 42.3601, lon: -71.0589 };

      act(() => {
        result.current.addWaypoint(coords1);
        result.current.addWaypoint(coords2);
        result.current.addWaypoint(coords3, 'Boston');
      });

      expect(result.current.waypoints).toHaveLength(2);
      expect(result.current.waypoints[0].name).toBe('Departure');
      expect(result.current.waypoints[1].name).toBe('Boston');
    });

    it('should remove waypoint by ID', () => {
      const { result } = renderHook(() => useAppState());
      const coords1: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const coords2: LatLonPosition = { lat: 41.8781, lon: -87.6298 };

      act(() => {
        result.current.addWaypoint(coords1);
        result.current.addWaypoint(coords2);
      });

      const waypointId = result.current.waypoints[1].id;

      act(() => {
        result.current.removeWaypoint(waypointId);
      });

      expect(result.current.waypoints).toHaveLength(1);
      expect(result.current.waypoints[0].name).toBe('Departure');
    });

    it('should clear all waypoints', () => {
      const { result } = renderHook(() => useAppState());
      const coords1: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const coords2: LatLonPosition = { lat: 41.8781, lon: -87.6298 };

      act(() => {
        result.current.addWaypoint(coords1);
        result.current.addWaypoint(coords2);
      });

      expect(result.current.waypoints).toHaveLength(2);

      act(() => {
        result.current.clearWaypoints();
      });

      expect(result.current.waypoints).toHaveLength(0);
    });
  });

  describe('computed values', () => {
    it('should update waypointCount correctly', () => {
      const { result } = renderHook(() => useAppState());
      const coords: LatLonPosition = { lat: 40.7128, lon: -74.0060 };

      expect(result.current.waypointCount).toBe(0);

      act(() => {
        result.current.addWaypoint(coords);
      });

      expect(result.current.waypointCount).toBe(1);
    });

    it('should update mapWaypoints correctly', () => {
      const { result } = renderHook(() => useAppState());
      const coords: LatLonPosition = { lat: 40.7128, lon: -74.0060 };

      act(() => {
        result.current.addWaypoint(coords);
      });

      expect(result.current.mapWaypoints).toEqual([coords]);
    });

    it('should update canCalculateRoute correctly', () => {
      const { result } = renderHook(() => useAppState());
      const coords1: LatLonPosition = { lat: 40.7128, lon: -74.0060 };
      const coords2: LatLonPosition = { lat: 41.8781, lon: -87.6298 };

      expect(result.current.canCalculateRoute).toBe(false);

      act(() => {
        result.current.addWaypoint(coords1);
      });

      expect(result.current.canCalculateRoute).toBe(false);

      act(() => {
        result.current.addWaypoint(coords2);
      });

      expect(result.current.canCalculateRoute).toBe(true);
    });

    it('should update hasRoute correctly', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.hasRoute).toBe(false);

      act(() => {
        result.current.handleRouteSolved({
          mode: 'ASTAR',
          waypoints: [{ lat: 40.7128, lon: -74.0060 }, { lat: 41.8781, lon: -87.6298 }],
          etaHours: 2.5,
        });
      });

      expect(result.current.hasRoute).toBe(true);
    });
  });

  describe('map management', () => {
    it('should change map style', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.mapStyle).toBe('dark-maritime');

      act(() => {
        result.current.handleMapStyleChange('openfreemap-liberty');
      });

      expect(result.current.mapStyle).toBe('openfreemap-liberty');
    });

    it('should toggle OpenSeaMap', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.showOpenSeaMap).toBe(true);

      act(() => {
        result.current.handleOpenSeaMapToggle();
      });

      expect(result.current.showOpenSeaMap).toBe(false);
    });

    it('should toggle layer', () => {
      const { result } = renderHook(() => useAppState());

      const weatherLayer = result.current.layers.find(layer => layer.id === 'weather');
      expect(weatherLayer?.active).toBe(false);

      act(() => {
        result.current.handleLayerToggle('weather');
      });

      const updatedWeatherLayer = result.current.layers.find(layer => layer.id === 'weather');
      expect(updatedWeatherLayer?.active).toBe(true);
    });
  });

  describe('route management', () => {
    it('should handle route solved', () => {
      const { result } = renderHook(() => useAppState());
      const routeResponse = {
        mode: 'ASTAR' as const,
        waypoints: [{ lat: 40.7128, lon: -74.0060 }, { lat: 41.8781, lon: -87.6298 }],
        etaHours: 2.5,
      };

      act(() => {
        result.current.handleRouteSolved(routeResponse);
      });

      expect(result.current.routeResult).toEqual(routeResponse);
      expect(result.current.route).toEqual([
        { lat: 40.7128, lon: -74.0060 },
        { lat: 41.8781, lon: -87.6298 },
      ]);
    });

    it('should clear route', () => {
      const { result } = renderHook(() => useAppState());

      act(() => {
        result.current.handleRouteSolved({
          mode: 'ASTAR',
          waypoints: [{ lat: 40.7128, lon: -74.0060 }],
          etaHours: 1.0,
        });
      });

      expect(result.current.hasRoute).toBe(true);

      act(() => {
        result.current.clearRoute();
      });

      expect(result.current.route).toEqual([]);
      expect(result.current.routeResult).toBeNull();
      expect(result.current.hasRoute).toBe(false);
    });
  });

  describe('state setters', () => {
    it('should set calculating state', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.isCalculating).toBe(false);

      act(() => {
        result.current.setIsCalculating(true);
      });

      expect(result.current.isCalculating).toBe(true);
    });

    it('should set right panel open state', () => {
      const { result } = renderHook(() => useAppState());

      expect(result.current.rightPanelOpen).toBe(false);

      act(() => {
        result.current.setRightPanelOpen(true);
      });

      expect(result.current.rightPanelOpen).toBe(true);
    });
  });
});
