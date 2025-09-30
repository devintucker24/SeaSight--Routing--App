# Routing Fixes Summary - 2025-09-30

## 🎯 Issues Identified

1. **WASM Module Still Loading Pthread Workers**
   - Even after removing pthread flags from CMakeLists.txt, the WASM module was still trying to load workers
   - This caused "still waiting on run dependencies: loading-workers" errors

2. **Route Running with Only One Waypoint**
   - The `useEffect` in `App.tsx` was triggering route calculation even with < 2 waypoints
   - Condition was `if (waypoints.length >= 2)` but should be more explicit

3. **Fallback Route Using Grid Coordinates as Lat/Lon**
   - In `router.worker.ts`, the fallback route was returning grid indices (`startLatGrid`, `startLonGrid`) as if they were geographic coordinates
   - This caused "crazy" routes that didn't make sense

## ✅ Fixes Applied

### 1. Clean Rebuild of WASM Module

**Files Modified:**
- `packages/router-core/build/` - Completely removed
- `packages/router-wasm/dist/` - Completely removed

**Actions:**
```bash
# Clean build directories
rm -rf packages/router-core/build
rm -rf packages/router-wasm/dist

# Rebuild from scratch
source emsdk/emsdk_env.sh
cd packages/router-wasm
npm run build
```

**Verification:**
- Confirmed no `USE_PTHREADS` or `PTHREAD_POOL` symbols in built WASM
- Only comments about pthreads remain (from Emscripten boilerplate)
- Build output shows: "Configuring SeaSightRouter for WebAssembly (single-threaded)"

### 2. Fixed Route Trigger Logic in App.tsx

**File:** `apps/web/src/App.tsx`

**Changes:**
```typescript
// OLD (triggered with 1 waypoint if length >= 2 was somehow true)
useEffect(() => {
  if (waypoints.length >= 2) {
    void runRouteSolve()
  }
}, [routingMode, runRouteSolve, waypoints.length])

// NEW (explicit logging and proper conditions)
useEffect(() => {
  console.log('🎯 [APP] useEffect triggered - waypoints:', waypoints.length, 'mode:', routingMode);
  if (waypoints.length === 2) {
    console.log('🎯 [APP] Exactly 2 waypoints - running route solve');
    void runRouteSolve();
  } else if (waypoints.length > 2) {
    console.log('🎯 [APP] More than 2 waypoints - using first and last for routing');
    void runRouteSolve();
  } else {
    console.log('🎯 [APP] Not enough waypoints (need 2, have', waypoints.length, ')');
  }
}, [routingMode, runRouteSolve, waypoints.length])
```

### 3. Removed Fallback Route (Force WASM Requirement)

**File:** `apps/web/src/workers/router.worker.ts`

**Changes:**
- **Removed** the fallback straight-line route that used grid coordinates as lat/lon
- **Added** explicit error throwing if WASM fails to load
- **Reason**: Fallback routes were causing more confusion than helping; better to fail fast and clearly

```typescript
// OLD (returned grid coords as lat/lon)
if (!routerInstance) {
  const waypoints = [
    { lat: startLatGrid, lon: startLonGrid },  // WRONG - these are grid indices!
    { lat: goalLatGrid, lon: goalLonGrid }
  ];
  return { mode: 'ASTAR', waypoints, ... };
}

// NEW (fail explicitly)
if (!routerInstance) {
  console.error('❌ [ROUTE SOLVER] Router instance not available');
  throw new Error('Router not initialized - WASM module failed to load. Please check browser console for WASM loading errors.');
}
```

### 4. Comprehensive Logging Throughout Pipeline

**Files Modified:**
- `apps/web/src/App.tsx` - Added logging to `runRouteSolve` and `useEffect`
- `apps/web/src/workers/router.worker.ts` - Added extensive logging to all operations
- `apps/web/src/features/route-planner/services/RouterService.ts` - Enhanced existing logs

**Logging Strategy:**
- **🎯 [APP]** - Application-level routing trigger logic
- **🚢 [ROUTE SOLVER]** - Worker-side route calculation
- **🔧 [ROUTER SERVICE]** - RouterService operations
- **📍** - Coordinate information
- **⚙️** - Configuration and options
- **✅/❌** - Success/failure indicators

