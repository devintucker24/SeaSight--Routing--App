import { useState, useRef } from 'react'
import './App.css'
import MapSimplified, { type MapRef } from './components/MapSimplified'
import RoutePlanner from './components/RoutePlanner'
import VesselProfile from './components/VesselProfile'
import SlidePanel from './components/SlidePanel'
import LayerToggles from './components/LayerToggles'
import StatusLedger from './components/StatusLedger'
import ActionDock from './components/ActionDock'
import type { LatLonPosition, RouteResponse } from './services/RouterService'

interface Waypoint {
  id: string
  lon: number
  lat: number
  name: string
}

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [route, setRoute] = useState<LatLonPosition[]>([])
  const [routeResult, setRouteResult] = useState<RouteResponse | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [rightPanelOpen, setRightPanelOpen] = useState(false)
  const [mapStyle, setMapStyle] = useState<'openfreemap-liberty' | 'dark-maritime'>('dark-maritime')
  const [showOpenSeaMap, setShowOpenSeaMap] = useState(true)
  const [routingMode] = useState<'ASTAR' | 'ISOCHRONE'>('ASTAR')
  const [isochroneOpts] = useState({
    timeStepMinutes: 30,
    headingCount: 16,
    mergeRadiusNm: 5,
    goalRadiusNm: 10,
    maxHours: 240,
    ship: { calmSpeedKts: 14, maxHeadingChange: 30 },
    safetyCaps: { maxWaveHeight: 4.0, minWaterDepth: 15 },
  })
  
  const [layers, setLayers] = useState([
    { id: 'nautical', icon: '🌊', label: 'Nautical Charts', active: true, onToggle: (id: string) => handleLayerToggle(id) },
    { id: 'weather', icon: '🌤️', label: 'Weather', active: false, onToggle: (id: string) => handleLayerToggle(id) },
    { id: 'ais', icon: '🚢', label: 'AIS Ships', active: false, onToggle: (id: string) => handleLayerToggle(id) },
    { id: 'ports', icon: '⚓', label: 'Ports', active: false, onToggle: (id: string) => handleLayerToggle(id) }
  ])
  
  const mapRef = useRef<MapRef>(null)

  const addWaypoint = (coords: LatLonPosition, label?: string) => {
    setWaypoints(prev => {
      const index = prev.length
      const name = label ?? (index === 0 ? 'Departure' : index === 1 ? 'Destination' : `Waypoint ${index + 1}`)
      return [
        ...prev,
        {
          id: `wp-${Date.now()}-${Math.round(Math.random() * 1e6)}`,
          lat: coords.lat,
          lon: coords.lon,
          name
        }
      ]
    })
  }

  const handleMapClick = (lngLat: [number, number]) => {
    addWaypoint({ lat: lngLat[1], lon: lngLat[0] })
  }

  const handleWaypointAdd = (coords: { lat: number; lon: number }) => {
    addWaypoint(coords)
  }

  const handleWaypointRemove = (id: string) => {
    setWaypoints(prev => prev.filter(wp => wp.id !== id))
  }

  const handleRoutePlan = async () => {
    if (!mapRef.current) return
    if (waypoints.length < 2) return
    setIsCalculating(true)
    try {
      await mapRef.current.calculateRoute()
    } catch (error) {
      console.error('Route planning failed:', error)
    } finally {
      setIsCalculating(false)
    }
  }

  const handleClearRoute = () => {
    setWaypoints([])
    setRoute([])
    setRouteResult(null)
    mapRef.current?.clearRoute()
  }

  const handleCenterMap = () => {
    if (mapRef.current) {
      const map = mapRef.current.getMapInstance()
      if (map) {
        map.flyTo({ center: [-70.9, 42.35], zoom: 6 })
      }
    }
  }

  const handleLayerToggle = (layerId: string) => {
    setLayers(prev => prev.map(layer => 
      layer.id === layerId ? { ...layer, active: !layer.active } : layer
    ))
  }

  const handleMapStyleChange = (style: 'openfreemap-liberty' | 'dark-maritime') => {
    setMapStyle(style)
    if (mapRef.current) {
      const map = mapRef.current.getMapInstance()
      if (map) {
        const styleUrl = style === 'dark-maritime' ? '/dark.json' : 'https://tiles.openfreemap.org/styles/liberty'
        map.setStyle(styleUrl)
      }
    }
  }

  const handleOpenSeaMapToggle = () => {
    setShowOpenSeaMap(!showOpenSeaMap)
    if (mapRef.current) {
      const map = mapRef.current.getMapInstance()
      if (map && map.getLayer('openseamap-overlay')) {
        map.setPaintProperty('openseamap-overlay', 'raster-opacity', !showOpenSeaMap ? 0.7 : 0)
      }
    }
  }

  const waypointCount = waypoints.length

  const mapWaypoints: LatLonPosition[] = waypoints.map(({ lat, lon }) => ({ lat, lon }))

  const handleRouteSolved = (result: RouteResponse | null) => {
    setRouteResult(result)
    if (result && result.waypoints) {
      const coords = result.waypoints.map(({ lat, lon }) => ({ lat, lon }))
      setRoute(coords)
    } else {
      setRoute([])
    }
  }

  const formatDuration = (hours: number | undefined) => {
    if (hours === undefined || Number.isNaN(hours)) return undefined
    const totalMinutes = Math.max(0, Math.round(hours * 60))
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}h ${m}m`
  }

  const formattedEta = routeResult?.etaHours !== undefined ? `${routeResult.etaHours.toFixed(1)} hrs` : undefined
  const formattedDistance = routeResult?.diagnostics?.totalDistanceNm !== undefined
    ? `${routeResult.diagnostics.totalDistanceNm.toFixed(1)} nm`
    : undefined

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: 'var(--navy-900)' }}>
      {/* Floating Navigation Bar */}
      <div className="nav-bar glass-panel" style={{ zIndex: 1100 }}>
        <div className="nav-brand">SeaSight</div>
        <button className="nav-icon-btn" title="Dashboard">🏠</button>
        <button className="nav-icon-btn" title="Alerts">⚠️</button>
        <button className="nav-icon-btn" title="Profile">👤</button>
      </div>

      {/* Main Map */}
      <MapSimplified 
        ref={mapRef}
        waypoints={mapWaypoints}
        route={route}
        onMapClick={handleMapClick}
        onWaypointAdd={(point) => addWaypoint(point)}
        onRouteCalculated={(coords) => setRoute(coords)}
        onRouteSolved={handleRouteSolved}
        onClearRoute={() => {
          setRoute([])
          setRouteResult(null)
        }}
        routingMode={routingMode}
        mapStyle={mapStyle}
        showOpenSeaMap={showOpenSeaMap}
        isochroneOptions={isochroneOpts}
      />

      {/* Start Auto Route Button */}
      <button
        onClick={handleRoutePlan}
        disabled={waypointCount < 2 || isCalculating}
        className="glass-panel"
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '88px',
          zIndex: 1100,
          padding: '10px 16px',
          borderRadius: '999px',
          background: waypointCount >= 2 && !isCalculating ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.45)',
          color: waypointCount >= 2 && !isCalculating ? 'var(--navy-900)' : 'var(--silver-300)',
          border: '1px solid var(--glass-border)',
          cursor: waypointCount >= 2 && !isCalculating ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 700,
          letterSpacing: '0.04em',
          boxShadow: waypointCount >= 2 && !isCalculating ? 'var(--glow)' : 'none'
        }}
        title={waypointCount < 2 ? 'Add at least 2 waypoints on the map' : (isCalculating ? 'Calculating...' : 'Start Auto Route')}
      >
        {isCalculating ? 'Calculating…' : 'Start Auto Route'}
      </button>

      {/* Clear Waypoints Button */}
      <button
        onClick={handleClearRoute}
        disabled={waypointCount === 0 && route.length === 0}
        className="glass-panel"
        style={{
          position: 'absolute',
          right: '20px',
          bottom: '40px',
          zIndex: 1100,
          padding: '8px 12px',
          borderRadius: '999px',
          background: waypointCount > 0 || route.length > 0 ? 'rgba(239,68,68,0.9)' : 'rgba(2, 11, 26, 0.45)',
          color: 'white',
          border: '1px solid var(--glass-border)',
          cursor: waypointCount > 0 || route.length > 0 ? 'pointer' : 'not-allowed',
          fontSize: '12px',
          fontWeight: 700
        }}
        title={waypointCount === 0 && route.length === 0 ? 'No waypoints/route to clear' : 'Clear waypoints & route'}
      >
        Clear Waypoints
      </button>

      {/* Map Style Controls */}
      <div className="glass-panel" style={{
        position: 'absolute',
        top: '96px',
        left: '20px',
        zIndex: 1000,
        padding: '12px 14px',
        minWidth: '200px'
      }}>
        <div style={{ 
          fontSize: '14px', 
          fontWeight: '600', 
          marginBottom: '12px',
          color: 'var(--cyan-400)'
        }}>
          🗺️ Map Style
        </div>
        
        <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
          <button
            onClick={() => handleMapStyleChange('dark-maritime')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: mapStyle === 'dark-maritime' ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.6)',
              color: mapStyle === 'dark-maritime' ? 'var(--navy-900)' : 'var(--white)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🌙</span>
            <span>Dark</span>
          </button>
          
          <button
            onClick={() => handleMapStyleChange('openfreemap-liberty')}
            style={{
              flex: 1,
              padding: '8px 12px',
              backgroundColor: mapStyle === 'openfreemap-liberty' ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.6)',
              color: mapStyle === 'openfreemap-liberty' ? 'var(--navy-900)' : 'var(--white)',
              border: '1px solid var(--glass-border)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '11px',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🆓</span>
            <span>Liberty</span>
          </button>
        </div>

        <button
          onClick={handleOpenSeaMapToggle}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: showOpenSeaMap ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.6)',
            color: showOpenSeaMap ? 'var(--navy-900)' : 'var(--white)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <span>🌊</span>
          <span>{showOpenSeaMap ? 'Nautical ON' : 'Nautical OFF'}</span>
        </button>
      </div>

      {/* Left Slide Panel - Route Planning */}
      <SlidePanel 
        side="left" 
        tabIcon="🧭" 
        tabLabel="Route Planning"
        onOpenChange={() => {}}
      >
        <RoutePlanner 
          waypoints={waypoints}
          onWaypointAdd={handleWaypointAdd}
          onWaypointRemove={handleWaypointRemove}
          onClearWaypoints={() => {
            setWaypoints([])
            setRoute([])
            setRouteResult(null)
          }}
          onRoutePlan={handleRoutePlan}
        />
      </SlidePanel>

      {/* Right Slide Panel - Vessel Profile */}
      <SlidePanel 
        side="right" 
        tabIcon="🚢" 
        tabLabel="Vessel Profile"
        onOpenChange={setRightPanelOpen}
      >
        <VesselProfile />
      </SlidePanel>

      {/* Layer Toggles */}
      <LayerToggles 
        layers={layers} 
        className={rightPanelOpen ? 'right-panel-open' : ''}
      />

      {/* Status Ledger */}
      <StatusLedger 
        eta={formattedEta}
        distance={formattedDistance}
        routeInfo={{
          waypoints: waypointCount,
          totalTime: route.length > 0 ? formatDuration(routeResult?.etaHours) : undefined
        }}
      />

      {/* Action Dock (Mobile) */}
      <ActionDock
        onMenuClick={() => console.log('Menu clicked')}
        onCenterMap={handleCenterMap}
        onConfirmRoute={handleRoutePlan}
        onClearRoute={handleClearRoute}
        hasRoute={route.length > 0}
        isCalculating={isCalculating}
      />
    </div>
  )
}

export default App
