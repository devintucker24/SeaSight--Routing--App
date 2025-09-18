# SeaSight Maritime Routing App

A professional-grade, web-first maritime route optimization application built with React, TypeScript, and WebAssembly. SeaSight combines advanced C++ routing algorithms with modern web technologies to provide offline-capable maritime navigation and route planning.

## 🌊 Overview

SeaSight is a Progressive Web App (PWA) designed for maritime professionals who need reliable, offline-capable route planning. The application features:

- **Advanced Routing Engine**: C++17 time-dependent A* algorithm compiled to WebAssembly
- **Real-time Weather Integration**: GFS, WW3, and HYCOM meteorological data
- **Interactive Map Interface**: MapLibre GL with nautical charts and maritime controls
- **Offline-First Architecture**: Works without internet connection once data is cached
- **Professional UX**: Dark maritime theme optimized for bridge environments
- **Comprehensive Testing**: Full test coverage with Vitest and React Testing Library
- **Accessibility Support**: Screen reader support and keyboard navigation
- **Performance Monitoring**: Built-in performance tracking and optimization
- **Type Safety**: Comprehensive TypeScript definitions and error handling

## 🏗️ Architecture

This is a monorepo containing multiple packages and applications:

### Applications
- **`apps/web`** - React PWA frontend application with maritime UI
- **`packages/router-core`** - C++17 router source code with time-dependent A* algorithm
- **`packages/router-wasm`** - WebAssembly build output and TypeScript bindings
- **`tools/packs-builder`** - Python tools for processing meteorological data packs
- **`tools/ci`** - Build scripts and Emscripten SDK setup

### Technology Stack
- **Frontend**: React 19, TypeScript, Vite, MapLibre GL
- **Routing Engine**: C++17 → WebAssembly (Emscripten)
- **State Management**: Custom hooks with centralized state management
- **Storage**: Dexie (IndexedDB) for offline data
- **Data Processing**: Python with NumPy, SciPy, xarray
- **Build System**: npm workspaces, CMake, Emscripten
- **Testing**: Vitest, React Testing Library, Jest DOM
- **Development**: ESLint, TypeScript strict mode, JSDoc documentation
- **Accessibility**: ARIA utilities, screen reader support, keyboard navigation
- **Performance**: Custom performance monitoring and metrics collection

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+ and npm
- **Python** 3.8+ (for data packing tools)
- **Git LFS** (for large data files)
- **Emscripten SDK** (for building router)

### First Time Setup

1. **Clone and install**
   ```bash
   git clone <repository-url>
   cd SeaSight-Routing-App
   npm run setup:emsdk
   npm run build:full
   ```

2. **Start development**
   ```bash
   npm run dev
   ```

### Daily Development

```bash
# Start development server (most common)
npm run dev

# Rebuild router after C++ changes
npm run build:router

# Clean build when things break
npm run build:clean
```

> **📖 For detailed development instructions, see [DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)**  
> **⚡ For quick commands reference, see [QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)**

## 🔧 Build System

### Available Commands

| Command | Description | When to Use |
|---------|-------------|-------------|
| `npm run dev` | Start development server | Daily development |
| `npm run build:router` | Build WASM router only | After C++ changes |
| `npm run build:clean` | Clean build + dependencies | When things break |
| `npm run build:full` | Complete clean build | First setup |
| `npm run clean` | Remove all build artifacts | Manual cleanup |
| `npm run setup:emsdk` | Install Emscripten SDK | First time only |

### When to Rebuild

- **Always**: Router C++ code changes (`packages/router-core/src/*.cpp`)
- **Sometimes**: Dependency changes, environment changes
- **Never**: Frontend-only changes (React, TypeScript, CSS)

### Troubleshooting

- **"emcmake: command not found"**: Run `source ./emsdk/emsdk_env.sh`
- **CSS import errors**: Run `npm run build:clean`
- **Router not updating**: Run `npm run build:router`

## 🆕 Recent Improvements