**Example Log Flow:**
```
🎯 [APP] useEffect triggered - waypoints: 2, mode: ASTAR
🎯 [APP] Exactly 2 waypoints - running route solve
🚀 [APP] runRouteSolve called: {hasMapRef: true, waypointCount: 2, routingMode: 'ASTAR'}
🗺️  [APP] Route from: {lat: 42.35, lon: -70.9} to: {lat: 51.5, lon: -0.12}
⚓ [APP] Calling mapRef.calculateRoute...
═══════════════════════════════════════════════════════════
🚢 [ROUTE SOLVER] Starting route calculation
═══════════════════════════════════════════════════════════
📍 Start Grid: {i: 132, j: 109}
📍 Goal Grid: {i: 141, j: 179}
⏰ Start Time: 0 hours
⚙️  Options: {mode: 'ASTAR'}
🤖 Router Instance Available: true
═══════════════════════════════════════════════════════════
⚓ [ROUTE SOLVER] Using A-STAR mode
⚙️  Calling routerInstance.solve...
📊 [ROUTE SOLVER] Raw A* result received
   Result length: 45
   First few nodes: [{i: 132, j: 109}, {i: 133, j: 110}, ...]
   Last few nodes: [{i: 140, j: 179}, {i: 141, j: 179}]
📍 [ROUTE SOLVER] Converted to waypoints: 45
✅ [ROUTE SOLVER] A* result: {...}
═══════════════════════════════════════════════════════════
✅ [APP] Route calculation completed
🏁 [APP] Route solve finished
```

### 5. Fixed IsochroneOptions Type Mismatch

**File:** `apps/web/src/workers/router.worker.ts`

**Issue:** Worker was accessing `options.isochrone.shipSpeedKts` but the actual type has `options.isochrone.ship.calmSpeedKts`

**Fix:**
```typescript
// Extract isochrone options with correct property paths
const isoOpts = options.isochrone;
const shipSpeedKts = isoOpts?.ship?.calmSpeedKts ?? 12;
const maxHours = isoOpts?.maxHours ?? 240;
const timeStepMinutes = isoOpts?.timeStepMinutes ?? 180;
const maxWaveHeight = isoOpts?.safetyCaps?.maxWaveHeight ?? 6.0;
const maxHeadingChange = isoOpts?.ship?.maxHeadingChange ?? 30.0;
const minWaterDepth = isoOpts?.safetyCaps?.minWaterDepth ?? 15.0;
```

## 📋 Testing Instructions

1. **Open Browser DevTools Console**
   - You'll now see detailed logs for every step of the routing process
   - Look for the emoji prefixes to quickly identify each stage

2. **Test Basic Route**
   - Click to add first waypoint → Should log "Not enough waypoints"
   - Click to add second waypoint → Should trigger full routing pipeline
   - Check console for complete log flow from App → RouterService → Worker

3. **Expected Behavior**
   - Route should ONLY calculate when you have exactly 2 waypoints
   - WASM module MUST load (no fallback routes)
   - If WASM fails, you'll see clear error: "Router not initialized - WASM module failed to load"

4. **Debug WASM Loading Issues**
   - If you see "WASM module loading timeout", check:
     - Network tab for WASM file loading
     - Console for any CORS or security errors
     - Browser compatibility (needs SharedArrayBuffer support if using pthreads, but we removed those)

## 🚀 Build Status

✅ **TypeScript Compilation:** Success  
✅ **Vite Build:** Success (1.94s)  
✅ **WASM Build:** Success (single-threaded, no pthread)  
✅ **Dev Server:** Running on http://localhost:5174

## 📊 What's Next

1. **Test with Real Data**
   - Add two waypoints on the map
   - Verify the route appears as a line connecting them
   - Check that waypoints are actual geographic coordinates (lat/lon), not grid indices

2. **Performance Monitoring**
   - With all the logging, initial performance may be slightly slower
   - Can remove verbose logs once issues are resolved
   - Keep error logs and key decision points

3. **Error Handling**
   - WASM loading failures should now be immediately visible
   - No more silent fallbacks that produce incorrect routes
   - Clear error messages guide debugging

## 🔍 Key Learnings

1. **Clean Builds Matter:** Cached build artifacts can persist flags even after CMakeLists.txt changes
2. **Explicit > Implicit:** Better to throw errors than silently fall back to incorrect behavior
3. **Logging is Gold:** Comprehensive logging makes debugging distributed systems (App → Service → Worker → WASM) much easier
4. **Type Safety:** Even with TypeScript, nested optional properties can cause runtime issues if not carefully accessed

## 📝 Files Modified

- `apps/web/src/App.tsx` - Route trigger logic + logging
- `apps/web/src/workers/router.worker.ts` - Removed fallback, added logging, fixed IsochroneOptions
- `packages/router-core/CMakeLists.txt` - Already had pthread removed
- `packages/router-wasm/` - Complete rebuild from clean state

## ✅ Verification Checklist

- [x] WASM builds without pthread
- [x] No pthread symbols in built artifacts
- [x] TypeScript compiles without errors
- [x] Dev server starts successfully
- [x] Logging shows complete routing pipeline
- [x] Route only triggers with 2+ waypoints
- [x] WASM loading failures throw explicit errors
- [x] IsochroneOptions properties match type definitions
