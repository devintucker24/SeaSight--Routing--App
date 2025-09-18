import { useState } from 'react'
import { getZIndex } from '@shared/constants/zIndex'

interface LayerToggle {
  id: string
  icon: string
  label: string
  active: boolean
  onToggle: (id: string) => void
}

interface LayerTogglesProps {
  layers: LayerToggle[]
  className?: string
}

const LayerToggles = ({ layers, className }: LayerTogglesProps) => {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null)

  return (
    <div className={`layer-toggles ${className || ''}`} style={{ zIndex: getZIndex('LAYER_TOGGLES') }}>
      {layers.map((layer) => (
        <div key={layer.id} style={{ position: 'relative' }}>
          <button
            className={`layer-toggle-btn ${layer.active ? 'active' : ''}`}
            onClick={() => layer.onToggle(layer.id)}
            onMouseEnter={() => setHoveredLayer(layer.id)}
            onMouseLeave={() => setHoveredLayer(null)}
            style={{
              background: layer.active 
                ? 'rgba(27, 228, 242, 0.15)' 
                : 'rgba(2, 11, 26, 0.45)',
              borderColor: layer.active 
                ? 'rgba(73, 242, 255, 0.5)' 
                : 'var(--glass-border)',
              boxShadow: layer.active ? 'var(--glow)' : 'none'
            }}
          >
            <span style={{ fontSize: '18px' }}>{layer.icon}</span>
          </button>
          
          {/* Tooltip */}
          {hoveredLayer === layer.id && (
            <div
              style={{
                position: 'absolute',
                right: '52px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'rgba(2, 11, 26, 0.9)',
                color: 'var(--white)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                border: '1px solid var(--glass-border)',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                zIndex: 1001
              }}
            >
              {layer.label}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default LayerToggles