### Code Organization & Architecture
- **Feature-first structure**: Organized code by features (map, route-planner, vessel) for better maintainability
- **Centralized state management**: Custom hooks with `useAppState` for consistent state handling
- **Type safety**: Comprehensive TypeScript definitions in `@shared/types`
- **Configuration management**: Centralized constants and environment configuration
- **Error handling**: Custom error classes with recovery mechanisms

### Developer Experience
- **Comprehensive testing**: Full test coverage with Vitest and React Testing Library
- **JSDoc documentation**: Complete documentation for all components and utilities
- **Development utilities**: Debug logging, performance monitoring, and development helpers
- **Linting**: ESLint with TypeScript strict mode for code quality
- **Path aliases**: Clean imports with `@features/*`, `@shared/*`, `@lib/*`

### Accessibility & Performance
- **Screen reader support**: ARIA utilities and live regions for announcements
- **Keyboard navigation**: Full keyboard support for all interactions
- **Focus management**: Proper focus handling and trapping
- **Performance monitoring**: Built-in performance tracking and metrics collection
- **Memory monitoring**: Resource usage tracking and optimization

### Testing & Quality
- **Unit tests**: Comprehensive test coverage for utilities and hooks
- **Integration tests**: Component testing with React Testing Library
- **Performance tests**: Route calculation and map operation performance tracking
- **Accessibility tests**: Screen reader and keyboard navigation testing
- **Error boundary testing**: Error handling and recovery testing

### Environment Setup

The web app supports optional API keys for enhanced functionality:

```bash
cd apps/web
npm run setup
```

**Optional API Keys:**
- **MapTiler**: Enhanced map styles and tiles
- **AISStream.io**: Live vessel tracking data
- **Open-Meteo**: Weather data integration
- **Sentry**: Error tracking and monitoring

## 🗺️ Features

### Interactive Map Interface
- **Multiple Map Styles**: Dark maritime theme, OpenFreeMap Liberty
- **Nautical Charts**: OpenSeaMap overlay with depth contours and navigation aids
- **Maritime Controls**: Compass, nautical scale, coordinate display
- **Touch Support**: Full mobile and tablet compatibility
- **Responsive Design**: Adapts to various screen sizes

### Advanced Route Planning
- **Time-Dependent A* Algorithm**: Considers environmental conditions over time
- **Waypoint Management**: Click-to-add waypoints with automatic route generation
- **Safety Constraints**: Configurable wave height, heading change, and depth limits
- **Anti-meridian Handling**: Correct routing across the International Date Line
- **Fallback Routing**: Direct line routing when no viable path exists
- **Route Comparison**: Side-by-side analysis of multiple route options

### Data Integration
- **Meteorological Data**: GFS, WW3, HYCOM weather and ocean data
- **Land Masks**: Automatic avoidance of land and restricted areas
- **Depth Data**: Shallow water avoidance based on vessel draft
- **Current Data**: Ocean current integration for accurate ETA calculations

### Offline Capabilities
- **Progressive Web App**: Installable on mobile devices
- **Data Caching**: Automatic caching of weather and chart data
- **Offline Routing**: Full routing functionality without internet connection
- **Background Sync**: Updates data when connection is restored

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build            # Build all packages
npm run build:router     # Build only the router WASM
npm run test             # Run tests across all packages

