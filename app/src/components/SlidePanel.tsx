import { useState } from 'react'

interface SlidePanelProps {
  side: 'left' | 'right'
  children: React.ReactNode
  tabIcon: string
  tabLabel: string
  onOpenChange?: (isOpen: boolean) => void
}

const SlidePanel = ({ side, children, tabIcon, tabLabel, onOpenChange }: SlidePanelProps) => {
  const [isOpen, setIsOpen] = useState(false)

  const handleToggle = () => {
    const newState = !isOpen
    setIsOpen(newState)
    if (onOpenChange) {
      onOpenChange(newState)
    }
  }

  return (
    <>
      {/* Tab Handle */}
      <button
        className={`slide-tab ${side}`}
        onClick={handleToggle}
        title={tabLabel}
        style={{
          zIndex: 1001,
          background: isOpen ? 'rgba(27, 228, 242, 0.2)' : 'rgba(27, 228, 242, 0.12)',
          borderColor: isOpen ? 'rgba(73, 242, 255, 0.6)' : 'rgba(27, 228, 242, 0.4)',
          boxShadow: isOpen ? 'var(--glow)' : 'none'
        }}
      >
        <span style={{ fontSize: '14px' }}>{tabIcon}</span>
      </button>

      {/* Panel */}
      <div 
        className={`slide-panel ${side} ${isOpen ? 'open' : ''} glass-panel`}
        style={{ 
          zIndex: 1000,
          transition: 'left 0.3s ease, right 0.3s ease'
        }}
      >
        <div className="slide-panel-content">
          {children}
        </div>
      </div>
    </>
  )
}

export default SlidePanel
