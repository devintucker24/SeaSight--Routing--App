import { useState } from 'react'
import { getZIndex } from '@shared/constants/zIndex'

/**
 * Props for the SlidePanel component
 */
interface SlidePanelProps {
  /** Which side the panel slides from */
  side: 'left' | 'right'
  /** Content to display inside the panel */
  children: React.ReactNode
  /** Icon to display on the tab */
  tabIcon: string
  /** Label to display on the tab */
  tabLabel: string
  /** Callback when panel open state changes */
  onOpenChange?: (isOpen: boolean) => void
}

/**
 * SlidePanel - Animated sliding panel component
 * 
 * A reusable panel component that slides in from the left or right side
 * of the screen. Includes a tab for toggling visibility and smooth animations.
 * 
 * @param side - Which side the panel slides from ('left' or 'right')
 * @param children - Content to display inside the panel
 * @param tabIcon - Icon to display on the tab
 * @param tabLabel - Label to display on the tab
 * @param onOpenChange - Callback when panel open state changes
 * @returns JSX element containing the sliding panel
 */
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
          zIndex: getZIndex('SLIDE_PANELS') + 1,
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
          zIndex: getZIndex('SLIDE_PANELS'),
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
