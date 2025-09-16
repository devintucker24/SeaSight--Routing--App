import { useState } from 'react'

interface VesselProfile {
  id: string
  name: string
  type: string
  length: number
  beam: number
  draft: number
  freeboard: number
  serviceSpeed: number
}

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
      position: 'absolute',
      top: '10px',
      right: '200px',
      zIndex: 1000,
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '16px',
      borderRadius: '8px',
      minWidth: '250px',
      backdropFilter: 'blur(8px)'
    }}>
      <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600' }}>
        🚢 Vessel Profile
      </h3>
      
      {/* Profile Selector */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', marginBottom: '4px' }}>
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
            padding: '6px 8px',
            backgroundColor: '#374151',
            color: 'white',
            border: '1px solid #4b5563',
            borderRadius: '4px',
            fontSize: '12px'
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
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Length:</span>
          <span>{selectedProfile.length}m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Beam:</span>
          <span>{selectedProfile.beam}m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Draft:</span>
          <span>{selectedProfile.draft}m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span>Freeboard:</span>
          <span>{selectedProfile.freeboard}m</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Speed:</span>
          <span>{selectedProfile.serviceSpeed} kts</span>
        </div>
      </div>
    </div>
  )
}

export default VesselProfile
