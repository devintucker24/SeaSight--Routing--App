# SeaSight Maritime Routing App

A web-first, offline-capable Progressive Web App (PWA) for professional-grade maritime route optimization.

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Environment Variables
```bash
# Interactive setup (recommended)
npm run setup

# Or manually create .env file
cp env.example .env
# Edit .env with your API keys
```

### 3. Start Development Server
```bash
npm run dev
```

## 🔐 API Keys Setup

### Required for Full Functionality

| Service | Purpose | Free Tier | Get Key |
|---------|---------|-----------|---------|
| **AISStream.io** | Live AIS vessel data | 100 requests/day | [Get Key](https://aisstream.io/) |
| **Open-Meteo** | Weather data | 10k requests/day | [Get Key](https://open-meteo.com/) |
| **Cloudflare** | Production backend | Free tier available | [Get Keys](https://dash.cloudflare.com/) |
| **Sentry** | Error tracking | 5k errors/month | [Get DSN](https://sentry.io/) |

### Minimal Setup (Basic Functionality)
No API key is strictly required for basic map functionality, as OpenFreeMap is used by default.

## 🗺️ Features

### Enhanced Map Interface
- **Multiple Map Providers**: OpenFreeMap Liberty (default), OpenStreetMap, OpenSeaMap
- **Nautical Charts**: OpenSeaMap overlay with depth contours
- **Maritime Controls**: Compass, nautical scale, coordinates
- **Interactive Waypoints**: Click to add route points

### Route Planning
- **Waypoint Management**: Click-to-add waypoints within router grid bounds (30–50°N, 80–60°W)
- **A***: Time-dependent A* in WASM with great-circle heuristic (12 kts)
- **Edge Sampling**: Geodesic sampling every 3 km; mask/cap rejection
- **Anti-meridian**: Correct continuity across ±180°
- **Fallback**: Direct line between waypoints if a path cannot be found
- **Route Actions**: Plan route, clear waypoints

### Dark Maritime Theme
- **High Contrast**: Dark backgrounds with bright text
- **Maritime Colors**: Blues, grays, and whites
- **Glassmorphism**: Modern UI with backdrop blur effects
- **Accessibility**: Keyboard navigation and screen reader support

## 🛠️ Development

### Available Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
npm run setup        # Interactive environment setup
```

### Project Structure
app/
├── src/
│ ├── components/
│ │ ├── Map.tsx # Enhanced map + routing visualization and bounds guard
│ │ ├── RoutePlanner.tsx # Route planning interface
│ │ └── VesselProfile.tsx # Vessel configuration
│ ├── App.tsx # Main application component
│ ├── App.css # Maritime theme styles
│ └── index.css # Global styles
├── .env # Environment variables (create from env.example)
├── env.example # Environment template
├── setup-env.cjs # Interactive setup script
└── SECURITY_SETUP.md # Detailed security guide


## 🔒 Security

### Environment Variables
- Never commit `.env` files to version control
- Use different keys for development/staging/production
- Rotate API keys regularly
- Monitor usage through provider dashboards

### .gitignore
The project includes proper `.gitignore` rules to exclude:
- `.env` files
- API keys and secrets
- Build artifacts
- Editor files

## 🌊 Maritime Features

### Map Providers
1. **OpenFreeMap Liberty**: Default free base map
2. **OpenStreetMap**: Open-source street map data
3. **OpenSeaMap**: Nautical charts with depth contours

### Vessel Profiles
- **Cargo Vessel**: 200m × 32m, 12m draft, 14 kts
- **Tanker**: 250m × 44m, 15m draft, 12 kts
- **Yacht**: 50m × 10m, 3m draft, 20 kts

### Route Planning
- Click anywhere on the map to add waypoints
- Set departure time in UTC
- Plan optimal maritime routes
- Compare multiple route options

## 📱 Mobile Support

- **Touch Controls**: Full touch support for mobile devices
- **Responsive Design**: UI adapts to screen size
- **PWA Ready**: Installable as a web app
- **Offline Capable**: Works without internet connection

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Environment Variables for Production
Set the following environment variables in your deployment platform:
- `VITE_AISSTREAM_TOKEN`
- `VITE_OPENMETEO_API_KEY`
- `VITE_CF_ACCOUNT_ID`
- `VITE_CF_API_TOKEN`
- `VITE_SENTRY_DSN`

## 📚 Documentation

- [Maritime UX Features](MARITIME_UX.md) - Detailed UX documentation
- [Security Setup Guide](SECURITY_SETUP.md) - Comprehensive security guide
- [Environment Template](env.example) - Environment variables template
- [Detailed App Overview](../docs/document.md) - Architecture and routing pipeline

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is part of the SeaSight Maritime Routing System.

## 🆘 Support

For issues and questions:
1. Check the documentation
2. Verify your API keys
3. Test with minimal configuration first
4. Contact support if issues persist