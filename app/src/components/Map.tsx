import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useRouter } from '../hooks/useRouter'
import type { LatLonPosition, RoutingMode, IsochroneDiagnostics } from '../services/RouterService'

interface MapProps {
  onMapClick?: (lngLat: [number, number]) => void
  onMapLoad?: (map: maplibregl.Map) => void
  onRouteCalculated?: (route: LatLonPosition[]) => void
}

type MapStyle = 'openfreemap-liberty' | 'dark-maritime'

const Map = ({ onMapClick, onMapLoad, onRouteCalculated }: MapProps) => {
  const mapRef = useRef<HTMLDivElement | null>(null)
  const mapInstance = useRef<maplibregl.Map | null>(null)
  const [mapStyle, setMapStyle] = useState<MapStyle>('dark-maritime')
  const [showOpenSeaMap, setShowOpenSeaMap] = useState(true)
  const [coordinates, setCoordinates] = useState({ lng: -70.9, lat: 42.35 })
  const [waypoints, setWaypoints] = useState<LatLonPosition[]>([])
  const [route, setRoute] = useState<LatLonPosition[]>([])
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false)
  const [routingMode, setRoutingMode] = useState<RoutingMode>('ASTAR')
  const [routeDiagnostics, setRouteDiagnostics] = useState<IsochroneDiagnostics | null>(null)
  const [lastEta, setLastEta] = useState<number | null>(null)
  
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
          lat0: -80.0,
          lat1: 80.0,
          lon0: -180.0,
          lon1: 180.0,
          dLat: 1.0,
          dLon: 1.0
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
    setWaypoints(prev => {
      if (prev.length === 0) return [p]
      if (prev.length === 1) return [prev[0], p]
      return [prev[1], p]
    })
    if (onMapClick) onMapClick(lngLat)
  }, [onMapClick])

  // Calculate route between waypoints with fallback straight line
  const calculateRoute = useCallback(async () => {
    if (waypoints.length < 2 || !isInitialized) return;

    setIsCalculatingRoute(true);
    try {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      const res = await solveRoute(start, end, 0, { mode: routingMode })

      let path = res.waypoints
      if (path.length >= 2) {
        const first = path[0]
        const last = path[path.length - 1]
        const withEndpoints = [...path]
        if (Math.abs(first.lat - start.lat) > 1e-3 || Math.abs(first.lon - start.lon) > 1e-3) {
          withEndpoints.unshift({ lat: start.lat, lon: start.lon, time: first.time })
        }
        if (Math.abs(last.lat - end.lat) > 1e-3 || Math.abs(last.lon - end.lon) > 1e-3) {
          withEndpoints.push({ lat: end.lat, lon: end.lon, time: last.time })
        }
        path = withEndpoints
      } else {
        path = [start, end]
      }

      const out = path.map(({ lat, lon }) => ({ lat, lon }))
      setRoute(out)
      setRouteDiagnostics(res.diagnostics ?? null)
      setLastEta(res.etaHours ?? null)
      if (onRouteCalculated) onRouteCalculated(out)
    } catch (err) {
      const start = waypoints[0]
      const end = waypoints[waypoints.length - 1]
      setRoute([start, end])
      setRouteDiagnostics(null)
      setLastEta(null)
      console.error('Failed to calculate route, using direct line fallback:', err)
    } finally {
      setIsCalculatingRoute(false);
    }
  }, [waypoints, isInitialized, solveRoute, routingMode, onRouteCalculated])

  // Clear waypoints and route
  const clearRoute = useCallback(() => {
    setWaypoints([])
    setRoute([])
    setRouteDiagnostics(null)
    setLastEta(null)
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
          'circle-radius': [
            'case',
            ['==', ['get', 'role'], 'start'], 10,
            ['==', ['get', 'role'], 'destination'], 10,
            8
          ],
          'circle-color': [
            'case',
            ['==', ['get', 'role'], 'start'], '#22d3ee',
            ['==', ['get', 'role'], 'destination'], '#f97316',
            '#f8fafc'
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#0f172a',
          'circle-opacity': 0.95
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
        label: index === 0 ? 'Departure' : 'Destination',
        role: index === 0 ? 'start' : 'destination'
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
          <div style={{
            display: 'flex',
            gap: '6px'
          }}>
            {(['ASTAR', 'ISOCHRONE'] as RoutingMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setRoutingMode(mode)}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  backgroundColor: routingMode === mode ? '#0ea5e9' : '#1f2937',
                  color: 'white',
                  border: '1px solid rgba(148, 163, 184, 0.5)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: 600,
                  boxShadow: routingMode === mode ? '0 0 12px rgba(56, 189, 248, 0.6)' : '0 2px 4px rgba(0,0,0,0.3)',
                  letterSpacing: '0.05em'
                }}
              >
                {mode === 'ASTAR' ? 'A* SEARCH' : 'ISOCHRONE'}
              </button>
            ))}
          </div>
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
          <div>Mode: {routingMode}</div>
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
          ? 'Click anywhere to set your departure point' 
          : waypoints.length === 1 
            ? 'Click again to choose a destination, then solve the route'
            : 'Click "Calculate Route" to generate the full voyage'
        }
      </div>

      {routeDiagnostics && (
        <div style={{
          position: 'absolute',
          bottom: '24px',
          left: '24px',
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          color: '#e0f2fe',
          padding: '14px 18px',
          borderRadius: '12px',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          boxShadow: '0 12px 24px rgba(8, 145, 178, 0.35)',
          fontSize: '12px',
          minWidth: '220px',
          backdropFilter: 'blur(8px)',
          zIndex: 1100
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            fontSize: '11px',
            letterSpacing: '0.08em',
            color: '#38bdf8'
          }}>
            <span>ROUTER MODE</span>
            <span>{routingMode}</span>
          </div>
          <div style={{ display: 'grid', gap: '6px', color: '#cbd5f5' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Distance</span>
              <span>{routeDiagnostics.totalDistanceNm.toFixed(1)} nm</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Avg Speed</span>
              <span>{routeDiagnostics.averageSpeedKts.toFixed(1)} kts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Peak Hs</span>
              <span>{routeDiagnostics.maxWaveHeightM.toFixed(1)} m</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Frontier</span>
              <span>{routeDiagnostics.frontierCount}</span>
            </div>
            {lastEta !== null && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>ETA (hrs)</span>
                <span>{lastEta.toFixed(1)}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Map
