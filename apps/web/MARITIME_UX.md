# SeaSight Maritime UX Features

## 🗺️ Enhanced Map Interface

### Multiple Map Providers
- **MapTiler Dark**: Professional dark maritime theme
- **MapTiler Satellite**: High-resolution satellite imagery
- **OpenStreetMap**: Open-source street map data
- **OpenSeaMap**: Nautical charts with depth contours and navigation aids

### Maritime Controls
- **Compass**: Visual compass with pitch visualization
- **Nautical Scale**: Distance measurements in nautical miles
- **Coordinates Display**: Real-time longitude/latitude display
- **Fullscreen Control**: Maximize map view

### Interactive Features
- **Click to Place Waypoints**: Click anywhere on the map to add route points
- **Real-time Coordinates**: Mouse position updates in real-time
- **Map Style Switching**: Toggle between different map providers
- **OpenSeaMap Overlay**: Toggle nautical charts on/off

## 🧭 Route Planning

### Waypoint Management
- **Visual Waypoint List**: See all waypoints with coordinates
- **Add/Remove Waypoints**: Click map to add, click × to remove
- **Waypoint Naming**: Automatic naming (Waypoint 1, 2, 3...)
- **Departure Time**: UTC datetime picker for route planning

### Route Actions
- **Plan Route**: Calculate optimal route between waypoints
- **Clear All**: Remove all waypoints and start over
- **Route Validation**: Requires minimum 2 waypoints to plan

## 🚢 Vessel Profile

### Ship Type Presets
- **Cargo Vessel**: 200m × 32m, 12m draft, 14 kts
- **Tanker**: 250m × 44m, 15m draft, 12 kts  
- **Yacht**: 50m × 10m, 3m draft, 20 kts

### Maritime Parameters
- **Length**: Overall vessel length in meters
- **Beam**: Maximum vessel width in meters
- **Draft**: Depth below waterline in meters
- **Freeboard**: Height above waterline in meters
- **Service Speed**: Normal operating speed in knots

## 🎨 Dark Maritime Theme

### Visual Design
- **High Contrast**: Dark backgrounds with bright text for readability
- **Maritime Colors**: Blues, grays, and whites for nautical feel
- **Glassmorphism**: Backdrop blur effects for modern UI
- **Smooth Animations**: Hover effects and transitions

### Accessibility
- **Keyboard Navigation**: Full keyboard support
- **High Contrast**: Meets WCAG accessibility standards
- **Large Touch Targets**: Mobile-friendly button sizes
- **Screen Reader Support**: Proper ARIA labels and structure

## 🛠️ Technical Features

### State Management
- **React Hooks**: useState for component state
- **Props Interface**: TypeScript interfaces for type safety
- **Event Handling**: Click events and form interactions

### Map Integration
- **MapLibre GL**: High-performance WebGL mapping
- **Layer Management**: Dynamic layer toggling
- **Coordinate Systems**: WGS84 longitude/latitude
- **Nautical Units**: All measurements in maritime units

### Performance
- **Efficient Rendering**: Minimal re-renders
- **Smooth Interactions**: 60fps animations
- **Memory Management**: Proper cleanup of map instances
- **Responsive Design**: Works on desktop and mobile

## 🚀 Usage

1. **Select Map Style**: Use the style buttons (🌙 🛰️ 🗺️ 🌊) to switch map providers
2. **Toggle Charts**: Click "🌊 Charts ON/OFF" to show/hide OpenSeaMap nautical charts
3. **Add Waypoints**: Click anywhere on the map to add route waypoints
4. **Set Departure Time**: Use the datetime picker to set route departure time
5. **Select Vessel**: Choose your ship type from the vessel profile dropdown
6. **Plan Route**: Click "Plan Route" to calculate the optimal maritime route

## 🔧 Configuration

### Environment Variables
- `VITE_MAPTILER_KEY`: Your MapTiler API key for enhanced map styles

### Map Styles
- Default fallback to OpenStreetMap if no API key provided
- OpenSeaMap always available as overlay
- All styles support nautical units and maritime controls

## 📱 Mobile Support

- **Touch Controls**: Full touch support for mobile devices
- **Responsive Panels**: UI panels adapt to screen size
- **Gesture Support**: Pinch to zoom, drag to pan
- **Mobile Optimized**: Touch-friendly button sizes and spacing
