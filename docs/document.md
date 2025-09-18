# SeaSight Routing Application – Technical Architecture

## 🎯 Purpose & Vision

SeaSight is a web-first, offline-capable maritime route planner designed for professional mariners. It combines advanced C++ routing algorithms compiled to WebAssembly with modern web technologies to provide reliable, real-time route optimization that works even without internet connectivity.

## 🏗️ System Architecture

### High-Level Overview

SeaSight follows a modern monorepo architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                    SeaSight Monorepo                        │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React PWA)     │  Backend Services              │
│  ├── Map Interface        │  ├── Router Engine (C++/WASM)  │
│  ├── Route Planning       │  ├── Data Processing (Python)  │
│  ├── Vessel Management    │  └── ML Integration (ONNX)     │
│  └── Offline Storage      │                                │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                               │
│  ├── Meteorological Data (GFS, WW3, HYCOM)               │
│  ├── Nautical Charts (OpenSeaMap, NOAA)                  │
│  └── AIS Data (Live Vessel Tracking)                     │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

#### 1. Frontend Application (`apps/web`)
- **Technology**: React 19, TypeScript, Vite, MapLibre GL
- **Architecture**: Feature-first modular design with shared utilities
- **State Management**: Custom hooks with centralized state management
- **UI Framework**: Custom maritime-themed components with glassmorphism
- **Testing**: Comprehensive test coverage with Vitest and React Testing Library
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance**: Built-in performance monitoring and optimization

#### 2. Routing Engine (`packages/router-core` + `packages/router-wasm`)
- **Technology**: C++17 → WebAssembly (Emscripten)
- **Algorithm**: Time-dependent A* with great-circle heuristic
- **Performance**: Optimized for real-time route calculation
- **Safety**: Integrated land masks and depth constraints

#### 3. Data Processing (`tools/packs-builder`)
- **Technology**: Python with NumPy, SciPy, xarray
- **Purpose**: Process meteorological data into optimized packs
- **Output**: Compressed, signed data packs for offline use
- **Sources**: NOAA GFS, WW3, HYCOM models

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

## 🆕 Recent Improvements

### Code Organization & Architecture
- **Feature-first Structure**: Organized code by features (map, route-planner, vessel) for better maintainability
- **Shared Utilities**: Centralized utilities for common functionality across features
- **Type Safety**: Comprehensive TypeScript definitions with strict type checking
- **Configuration Management**: Centralized constants and environment configuration

### State Management
- **Custom Hooks**: Centralized state management with `useAppState` hook
- **Reactive Updates**: Efficient state updates with minimal re-renders
- **Type-safe State**: Full TypeScript support for state management
- **Error Boundaries**: Graceful error handling and recovery

### Testing & Quality
- **Comprehensive Testing**: Full test coverage with Vitest and React Testing Library
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Feature-level testing with user interactions
- **Performance Tests**: Route calculation and map operation performance tracking

### Accessibility & Performance
- **Screen Reader Support**: ARIA utilities and live regions for announcements
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Proper focus handling and trapping
- **Performance Monitoring**: Built-in performance tracking and metrics collection
- **Memory Monitoring**: Resource usage tracking and optimization

### Developer Experience
- **JSDoc Documentation**: Complete documentation for all components and utilities
- **Development Utilities**: Debug logging, performance monitoring, and development helpers
- **Linting**: ESLint with TypeScript strict mode for code quality
- **Path Aliases**: Clean imports with `@features/*`, `@shared/*`, `@lib/*`

## Roadmap
- M3: PackLoader Worker, inputs, dual routes, persistence.
- M4: ML derating integration; WebGL backend; batch inference.
- M5: Compare table, staleness, exports, enhanced accessibility.
- M6: Hybrid online mode via Cloudflare Workers.

## Troubleshooting
- Blank map or floaty routes: ensure waypoints are within bounds (30–50, -80–-60). The app now guards out-of-bounds clicks and falls back to a straight line when A* has no solution.
- WASM load: verify `src/wasm/SeaSightRouter.js/.wasm` are served and `vite.config.ts` has `assetsInclude: ['**/*.wasm']`.
