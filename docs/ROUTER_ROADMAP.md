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

5) **[P2] Off-Main-Thread Solver** ✅ **COMPLETED**
   - Move the WASM routing call into a Web Worker to prevent the UI from freezing during long computations.
   - *Files*: `useRouter.ts`, `RouterService.ts`, `router.worker.ts`, `pack.worker.ts`
   - *Note*: Single-threaded WASM build (pthread removed for web worker compatibility)

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
### Phase 4: Threading & ML Preparation (P3 - Future)
*Goal: Prepare architecture for ML batch processing without breaking current functionality.*

11) **[P3] Worker Pool Architecture for ML**
   - Implement a worker pool manager to handle parallel route calculations for ML model training.
   - Use multiple single-threaded WASM workers instead of pthread for better compatibility and isolation.
   - *Files*: `apps/web/src/workers/WorkerPool.ts`, `RouterService.ts`
   - *Benefit*: 8x parallelism on 8-core machines without pthread complexity
   - *Status*: Planned for v0.5.0 ML integration

12) **[P3] Hybrid Build System (Single + Multi-threaded)**
   - Create two build variants: single-threaded (current) and multi-threaded (future ML).
   - Single-threaded for web workers, multi-threaded for main thread batch processing.
   - *Files*: `packages/router-core/src/CMakeLists.txt`, `package.json`
   - *Benefit*: Best of both worlds - compatibility now, performance later
   - *Status*: Optional, only if worker pool insufficient

13) **[P3] ML Batch API**
   - Design API for processing 1000+ route scenarios in parallel for ML training.
   - Support both worker pool and pthread pool backends.
   - *Files*: `RouterService.ts`, `MLCoordinator.ts`
   - *Benefit*: Ready for ONNX integration in v0.5.0

---
### Architecture Decisions

**Threading Strategy:**
- **Current (v0.3.0-v0.4.0):** Single-threaded WASM in web workers ✅
  - ✅ Universal browser compatibility
  - ✅ Works reliably in worker context
  - ✅ No SharedArrayBuffer issues
  - ✅ Simple debugging and maintenance
  - ✅ Fast enough for single routes (< 1 second)

- **Future (v0.5.0+):** Worker pool for ML parallelism
  - Multiple single-threaded WASM instances
  - 4-8x parallelism without pthread complexity
  - Better isolation (crash resilience)
  - Each worker processes routes independently
  - Optional pthread build for extreme performance needs

**Why Not Pthreads Initially:**
- ❌ Pthreads don't work reliably in web worker context
- ❌ SharedArrayBuffer restrictions in workers
- ❌ Worker-in-worker spawn limitations
- ❌ Adds complexity without current benefit
- ✅ Single routes are already fast enough (< 1 second)
- ✅ Worker pool provides sufficient parallelism for ML

**When to Consider Pthreads:**
- Only if ML profiling shows worker pool insufficient
- Main thread context only (not in workers)
- Separate build variant, not default
- Requires performance benchmarking first

**Build Configuration:**
- `CMakeLists.txt` uses single-threaded flags
- Removed: `-pthread`, `-s USE_PTHREADS=1`, `-s PTHREAD_POOL_SIZE=4`
- Result: WASM loads instantly in workers without "loading-workers" dependency

---
### Previously Completed Tasks
- [🟢] Waypoint/solve guards
- [🟢] Post-process route to remove zig-zags (Douglas-Peucker)
- [🟢] Dense safety sampling along legs
- [🟢] Pthread removal for web worker compatibility
- [🟢] Worker message type fixes (ROUTER_INITIALIZED)