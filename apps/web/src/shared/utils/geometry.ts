import type { RouteWaypoint } from '@features/route-planner/services/RouterService'

const EARTH_RADIUS_NM = 3440.065
const DEG_TO_RAD = Math.PI / 180

function haversineCentralAngle(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG_TO_RAD
  const phi2 = lat2 * DEG_TO_RAD
  const dPhi = (lat2 - lat1) * DEG_TO_RAD
  const dLambda = (lon2 - lon1) * DEG_TO_RAD

  const sinDPhi = Math.sin(dPhi / 2)
  const sinDLambda = Math.sin(dLambda / 2)
  const a = sinDPhi * sinDPhi + Math.cos(phi1) * Math.cos(phi2) * sinDLambda * sinDLambda
  return 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
}

function distanceNm(a: RouteWaypoint, b: RouteWaypoint): number {
  return EARTH_RADIUS_NM * haversineCentralAngle(a.lat, a.lon, b.lat, b.lon)
}

function bearingRad(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const phi1 = lat1 * DEG_TO_RAD
  const phi2 = lat2 * DEG_TO_RAD
  const dLambda = (lon2 - lon1) * DEG_TO_RAD
  const y = Math.sin(dLambda) * Math.cos(phi2)
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda)
  return Math.atan2(y, x)
}

function crossTrackDistanceNm(point: RouteWaypoint, start: RouteWaypoint, end: RouteWaypoint): number {
  const delta13 = haversineCentralAngle(start.lat, start.lon, point.lat, point.lon)
  if (delta13 === 0) return 0
  const theta13 = bearingRad(start.lat, start.lon, point.lat, point.lon)
  const theta12 = bearingRad(start.lat, start.lon, end.lat, end.lon)
  const crossTrack = Math.asin(Math.sin(delta13) * Math.sin(theta13 - theta12))
  return Math.abs(crossTrack) * EARTH_RADIUS_NM
}

function douglasPeuckerRecursive(points: RouteWaypoint[], toleranceNm: number, first: number, last: number, keep: boolean[]): void {
  if (last <= first + 1) {
    return
  }

  let maxDistance = 0
  let index = first
  for (let i = first + 1; i < last; i++) {
    const distance = crossTrackDistanceNm(points[i], points[first], points[last])
    if (distance > maxDistance) {
      index = i
      maxDistance = distance
    }
  }

  if (maxDistance > toleranceNm) {
    keep[index] = true
    douglasPeuckerRecursive(points, toleranceNm, first, index, keep)
    douglasPeuckerRecursive(points, toleranceNm, index, last, keep)
  }
}

export function simplifyRoute(waypoints: RouteWaypoint[], toleranceNm = 5): RouteWaypoint[] {
  if (waypoints.length <= 2 || toleranceNm <= 0) {
    return [...waypoints]
  }

  const keep = new Array<boolean>(waypoints.length).fill(false)
  keep[0] = true
  keep[waypoints.length - 1] = true

  douglasPeuckerRecursive(waypoints, toleranceNm, 0, waypoints.length - 1, keep)

  const simplified: RouteWaypoint[] = []
  for (let i = 0; i < waypoints.length; i++) {
    if (keep[i]) {
      simplified.push(waypoints[i])
    }
  }

  // Ensure we always keep departure and destination even if tolerance removed them
  if (simplified.length === 0) {
    return [...waypoints]
  }

  return simplified
}

export function routeLengthNm(waypoints: RouteWaypoint[]): number {
  if (waypoints.length < 2) return 0
  let total = 0
  for (let i = 1; i < waypoints.length; i++) {
    total += distanceNm(waypoints[i - 1], waypoints[i])
  }
  return total
}
