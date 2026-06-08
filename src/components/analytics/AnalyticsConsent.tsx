import { useState } from 'react'
import { setAnalyticsEnabled, trackEventAsync } from '../../utils/analytics'
import './AnalyticsConsent.css'

interface AnalyticsConsentProps {
  onDecision: (allowed: boolean) => void
}

/**
 * Privacy-first analytics consent modal
 * Non-blocking, clear messaging, user choice persists
 */
export default function AnalyticsConsent({ onDecision }: AnalyticsConsentProps) {
  const [isClosing, setIsClosing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleAllow = async () => {
    setIsSaving(true)
    try {
      setAnalyticsEnabled(true)
      trackEventAsync('analytics_consent_given', { decision: 'allowed' })
      setIsClosing(true)
      setTimeout(() => onDecision(true), 300)
    } catch (error) {
      console.error('Failed to enable analytics:', error)
      setIsSaving(false)
    }
  }

  const handleDecline = async () => {
    setIsSaving(true)
    try {
      setAnalyticsEnabled(false)
      setIsClosing(true)
      setTimeout(() => onDecision(false), 300)
    } catch (error) {
      console.error('Failed to disable analytics:', error)
      setIsSaving(false)
    }
  }

  const handleDismiss = () => {
    setIsClosing(true)
    setTimeout(() => onDecision(false), 300)
  }

  return (
    <>
      <div className={`consent-backdrop ${isClosing ? 'closing' : ''}`} />
      <div className={`consent-modal ${isClosing ? 'closing' : ''}`}>
        <button className="consent-close" onClick={handleDismiss} aria-label="Close">
          ✕
        </button>

        <div className="consent-content">
          <h2 className="consent-title">Help Improve Livicat</h2>

          <p className="consent-description">
            We'd like to collect <strong>anonymous usage data</strong> to help us improve Livicat.
          </p>

          <div className="consent-section">
            <h3 className="consent-section-title">We collect:</h3>
            <ul className="consent-list consent-list-collect">
              <li>
                <span className="consent-icon">✓</span>
                How you use features (e.g., which tools you use most)
              </li>
              <li>
                <span className="consent-icon">✓</span>
                Performance metrics
              </li>
              <li>
                <span className="consent-icon">✓</span>
                Your platform and app version
              </li>
            </ul>
          </div>

          <div className="consent-section">
            <h3 className="consent-section-title">We NEVER collect:</h3>
            <ul className="consent-list consent-list-never">
              <li>
                <span className="consent-icon consent-icon-cross">✗</span>
                Personal information (name, email, etc.)
              </li>
              <li>
                <span className="consent-icon consent-icon-cross">✗</span>
                YouTube URLs or video content
              </li>
              <li>
                <span className="consent-icon consent-icon-cross">✗</span>
                Your custom CSS or chat data
              </li>
            </ul>
          </div>

          <p className="consent-note">
            You can change this anytime in Settings.{' '}
            <a
              href="https://github.com/kg20dev/livicat#privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="consent-link"
            >
              Privacy Policy
            </a>
          </p>

          <div className="consent-actions">
            <button
              className="consent-btn consent-btn-primary"
              onClick={handleAllow}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Allow Analytics'}
            </button>
            <button
              className="consent-btn consent-btn-secondary"
              onClick={handleDecline}
              disabled={isSaving}
            >
              Decline
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
