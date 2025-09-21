Router Roadmap v0.5.0 — Performance Overhaul
Legend: [P1]=top priority, [P2]=next, [P3]=later; [🟢 Completed] already landed.

---
### Phase 1: Core Performance Overhaul (P1)
*Goal: Achieve sub-minute solve times for long-range routes without compromising coastal accuracy.*

1) **[P1] Bearing-Window Pruning** ✅ **COMPLETED**
  - Expand headings only within ±60° of the great-circle bearing to the destination. This drastically cuts the search space by eliminating illogical paths.
  - *Files*: `packages/router-core/src/isochrone_router.cpp`
  - *Performance*: 3-5x speed improvement

2) **[P1] Beam Search per Time Layer** ✅ **COMPLETED**
   - At each time step, keep only the top K most promising states (e.g., K=1000) based on their score (ETA + hazard penalty). This caps the width of the search frontier, preventing exponential growth.
   - *Files*: `packages/router-core/src/isochrone_router.cpp`
   - *Performance*: Additional 2-3x speed improvement

3) **[P1] Adaptive Safety Sampling** ✅ **COMPLETED**
   - Use fine-grained sampling (~5 km) near coasts/hazards and coarse sampling (~15-20 km) in deep, open ocean. This maintains safety where critical while speeding up checks elsewhere.
   - *Files*: `packages/router-core/src/isochrone_router.cpp`
   - *Performance*: Additional 1.5-2x speed improvement with improved accuracy

4) **[P1] Two-Phase Hierarchical Routing (Coarse → Refine)** ✅ **COMPLETED**
   - The ultimate solution. First, run a very fast search on a coarse grid to define an "ocean highway" corridor. Then, run the high-accuracy solver only within this narrow corridor.
   - *Files*: `isochrone_router.cpp`, `main.cpp`, `RouterService.ts`
   - *Performance*: 20–100x speed improvement for ultra-long routes, preserves coastal accuracy when tuned (`corridorWidthNm`, fine-pass `headingCount`, and time steps).

---
### Phase 2: Responsiveness and User Experience (P2)
*Goal: Ensure the UI remains responsive during solves and provides better feedback.*

5) **[P2] Off-Main-Thread Solver**
   - Move the WASM routing call into a Web Worker to prevent the UI from freezing during long computations.
   - *Files*: `useRouter.ts`, Emscripten thread configuration

6) **[P2] Early-Exit Budget & Partial Routes**
   - Implement a time budget (e.g., 60 seconds). If the solver exceeds it, it terminates and returns the best partial route found so far.
   - *Files*: `packages/router-core/src/isochrone_router.cpp`

7) **[P2] Hazard Visualization**
   - Add a UI banner/toast when `hazardFlags > 0` in a route and color the hazardous segments on the map polyline.
   - *Files*: `apps/web/src/features/map/MapSimplified.tsx`

---
### Phase 3: Data Robustness & Final Polish (P3)
*Goal: Improve data handling, add diagnostics, and complete core quality features.*

8) **[P3] Pack-Backed Sampler in WASM**
   - Make the C++ sampler read directly from the data packs, removing the JS bridge for performance and making it the canonical source.
   - *Files*: `packages/router-core/src/main.cpp`, `RouterService.ts`

9) **[P3] Hazard-Tolerant Legs with Penalty**
   - Instead of just avoiding hazards, allow routing through moderately hazardous areas but apply a significant cost penalty.
   - *Files*: `packages/router-core/src/isochrone_router.cpp`

10) **[P3] Render Full Waypoint Chain with Tooltips**
    - For diagnostics, allow rendering the `waypointsRaw` with hover tooltips showing lat/lon/time/hazards.
    - *Files*: `apps/web/src/features/map/MapSimplified.tsx`

---
### Previously Completed Tasks
- [🟢] Waypoint/solve guards
- [🟢] Post-process route to remove zig-zags (Douglas-Peucker)
- [🟢] Dense safety sampling along legs