# Utilities
npm run clean            # Clean all node_modules
npm run setup:emsdk      # Install Emscripten SDK
npm run install:all      # Install deps and build router
```

### Project Structure

```
apps/web/src/
├── features/                    # Feature-based modules
│   ├── map/                    # Map components and visualization
│   │   ├── MapSimplified.tsx   # Main map component
│   │   └── LayerToggles.tsx    # Layer control interface
│   ├── route-planner/          # Route planning functionality
│   │   ├── RoutePlanner.tsx    # Route planning UI
│   │   ├── hooks/
│   │   │   └── useRouter.ts    # Router integration hook
│   │   └── services/
│   │       └── RouterService.ts # WASM router service
│   └── vessel/                 # Vessel profile management
│       └── VesselProfile.tsx   # Vessel configuration UI
├── shared/                     # Shared utilities and components
│   ├── ui/                     # Reusable UI components
│   │   ├── ActionDock.tsx      # Mobile action interface
│   │   ├── SlidePanel.tsx      # Sliding panel component
│   │   └── StatusLedger.tsx    # Route status display
│   ├── hooks/                  # Shared custom hooks
│   │   └── useAppState.ts      # Centralized state management
│   ├── utils/                  # Utility functions
│   │   ├── index.ts            # General utilities
│   │   ├── errorHandling.ts    # Error handling utilities
│   │   ├── performance.ts      # Performance monitoring
│   │   └── accessibility.ts    # Accessibility utilities
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts            # Global type definitions
│   ├── constants/              # Configuration constants
│   │   └── index.ts            # App constants and defaults
│   └── config/                 # Environment configuration
│       └── env.ts              # Environment variables
├── lib/                        # External library configurations
└── __tests__/                  # Test files
    ├── setup.ts                # Test setup configuration
    ├── shared/                 # Shared utility tests
    └── features/               # Feature-specific tests

packages/
├── router-core/                # C++ router source
│   └── src/
│       ├── isochrone_router.cpp
│       ├── isochrone_router.hpp
│       └── CMakeLists.txt
└── router-wasm/                # Compiled WASM output
    ├── dist/
    │   ├── SeaSightRouter.js
    │   ├── SeaSightRouter.wasm
    │   └── SeaSightRouter.d.ts
    └── package.json

tools/
├── packs-builder/              # Data processing tools
│   ├── build_pack.py          # Main pack builder
│   ├── generate_test_data.py  # Test data generator
│   └── verify_pack.py         # Pack verification
└── ci/
    └── setup-emsdk.sh         # Emscripten setup script
