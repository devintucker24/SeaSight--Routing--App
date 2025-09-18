import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from '@features/route-planner/hooks/useRouter'
import type { LatLonPosition, RoutingMode, IsochroneOptions, RouteResponse } from '@features/route-planner/services/RouterService'
import { MAP_STYLES } from '@shared/constants'
import { debugRouter } from '@shared/dev'

/**
 * Props for the MapSimplified component
 */
interface MapProps {
  /** Array of waypoints to display on the map */
  waypoints: LatLonPosition[]
  /** Calculated route coordinates to visualize */
  route: LatLonPosition[]
  /** Full solver waypoint chain for visualization */
  routeWaypoints?: { lat: number; lon: number; time?: number }[]
  /** Callback when map is clicked */
  onMapClick?: (lngLat: [number, number]) => void
  /** Callback when map is loaded */
  onMapLoad?: (map: maplibregl.Map) => void
  /** Callback when a waypoint is added */
  onWaypointAdd?: (waypoint: LatLonPosition) => void
  /** Callback when route is calculated */
  onRouteCalculated?: (route: LatLonPosition[]) => void
  /** Callback when route solving is complete */
  onRouteSolved?: (result: RouteResponse | null) => void
  /** Callback when route is cleared */
  onClearRoute?: () => void
  /** Routing algorithm mode */
  routingMode?: RoutingMode
  /** Map style to use */
  mapStyle?: MapStyle
  /** Whether to show OpenSeaMap overlay */
  showOpenSeaMap?: boolean
  /** Options for isochrone routing */
  isochroneOptions?: IsochroneOptions
}

/** Available map styles */
type MapStyle = 'openfreemap-liberty' | 'dark-maritime'

/**
 * Ref interface for MapSimplified component
 * Provides methods to interact with the map programmatically
 */
export interface MapRef {
  /** Calculate route between waypoints */
  calculateRoute: () => Promise<void>
  /** Clear current route from map */
  clearRoute: () => void
  /** Get current waypoints */
  getWaypoints: () => LatLonPosition[]
  /** Get current route coordinates */
  getRoute: () => LatLonPosition[]
  /** Get the underlying MapLibre GL instance */
  getMapInstance: () => maplibregl.Map | null
}

/**
 * MapSimplified - Main map component with routing capabilities
 * 
 * A React component that renders an interactive map using MapLibre GL JS.
 * Supports waypoint management, route calculation, and various map overlays.
 * 
 * @param waypoints - Array of waypoints to display on the map
 * @param route - Calculated route coordinates to visualize
 * @param onMapClick - Callback when map is clicked (receives [lng, lat])
 * @param onMapLoad - Callback when map is loaded (receives map instance)
 * @param onWaypointAdd - Callback when a waypoint is added
 * @param onRouteCalculated - Callback when route is calculated
 * @param onRouteSolved - Callback when route solving is complete
 * @param onClearRoute - Callback when route is cleared
 * @param routingMode - Routing algorithm mode ('ASTAR' or 'ISOCHRONE')
 * @param mapStyle - Map style to use ('openfreemap-liberty' or 'dark-maritime')
 * @param showOpenSeaMap - Whether to show OpenSeaMap overlay
 * @param isochroneOptions - Options for isochrone routing
 * @returns JSX element containing the map
 */
