import { useRef, useEffect, useCallback, useState } from 'react'
import './App.css'
import MapSimplified, { type MapRef } from '@features/map/MapSimplified'
import RoutePlanner from '@features/route-planner/RoutePlanner'
import VesselProfile from '@features/vessel/VesselProfile'
import SlidePanel from '@shared/ui/SlidePanel'
import LayerToggles from '@features/map/LayerToggles'
import StatusLedger from '@shared/ui/StatusLedger'
// import ActionDock from '@shared/ui/ActionDock'
import type { RouteResponse } from '@shared/types'
import { useAppState } from '@shared/hooks/useAppState'
import { formatDuration, formatEta, formatDistance } from '@shared/utils'
import { debugRouter } from '@shared/dev'

function App() {
  // Use custom hook for state management
  const {
    waypoints,
    route,
    routeResult,
    lastSolveKey,
    // isCalculating,
    rightPanelOpen,
    mapStyle,
    showOpenSeaMap,
    routingMode,
    layers,
    waypointCount,
    mapWaypoints,
    addWaypoint,
    removeWaypoint,
    clearWaypoints,
    handleRouteSolved,
    clearRoute,
    handleMapStyleChange,
    handleOpenSeaMapToggle,
    setIsCalculating,
    setRightPanelOpen,
    setRoutingMode,
    recordSolveAttempt,
  } = useAppState()
  
  // Track left slide panel open state to avoid overlaps
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)

  const mapRef = useRef<MapRef>(null)

  const handleMapClick = (lngLat: [number, number]) => {
    addWaypoint({ lat: lngLat[1], lon: lngLat[0] })
  }

  const handleWaypointAdd = (coords: { lat: number; lon: number }) => {
    addWaypoint(coords)
  }

  const handleWaypointRemove = (id: string) => {
    removeWaypoint(id)
  }

  const runRouteSolve = useCallback(async () => {
    if (!mapRef.current || waypoints.length < 2) return

    const start = waypoints[0]
    const end = waypoints[waypoints.length - 1]
    const solveKey = `${start.lat.toFixed(4)},${start.lon.toFixed(4)}|${end.lat.toFixed(4)},${end.lon.toFixed(4)}`

    recordSolveAttempt(solveKey)
    setIsCalculating(true)
    try {
      debugRouter.logRouteCalculation(start, end, routingMode)
      await mapRef.current.calculateRoute()
    } catch (error) {
      debugRouter.logRouterError(error)
      console.error('Route planning failed:', error)
    } finally {
      setIsCalculating(false)
    }
  }, [recordSolveAttempt, routingMode, waypoints])

  useEffect(() => {
    if (waypoints.length >= 2) {
      void runRouteSolve()
    }
  }, [routingMode, runRouteSolve, waypoints.length])

  const handleRoutePlan = () => {
    void runRouteSolve()
  }

  const handleClearRoute = () => {
    clearWaypoints()
    clearRoute()
    mapRef.current?.clearRoute()
  }

  // const handleCenterMap = () => {
  //   if (mapRef.current) {
  //     const map = mapRef.current.getMapInstance()
  //     if (map) {
  //       map.flyTo({ center: [-70.9, 42.35], zoom: 6 })
  //     }
  //   }
  // }

  const handleMapStyleChangeWithMap = (style: 'openfreemap-liberty' | 'dark-maritime') => {
    handleMapStyleChange(style)
    if (mapRef.current) {
      const map = mapRef.current.getMapInstance()
      if (map) {
        const styleUrl = style === 'dark-maritime' ? '/dark.json' : 'https://tiles.openfreemap.org/styles/liberty'
        map.setStyle(styleUrl)
      }
    }
  }

  const handleOpenSeaMapToggleWithMap = () => {
    handleOpenSeaMapToggle()
    if (mapRef.current) {
      const map = mapRef.current.getMapInstance()
      if (map && map.getLayer('openseamap-overlay')) {
        map.setPaintProperty('openseamap-overlay', 'raster-opacity', !showOpenSeaMap ? 0.7 : 0)
      }
    }
  }

  const handleRouteSolvedWithMap = (result: RouteResponse | null) => {
    handleRouteSolved(result)
  }

  useEffect(() => {
    if (waypoints.length === 2) {
      const start = waypoints[0]
      const destination = waypoints[1]
      const key = `${start.lat.toFixed(4)},${start.lon.toFixed(4)}|${destination.lat.toFixed(4)},${destination.lon.toFixed(4)}`
      if (lastSolveKey !== key) {
        void runRouteSolve()
      }
    }
  }, [waypoints, runRouteSolve, lastSolveKey])

  const formattedEta = formatEta(routeResult?.etaHours)
  const formattedDistance = formatDistance(routeResult?.diagnostics?.totalDistanceNm)

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
        onRouteSolved={handleRouteSolvedWithMap}
        onClearRoute={() => {
          clearRoute()
        }}
        routingMode={routingMode}
        mapStyle={mapStyle}
        showOpenSeaMap={showOpenSeaMap}
      />

      {/* Clear Waypoints Button - repositioned as top dropdown */}
      <div className="clear-dropdown">
        <button
          onClick={handleClearRoute}
          disabled={waypointCount === 0 && route.length === 0}
          className="clear-waypoints-btn glass-panel"
          title={waypointCount === 0 && route.length === 0 ? 'No waypoints/route to clear' : 'Clear waypoints & route'}
        >
          Clear
        </button>
        <div className="clear-dropdown-menu glass-panel">
          <button onClick={clearWaypoints} disabled={waypointCount === 0}>Clear Waypoints</button>
          <button onClick={clearRoute} disabled={route.length === 0}>Clear Route</button>
          <button onClick={handleClearRoute} disabled={waypointCount === 0 && route.length === 0}>Clear Both</button>
        </div>
      </div>

      {/* Map Style Controls */}
      <div className={`map-style-controls glass-panel ${leftPanelOpen ? 'left-panel-open' : ''}`}>
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
            onClick={() => handleMapStyleChangeWithMap('dark-maritime')}
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
            onClick={() => handleMapStyleChangeWithMap('openfreemap-liberty')}
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

        <div
          style={{
            fontSize: '13px',
            fontWeight: '600',
            margin: '12px 0 6px',
            color: 'var(--cyan-300)'
          }}
        >
          ⚙️ Routing Mode
        </div>

        <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
          {(['ASTAR', 'ISOCHRONE'] as const).map((mode) => {
            const isSelected = routingMode === mode
            return (
              <button
                key={mode}
                onClick={() => setRoutingMode(mode)}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  backgroundColor: isSelected ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.6)',
                  color: isSelected ? 'var(--navy-900)' : 'var(--white)',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
                title={mode === 'ISOCHRONE' ? 'Detailed metocean-aware routing' : 'Fast grid-based routing'}
              >
                <span>{mode === 'ASTAR' ? '⚡' : '🌐'}</span>
                <span>{mode === 'ASTAR' ? 'A* Route' : 'Isochrone'}</span>
              </button>
            )
          })}
        </div>

        <button
          onClick={handleOpenSeaMapToggleWithMap}
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
        onOpenChange={setLeftPanelOpen}
      >
        <RoutePlanner 
          waypoints={waypoints}
          routeResult={routeResult}
          onWaypointAdd={handleWaypointAdd}
          onWaypointRemove={handleWaypointRemove}
          onClearWaypoints={clearWaypoints}
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
        className={leftPanelOpen ? 'left-panel-open' : ''}
        eta={formattedEta}
        distance={formattedDistance}
        routeInfo={{
          waypoints: waypointCount,
          totalTime: route.length > 0 ? formatDuration(routeResult?.etaHours) : undefined,
          mode: routeResult?.mode === 'ISOCHRONE' ? 'Isochrone' : 'A*'
        }}
      />
      {/* Action Dock removed per request */}
    </div>
  )
}

export default App
