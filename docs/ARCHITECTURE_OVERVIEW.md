# SeaSight Architecture Overview

## 🏗️ System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SeaSight Maritime Routing App                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────┐    ┌─────────────────────────────────────┐ │
│  │         Frontend Layer          │    │         Backend Services            │ │
│  │                                 │    │                                     │ │
│  │  ┌─────────────────────────────┐│    │  ┌─────────────────────────────────┐│ │
│  │  │     React PWA (apps/web)    ││    │  │   Router Engine (C++/WASM)      ││ │
│  │  │                             ││    │  │                                 ││ │
│  │  │  ┌─────────────────────────┐││    │  │  ┌─────────────────────────────┐││ │
│  │  │  │    Map Interface        │││    │  │  │   Time-dependent A*          │││ │
│  │  │  │  • MapLibre GL          │││    │  │  │   • Grid-based navigation   │││ │
│  │  │  │  • Nautical charts      │││    │  │  │   • Great circle heuristic  │││ │
│  │  │  │  • Maritime controls    │││    │  │  │   • Safety constraints      │││ │
│  │  │  └─────────────────────────┘││    │  │  └─────────────────────────────┘││ │
│  │  │                             ││    │  │                                 ││ │
│  │  │  ┌─────────────────────────┐││    │  │  ┌─────────────────────────────┐││ │
│  │  │  │   Route Planning        │││    │  │  │   Edge Sampling             │││ │
│  │  │  │  • Waypoint management  │││    │  │  │   • Geodesic sampling       │││ │
│  │  │  │  • Real-time routing    │││    │  │  │   • 3km intervals           │││ │
│  │  │  │  • Safety constraints   │││    │  │  │   • Mask validation         │││ │
│  │  │  └─────────────────────────┘││    │  │  └─────────────────────────────┘││ │
│  │  │                             ││    │  │                                 ││ │
│  │  │  ┌─────────────────────────┐││    │  │  ┌─────────────────────────────┐││ │
│  │  │  │   Vessel Management     │││    │  │  │   Anti-meridian Handling    │││ │
│  │  │  │  • Vessel profiles      │││    │  │  │   • Longitude normalization │││ │
│  │  │  │  • Safety caps          │││    │  │  │   • Cross-date-line routing │││ │
│  │  │  │  • AIS integration      │││    │  │  │   • Continuity preservation │││ │
│  │  │  └─────────────────────────┘││    │  │  └─────────────────────────────┘││ │
│  │  └─────────────────────────────┘│    │  └─────────────────────────────────┘│ │
│  │                                 │    │                                     │ │
│  │  ┌─────────────────────────────┐│    │  ┌─────────────────────────────────┐│ │
│  │  │     State Management        ││    │  │   Data Processing (Python)      ││ │
│  │  │                             ││    │  │                                 ││ │
│  │  │  • Zustand (reactive)       ││    │  │  • Meteorological data packs    ││ │
│  │  │  • Dexie (persistence)      ││    │  │  • GFS/WW3/HYCOM processing     ││ │
│  │  │  • IndexedDB storage        ││    │  │  • Land mask generation         ││ │
│  │  │  • Offline synchronization  ││    │  │  • Data compression & signing   ││ │
│  │  └─────────────────────────────┘│    │  └─────────────────────────────────┘│ │
│  └─────────────────────────────────┘    └─────────────────────────────────────┘ │
│                                                                                 │
├─────────────────────────────────────────────────────────────────────────────────┤
│                              Data Layer                                        │
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │  Weather Data   │  │  Ocean Data     │  │  Chart Data     │  │  AIS Data   │ │
│  │                 │  │                 │  │                 │  │             │ │
│  │  • GFS Models   │  │  • HYCOM        │  │  • OpenSeaMap   │  │  • Live     │ │
│  │  • WW3 Waves    │  │  • Currents     │  │  • NOAA Charts  │  │  • Vessels  │ │
│  │  • Wind/Weather │  │  • Temperature  │  │  • Depth Data   │  │  • Tracking │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Data Flow

### 1. Route Planning Flow
```
User Input → Waypoint Selection → Router Service → WASM Router → Route Calculation → Map Display
     ↓              ↓                    ↓              ↓              ↓              ↓
  Click Map    Validate Bounds      Initialize    A* Algorithm    Safety Check    Visualize
```

### 2. Data Processing Flow
```
Raw Data → Python Tools → Data Packs → Compression → Signing → Storage → Loading
    ↓           ↓            ↓           ↓          ↓         ↓         ↓
  NOAA      Processing    Structured   zstd      Ed25519   IndexedDB  WASM
```

### 3. Offline Synchronization
```
Online Mode → Data Download → Local Storage → Offline Mode → Background Sync → Update
     ↓             ↓              ↓             ↓              ↓           ↓
  API Calls    Pack Loading    IndexedDB    Full Access    Auto Update  Refresh
```

## 🧩 Component Architecture

### Frontend Components
```
App.tsx
├── MapSimplified (Map Interface)
│   ├── MapLibre GL Integration
│   ├── Waypoint Management
│   └── Route Visualization
├── RoutePlanner (Route Planning)
│   ├── Waypoint Input
│   ├── Route Controls
│   └── Results Display
├── VesselProfile (Vessel Management)
│   ├── Vessel Selection
│   ├── Safety Settings
│   └── AIS Integration
└── Shared UI Components
    ├── SlidePanel
    ├── ActionDock
    └── StatusLedger
```

