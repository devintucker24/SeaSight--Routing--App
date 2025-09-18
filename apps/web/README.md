# SeaSight Web Application

A professional-grade maritime routing Progressive Web App built with React, TypeScript, and WebAssembly. This is the frontend application for the SeaSight Maritime Routing System.

## 🌊 Overview

The SeaSight web application provides an intuitive, maritime-optimized interface for professional route planning. Built with modern web technologies, it offers offline-capable navigation tools with real-time weather integration and advanced routing algorithms.

## ✨ Features

### 🗺️ Interactive Map Interface
- **MapLibre GL Integration**: High-performance vector maps with custom maritime styling
- **Multiple Map Styles**: Dark maritime theme and OpenFreeMap Liberty
- **Nautical Charts**: OpenSeaMap overlay with depth contours and navigation aids
- **Maritime Controls**: Compass, nautical scale, coordinate display
- **Touch Support**: Full mobile and tablet compatibility
- **Responsive Design**: Adapts to various screen sizes and orientations

### 🧭 Advanced Route Planning
- **Time-Dependent A* Algorithm**: C++ routing engine compiled to WebAssembly
- **Interactive Waypoints**: Click-to-add waypoints with automatic route generation
- **Safety Constraints**: Configurable wave height, heading change, and depth limits
- **Anti-meridian Handling**: Correct routing across the International Date Line
- **Fallback Routing**: Direct line routing when no viable path exists
- **Real-time Updates**: Live route recalculation as conditions change

### 🚢 Vessel Management
- **Vessel Profiles**: Predefined configurations for different ship types
- **Custom Settings**: Override default parameters for specific vessels
- **Safety Caps**: Vessel-specific safety constraints and limitations
- **AIS Integration**: Live vessel tracking and autofill capabilities (planned)

### 📊 Data Integration
- **Meteorological Data**: GFS, WW3, HYCOM weather and ocean data
- **Land Masks**: Automatic avoidance of land and restricted areas
- **Depth Data**: Shallow water avoidance based on vessel draft
- **Current Data**: Ocean current integration for accurate ETA calculations

### 📱 Progressive Web App
- **Offline Capable**: Full functionality without internet connection
- **Installable**: Add to home screen on mobile devices
- **Background Sync**: Automatic data updates when connection is restored
- **Push Notifications**: Weather alerts and route updates (planned)

### 🧪 Testing & Quality
- **Comprehensive Testing**: Full test coverage with Vitest and React Testing Library
- **Unit Tests**: Individual component and utility testing
- **Integration Tests**: Feature-level testing with user interactions
- **Performance Tests**: Route calculation and map operation performance tracking
- **Accessibility Tests**: Screen reader and keyboard navigation testing

### ♿ Accessibility & Performance
- **Screen Reader Support**: ARIA utilities and live regions for announcements
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Proper focus handling and trapping
- **Performance Monitoring**: Built-in performance tracking and metrics collection
- **Memory Monitoring**: Resource usage tracking and optimization

### 🛠️ Developer Experience
- **Type Safety**: Comprehensive TypeScript definitions with strict type checking
- **JSDoc Documentation**: Complete documentation for all components and utilities
- **Development Utilities**: Debug logging, performance monitoring, and development helpers
- **Linting**: ESLint with TypeScript strict mode for code quality
- **Path Aliases**: Clean imports with `@features/*`, `@shared/*`, `@lib/*`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git LFS (for large data files)
- Emscripten SDK (for building router)

### First Time Setup

1. **From project root, set up everything:**
   ```bash
   npm run setup:emsdk
   npm run build:full
   ```

2. **Start development:**
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

> **📖 For detailed development instructions, see [DEVELOPER_GUIDE.md](../../docs/DEVELOPER_GUIDE.md)**

### Environment Setup

The application supports optional API keys for enhanced functionality:

```bash
# Interactive setup (recommended)
npm run setup

# Or manually create .env file
cp env.example .env
# Edit .env with your API keys
```

**Optional API Keys:**
- **MapTiler**: Enhanced map styles and tiles
- **AISStream.io**: Live vessel tracking data
- **Open-Meteo**: Weather data integration
- **Sentry**: Error tracking and monitoring

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
npm run setup        # Interactive environment setup
```

### Project Structure

```
src/
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
├── __tests__/                  # Test files
│   ├── setup.ts                # Test setup configuration
│   ├── shared/                 # Shared utility tests
│   └── features/               # Feature-specific tests
├── App.tsx                     # Main application component
├── App.css                     # Maritime theme styles
└── main.tsx                    # Application entry point
```

### Technology Stack

- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tool and dev server
- **MapLibre GL**: Open-source mapping library
- **Zustand**: Lightweight state management
- **Dexie**: IndexedDB wrapper for offline storage
- **Sentry**: Error tracking and monitoring

## 🎨 UI/UX Design

### Maritime Theme
- **Dark Color Scheme**: Optimized for bridge environments
- **High Contrast**: Excellent readability in various lighting conditions
- **Glassmorphism**: Modern UI with backdrop blur effects
- **Maritime Colors**: Blues, grays, and whites for professional appearance

### Component Architecture
- **Feature-First**: Components organized by business functionality
- **Reusable UI**: Shared components in `@shared/ui`
- **Type Safety**: Full TypeScript coverage
- **Accessibility**: Keyboard navigation and screen reader support

### Responsive Design
- **Mobile First**: Optimized for touch interaction
- **Tablet Support**: Enhanced interface for larger screens
- **Desktop**: Full-featured interface for professional use
- **PWA**: Installable on all platforms

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# MapTiler API Key (for enhanced map styles)
VITE_MAPTILER_KEY=your_maptiler_key

# AISStream.io API Key (for live AIS vessel data)
VITE_AISSTREAM_TOKEN=your_aisstream_token

# Open-Meteo API Key (for weather data)
VITE_OPENMETEO_API_KEY=your_openmeteo_key

# Cloudflare Workers (for production backend)
VITE_CF_ACCOUNT_ID=your_cf_account_id
VITE_CF_API_TOKEN=your_cf_api_token

# Sentry DSN (for error tracking)
VITE_SENTRY_DSN=your_sentry_dsn
```

