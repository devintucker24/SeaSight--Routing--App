# SeaSight Router Developer Guide

This comprehensive guide covers the SeaSight routing system's architecture, algorithms, and configuration parameters. It's designed for developers who need to understand, tune, or extend the routing functionality.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Algorithms](#core-algorithms)
3. [Configuration Parameters](#configuration-parameters)
4. [Performance Tuning](#performance-tuning)
5. [Debugging & Diagnostics](#debugging--diagnostics)
6. [Advanced Topics](#advanced-topics)

## Architecture Overview

The SeaSight routing system consists of three main layers:

### 1. C++ Core (`packages/router-core/`)
- **Isochrone Router**: Time-dependent A* pathfinding algorithm
- **Douglas-Peucker Simplifier**: Route simplification using geodesic geometry
- **Geometric Utilities**: Great-circle calculations, cross-track distances
- **WASM Bindings**: Exposes C++ functionality to JavaScript

### 2. TypeScript Service Layer (`apps/web/src/features/route-planner/services/`)
- **RouterService**: High-level interface to WASM router
- **Route Comparison**: Tools for analyzing route performance
- **Error Handling**: Robust error management and fallbacks

### 3. React UI Layer (`apps/web/src/features/`)
- **MapSimplified**: Interactive map with route visualization
- **RoutePlanner**: User interface for route configuration
- **VesselProfile**: Ship-specific parameter management

## Core Algorithms

### Isochrone Routing Algorithm

The Isochrone router uses a time-dependent A* search algorithm that:

1. **Discretizes Space**: Creates a grid of possible vessel positions
2. **Time Steps**: Simulates vessel movement in discrete time intervals
3. **Heading Sampling**: Explores multiple possible headings at each step
4. **State Merging**: Combines similar states to reduce computational load
5. **Environmental Constraints**: Applies weather, depth, and safety limits

**Key Characteristics:**
- **Time-Optimal**: Finds the fastest route, not necessarily the shortest
- **Weather-Aware**: Considers wave height, currents, and wind
- **Safety-Constrained**: Avoids hazardous conditions and shallow water
- **Anti-Meridian Safe**: Handles routes crossing the International Date Line

### Douglas-Peucker Simplification

The route simplification process:

1. **Preserves Endpoints**: Always keeps start and destination points
2. **Cross-Track Distance**: Uses great-circle geometry for accuracy
3. **Secondary Gating**: Removes short segments and minor heading changes
4. **Dual Output**: Provides both raw and simplified routes

**Benefits:**
- **Reduced Waypoints**: Fewer points for easier navigation
- **Smoother Paths**: Eliminates unnecessary zigzags
- **Preserved Safety**: Maintains critical hazard avoidance points

## Configuration Parameters

### Router Configuration (`ROUTER_CONFIG`)

#### `GRID_RESOLUTION` (0.5 degrees)
- **Purpose**: Defines the spatial resolution of the routing grid
- **Impact on Performance**: 
  - Smaller values = Higher accuracy, slower computation
  - Larger values = Lower accuracy, faster computation
- **Recommended Values**:
  - Open ocean: 0.5-1.0 degrees
  - Coastal areas: 0.25-0.5 degrees
  - Harbor approaches: 0.1-0.25 degrees

#### `EDGE_SAMPLING_KM` (3 km)
- **Purpose**: Distance between sample points when checking edge validity
- **Impact**: 
  - Smaller values = More accurate obstacle detection, slower computation
  - Larger values = Faster computation, may miss small obstacles
- **Tuning**: Increase for open ocean, decrease for complex coastlines

#### `NOMINAL_SPEED_KTS` (12 knots)
- **Purpose**: Base speed assumption for initial path estimation
- **Impact**: Affects heuristic calculations and initial route planning
- **Tuning**: Should match typical vessel speed for the route type

### Isochrone Options (`DEFAULT_ISOCHRONE_OPTIONS`)

#### `timeStepMinutes` (30 minutes)
- **Purpose**: Duration of each simulation step
- **Impact on Performance**:
  - Smaller steps = Higher accuracy, exponentially slower computation
  - Larger steps = Lower accuracy, faster computation
- **Recommended Values**:
  - Short routes (<100nm): 15-30 minutes
  - Medium routes (100-500nm): 30-60 minutes
  - Long routes (>500nm): 60-120 minutes

#### `bearingWindowDeg` (60 degrees)
- **Purpose**: Bearing window for pruning heading exploration
- **Impact on Performance**:
  - Smaller window = Faster computation, may miss some optimal paths
  - Larger window = Slower computation, more thorough exploration
- **How it works**: Only explores headings within ±60° of great-circle bearing to goal
- **Recommended Values**:
  - Open ocean: 60-90 degrees
  - Coastal areas: 30-60 degrees
  - Harbor approaches: 15-30 degrees

#### `beamWidth` (1000 states)
- **Purpose**: Maximum number of states to keep in search frontier
- **Impact on Performance**:
  - Smaller beam = Faster computation, may miss optimal paths
  - Larger beam = Slower computation, more thorough search
- **How it works**: After each time step, keeps only the top N states by cost
- **Recommended Values**:
  - Short routes (<100nm): 500-1000 states
  - Medium routes (100-500nm): 1000-2000 states
  - Long routes (>500nm): 2000-5000 states
  - Set to 0 to disable beam search (unlimited frontier)

#### `minTimeStepMinutes` (15 minutes)
- **Purpose**: Minimum time step for adaptive sampling in complex areas
- **Impact on Performance**:
  - Smaller steps = Higher accuracy, slower computation
  - Larger steps = Lower accuracy, faster computation
- **How it works**: Used when environmental complexity is high (waves, shallow water)
- **Recommended Values**:
  - Harbor approaches: 10-15 minutes
  - Coastal areas: 15-30 minutes
  - Open ocean: 30-60 minutes

#### `maxTimeStepMinutes` (120 minutes)
- **Purpose**: Maximum time step for adaptive sampling in calm areas
- **Impact on Performance**:
  - Larger steps = Much faster computation, lower accuracy
  - Smaller steps = Slower computation, higher accuracy
- **How it works**: Used when environmental complexity is low (calm open ocean)
- **Recommended Values**:
  - Open ocean: 60-120 minutes
  - Long routes: 120-240 minutes
  - Short routes: 30-60 minutes

#### `complexityThreshold` (0.5)
- **Purpose**: Threshold for switching between min/max time steps
- **Impact on Performance**:
  - Lower threshold = More aggressive time step reduction
  - Higher threshold = Less aggressive time step reduction
- **How it works**: Environmental complexity above this value triggers smaller time steps
- **Recommended Values**:
  - Conservative: 0.3-0.4
  - Balanced: 0.5-0.6
  - Aggressive: 0.7-0.8

#### `enableAdaptiveSampling` (true)
- **Purpose**: Enable/disable adaptive time step adjustment
- **Impact on Performance**:
  - Enabled = Dynamic time steps, better performance in mixed environments
  - Disabled = Fixed time steps, consistent performance
- **How it works**: When enabled, time steps adjust based on environmental complexity
- **Recommended Values**:
  - Mixed environments: true
  - Uniform environments: false
  - Testing/debugging: false

#### `headingCount` (32)
- **Purpose**: Number of discrete headings explored at each step
- **Impact on Performance**:
  - Higher count = Smoother paths, exponentially slower computation
  - Lower count = Rougher paths, faster computation
- **Recommended Values**:
  - Open ocean: 16-32 headings
  - Coastal areas: 32-64 headings
  - Harbor approaches: 64+ headings

#### `mergeRadiusNm` (5 nm)
- **Purpose**: Radius for merging similar states in the search frontier
- **Impact on Performance**:
  - Larger radius = Faster computation, less precise paths
  - Smaller radius = Slower computation, more precise paths
- **Tuning**: Increase for long routes, decrease for short routes

#### `goalRadiusNm` (10 nm)
- **Purpose**: Acceptable distance from goal to consider route complete
- **Impact**: 
  - Larger radius = Routes may end far from actual destination
  - Smaller radius = More precise goal reaching, may fail to find routes
- **Tuning**: Match to navigation precision requirements

#### `maxHours` (240 hours)
- **Purpose**: Maximum search duration before giving up
- **Impact**: 
  - Too low = Routes may fail to complete
  - Too high = Wasted computation time
- **Tuning**: Set based on expected route duration + safety margin

### Simplification Parameters

#### `simplifyToleranceNm` (25 nm)
- **Purpose**: Douglas-Peucker simplification tolerance
- **Impact on Display**:
  - Higher values = Straighter, fewer waypoints
  - Lower values = More waypoints, follows original path more closely
- **Recommended Values**:
  - Open ocean: 20-50 nm
  - Coastal areas: 5-15 nm
  - Harbor approaches: 1-5 nm

#### `minLegNm` (4.0 nm)
- **Purpose**: Minimum segment length after simplification
- **Impact**: Removes very short segments that may be navigationally unnecessary
- **Tuning**: Adjust based on vessel maneuverability and navigation requirements

#### `minHeadingDeg` (5 degrees)
- **Purpose**: Minimum heading change to preserve a waypoint
- **Impact**: Removes waypoints with minimal course changes
- **Tuning**: Lower values preserve more waypoints, higher values create smoother routes

### Safety Configuration (`DEFAULT_SAFETY_CAPS`)

#### `maxWaveHeight` (8.0 meters)
- **Purpose**: Maximum safe wave height for the vessel
- **Impact**: Routes will avoid areas with waves exceeding this height
- **Tuning**: Based on vessel type, cargo, and crew experience

#### `maxHeadingChange` (30 degrees)
- **Purpose**: Maximum heading change per routing step
- **Impact**: Prevents sharp turns that may be unsafe or inefficient
- **Tuning**: Based on vessel maneuverability and operational requirements

#### `minWaterDepth` (15 meters)
- **Purpose**: Minimum safe water depth
- **Impact**: Routes avoid shallow areas that could ground the vessel
- **Tuning**: Vessel draft + safety buffer (typically 20-30% of draft)

## Performance Tuning

### Quick Performance Wins

1. **Enable Bearing-Window Pruning**: Set `bearingWindowDeg` to 60° for 3-5x speed improvement
2. **Enable Beam Search**: Set `beamWidth` to 1000 for 2-3x additional speed improvement
3. **Increase `timeStepMinutes`**: 30→60 minutes for 2x speed improvement
4. **Reduce `headingCount`**: 32→16 for 2x speed improvement
5. **Increase `mergeRadiusNm`**: 5→10 nm for significant speedup
6. **Adjust `maxHours`**: Set realistic limits based on route length

### Accuracy vs. Speed Trade-offs

| Parameter | Speed Impact | Accuracy Impact | Use Case |
|-----------|-------------|-----------------|----------|
| `bearingWindowDeg` | Very High | Low | All routes, major performance gain |
| `beamWidth` | High | Low | Long routes, prevents exponential growth |
| `timeStepMinutes` | High | High | Long routes, rough planning |
| `headingCount` | High | Medium | Open ocean, initial planning |
| `mergeRadiusNm` | High | Medium | Long routes, corridor planning |
| `simplifyToleranceNm` | None | Display only | UI responsiveness |

### Route-Specific Tuning

#### Open Ocean Routes (>200nm)
```typescript
{
  timeStepMinutes: 60,
  headingCount: 16,
  mergeRadiusNm: 10,
  bearingWindowDeg: 90,
  beamWidth: 2000,
  simplifyToleranceNm: 50
}
```

#### Coastal Routes (50-200nm)
```typescript
{
  timeStepMinutes: 30,
  headingCount: 32,
  mergeRadiusNm: 5,
  bearingWindowDeg: 60,
  beamWidth: 1000,
  simplifyToleranceNm: 15
}
```

#### Harbor Approaches (<50nm)
```typescript
{
  timeStepMinutes: 15,
  headingCount: 64,
  mergeRadiusNm: 2,
  bearingWindowDeg: 30,
  beamWidth: 500,
  simplifyToleranceNm: 5
}
```

## Debugging & Diagnostics

### Route Comparison Tool

The `RouterService.compareWithStraightRoute()` method provides:

- **Distance Analysis**: Isochrone vs. straight-line distance
- **Time Analysis**: Isochrone vs. straight-line time
- **Efficiency Metrics**: Percentage differences in distance and time

### Console Debugging

Enable detailed logging by checking browser console for:
- Route calculation progress
- Performance metrics
- Hazard detection
- Simplification statistics

### Common Issues & Solutions

#### Routes Taking Too Long
- **Symptom**: Computation exceeds 5 minutes
- **Solutions**: 
  - Increase `timeStepMinutes`
  - Reduce `headingCount`
  - Increase `mergeRadiusNm`
  - Reduce `maxHours`

#### Routes Too Zigzaggy
- **Symptom**: Route has many unnecessary turns
- **Solutions**:
  - Increase `simplifyToleranceNm`
  - Increase `minLegNm`
  - Increase `minHeadingDeg`

#### Routes Missing Hazards
- **Symptom**: Route goes through dangerous areas
- **Solutions**:
  - Reduce `simplifyToleranceNm`
  - Check `safetyCaps` settings
  - Verify environmental data quality

#### Routes Failing to Complete
- **Symptom**: No route found within time limit
- **Solutions**:
  - Increase `maxHours`
  - Increase `goalRadiusNm`
  - Relax `safetyCaps`
  - Check waypoint validity

## Advanced Topics

### Custom Vessel Profiles

Create vessel-specific configurations:

```typescript
const customVessel = {
  id: 'custom',
  name: 'Custom Vessel',
  type: 'cargo' as const,
  length: 180,
  beam: 28,
  draft: 10,
  maxSpeed: 16,
  safetyCaps: {
    maxWaveHeight: 6.0,  // More conservative
    maxHeadingChange: 20, // Less maneuverable
    minWaterDepth: 12,    // Shallow draft
  }
};
```

### Environmental Data Integration

The router can integrate with:
- **Wave Data**: WW3, GFS wave models
- **Current Data**: HYCOM ocean currents
- **Weather Data**: Wind, pressure, visibility
- **Bathymetry**: Depth data for shallow water avoidance

### Performance Monitoring

Track key metrics:
- **Computation Time**: Total route calculation duration
- **States Explored**: Number of search states processed
- **Memory Usage**: RAM consumption during routing
- **Convergence Rate**: How quickly the algorithm finds solutions

### Future Optimizations

Planned improvements include:
- **Hierarchical Routing**: Multi-resolution pathfinding
- **Machine Learning**: ML-guided heuristic functions
- **Parallel Processing**: Multi-threaded computation
- **Caching**: Route result caching for similar requests

---

## Quick Reference

### Essential Parameters for Tuning

| Parameter | File | Purpose | Speed Impact | Accuracy Impact |
|-----------|------|---------|-------------|-----------------|
| `timeStepMinutes` | `index.ts` | Simulation step size | High | High |
| `headingCount` | `index.ts` | Heading resolution | High | Medium |
| `mergeRadiusNm` | `index.ts` | State merging | High | Medium |
| `simplifyToleranceNm` | `index.ts` | Route simplification | None | Display only |
| `maxHours` | `index.ts` | Search time limit | Medium | Low |

### Performance Targets

- **Short Routes (<100nm)**: <30 seconds
- **Medium Routes (100-500nm)**: <2 minutes  
- **Long Routes (>500nm)**: <5 minutes
- **Ultra-Long Routes (>2000nm)**: <10 minutes

### Safety Guidelines

- Always test parameter changes with known routes
- Start with conservative safety caps
- Monitor route quality, not just speed
- Document parameter changes and their effects
- Use route comparison tools to validate improvements
