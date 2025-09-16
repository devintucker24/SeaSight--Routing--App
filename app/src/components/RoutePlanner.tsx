import { useState } from 'react'

interface Waypoint {
  id: string
  lat: number
  lon: number
  name: string
}

interface RoutePlannerProps {
  waypoints: Waypoint[]
  onWaypointAdd: (coords: { lat: number; lon: number }) => void
  onWaypointRemove: (id: string) => void
  onClearWaypoints?: () => void
  onRoutePlan: () => void
}

const RoutePlanner = ({ waypoints, onWaypointAdd, onWaypointRemove, onClearWaypoints, onRoutePlan }: RoutePlannerProps) => {
  const [departureTime, setDepartureTime] = useState(new Date().toISOString().slice(0, 16))
  const [pendingLat, setPendingLat] = useState('')
  const [pendingLon, setPendingLon] = useState('')

  return (
    <div style={{
      color: 'var(--white)',
      padding: '0',
      minWidth: '300px'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: '600',
        color: 'var(--cyan-400)'
      }}>
        🧭 Route Planner
      </h3>
      
      {/* Departure Time */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          marginBottom: '4px',
          color: 'var(--silver-200)',
          fontWeight: '500'
        }}>
          Departure Time (UTC)
        </label>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'rgba(2, 11, 26, 0.6)',
            color: 'var(--white)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}
        />
      </div>

      {/* Waypoints */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          marginBottom: '4px',
          color: 'var(--silver-200)',
          fontWeight: '500'
        }}>
          Waypoints ({waypoints.length})
        </label>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {waypoints.map((wp, index) => (
            <div key={wp.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '8px 12px',
              backgroundColor: 'rgba(2, 11, 26, 0.4)',
              borderRadius: '6px',
              marginBottom: '6px',
              fontSize: '11px',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(4px)'
            }}>
              <span style={{ color: 'var(--white)' }}>
                {index + 1}. {wp.name}
              </span>
              <button
                onClick={() => onWaypointRemove(wp.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '2px',
                  borderRadius: '4px',
                  transition: 'background 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Manual waypoint entry */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          type="number"
          value={pendingLat}
          onChange={(e) => setPendingLat(e.target.value)}
          placeholder="Lat"
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: 'rgba(2, 11, 26, 0.6)',
            color: 'var(--white)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}
        />
        <input
          type="number"
          value={pendingLon}
          onChange={(e) => setPendingLon(e.target.value)}
          placeholder="Lon"
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: 'rgba(2, 11, 26, 0.6)',
            color: 'var(--white)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}
        />
        <button
          onClick={() => {
            const lat = parseFloat(pendingLat)
            const lon = parseFloat(pendingLon)
            if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
              onWaypointAdd({ lat, lon })
              setPendingLat('')
              setPendingLon('')
            }
          }}
          style={{
            padding: '8px 12px',
            backgroundColor: 'var(--cyan-500)',
            color: 'var(--navy-900)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--cyan-400)'
            e.currentTarget.style.boxShadow = 'var(--glow)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--cyan-500)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          +
        </button>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRoutePlan}
          disabled={waypoints.length < 2}
          style={{
            flex: 1,
            padding: '10px 16px',
            backgroundColor: waypoints.length >= 2 ? 'var(--cyan-500)' : 'rgba(2, 11, 26, 0.4)',
            color: waypoints.length >= 2 ? 'var(--navy-900)' : 'var(--silver-300)',
            border: 'none',
            borderRadius: '6px',
            cursor: waypoints.length >= 2 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            if (waypoints.length >= 2) {
              e.currentTarget.style.backgroundColor = 'var(--cyan-400)'
              e.currentTarget.style.boxShadow = 'var(--glow)'
            }
          }}
          onMouseLeave={(e) => {
            if (waypoints.length >= 2) {
              e.currentTarget.style.backgroundColor = 'var(--cyan-500)'
              e.currentTarget.style.boxShadow = 'none'
            }
          }}
        >
          Plan Route
        </button>
        <button
          onClick={() => onClearWaypoints?.()}
          style={{
            padding: '10px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.8)',
            color: 'var(--white)',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '600',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 1)'
            e.currentTarget.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.8)'
            e.currentTarget.style.boxShadow = 'none'
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default RoutePlanner
