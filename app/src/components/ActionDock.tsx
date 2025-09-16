interface ActionDockProps {
  onMenuClick: () => void
  onCenterMap: () => void
  onConfirmRoute: () => void
  onClearRoute: () => void
  hasRoute: boolean
  isCalculating: boolean
}

const ActionDock = ({ 
  onMenuClick, 
  onCenterMap, 
  onConfirmRoute, 
  onClearRoute, 
  hasRoute,
  isCalculating 
}: ActionDockProps) => {
  return (
    <div className="action-dock glass-panel" style={{ zIndex: 1000 }}>
      <button
        className="dock-btn"
        onClick={onMenuClick}
        title="Menu"
      >
        <span style={{ fontSize: '18px' }}>☰</span>
      </button>
      
      <button
        className="dock-btn"
        onClick={onCenterMap}
        title="Center Map"
      >
        <span style={{ fontSize: '18px' }}>🎯</span>
      </button>
      
      <button
        className={`dock-btn ${hasRoute ? 'active' : ''}`}
        onClick={onConfirmRoute}
        disabled={!hasRoute || isCalculating}
        title={isCalculating ? "Calculating..." : "Confirm Route"}
        style={{
          opacity: (!hasRoute || isCalculating) ? 0.5 : 1,
          cursor: (!hasRoute || isCalculating) ? 'not-allowed' : 'pointer'
        }}
      >
        <span style={{ fontSize: '18px' }}>
          {isCalculating ? '⏳' : '✅'}
        </span>
      </button>
      
      <button
        className="dock-btn"
        onClick={onClearRoute}
        disabled={!hasRoute}
        title="Clear Route"
        style={{
          opacity: !hasRoute ? 0.5 : 1,
          cursor: !hasRoute ? 'not-allowed' : 'pointer'
        }}
      >
        <span style={{ fontSize: '18px' }}>🗑️</span>
      </button>
    </div>
  )
}

export default ActionDock
