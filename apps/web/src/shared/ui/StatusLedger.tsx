import { getZIndex } from '@shared/constants/zIndex'

interface StatusLedgerProps {
  className?: string
  eta?: string
  distance?: string
  weather?: {
    temperature: string
    windSpeed: string
    waveHeight: string
    visibility: string
  }
  routeInfo?: {
    waypoints: number
    totalTime?: string
    mode?: string
  }
}

const StatusLedger = ({ className, eta, distance, weather, routeInfo }: StatusLedgerProps) => {
  return (
    <div className={`status-ledger glass-panel ${className ?? ''}`} style={{ zIndex: getZIndex('STATUS_LEDGER') }}>
      <div style={{ 
        fontSize: '14px', 
        fontWeight: '600', 
        marginBottom: '12px',
        color: 'var(--cyan-400)'
      }}>
        Status
      </div>
      
      {eta && (
        <div className="status-row">
          <span>⏱️</span>
          <span>ETA:</span>
          <span className="status-metric">{eta}</span>
        </div>
      )}
      
      {distance && (
        <div className="status-row">
          <span>📏</span>
          <span>Distance:</span>
          <span className="status-metric">{distance}</span>
        </div>
      )}
      
      {routeInfo && (
        <div className="status-row">
          <span>🧭</span>
          <span>Waypoints:</span>
          <span className="status-metric">{routeInfo.waypoints}</span>
        </div>
      )}

      {routeInfo?.mode && (
        <div className="status-row">
          <span>⚙️</span>
          <span>Mode:</span>
          <span className="status-metric">{routeInfo.mode}</span>
        </div>
      )}
      
      {routeInfo?.totalTime && (
        <div className="status-row">
          <span>⏰</span>
          <span>Duration:</span>
          <span className="status-metric">{routeInfo.totalTime}</span>
        </div>
      )}
      
      {weather && (
        <>
          <div style={{ 
            height: '1px', 
            background: 'var(--glass-border)', 
            margin: '8px 0',
            opacity: 0.5
          }} />
          
          <div style={{ 
            fontSize: '12px', 
            fontWeight: '600', 
            marginBottom: '8px',
            color: 'var(--silver-200)'
          }}>
            Weather
          </div>
          
          <div className="status-row">
            <span>🌡️</span>
            <span>Temp:</span>
            <span className="status-metric">{weather.temperature}</span>
          </div>
          
          <div className="status-row">
            <span>💨</span>
            <span>Wind:</span>
            <span className="status-metric">{weather.windSpeed}</span>
          </div>
          
          <div className="status-row">
            <span>🌊</span>
            <span>Waves:</span>
            <span className="status-metric">{weather.waveHeight}</span>
          </div>
          
          <div className="status-row">
            <span>👁️</span>
            <span>Visibility:</span>
            <span className="status-metric">{weather.visibility}</span>
          </div>
        </>
      )}
    </div>
  )
}

export default StatusLedger
