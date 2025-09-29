Excellent! Let's dive into the router improvements. Looking at the ROUTER_ROADMAP.md, I can see we have a clear Phase 1 plan with four key performance optimizations. Let me elaborate on the plan and identify exactly what I'll implement.

## Current Plan Analysis

From the ROUTER_ROADMAP.md, Phase 1 focuses on **Core Performance Overhaul** with these four tasks:

1. **[P1] Bearing-Window Pruning** - Expand headings only within ±60° of great-circle bearing
2. **[P1] Beam Search** - Limit frontier to top N states by cost
3. **[P1] Adaptive Sampling** - Dynamic time steps based on environmental complexity
4. **[P1] Two-Phase Hierarchical Routing** - Coarse grid for corridor, high-res for refinement

## Detailed Implementation Plan

### 1. Bearing-Window Pruning (Highest Impact, Lowest Risk)

**What I'll do:**
- Modify the heading expansion logic in `isochrone_router.cpp`
- Calculate the great-circle bearing from current position to destination
- Only expand headings within ±60° of that bearing
- Add a configuration parameter `bearingWindowDeg` (default 60°)
- Preserve the ability to disable this feature for debugging

**Files to modify:**
- `packages/router-core/src/isochrone_router.hpp` - Add bearing window parameter
- `packages/router-core/src/isochrone_router.cpp` - Implement bearing calculation and filtering
- `packages/router-core/src/main.cpp` - Expose parameter via WASM
- `packages/router-wasm/src/SeaSightRouter.d.ts` - Add TypeScript interface
- `apps/web/src/shared/constants/index.ts` - Add default value

**Expected impact:**
- **Performance**: 3-5x speed improvement (eliminates ~75% of heading exploration)
- **Accuracy**: Minimal impact (most eliminated paths are indeed suboptimal)
- **Risk**: Very low (easy to disable, doesn't change core algorithm)

### 2. Beam Search (High Impact, Medium Risk)

**What I'll do:**
- Add a `beamWidth` parameter to limit the frontier size
- After each time step, sort states by cost and keep only the top N
- Implement this as a configurable limit (default 1000 states)
- Add logging to track frontier size reduction

**Files to modify:**
- `packages/router-core/src/isochrone_router.hpp` - Add beam width parameter
- `packages/router-core/src/isochrone_router.cpp` - Implement beam search logic
- `packages/router-core/src/main.cpp` - Expose parameter via WASM
- `packages/router-wasm/src/SeaSightRouter.d.ts` - Add TypeScript interface
- `apps/web/src/shared/constants/index.ts` - Add default value

**Expected impact:**
- **Performance**: 2-3x speed improvement (prevents exponential frontier growth)
- **Accuracy**: Small risk of missing optimal paths (mitigated by reasonable beam width)
- **Risk**: Medium (requires careful tuning of beam width)

### 3. Adaptive Sampling (Medium Impact, Medium Risk)

**What I'll do:**
- Implement dynamic time step adjustment based on environmental complexity
- Use wave height variance and heading change frequency as complexity indicators
- Add parameters: `minTimeStepMinutes`, `maxTimeStepMinutes`, `complexityThreshold`
- Implement logic to increase time steps in calm conditions, decrease in complex areas

**Files to modify:**
- `packages/router-core/src/isochrone_router.hpp` - Add adaptive sampling parameters
- `packages/router-core/src/isochrone_router.cpp` - Implement adaptive logic
- `packages/router-core/src/main.cpp` - Expose parameters via WASM
- `packages/router-wasm/src/SeaSightRouter.d.ts` - Add TypeScript interface
- `apps/web/src/shared/constants/index.ts` - Add default values

**Expected impact:**
- **Performance**: 1.5-2x speed improvement (fewer steps in simple areas)
- **Accuracy**: Improved (more steps in complex areas)
- **Risk**: Medium (complex logic, requires testing)

### 4. Two-Phase Hierarchical Routing (High Impact, High Risk)

**What I'll do:**
- Implement a two-phase approach:
  - Phase 1: Coarse grid (1.0° resolution) to find corridor
  - Phase 2: High-resolution (0.25° resolution) within corridor
- Add parameters: `coarseGridResolution`, `corridorWidthNm`, `enableHierarchical`
- Implement corridor detection and high-res refinement logic

**Files to modify:**
- `packages/router-core/src/isochrone_router.hpp` - Add hierarchical parameters
- `packages/router-core/src/isochrone_router.cpp` - Implement two-phase logic
- `packages/router-core/src/main.cpp` - Expose parameters via WASM
- `packages/router-wasm/src/SeaSightRouter.d.ts` - Add TypeScript interface
- `apps/web/src/shared/constants/index.ts` - Add default values

**Expected impact:**
- **Performance**: 5-10x speed improvement for long routes
- **Accuracy**: Maintained or improved (more resolution where needed)
- **Risk**: High (complex implementation, requires extensive testing)

## Implementation Strategy

### Phase 1: Start with Bearing-Window Pruning
1. **Why first**: Highest impact, lowest risk, easiest to implement
2. **Implementation order**:
   - Add parameter to C++ structs
   - Implement bearing calculation function
   - Modify heading expansion logic
   - Add WASM bindings
   - Add TypeScript interfaces
   - Add UI controls
   - Test and validate

### Phase 2: Add Beam Search
1. **Why second**: High impact, builds on bearing-window success
2. **Implementation order**:
   - Add beam width parameter
   - Implement frontier sorting and limiting
   - Add logging and diagnostics
   - Test with various beam widths

### Phase 3: Implement Adaptive Sampling
1. **Why third**: Medium impact, requires more complex logic
2. **Implementation order**:
   - Add complexity calculation
   - Implement dynamic time step logic
   - Add parameters and controls
   - Test with various environmental conditions

### Phase 4: Two-Phase Hierarchical Routing
1. **Why last**: Highest impact but highest risk
2. **Implementation order**:
   - Implement coarse grid routing
   - Add corridor detection
   - Implement high-res refinement
   - Add comprehensive testing

## Testing Strategy

For each optimization:
1. **Unit tests**: Test individual functions
2. **Integration tests**: Test with known routes
3. **Performance tests**: Measure speed improvements
4. **Accuracy tests**: Compare with original algorithm
5. **Regression tests**: Ensure no functionality is broken

## Risk Mitigation

1. **Feature flags**: Each optimization can be disabled independently
2. **Fallback logic**: If optimization fails, fall back to original algorithm
3. **Extensive logging**: Track performance and accuracy metrics
4. **Gradual rollout**: Test with small routes before large ones

## Expected Overall Impact

Combined, these optimizations should achieve:
- **10-20x speed improvement** for long routes (>500nm)
- **3-5x speed improvement** for medium routes (100-500nm)
- **Maintained or improved accuracy**
- **Sub-minute computation** for routes up to 2000nm

Would you like me to proceed with implementing **Bearing-Window Pruning** first? This will give us the biggest performance win with the lowest risk, and we can build on that success for the other optimizations.