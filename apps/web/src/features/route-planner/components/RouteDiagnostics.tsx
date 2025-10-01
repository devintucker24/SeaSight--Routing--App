import type { RouteResponse } from '@shared/types';

interface RouteDiagnosticsProps {
  routeResult: RouteResponse | null;
}

export default function RouteDiagnostics({ routeResult }: RouteDiagnosticsProps) {
  if (!routeResult || !routeResult.diagnostics) {
    return null;
  }

  const { diagnostics, waypoints, mode } = routeResult;

  return (
    <div className="route-diagnostics" style={{ 
      padding: '1rem', 
      backgroundColor: '#1a2332', 
      borderRadius: '8px',
      marginTop: '1rem',
      color: '#e0e0e0'
    }}>
      <h3 style={{ marginTop: 0, color: '#4fc3f7' }}>📊 Route Analysis</h3>
      
      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: '#81c784', fontSize: '0.9rem' }}>🌊 Environmental Conditions</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>Max Wave Height:</span>
          <strong>{diagnostics.maxWaveHeightM?.toFixed(1) ?? 'N/A'} m</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>Average Speed:</span>
          <strong>{diagnostics.averageSpeedKts?.toFixed(1) ?? 'N/A'} kts</strong>
        </div>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <h4 style={{ color: '#81c784', fontSize: '0.9rem' }}>📍 Route Details</h4>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>Algorithm:</span>
          <strong>{mode}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>Waypoints:</span>
          <strong>{waypoints?.length ?? 0}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>Distance:</span>
          <strong>{diagnostics.totalDistanceNm?.toFixed(1) ?? 'N/A'} nm</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
          <span>ETA:</span>
          <strong>{diagnostics.etaHours?.toFixed(1) ?? routeResult.etaHours?.toFixed(1) ?? 'N/A'} hrs</strong>
        </div>
      </div>

      {mode === 'ISOCHRONE' && (
        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ color: '#81c784', fontSize: '0.9rem' }}>🔍 Search Statistics</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
            <span>Search Steps:</span>
            <strong>{diagnostics.stepCount ?? 'N/A'}</strong>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
            <span>Reached Goal:</span>
            <strong style={{ color: diagnostics.reachedGoal ? '#81c784' : '#e57373' }}>
              {diagnostics.reachedGoal ? '✅ Yes' : '❌ No'}
            </strong>
          </div>
          {!diagnostics.reachedGoal && (
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#ffb74d' }}>
              <span>Distance to Goal:</span>
              <strong>{diagnostics.finalDistanceToGoalNm?.toFixed(1) ?? 'N/A'} nm</strong>
            </div>
          )}
        </div>
      )}

      {diagnostics.hazardFlags && diagnostics.hazardFlags > 0 && (
        <div style={{ backgroundColor: '#5d4037', padding: '0.5rem', borderRadius: '4px', marginTop: '0.5rem' }}>
          <h4 style={{ color: '#ffb74d', fontSize: '0.9rem', marginTop: 0 }}>⚠️ Hazards Detected</h4>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Hazard Flags:</span>
            <strong>{diagnostics.hazardFlags}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