### Backend Services
```
Router Service
├── WASM Module Loading
├── Grid Coordinate Conversion
├── Safety Constraint Application
└── Route Calculation

Data Service
├── Pack Loading
├── Data Verification
├── Offline Storage
└── Background Sync
```

## 🔧 Technology Stack

### Frontend Technologies
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **MapLibre GL**: Open-source mapping library
- **Zustand**: Lightweight state management
- **Dexie**: IndexedDB wrapper for offline storage

### Backend Technologies
- **C++17**: High-performance routing algorithm
- **WebAssembly**: Cross-platform execution
- **Emscripten**: C++ to WASM compilation
- **Python**: Data processing and pack creation
- **NumPy/SciPy**: Scientific computing
- **xarray**: NetCDF data handling

### Data Technologies
- **IndexedDB**: Client-side database
- **zstd**: Data compression
- **Ed25519**: Digital signatures
- **NetCDF**: Meteorological data format
- **GeoJSON**: Geographic data format

## 🚀 Performance Characteristics

### Routing Performance
- **Algorithm**: Time-dependent A* with O(b^d) complexity
- **Grid Resolution**: 0.5° (approximately 30km at equator)
- **Edge Sampling**: 3km intervals for accuracy
- **Typical Route**: 100-500 waypoints in <1 second

### Memory Usage
- **WASM Module**: ~2MB compressed
- **Data Packs**: ~50MB per region
- **IndexedDB**: ~200MB for full dataset
- **Browser Memory**: ~100MB during operation

### Network Requirements
- **Initial Load**: ~5MB (compressed)
- **Data Packs**: ~50MB per region
- **Updates**: ~1MB per day
- **Offline Capable**: Full functionality without internet

## 🔒 Security Architecture

### Data Protection
- **Local Storage Only**: No cloud storage of sensitive data
- **Encrypted Storage**: Sensitive data encrypted at rest
- **API Key Security**: Keys stored locally, never transmitted
- **HTTPS Only**: All external API calls use secure connections

### WebAssembly Security
- **Memory Isolation**: WASM runs in isolated memory space
- **No Direct Memory Access**: JavaScript cannot directly access WASM memory
- **Buffer Validation**: All data passed to WASM is validated
- **COOP/COEP Headers**: Required for shared memory with WASM

### Privacy Protection
- **No Tracking**: No user behavior tracking
- **Optional Analytics**: Opt-in error reporting only
- **Data Minimization**: Only collect necessary data
- **User Control**: Full control over data and settings

## 📱 Platform Support

### Web Browsers
- **Chrome**: 90+ (full support)
- **Firefox**: 88+ (full support)
- **Safari**: 14+ (full support)
- **Edge**: 90+ (full support)

### Mobile Platforms
- **iOS**: 14+ (PWA support)
- **Android**: 8+ (PWA support)
- **Touch Support**: Full touch interaction
- **Responsive Design**: Adapts to all screen sizes

### Desktop Platforms
- **Windows**: 10+ (Chrome, Firefox, Edge)
- **macOS**: 10.15+ (Safari, Chrome, Firefox)
- **Linux**: Ubuntu 18.04+ (Chrome, Firefox)

## 🌊 Maritime Compliance

### Navigation Standards
- **IMO Guidelines**: International Maritime Organization standards
- **SOLAS Compliance**: Safety of Life at Sea regulations
- **COLREGS**: Collision avoidance regulations
- **ECDIS Standards**: Electronic Chart Display compatibility

### Data Accuracy
- **NOAA Standards**: National Oceanic and Atmospheric Administration data
- **WMO Guidelines**: World Meteorological Organization standards
- **IHO Standards**: International Hydrographic Organization charts

### Safety Features
- **Land Avoidance**: Automatic avoidance of land areas
- **Depth Constraints**: Vessel-specific depth requirements
- **Weather Integration**: Real-time weather data integration
- **Emergency Fallback**: Direct routing when no viable path exists

## 🆕 Recent Architecture Improvements

### Code Organization & Structure
- **Feature-first Architecture**: Organized code by features (map, route-planner, vessel) for better maintainability
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

## 🚧 Future Architecture

### Machine Learning Integration (v0.5.0)
- **ONNX Runtime**: Cross-platform ML inference
- **Derating Models**: Weather-dependent speed adjustments
- **Batch Processing**: Efficient processing of multiple routes
- **WebGL Backend**: GPU-accelerated inference

### Hybrid Online Mode (v0.7.0)
- **Cloudflare Workers**: Edge computing for data synchronization
- **Real-time Updates**: Live weather and AIS data
- **Offline Fallback**: Graceful degradation when offline
- **Background Sync**: Automatic data updates

### Advanced Features (v0.8.0+)
- **Multi-vessel Planning**: Fleet management capabilities
- **Route Optimization**: Multi-objective optimization
- **Predictive Analytics**: Weather forecasting integration
- **Collaborative Planning**: Multi-user route planning

---

This architecture overview provides a comprehensive understanding of the SeaSight system design, implementation details, and future roadmap. For specific implementation details, refer to the source code and inline documentation.
