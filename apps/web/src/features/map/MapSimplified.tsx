import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useState } from 'react'
import maplibregl from 'maplibre-gl'
import { useRouter } from '@features/route-planner/hooks/useRouter'
import { routerService, type LatLonPosition, type RoutingMode, type IsochroneOptions, type RouteResponse, type LandMaskData } from '@features/route-planner/services/RouterService'
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
 */
const MapSimplified = forwardRef<MapRef, MapProps>(({ waypoints, route, routeWaypoints = [], onMapClick, onMapLoad, onWaypointAdd, onRouteCalculated, onRouteSolved, onClearRoute, routingMode = 'ASTAR', mapStyle: mapStyleProp = 'dark-maritime', showOpenSeaMap: showOpenSeaMapProp = true, isochroneOptions }, ref) => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)

  // Internal map view state to prevent re-centering on re-renders
  const [currentCenter, setCurrentCenter] = useState<[number, number]>([-70.9, 42.35])
  const [currentZoom, setCurrentZoom] = useState(6)
  const [isMapReady, setIsMapReady] = useState(false); // New state to track map readiness

  // Router integration
  const {
    isInitialized,
    initializeRouter,
    solveRoute,
    setSafetyCaps
  } = useRouter()

  const [showRawRoute, setShowRawRoute] = useState(false);
  const [rawRouteData, setRawRouteData] = useState<LatLonPosition[]>([]);
  const [showLandMask, setShowLandMask] = useState(false);
  const [landMaskData, setLandMaskData] = useState<LandMaskData | null>(null);

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
          maxWaveHeight: 6.0,
          maxHeadingChange: 30.0,
          minWaterDepth: 15.0
        });
      } catch (err) {
        console.error('Failed to initialize router:', err);
      }
    };

    initializeRouterService();
  }, [initializeRouter, setSafetyCaps]);

  // Load land mask data from router
  const loadLandMaskData = useCallback(async () => {
    try {
      const data = await routerService.getLandMaskData();
      if (data && data.loaded) {
        setLandMaskData(data);
        console.log('Land mask data loaded:', data);
      } else {
        console.warn('Land mask data not available');
      }
    } catch (error) {
      console.error('Failed to load land mask data:', error);
    }
  }, []);

  // Load land mask data when router is initialized
  useEffect(() => {
    if (isInitialized) {
      loadLandMaskData();
    }
  }, [isInitialized, loadLandMaskData]);

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
      let path = res.waypoints
      if (path.length < 2) {
        path = [start, end]
      }
      const coords = path.map(({ lat, lon }) => ({ lat, lon }))
      onRouteCalculated?.(coords)
      onRouteSolved?.(res)
      setRawRouteData((res.waypointsRaw ?? []).map(({ lat, lon }) => ({ lat, lon })));
      console.log("Full Route Response:", res);

      // --- ADD THIS BLOCK FOR COMPARISON TOOL ---
      if (res && res.mode === 'ISOCHRONE') {
        const comparison = routerService.compareWithStraightRoute(res);
        console.log("Route Comparison (Isochrone vs. Straight):", comparison);
      }
      // --- END ADDITION ---

    } catch (err) {
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
    
    const currentRouteData = showRawRoute ? rawRouteData : route;

    if (currentRouteData.length < 2) {
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
            coordinates: currentRouteData.map(point => [point.lon, point.lat])
          },
          properties: {}
        }
      ]
    })
  }, [route, rawRouteData, showRawRoute])

  // Create land mask layer once data is available
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isMapReady || !landMaskData || !landMaskData.loaded || map.getSource('land-mask-image-source')) {
      return;
    }
    
    console.log('Setting up land mask layer for the first time.');

    const { lat0, lon0, lat1, lon1, rows, cols, cells } = landMaskData;

    const canvas = document.createElement('canvas');
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(cols, rows);
    const data = imageData.data;

    // Fill the ImageData with the land mask data, flipping the rows vertically
    // The source `cells` data is ordered from South to North (bottom-to-top),
    // but canvas ImageData is drawn from top-to-bottom.
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        // Source index from bottom-to-top
        const srcIndex = y * cols + x;
        // Destination index from top-to-bottom
        const destRow = rows - 1 - y;
        const destIndex = (destRow * cols + x) * 4;
        
        const isLand = cells[srcIndex] !== 0;
        if (isLand) {
          data[destIndex] = 255;     // R
          data[destIndex + 1] = 107; // G
          data[destIndex + 2] = 107; // B
          data[destIndex + 3] = 77;  // Alpha (0.3 * 255)
        }
      }
    }
    ctx.putImageData(imageData, 0, 0);

    const imageUrl = canvas.toDataURL();
    const coordinates: [[number, number], [number, number], [number, number], [number, number]] = [
      [lon0, lat1], // Top-left
      [lon1, lat1], // Top-right
      [lon1, lat0], // Bottom-right
      [lon0, lat0]  // Bottom-left
    ];

    if (!map.getSource('land-mask-image-source')) {
      map.addSource('land-mask-image-source', {
        type: 'image',
        url: imageUrl,
        coordinates: coordinates
      });
    }
    
    if (!map.getLayer('land-mask-image-layer')) {
      map.addLayer({
        id: 'land-mask-image-layer',
        type: 'raster',
        source: 'land-mask-image-source',
        paint: { 'raster-opacity': 0.8 },
        layout: { 'visibility': 'none' } // Initially hidden
      });
    }
  }, [landMaskData, isMapReady]);

  // Toggle land mask visibility
  useEffect(() => {
    const map = mapInstance.current;
    if (isMapReady && map?.getLayer('land-mask-image-layer')) {
      map.setLayoutProperty(
        'land-mask-image-layer',
        'visibility',
        showLandMask ? 'visible' : 'none'
      );
    }
  }, [showLandMask, isMapReady]);

  // Map initialization (runs only once on component mount)
  useEffect(() => {
    if (!mapRef.current) return

    const map = new maplibregl.Map({
      container: mapRef.current,
      style: MAP_STYLES[mapStyleProp].url,
      center: currentCenter,
      zoom: currentZoom,
      maxZoom: 18,
      minZoom: 1,
    })

    mapInstance.current = map

    const onMoveEnd = () => {
      setCurrentCenter(map.getCenter().toArray() as [number, number]);
      setCurrentZoom(map.getZoom());
    };
    map.on('moveend', onMoveEnd);
    const onZoomEnd = () => {
      setCurrentZoom(map.getZoom());
    };
    map.on('zoomend', onZoomEnd);

    map.addControl(new maplibregl.NavigationControl({
      showCompass: true,
      showZoom: true,
      visualizePitch: true
    }), 'top-right')

    map.addControl(new maplibregl.ScaleControl({
      maxWidth: 100,
      unit: 'nautical'
    }), 'bottom-left')

    map.addControl(new maplibregl.FullscreenControl(), 'top-right')

    map.on('click', (e) => {
      handleMapClick([e.lngLat.lng, e.lngLat.lat])
    })

    map.on('load', () => {
      console.log('Map fired "load" event. Setting up initial sources and layers.');
      
      // Add OpenSeaMap
      map.addSource('openseamap', {
        type: 'raster',
        tiles: ['https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenSeaMap contributors'
      });
      map.addLayer({
        id: 'openseamap-overlay',
        type: 'raster',
        source: 'openseamap',
        paint: { 'raster-opacity': showOpenSeaMapProp ? 0.7 : 0 }
      });

      // Add Waypoints source and layer
      map.addSource('waypoints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'waypoints',
        type: 'circle',
        source: 'waypoints',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'role'], 'start'], 10, ['==', ['get', 'role'], 'destination'], 10, 7],
          'circle-color': ['case', ['==', ['get', 'role'], 'start'], '#22d3ee', ['==', ['get', 'role'], 'destination'], '#f97316', '#f8fafc'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a'
        }
      });

      // Add Isochrone Waypoints source and layer
      map.addSource('isochrone-waypoints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
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
      });

      // Add Route source and layer
      map.addSource('route', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#38bdf8', 'line-width': 3.5, 'line-opacity': 0.92 }
      });

      setIsMapReady(true); // Signal that the map is ready for updates

      if (onMapLoad) {
        onMapLoad(map)
      }
    });

    // Cleanup on component unmount
    return () => {
      map.off('moveend', onMoveEnd);
      map.off('zoomend', onZoomEnd);
      map.remove()
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Effect to update map style when mapStyleProp changes
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    const newStyleUrl = MAP_STYLES[mapStyleProp].url;
    try {
      setIsMapReady(false); // Map will reload, so it's not ready
      map.setStyle(newStyleUrl);
    } catch (_) {
      // noop - setStyle can throw if map is mid-update; next tick will apply
    }
  }, [mapStyleProp]);

  // Effect to update OpenSeaMap overlay opacity when showOpenSeaMapProp changes
  useEffect(() => {
    if (isMapReady && mapInstance.current?.getLayer('openseamap-overlay')) {
      mapInstance.current.setPaintProperty('openseamap-overlay', 'raster-opacity', showOpenSeaMapProp ? 0.7 : 0);
    }
  }, [showOpenSeaMapProp, isMapReady]);

  // Update waypoints visualization
  useEffect(() => {
    if (isMapReady && mapInstance.current) {
      updateWaypointSource(mapInstance.current);
    }
  }, [waypoints, isMapReady, updateWaypointSource]);

  // Update route visualization
  useEffect(() => {
    if (isMapReady && mapInstance.current) {
      updateRouteSource(mapInstance.current);
    }
  }, [route, rawRouteData, showRawRoute, isMapReady, updateRouteSource]);

  // Update solver waypoint markers
  useEffect(() => {
    if (isMapReady && mapInstance.current) {
      updateIsochroneWaypointSource(mapInstance.current);
    }
  }, [routeWaypoints, isMapReady, updateIsochroneWaypointSource]);
  
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Debug Toggle for Raw Route */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'var(--glass-bg)',
        padding: '8px',
        borderRadius: '8px',
        zIndex: 1001,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        color: 'var(--white)',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <input
          type="checkbox"
          id="showRawRouteToggle"
          checked={showRawRoute}
          onChange={(e) => setShowRawRoute(e.target.checked)}
          style={{ accentColor: '#38bdf8' }}
        />
        <label htmlFor="showRawRouteToggle">Show Raw Route (Debug)</label>
      </div>

      {/* Land Mask Toggle */}
      <div style={{
        position: 'absolute',
        top: '50px',
        left: '10px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '8px',
        padding: '8px 12px',
        color: 'var(--text-primary)',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        <input
          type="checkbox"
          id="showLandMaskToggle"
          checked={showLandMask}
          onChange={(e) => setShowLandMask(e.target.checked)}
          style={{ accentColor: '#ff6b6b' }}
        />
        <label htmlFor="showLandMaskToggle">Show Land Mask (Debug)</label>
      </div>
      
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
