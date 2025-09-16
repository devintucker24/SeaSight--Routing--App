import { useState } from 'react'
import './App.css'
import Map from './components/Map'
import RoutePlanner from './components/RoutePlanner'
import VesselProfile from './components/VesselProfile'

interface Waypoint {
  id: string
  lng: number
  lat: number
  name: string
}

function App() {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([])

  const handleMapClick = (lngLat: [number, number]) => {
    console.log('Map clicked at:', lngLat)
    // This will be handled by RoutePlanner
  }

  const handleWaypointAdd = (waypoint: Waypoint) => {
    setWaypoints([...waypoints, waypoint])
  }

  const handleRoutePlan = () => {
    console.log('Planning route with waypoints:', waypoints)
    // Route planning logic will go here
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <Map onMapClick={handleMapClick} />
      <RoutePlanner 
        onWaypointAdd={handleWaypointAdd}
        onRoutePlan={handleRoutePlan}
      />
      <VesselProfile />
    </div>
  )
}

export default App