### Build Configuration

The application uses Vite with custom configuration:

```typescript
// vite.config.ts
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // PWA configuration
    })
  ],
  resolve: {
    alias: {
      '@features': resolve(__dirname, './src/features'),
      '@shared': resolve(__dirname, './src/shared'),
      '@lib': resolve(__dirname, './src/lib')
    }
  },
  // Additional configuration
});
```

## 🧪 Testing

### Test Structure
- **Unit Tests**: Component and hook testing
- **Integration Tests**: Feature workflow testing
- **E2E Tests**: Complete user journey testing

### Running Tests
```bash
npm run test              # Run all tests
npm run test:unit         # Run unit tests only
npm run test:integration  # Run integration tests
npm run test:e2e          # Run end-to-end tests
```

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Static Hosting**: Vercel, Netlify, GitHub Pages
- **CDN**: Cloudflare, AWS CloudFront
- **Docker**: Containerized deployment
- **Kubernetes**: Scalable container orchestration

### Performance Optimization
- **Code Splitting**: Automatic code splitting by route
- **Tree Shaking**: Remove unused code
- **Asset Optimization**: Compressed images and fonts
- **Caching**: Aggressive caching for offline capability

## 🔒 Security

### Data Protection
- **Local Storage Only**: No cloud storage of sensitive data
- **API Key Security**: Keys stored locally, never transmitted
- **HTTPS Only**: All external API calls use secure connections
- **CSP Headers**: Content Security Policy for XSS protection

### Privacy
- **No Tracking**: No user behavior tracking
- **Optional Analytics**: Opt-in error reporting only
- **Data Minimization**: Only collect necessary data
- **User Control**: Full control over data and settings

## 📱 Mobile Support

### Progressive Web App Features
- **Installable**: Add to home screen on mobile devices
- **Offline Capable**: Full functionality without internet
- **Background Sync**: Automatic data updates when online
- **Push Notifications**: Weather alerts and updates (planned)

### Mobile Optimization
- **Touch Controls**: Optimized for touch interaction
- **Responsive Design**: Adapts to all screen sizes
- **Performance**: Optimized for mobile hardware
- **Battery Efficiency**: Minimal battery drain

## 🌊 Maritime Features

### Navigation Standards
- **IMO Guidelines**: International Maritime Organization standards
- **SOLAS Compliance**: Safety of Life at Sea regulations
- **COLREGS**: Collision avoidance regulations
- **ECDIS Standards**: Electronic Chart Display compatibility

### Data Sources
- **NOAA**: National Oceanic and Atmospheric Administration
- **GFS**: Global Forecast System meteorological data
- **WW3**: WaveWatch III ocean wave models
- **HYCOM**: Hybrid Coordinate Ocean Model current data

## 🆘 Troubleshooting

### Common Issues

**Blank Map Display**
- Ensure waypoints are within router bounds (30–50°N, 80–60°W)
- Check browser console for WebGL errors
- Verify MapLibre GL is properly loaded

**WASM Load Errors**
- Ensure Emscripten SDK is properly installed
- Check browser compatibility (Chrome, Firefox, Safari)
- Verify COOP/COEP headers are set

**Build Failures**
- Check Node.js version (18+ required)
- Clear npm cache: `npm cache clean --force`
- Delete node_modules and reinstall

**API Errors**
- Verify API keys are correctly configured
- Check network connectivity
- Review browser console for error messages

### Getting Help
1. Check the documentation
2. Search existing issues
3. Create a new issue with detailed information
4. Contact support for urgent issues

## 📚 Documentation

- **[Main README](../../README.md)** - Project overview and setup
- **[Technical Architecture](../../docs/document.md)** - Detailed technical documentation
- **[Feature Backlog](../../cody-framework/.cody/project/build/feature-backlog.md)** - Development roadmap
- **[Maritime UX Guide](MARITIME_UX.md)** - User experience documentation
- **[Security Setup](SECURITY_SETUP.md)** - Security configuration guide

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Follow coding standards**: TypeScript, ESLint, Prettier
4. **Write tests**: Ensure your changes are tested
5. **Submit a pull request**: Include a clear description

### Development Guidelines
- Use the feature-first architecture for new components
- Follow TypeScript path aliases (`@features/*`, `@shared/*`)
- Update documentation for new features
- Test on multiple devices and browsers

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](../../LICENSE) file for details.

---

**SeaSight Web App** - Professional maritime routing for the modern web. ⚓🌊