import { useState, useEffect } from 'react'
import { isAnalyticsEnabled, setAnalyticsEnabled, trackEventAsync } from '../../utils/analytics'
import './Settings.css'

/**
 * Settings panel with analytics toggle
 */
export default function Settings() {
  const [analyticsEnabled, setAnalyticsEnabledState] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load current analytics consent status from localStorage
    setAnalyticsEnabledState(isAnalyticsEnabled())
    setIsLoading(false)
  }, [])

  const handleToggle = () => {
    const newValue = !analyticsEnabled
    setAnalyticsEnabledState(newValue)
    setAnalyticsEnabled(newValue)

    // Track the toggle event
    if (newValue) {
      trackEventAsync('analytics_enabled_in_settings')
    }
  }

  return (
    <div className="settings-container">
      <div className="settings-header">
        <h2 className="settings-title">Settings</h2>
      </div>

      <div className="settings-content">
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 5V10L13 13"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="settings-section-title">Privacy & Analytics</h3>
          </div>

          <div className="settings-item">
            <div className="settings-item-content">
              <div className="settings-item-header">
                <label htmlFor="analytics-toggle" className="settings-item-label">
                  Anonymous Analytics
                </label>
                <div className={`toggle-switch ${analyticsEnabled ? 'active' : ''}`}>
                  <input
                    id="analytics-toggle"
                    type="checkbox"
                    checked={analyticsEnabled}
                    onChange={handleToggle}
                    disabled={isLoading}
                  />
                  <span className="toggle-slider"></span>
                </div>
              </div>
              <p className="settings-item-description">
                Help improve Livicat with anonymous usage data.{' '}
                <a
                  href="https://github.com/kg20dev/livicat#privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="settings-link"
                >
                  Learn more
                </a>
              </p>
            </div>
          </div>
        </div>

        <div className="settings-section">
          <div className="settings-section-header">
            <div className="settings-section-icon">
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M10 18C14.4183 18 18 14.4183 18 10C18 5.58172 14.4183 2 10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18Z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 6V10H14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="settings-section-title">About</h3>
          </div>

          <div className="settings-item">
            <div className="settings-item-content">
              <div className="settings-item-header">
                <span className="settings-item-label">Version</span>
              </div>
              <p className="settings-item-description">
                Livicat v0.6.1 — YouTube Live Chat editor for OBS
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
