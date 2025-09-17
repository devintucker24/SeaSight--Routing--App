import { useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from '../hooks/useRouter'
import type { LatLonPosition, RoutingMode, IsochroneOptions, RouteResponse } from '../services/RouterService'

interface MapProps {
  waypoints: LatLonPosition[]
  route: LatLonPosition[]
  onMapClick?: (lngLat: [number, number]) => void
  onMapLoad?: (map: maplibregl.Map) => void
  onWaypointAdd?: (waypoint: LatLonPosition) => void
  onRouteCalculated?: (route: LatLonPosition[]) => void
  onRouteSolved?: (result: RouteResponse | null) => void
  onClearRoute?: () => void
  routingMode?: RoutingMode
  mapStyle?: MapStyle
  showOpenSeaMap?: boolean
  isochroneOptions?: IsochroneOptions
}

type MapStyle = 'openfreemap-liberty' | 'dark-maritime'

export interface MapRef {
  calculateRoute: () => Promise<void>
  clearRoute: () => void
  getWaypoints: () => LatLonPosition[]
  getRoute: () => LatLonPosition[]
  getMapInstance: () => maplibregl.Map | null
}

const MapSimplified = forwardRef<MapRef, MapProps>(({ waypoints, route, onMapClick, onMapLoad, onWaypointAdd, onRouteCalculated, onRouteSolved, onClearRoute, routingMode = 'ASTAR', mapStyle: mapStyleProp = 'dark-maritime', showOpenSeaMap: showOpenSeaMapProp = true, isochroneOptions }, ref) => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const mapStyle = mapStyleProp
  const showOpenSeaMap = showOpenSeaMapProp
  
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

  // Initialize router on component mount
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
          maxWaveHeight: 4.0,
          maxHeadingChange: 30.0,
          minWaterDepth: 15.0
        });
      } catch (err) {
        console.error('Failed to initialize router:', err);
      }
    };

    initializeRouterService();
  }, [initializeRouter, setSafetyCaps]);

  // Handle map clicks for waypoint selection with bounds guard
  const handleMapClick = useCallback((lngLat: [number, number]) => {
    const p: LatLonPosition = { lat: lngLat[1], lon: lngLat[0] }
    onWaypointAdd?.(p)
    if (onMapClick) onMapClick(lngLat)
  }, [onMapClick, onWaypointAdd])

  // Calculate route between waypoints with fallback straight line
  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2 || !isInitialized) return;

    try {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      const res = await solveRoute(start, end, 0, {
        mode: routingMode,
        isochrone: routingMode === 'ISOCHRONE' ? isochroneOptions : undefined,
        start,
        goal: end,
      })
      let path = res.waypoints
      if (path.length < 2) {
        path = [start, end]
      }
      const coords = path.map(({ lat, lon }) => ({ lat, lon }))
      onRouteCalculated?.(coords)
      onRouteSolved?.(res)
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

  // Map style configurations - optimized for maritime use
  const mapStyles = {
    'openfreemap-liberty': {
      url: 'https://tiles.openfreemap.org/styles/liberty',
      name: 'OpenFreeMap Liberty',
      icon: '🆓',
      attribution: '© OpenStreetMap contributors'
    },
    'dark-maritime': {
      url: '/dark.json',
      name: 'Dark Maritime',
      icon: '🌙',
      attribution: '© OpenStreetMap contributors'
    }
  }

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
          'raster-opacity': showOpenSeaMap ? 0.7 : 0
        }
      })
    } else {
      map.setPaintProperty('openseamap-overlay', 'raster-opacity', showOpenSeaMap ? 0.7 : 0)
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
    updateRouteSource(map)
  }, [showOpenSeaMap, updateWaypointSource, updateRouteSource])

  useEffect(() => {
    if (!mapRef.current) return

    const currentStyle = mapStyles[mapStyle]
    
    // Create map with OpenFreeMap style
    const map = new maplibregl.Map({
      container: mapRef.current,
      style: currentStyle.url,
      center: [-70.9, 42.35],
      zoom: 6,
      maxZoom: 18,
      minZoom: 1,
    })

    mapInstance.current = map

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

    // When style changes (e.g., via map.setStyle), re-add custom layers
    map.on('styledata', () => {
      ensureCustomLayers(map)
    })

    return () => {
      map.remove()
    }
  }, [onMapClick, onMapLoad, showOpenSeaMap, mapStyle, handleMapClick])

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