```

### Building Components

#### Router (C++ → WASM)
```bash
cd packages/router-core/src
emcmake cmake .
emmake make
```

#### Web Application
```bash
cd apps/web
npm run build
```

#### Data Packs
```bash
cd tools/packs-builder
python build_pack.py --region NATL_050 --resolution 0.5
```

## 📊 Current Status

### ✅ Completed Features (v0.1.0 - v0.3.0)

- **Project Infrastructure**: React PWA with Vite, TypeScript, and modern tooling
- **Map Integration**: MapLibre GL with nautical charts and maritime controls
- **State Management**: Custom hooks with centralized state management
- **Router Engine**: C++17 time-dependent A* algorithm with WebAssembly
- **Data Processing**: Python tools for meteorological data pack creation
- **Safety Systems**: Land masks, depth constraints, and anti-meridian handling
- **UI Components**: Maritime-themed interface with glassmorphism design
- **Code Organization**: Feature-first architecture with shared utilities
- **Type Safety**: Comprehensive TypeScript definitions and error handling
- **Testing**: Full test coverage with Vitest and React Testing Library
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance**: Built-in performance monitoring and optimization
- **Documentation**: Complete JSDoc documentation for all components

### 🚧 In Development (v0.4.0 - v0.6.0)

- **Pack Loader Worker**: Secure data pack loading and verification
- **Vessel Presets**: Predefined vessel configurations with custom overrides
- **AIS Integration**: Live vessel tracking and autofill capabilities
- **ML Integration**: ONNX-based derating for weather-dependent routing
- **Enhanced UI**: Route comparison, charts, and export functionality

### 📋 Planned Features (v0.7.0 - v0.9.0)

- **Hybrid Online Mode**: Cloudflare Workers for data synchronization
- **Advanced Analytics**: Enhanced performance monitoring and error tracking
- **Pilot Features**: Documentation, EULA, and production readiness

## 🔒 Security & Privacy

### Data Protection
- **Local Storage**: All sensitive data stored locally in IndexedDB
- **No Tracking**: No user behavior tracking or analytics
- **API Keys**: Stored locally, never transmitted to third parties
- **Offline Operation**: Full functionality without internet connection

### Security Features
- **COOP/COEP Headers**: Required for WebAssembly shared memory
- **Content Security Policy**: Strict CSP for XSS protection
- **HTTPS Only**: All external API calls use secure connections
- **Input Validation**: Comprehensive validation of all user inputs

## 🌍 Maritime Compliance

### Navigation Standards
- **IMO Guidelines**: Follows International Maritime Organization standards
- **SOLAS Compliance**: Safety of Life at Sea regulations
- **COLREGS**: International Regulations for Preventing Collisions at Sea
- **ECDIS Standards**: Electronic Chart Display and Information System compatibility

### Data Sources
- **NOAA**: National Oceanic and Atmospheric Administration weather data
- **GFS**: Global Forecast System meteorological models
- **WW3**: WaveWatch III ocean wave models
- **HYCOM**: Hybrid Coordinate Ocean Model current data

## 📱 Mobile & PWA Support

### Progressive Web App Features
- **Installable**: Add to home screen on mobile devices
- **Offline Capable**: Full functionality without internet connection
- **Background Sync**: Automatic data updates when online
- **Push Notifications**: Weather alerts and route updates (planned)

### Mobile Optimization
- **Touch Controls**: Optimized for touch interaction
- **Responsive Design**: Adapts to all screen sizes
- **Performance**: Optimized for mobile hardware
- **Battery Efficiency**: Minimal battery drain during operation

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables
Set the following in your deployment platform:
```bash
VITE_MAPTILER_KEY=your_maptiler_key
VITE_AISSTREAM_TOKEN=your_aisstream_token
VITE_OPENMETEO_API_KEY=your_openmeteo_key
VITE_SENTRY_DSN=your_sentry_dsn
```

### Docker Support
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## 📚 Documentation

- **[Detailed Architecture](docs/document.md)** - Comprehensive technical overview
- **[Feature Backlog](cody-framework/.cody/project/build/feature-backlog.md)** - Development roadmap
- **[Maritime UX Guide](apps/web/MARITIME_UX.md)** - User experience documentation
- **[Security Setup](apps/web/SECURITY_SETUP.md)** - Security configuration guide

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow the coding standards**: TypeScript, ESLint, Prettier
4. **Write tests**: Ensure your changes are tested
5. **Submit a pull request**: Include a clear description of changes

### Development Guidelines
- Use the feature-first architecture for new components
- Follow TypeScript path aliases (`@features/*`, `@shared/*`)
- Keep router C++ code in `packages/router-core`
- Update documentation for new features
- Test on multiple devices and browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
1. **Check the documentation** - Most questions are answered in the docs
2. **Search existing issues** - Look for similar problems
3. **Create a new issue** - Provide detailed information about your problem
4. **Contact support** - For urgent maritime safety issues

### Troubleshooting

**Common Issues:**
- **Blank map**: Ensure waypoints are within router bounds (30–50°N, 80–60°W)
- **WASM load errors**: Verify Emscripten SDK is properly installed
- **Build failures**: Check Node.js version (18+) and npm cache
- **API errors**: Verify API keys are correctly configured

## 📚 Documentation

- **[Architecture Overview](docs/ARCHITECTURE_OVERVIEW.md)** - Detailed system architecture and design
- **[Technical Documentation](docs/document.md)** - Technical implementation details
- **[Recent Improvements](docs/RECENT_IMPROVEMENTS.md)** - Comprehensive overview of recent enhancements
- **[Maritime UX Guide](apps/web/MARITIME_UX.md)** - User experience documentation
- **[Security Setup](apps/web/SECURITY_SETUP.md)** - Security configuration guide

## 🌟 Acknowledgments

- **MapLibre GL**: Open-source mapping library
- **Emscripten**: WebAssembly compilation toolchain
- **NOAA**: Weather and oceanographic data
- **OpenStreetMap**: Open-source mapping data
- **Maritime Community**: Feedback and testing from professional mariners

---

**SeaSight** - Professional maritime routing for the modern web. ⚓🌊