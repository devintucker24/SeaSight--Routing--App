Router Polish Plan

[]1. Replace the sine-wave fallback sampler with PackLoader data by threading pack-derived fields directly into the WASM sampler construction (packages/router-core/src/main.cpp:522) and exposing a lightweight bridge for A* to query the same sampler that Isochrone receives.

[]2. Increase Isochrone leg sampling density by deriving the sample count from ~5 km spacing and forwarding each checkpoint through the existing land/depth mask helpers before acceptance (packages/router-core/src/isochrone_router.cpp:100).

[]3.Support higher-resolution or buffered land masks by allowing multiple mask tiles/resolutions, normalizing coordinates at load, and swapping the sampler to the finest available tile near coasts (packages/router-core/src/main.cpp:606 plus apps/web/src/features/route-planner/services/RouterService.ts:174 for load orchestration).

[]4. After expanding the waypoint chain, run Douglas–Peucker (or heading/distance gating) on the canonical state list before serialization to strip zig-zags and enforce minimum-leg constraints (packages/router-core/src/isochrone_router.cpp:208).

[]5. Derive both the rendered polyline and marker layers from the exact same ordered waypoint array, caching it once the solve completes so zoom-dependent resampling can’t desync them (apps/web/src/features/map/MapSimplified.tsx:185 and :214).

[]6. Emit structured diagnostics whenever a leg is rejected for land, depth, or wave limits by logging the reason and coordinates through the existing wasm→JS bindings so QA can toggle a UI overlay (packages/router-core/src/isochrone_router.cpp:120 and packages/router-core/src/main.cpp:342).

[]7.Extend the map layer to render every isochrone waypoint with hover tooltips showing lat/lon/time, rather than just endpoints, by binding the computed canonical list into the isochrone-waypoints GeoJSON source (apps/web/src/features/map/MapSimplified.tsx:198).

[]8.Surface warnings when the land mask fails to load or is stale by propagating header metadata and status into UI state (badge/toast) while keeping console logs for developers (apps/web/src/features/route-planner/services/RouterService.ts:174).
