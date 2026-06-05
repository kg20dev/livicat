import { FC } from 'react'

interface SettingsPanelProps {
  className?: string
}

export const SettingsPanel: FC<SettingsPanelProps> = ({ className = '' }) => {
  return (
    <div className={`settings-panel ${className}`}>
      <div className="settings-header">
        <h2>Settings</h2>
      </div>
      <div className="settings-content">
        <p className="text-gray-400">Configuration options will appear here...</p>
      </div>
    </div>
  )
}

export default SettingsPanel
