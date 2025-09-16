import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from '../hooks/useRouter'
import type { LatLonPosition, SafetyCaps } from '../services/RouterService'

interface MapProps {
  onMapClick?: (lngLat: [number, number]) => void
  onMapLoad?: (map: maplibregl.Map) => void
  onRouteCalculated?: (route: LatLonPosition[]) => void
}

type MapStyle = 'openfreemap-liberty' | 'dark-maritime'

// Router grid bounds used by the current WASM router
const BOUNDS = { lat0: 30, lat1: 50, lon0: -80, lon1: -60 }

const Map = ({ onMapClick, onMapLoad, onRouteCalculated }: MapProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark-maritime')
  const [showOpenSeaMap, setShowOpenSeaMap] = useState(true)
  const [coordinates, setCoordinates] = useState({ lng: -70.9, lat: 42.35 })
  const [waypoints, setWaypoints] = useState<LatLonPosition[]>([])
  const [route, setRoute] = useState<LatLonPosition[]>([])
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  
  // Router integration
  const { 
    isInitialized, 
    isLoading, 
    error, 
    initializeRouter, 
    solveRoute, 
    setSafetyCaps 
  } = useRouter()

  // Initialize router on component mount
  useEffect(() => {
    const initializeRouterService = async () => {
      try {
        await initializeRouter({
          lat0: 30.0,
          lat1: 50.0,
          lon0: -80.0,
          lon1: -60.0,
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
    if (
      p.lat < BOUNDS.lat0 || p.lat > BOUNDS.lat1 ||
      p.lon < BOUNDS.lon0 || p.lon > BOUNDS.lon1
    ) {
      console.warn('Waypoint outside router bounds')
      return
    }
    setWaypoints(prev => [...prev, p])
    if (onMapClick) onMapClick(lngLat)
  }, [onMapClick])

  // Calculate route between waypoints with fallback straight line
  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2 || !isInitialized) return;

    setIsCalculatingRoute(true);
    try {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      const res = await solveRoute(start, end)
      const out = res.length >= 2 ? res : [start, end]
      setRoute(out)
      if (onRouteCalculated) onRouteCalculated(out)
    } catch (err) {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      setRoute([start, end])
      console.error('Failed to calculate route, using direct line fallback:', err)
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [waypoints, isInitialized, solveRoute, onRouteCalculated])

  // Clear waypoints and route
  const clearRoute = useCallback(() => {
    setWaypoints([])
    setRoute([])
  }, [])

  // Map style configurations - optimized for maritime use
  const mapStyles = {
    'openfreemap-liberty': {
      url: 'https://tiles.openfreemap.org/styles/liberty',
      name: 'OpenFreeMap Liberty',
      icon: '🆓',
      attribution: '© OpenStreetMap contributors'
    },
    'dark-maritime': {
      url: '/styles/dark.json',
      name: 'Dark Maritime',
      icon: '🌙',
      attribution: '© OpenStreetMap contributors'
    }
  }

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
      setCoordinates({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    })

    // Update coordinates on mouse move
    map.on('mousemove', (e) => {
      setCoordinates({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    })

    // Add OpenSeaMap overlay when enabled
    const addOpenSeaMapOverlay = () => {
      if (map.getSource('openseamap')) return

      map.addSource('openseamap', {
        type: 'raster',
        tiles: [
          'https://tiles.openseamap.org/seamark/{z}/{x}/{y}.png'
        ],
        tileSize: 256,
        attribution: '© OpenSeaMap contributors'
      })

      map.addLayer({
        id: 'openseamap-overlay',
        type: 'raster',
        source: 'openseamap',
        paint: {
          'raster-opacity': showOpenSeaMap ? 0.7 : 0
        }
      })
    }

    // Add route visualization
    const addRouteVisualization = () => {
      // Add waypoints source and layer
      if (!map.getSource('waypoints')) {
        map.addSource('waypoints', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })
      }

      map.addLayer({
        id: 'waypoints',
        type: 'circle',
        source: 'waypoints',
        paint: {
          'circle-radius': 8,
          'circle-color': '#ff6b6b',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff'
        }
      })

      // Add route source and layer
      if (!map.getSource('route')) {
        map.addSource('route', {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: []
          }
        })
      }

      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: {
          'line-join': 'round',
          'line-cap': 'round'
        },
        paint: {
          'line-color': '#4f46e5',
          'line-width': 3,
          'line-opacity': 0.8
        }
      })
    }

    // Add OpenSeaMap when map loads
    map.on('load', () => {
      addOpenSeaMapOverlay()
      addRouteVisualization()
      if (onMapLoad) {
        onMapLoad(map)
      }
    })

    // Update OpenSeaMap visibility
    if (map.getLayer('openseamap-overlay')) {
      map.setPaintProperty('openseamap-overlay', 'raster-opacity', showOpenSeaMap ? 0.8 : 0)
    }

    return () => {
      map.remove()
    }
  }, [onMapClick, onMapLoad, showOpenSeaMap, mapStyle, handleMapClick])

  // Update waypoints visualization
  useEffect(() => {
    if (!mapInstance.current || !mapInstance.current.getSource('waypoints')) return;

    const waypointFeatures = waypoints.map((wp, index) => ({
      type: 'Feature' as const,
      geometry: {
        type: 'Point' as const,
        coordinates: [wp.lon, wp.lat]
      },
      properties: {
        id: index,
        label: `Waypoint ${index + 1}`
      }
    }));

    (mapInstance.current.getSource('waypoints') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: waypointFeatures
    });
  }, [waypoints]);

  // Update route visualization
  useEffect(() => {
    if (!mapInstance.current || !mapInstance.current.getSource('route')) return;

    if (route.length < 2) {
      (mapInstance.current.getSource('route') as maplibregl.GeoJSONSource).setData({
        type: 'FeatureCollection',
        features: []
      });
      return;
    }

    const routeFeature = {
      type: 'Feature' as const,
      geometry: {
        type: 'LineString' as const,
        coordinates: route.map(point => [point.lon, point.lat])
      },
      properties: {
        name: 'Calculated Route'
      }
    };

    (mapInstance.current.getSource('route') as maplibregl.GeoJSONSource).setData({
      type: 'FeatureCollection',
      features: [routeFeature]
    });
  }, [route]);

  const toggleOpenSeaMap = () => {
    setShowOpenSeaMap(!showOpenSeaMap)
  }

  const changeMapStyle = (style: MapStyle) => {
    setMapStyle(style)
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      
      {/* Map Controls Overlay */}
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}>
        {/* Map Style Selector */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          {Object.entries(mapStyles).map(([key, style]) => (
            <button
              key={key}
              onClick={() => changeMapStyle(key as MapStyle)}
              style={{
                padding: '6px 10px',
                backgroundColor: mapStyle === key ? '#1e40af' : '#374151',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: '500',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = mapStyle === key ? '#1d4ed8' : '#4b5563'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = mapStyle === key ? '#1e40af' : '#374151'
              }}
            >
              <span>{style.icon}</span>
              <span>{style.name}</span>
            </button>
          ))}
        </div>

        {/* OpenSeaMap Toggle */}
        <button
          onClick={toggleOpenSeaMap}
          style={{
            padding: '8px 12px',
            backgroundColor: showOpenSeaMap ? '#059669' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = showOpenSeaMap ? '#047857' : '#4b5563'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = showOpenSeaMap ? '#059669' : '#374151'
          }}
        >
          <span>🌊</span>
          <span>{showOpenSeaMap ? 'Nautical Charts ON' : 'Nautical Charts OFF'}</span>
        </button>

        {/* Route Planning Controls */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '4px'
        }}>
          <button
            onClick={calculateRoute}
            disabled={waypoints.length < 2 || !isInitialized || isCalculatingRoute}
            style={{
              padding: '8px 12px',
              backgroundColor: waypoints.length >= 2 && isInitialized && !isCalculatingRoute ? '#059669' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: waypoints.length >= 2 && isInitialized && !isCalculatingRoute ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🚢</span>
            <span>{isCalculatingRoute ? 'Calculating...' : 'Calculate Route'}</span>
          </button>

          <button
            onClick={clearRoute}
            disabled={waypoints.length === 0 && route.length === 0}
            style={{
              padding: '6px 10px',
              backgroundColor: waypoints.length > 0 || route.length > 0 ? '#dc2626' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: waypoints.length > 0 || route.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '11px',
              fontWeight: '500',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>🗑️</span>
            <span>Clear</span>
          </button>
        </div>

        {/* Router Status */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: isInitialized ? 'rgba(5, 150, 105, 0.8)' : 'rgba(239, 68, 68, 0.8)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          minWidth: '140px',
          backdropFilter: 'blur(4px)'
        }}>
          <div>Router: {isInitialized ? 'Ready' : isLoading ? 'Loading...' : 'Error'}</div>
          {error && <div style={{ fontSize: '10px', color: '#fca5a5' }}>{error}</div>}
          <div>Waypoints: {waypoints.length}</div>
          {route.length > 0 && <div>Route: {route.length} points</div>}
        </div>

        {/* Coordinates Display */}
        <div style={{
          padding: '8px 12px',
          backgroundColor: 'rgba(0,0,0,0.8)',
          color: 'white',
          borderRadius: '4px',
          fontSize: '11px',
          fontFamily: 'monospace',
          minWidth: '140px',
          backdropFilter: 'blur(4px)'
        }}>
          <div>Lon: {coordinates.lng.toFixed(4)}°</div>
          <div>Lat: {coordinates.lat.toFixed(4)}°</div>
        </div>
      </div>

      {/* Map Info Panel */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        zIndex: 1000,
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 12px',
        borderRadius: '4px',
        fontSize: '11px',
        backdropFilter: 'blur(4px)'
      }}>
        <div style={{ fontWeight: '600', marginBottom: '4px' }}>Map Info</div>
        <div>Style: {mapStyles[mapStyle].name}</div>
        <div>Nautical: {showOpenSeaMap ? 'ON' : 'OFF'}</div>
        <div>Zoom: {mapInstance.current?.getZoom()?.toFixed(1) || '6.0'}</div>
      </div>

      {/* Click Instructions */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '4px',
        fontSize: '12px',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}>
        {waypoints.length === 0 
          ? 'Click on the map to select waypoints' 
          : waypoints.length === 1 
            ? 'Click to add destination, then click "Calculate Route"'
            : 'Click "Calculate Route" to plan your journey'
        }
      </div>
    </div>
  )
}

export default Map
