# SeaSight Routing Application – Detailed Overview

## Purpose
SeaSight is a web-first, offline-capable maritime route planner. It combines a C++17 routing core compiled to WebAssembly (WASM), meteorological/oceanographic data “packs”, and a browser UI built with React + Vite.

## Architecture
- App (React + Vite): MapLibre GL UI, waypoint input, route visuals, workers planned for pack loading and ML.
- Router (C++17 → WASM): Time-dependent A* over grid nodes (i,j,t) with great-circle heuristic; geodesic edge sampling; safety checks; anti‑meridian continuity; Embind interface.
- Data Packs (planned/available via Python tools): NOAA GFS/WW3/HYCOM regridded to 0.5°, masks for land/shallow/restricted.
- ML (next milestone M4): ONNX derating model via onnxruntime‑web to adjust edge effective speeds.

## Current Routing Pipeline (M2 complete)
1. Grid definition: bounds 30–50°N, 80–60°W; spacing 0.5°.
2. A* search: open/closed sets on (i,j,t); heuristic uses great‑circle distance at 12 kts.
3. Edge sampling: geodesic points ~3 km apart between neighbor cells; reject if masks/caps violated.
4. Anti‑meridian: longitude normalization to [-180,180) and shortest‑path continuity across ±180°.
5. Embind API: `RouterWrapper` exposes create/solve/utility methods to JS; ES module output with MODULARIZE.
6. App integration: `RouterService` loads WASM, `useRouter` hook provides initialize/solve helpers, `Map.tsx` renders waypoints and route.

## Map Integration Notes
- Waypoints are only accepted inside the router grid bounds to avoid invalid indices.
- If A* returns <2 points (no viable path), the app falls back to a straight line between the selected waypoints.
- Visualization uses GeoJSON sources: `waypoints` (circle layer) and `route` (line layer).

## Where ML Fits (M4)
- onnxruntime‑web in a Web Worker.
- Batch edges (e.g., 1024) and evaluate derating features per edge (sea state, encounter angle, vessel profile).
- Replace constant 12 kts with `v_eff_kts` from ML; A* then optimizes using ML-informed travel time.

## Developer Guide
- Build router: `cd router && source ../emsdk/emsdk_env.sh && emcmake cmake -S . -B build && cmake --build build -j`
- App dev: `cd app && npm i && npm run dev`
- WASM artifacts are under `app/src/wasm/` and loaded as ES modules by Vite; `.wasm` is included via `assetsInclude`.

## Safety & Constraints
- Example caps: max wave height 4 m, max heading change 30°, min depth 15 m (placeholders until pack data).
- Masks/caps are stubbed for now; integration with real pack data comes with workers in M3.

## Roadmap
- M3: PackLoader Worker, inputs, dual routes, persistence.
- M4: ML derating integration; WebGL backend; batch inference.
- M5: Compare table, staleness, exports, accessibility.
- M6: Hybrid online mode via Cloudflare Workers.

## Troubleshooting
- Blank map or floaty routes: ensure waypoints are within bounds (30–50, -80–-60). The app now guards out-of-bounds clicks and falls back to a straight line when A* has no solution.
- WASM load: verify `src/wasm/SeaSightRouter.js/.wasm` are served and `vite.config.ts` has `assetsInclude: ['**/*.wasm']`.
