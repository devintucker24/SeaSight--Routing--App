Isochrone-Based Ocean Routing Agent Specification & Integration Plan

Purpose

This agent implements a time-front / isochrone routing algorithm to generate practical, safe, and efficient vessel routes across the ocean.
It must integrate into the existing SeaSight Routing App repo, without breaking current A* functionality.
The output is a polyline of waypoints with timing and diagnostics, accessible via the same API patterns already used by the app.

Core Concept: Isochrone / Time-Front Routing

Start from departure point + time.

Every Δt (time step) expand reachable positions forward given vessel performance and environment.

Each expansion produces an isochrone (the frontier of where the vessel could be at that elapsed time).

Keep only the Pareto-optimal set of positions (fastest arrivals that are safe).

Repeat until the isochrone reaches the goal region.

Pick the best endpoint and backtrack to reconstruct the route.

This naturally handles time-varying weather and currents, unlike static A*.

Inputs

Start: (lat, lon, departure_time)

Destination: (lat, lon, ETA_window)

Environment model (Env):

Wind (u,v @ 10 m)

Waves (Hs, Tp, Dir)

Currents (u,v surface)

Bathymetry (depth)

Restricted zones (ECAs, TSS, land, ice)

Vessel model (Ship):

Nominal calm speed (knots)

Draft / safety depth (m)

Wave height cap (Hs max)

Heading change limits (deg/Δt)

Speed-loss function (waves, wind, currents)

Optional: fuel/CO₂ consumption curves

Outputs

Route polyline: waypoints (lat, lon, time)

ETA: estimated arrival time

Diagnostics: distance (NM), avg/actual speed (kts), max Hs encountered, optional fuel/CO₂

Algorithm Steps

Initialize frontier = start point at departure time.

Expand each Δt:

Try 12–16 bearings (22.5°–30° apart).

Step distance = V_eff(lat, lon, heading, t) * Δt.

Advance to (lat, lon, t+Δt).

Environment check:

Sample forecast at new point/time.

Reject if violates masks (land, depth < draft+safety, Hs > cap).

Ship model:

Compute V_eff = V_calm ⊕ current ± wave_loss.

Clamp min speed (≥ 3 kts).

Update frontier:

Deduplicate within tolerance (10–20 NM).

Keep only Pareto-best arrivals.

Goal detection:

If within ~20–30 NM of destination, accept.

Otherwise continue until horizon reached.

Backtrack:

Trace parents → ordered waypoints.

Simplify with Douglas-Peucker, enforce waypoint spacing (30–60 NM offshore).

Why Isochrone > Static A*

Weather moves; forecasts are time-dependent.

Currents matter; time-front adapts.

Grid snapping artifacts vanish; bearings define steps.

Industry standard; mirrors how commercial routers work.

Key Parameters

Δt: 30–60 min offshore

Bearings: 12–16 (22.5°–30°)

Merge tolerance: 10–20 NM

Safety: Hs cap (e.g. 4.5 m), min depth, max heading change

Repo Integration Plan
What Exists

C++ core: TimeDependentAStar (grid + A*), compiled with Emscripten to WASM.

Embind wrapper: exposes RouterWrapper.solve(...) etc.

API layer: /app/api/route.ts calls into WASM and returns waypoints.

UI: sends start/destination, draws returned route.

What To Add

New module: IsochroneRouter in C++ (isochrone_router.hpp/.cpp).

Args struct: IsochroneArgs for start, end, Δt, bearings, safety caps.

Bindings: expose .solveIsochrone() in EMSCRIPTEN_BINDINGS block.

Env + Ship stubs:

Env(lat, lon, t) → calm values (extend later).

Ship.performance(env, heading) → effective speed.

API Changes

Add mode flag to API ('ASTAR' | 'ISOCHRONE'):

if (mode === 'ISOCHRONE') {
  return wasmIsochrone.solveIsochrone(args);
} else {
  return wasmAstar.solve(args); // default
}


Default = A*, so nothing breaks.

UI toggle can expose mode switch.

Risks & Mitigations

Performance: prune dominated frontier points, merge within tolerance.

Data feeds: start with stubs; design Env interface so GRIB/NetCDF can be plugged in later.

Compatibility: keep A* intact, add Isochrone as parallel path.

Success Criteria

Routes avoid unsafe/restricted areas.

Arrival time minimized given forecast.

Smooth, practical waypoint spacing.

Default app behavior unchanged unless mode=ISOCHRONE.