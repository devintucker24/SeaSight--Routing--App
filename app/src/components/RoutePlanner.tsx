import { useState } from 'react'

interface Waypoint {
  id: string
  lng: number
  lat: number
  name: string
}

interface RoutePlannerProps {
  onWaypointAdd: (waypoint: Waypoint) => void
  onRoutePlan: () => void
}

const RoutePlanner = ({ onWaypointAdd, onRoutePlan }: RoutePlannerProps) => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])
  const [departureTime, setDepartureTime] = useState(new Date().toISOString().slice(0, 16))

  const addWaypoint = (lng: number, lat: number) => {
    const newWaypoint: Waypoint = {
      id: `wp-${Date.now()}`,
      lng,
      lat,
      name: `Waypoint ${waypoints.length + 1}`
    }
    setWaypoints([...waypoints, newWaypoint])
    onWaypointAdd(newWaypoint)
  }

  const removeWaypoint = (id: string) => {
    setWaypoints(waypoints.filter(wp => wp.id !== id))
  }

  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      left: '200px',
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      minWidth: '300px',
      backdropFilter: 'blur(8px)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
        🧭 Route Planner
      </h3>
      
      {/* Departure Time */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
          Departure Time (UTC)
        </label>
        <input
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          style={{
            width: '100%',
            padding: '6px 8px',
            backgroundColor: '#374151',
            color: 'white',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            fontSize: '12px'
          }}
        />
      </div>

      {/* Waypoints */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
          Waypoints ({waypoints.length})
        </label>
        <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
          {waypoints.map((wp, index) => (
            <div key={wp.id} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '4px 8px',
              backgroundColor: '#1f2937',
              borderRadius: '4px',
              marginBottom: '4px',
              fontSize: '11px'
            }}>
              <span>
                {index + 1}. {wp.name}
              </span>
              <button
                onClick={() => removeWaypoint(wp.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={onRoutePlan}
          disabled={waypoints.length < 2}
          style={{
            flex: 1,
            padding: '8px 12px',
            backgroundColor: waypoints.length >= 2 ? '#1e40af' : '#374151',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: waypoints.length >= 2 ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Plan Route
        </button>
        <button
          onClick={() => setWaypoints([])}
          style={{
            padding: '8px 12px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: '500'
          }}
        >
          Clear
        </button>
      </div>
    </div>
  )
}

export default RoutePlanner
