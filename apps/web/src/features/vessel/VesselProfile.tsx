import { useState } from 'react'

/**
 * Vessel profile interface for maritime routing
 */
interface VesselProfile {
  /** Unique identifier for the vessel profile */
  id: string
  /** Display name of the vessel */
  name: string
  /** Type of vessel (cargo, tanker, yacht, etc.) */
  type: string
  /** Length in meters */
  length: number
  /** Beam (width) in meters */
  beam: number
  /** Draft (depth) in meters */
  draft: number
  /** Freeboard height in meters */
  freeboard: number
  /** Service speed in knots */
  serviceSpeed: number
}

/**
 * VesselProfile - Component for managing vessel profiles
 * 
 * Provides a user interface for selecting and configuring vessel profiles
 * that affect routing calculations. Includes predefined profiles for common
 * vessel types and allows customization of vessel parameters.
 * 
 * @returns JSX element containing the vessel profile interface
 */
const VesselProfile = () => {
  const [profiles] = useState<VesselProfile[]>([
    {
      id: 'cargo-default',
      name: 'Cargo Vessel',
      type: 'cargo',
      length: 200,
      beam: 32,
      draft: 12,
      freeboard: 8,
      serviceSpeed: 14
    },
    {
      id: 'tanker-default',
      name: 'Tanker',
      type: 'tanker',
      length: 250,
      beam: 44,
      draft: 15,
      freeboard: 10,
      serviceSpeed: 12
    },
    {
      id: 'yacht-default',
      name: 'Yacht',
      type: 'yacht',
      length: 50,
      beam: 10,
      draft: 3,
      freeboard: 2,
      serviceSpeed: 20
    }
  ])

  const [selectedProfile, setSelectedProfile] = useState<VesselProfile>(profiles[0])

  return (
    <div style={{
      color: 'var(--white)',
      padding: '0',
      minWidth: '250px'
    }}>
      <h3 style={{ 
        margin: '0 0 16px 0', 
        fontSize: '16px', 
        fontWeight: '600',
        color: 'var(--cyan-400)'
      }}>
        🚢 Vessel Profile
      </h3>
      
      {/* Profile Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ 
          display: 'block', 
          fontSize: '12px', 
          marginBottom: '4px',
          color: 'var(--silver-200)',
          fontWeight: '500'
        }}>
          Ship Type
        </label>
        <select
          value={selectedProfile.id}
          onChange={(e) => {
            const profile = profiles.find(p => p.id === e.target.value)
            if (profile) setSelectedProfile(profile)
          }}
          style={{
            width: '100%',
            padding: '8px 12px',
            backgroundColor: 'rgba(2, 11, 26, 0.6)',
            color: 'var(--white)',
            border: '1px solid var(--glass-border)',
            borderRadius: '6px',
            fontSize: '12px',
            backdropFilter: 'blur(4px)'
          }}
        >
          {profiles.map(profile => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>

      {/* Vessel Details */}
      <div style={{ fontSize: '11px' }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          padding: '4px 0',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ color: 'var(--silver-200)' }}>Length:</span>
          <span style={{ color: 'var(--cyan-400)', fontWeight: '600' }}>{selectedProfile.length}m</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          padding: '4px 0',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ color: 'var(--silver-200)' }}>Beam:</span>
          <span style={{ color: 'var(--cyan-400)', fontWeight: '600' }}>{selectedProfile.beam}m</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          padding: '4px 0',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ color: 'var(--silver-200)' }}>Draft:</span>
          <span style={{ color: 'var(--cyan-400)', fontWeight: '600' }}>{selectedProfile.draft}m</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          marginBottom: '6px',
          padding: '4px 0',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <span style={{ color: 'var(--silver-200)' }}>Freeboard:</span>
          <span style={{ color: 'var(--cyan-400)', fontWeight: '600' }}>{selectedProfile.freeboard}m</span>
        </div>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          padding: '4px 0'
        }}>
          <span style={{ color: 'var(--silver-200)' }}>Speed:</span>
          <span style={{ color: 'var(--cyan-400)', fontWeight: '600' }}>{selectedProfile.serviceSpeed} kts</span>
        </div>
      </div>
    </div>
  )
}

export default VesselProfile