const MapSimplified = forwardRef<MapRef, MapProps>(({ waypoints, route, routeWaypoints = [], onMapClick, onMapLoad, onWaypointAdd, onRouteCalculated, onRouteSolved, onClearRoute, routingMode = 'ASTAR', mapStyle: mapStyleProp = 'dark-maritime', showOpenSeaMap: showOpenSeaMapProp = true, isochroneOptions }, ref) => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)

  // Internal map view state to prevent re-centering on re-renders
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([-70.9, 42.35])
  const [currentZoom, setCurrentZoom] = useState(6)

  // Router integration
  const {
    isInitialized,
    initializeRouter,
    solveRoute,
    setSafetyCaps
  } = useRouter()

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    calculateRoute,
    clearRoute,
    getWaypoints: () => waypoints,
    getRoute: () => route,
    getMapInstance: () => mapInstance.current
  }))

  // Initialize router on component mount (runs only once)
  useEffect(() => {
    const initializeRouterService = async () => {
      try {
        await initializeRouter({
          lat0: -80.0,
          lat1: 80.0,
          lon0: -180.0,
          lon1: 180.0,
          dLat: 0.5,
          dLon: 0.5
        });

        // Set default safety caps
        setSafetyCaps({
          maxWaveHeight: 8.0,
          maxHeadingChange: 30.0,
          minWaterDepth: 15.0
        });
      } catch (err) {
        console.error('Failed to initialize router:', err);
      }
    };

    initializeRouterService();
  }, [initializeRouter, setSafetyCaps]); // Dependencies for router initialization

  // Handle map clicks for waypoint selection with bounds guard
  const handleMapClick = useCallback((lngLat: [number, number]) => {
    const p: LatLonPosition = { lat: lngLat[1], lon: lngLat[0] }
    onWaypointAdd?.(p)
    if (onMapClick) onMapClick(lngLat)
  }, [onMapClick, onWaypointAdd])

  // Calculate route between waypoints with fallback straight line
  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2 || !isInitialized) return;

    const t0 = performance.now()
    try {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      const res = await solveRoute(start, end, 0, {
        mode: routingMode,
        isochrone: routingMode === 'ISOCHRONE' ? isochroneOptions : undefined,
        start,
        goal: end,
      })
      const elapsedMs = Math.round(performance.now() - t0)
      debugRouter.logRouteResult(res, elapsedMs)
      if (routingMode === 'ISOCHRONE' && (res.waypoints?.length ?? 0) <= 1) {
        console.warn('[SeaSight] Isochrone solver returned a single waypoint. Check land/depth masks or provide wider start/end separation.')
      }
      if (routingMode === 'ISOCHRONE' && (res.diagnostics?.hazardFlags ?? 0) & 0x1) {
        console.warn('[SeaSight] Route crosses segments exceeding configured wave limits. Informing user while continuing.');
      }
      let path = res.waypoints
      if (path.length < 2) {
        path = [start, end]
      }
      const coords = path.map(({ lat, lon }) => ({ lat, lon }))
      onRouteCalculated?.(coords)
      onRouteSolved?.(res)
    } catch (err) {
      if (err instanceof Error && err.message === 'ISOCHRONE_NO_ROUTE' && routingMode === 'ISOCHRONE') {
        console.warn('[SeaSight] Isochrone aborted: safety caps prevented route expansion.');
        onRouteCalculated?.([])
        onRouteSolved?.(null)
        setIsCalculating(false)
        return
      }
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      onRouteCalculated?.([start, end])
      onRouteSolved?.(null)
      console.error('Failed to calculate route, using direct line fallback:', err)
    }
  }, [waypoints, isInitialized, solveRoute, onRouteCalculated, onRouteSolved, routingMode, isochroneOptions])

  // Clear waypoints and route
  const clearRoute = useCallback(() => {
    onClearRoute?.()
    onRouteCalculated?.([])
    onRouteSolved?.(null)
  }, [onClearRoute, onRouteCalculated, onRouteSolved])

  const updateWaypointSource = useCallback((map: maplibregl.Map) => {
    const source = map.getSource('waypoints') as maplibregl.GeoJSONSource | undefined
    if (!source) return

    const waypointFeatures = waypoints.map((wp, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lon, wp.lat]
      },
      properties: {
        id: index,
        label: index === 0 ? 'Departure' : index === waypoints.length - 1 ? 'Destination' : `Waypoint ${index + 1}`,
        role: index === 0 ? 'start' : index === waypoints.length - 1 ? 'destination' : 'via'
      }
    }))

    source.setData({
      type: 'FeatureCollection',
      features: waypointFeatures
    })
  }, [waypoints])

  const updateIsochroneWaypointSource = useCallback((map: maplibregl.Map) => {
    const source = map.getSource('isochrone-waypoints') as maplibregl.GeoJSONSource | undefined
    if (!source) return

    const features = routeWaypoints.map((wp, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lon, wp.lat]
      },
      properties: {
        id: index,
        label: index === 0 ? 'Departure' : index === routeWaypoints.length - 1 ? 'Destination' : `Waypoint ${index}`,
        time: wp.time ?? null
      }
    }))

    source.setData({
      type: 'FeatureCollection',
      features
    })
  }, [routeWaypoints])

  const updateRouteSource = useCallback((map: maplibregl.Map) => {
    const source = map.getSource('route') as maplibregl.GeoJSONSource | undefined
    if (!source) return
    if (route.length < 2) {
      source.setData({ type: 'FeatureCollection', features: [] })
      return
    }
    source.setData({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature' as const,
          geometry: {
            type: 'LineString' as const,
            coordinates: route.map(point => [point.lon, point.lat])
          },
          properties: {}
        }
      ]
    })
  }, [route])

  const ensureCustomLayers = useCallback((map: maplibregl.Map) => {
    if (!map.getSource('openseamap')) {
      map.addSource('openseamap', {
        type: 'raster',
        tiles: [
          'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenSeaMap contributors'
      })
    }
    if (!map.getLayer('openseamap-overlay')) {
      map.addLayer({
        id: 'openseamap-overlay',
        type: 'raster',
        source: 'openseamap',
        paint: {
          'raster-opacity': showOpenSeaMapProp ? 0.7 : 0
        }
      })
    } else {
      map.setPaintProperty('openseamap-overlay', 'raster-opacity', showOpenSeaMapProp ? 0.7 : 0)
    }

    if (!map.getSource('waypoints')) {
      map.addSource('waypoints', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }
    if (!map.getLayer('waypoints')) {
      map.addLayer({
        id: 'waypoints',
        type: 'circle',
        source: 'waypoints',
        paint: {
          'circle-radius': [
            'case',
            ['==', ['get', 'role'], 'start'], 10,
            ['==', ['get', 'role'], 'destination'], 10,
            7
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'role'], 'start'], '#22d3ee',
            ['==', ['get', 'role'], 'destination'], '#f97316',
            '#f8fafc'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a'
        }
      })
    }

    if (!map.getSource('isochrone-waypoints')) {
      map.addSource('isochrone-waypoints', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }
    if (!map.getLayer('isochrone-waypoints')) {
      map.addLayer({
        id: 'isochrone-waypoints',
        type: 'circle',
        source: 'isochrone-waypoints',
        paint: {
          'circle-radius': 4,
          'circle-color': '#0ea5e9',
          'circle-stroke-width': 1,
          'circle-stroke-color': '#0f172a'
        }
      })
    }

    if (!map.getSource('route')) {
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        }
      })
    }
    if (!map.getLayer('route')) {
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#38bdf8',
          'line-width': 3.5,
          'line-opacity': 0.92
        }
      })
    }
    updateWaypointSource(map)
    updateIsochroneWaypointSource(map)
    updateRouteSource(map)
  }, [showOpenSeaMapProp, updateWaypointSource, updateIsochroneWaypointSource, updateRouteSource])

  // Map initialization (runs only once on component mount)
  useEffect(() => {
    if (!mapRef.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLES[mapStyleProp].url, // Use prop for initial style
      center: currentCenter, // Use internal state
      zoom: currentZoom,     // Use internal state
      maxZoom: 18,
      minZoom: 1,
    })

    mapInstance.current = map

    // Store current view state on map move/zoom
    const onMoveEnd = () => {
      setCurrentCenter(map.getCenter().toArray() as [number, number]);
      setCurrentZoom(map.getZoom());
    };
    map.on('moveend', onMoveEnd);
    const onZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', onZoomEnd);

    // Add maritime-specific controls
    map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right')

    // Add scale control with nautical units
    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'nautical'
    }), 'bottom-left')

    // Add fullscreen control
    map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    // Handle map clicks
    map.on('click', (e) => {
      handleMapClick([e.lngLat.lng, e.lngLat.lat])
    })

    // On load ensure our custom layers exist
    map.on('load', () => {
      ensureCustomLayers(map)
      if (onMapLoad) {
        onMapLoad(map)
      }
    })

    // Cleanup on component unmount
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onZoomEnd);
      map.remove()
    }
  }, []) // Empty dependency array means this runs only once on mount

  // Effect to update map style when mapStyleProp changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const newStyleUrl = MAP_STYLES[mapStyleProp].url;
    try {
      map.setStyle(newStyleUrl);
    } catch (_) {
      // noop - setStyle can throw if map is mid-update; next tick will apply
    }
  }, [mapStyleProp]);

  // Effect to update OpenSeaMap overlay opacity when showOpenSeaMapProp changes
  useEffect(() => {
    if (mapInstance.current && mapInstance.current.getLayer('openseamap-overlay')) {
      mapInstance.current.setPaintProperty('openseamap-overlay', 'raster-opacity', showOpenSeaMapProp ? 0.7 : 0);
    }
  }, [showOpenSeaMapProp]);

  // Update waypoints visualization
  useEffect(() => {
    if (!mapInstance.current) return;
    updateWaypointSource(mapInstance.current);
  }, [waypoints, updateWaypointSource]);

  // Update route visualization
  useEffect(() => {
    if (!mapInstance.current) return;
    updateRouteSource(mapInstance.current);
  }, [route, updateRouteSource]);

  // Update solver waypoint markers
  useEffect(() => {
    if (!mapInstance.current) return;
    updateIsochroneWaypointSource(mapInstance.current);
  }, [routeWaypoints, updateIsochroneWaypointSource]);

  // Effect to re-add custom layers when map style changes dynamically
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const handler = () => {
      ensureCustomLayers(map);
    };
    map.on('styledata', handler);
    return () => {
      map.off('styledata', handler);
    };
  }, [ensureCustomLayers]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Grid overlay for maritime theme */}
      <div className="map-grid-overlay" />
      
      {/* Click Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--glass-bg)',
        color: 'var(--white)',
        padding: '8px 16px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        fontWeight: '500'
      }}>
        {waypoints.length === 0 
          ? 'Click anywhere to set your departure point' 
          : waypoints.length === 1 
            ? 'Click again to choose a destination – route will auto generate'
            : 'Route generated. Click Clear to start over'
        }
      </div>

    </div>
  )
})

MapSimplified.displayName = 'MapSimplified'

export default MapSimplified
