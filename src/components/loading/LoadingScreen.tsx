import { useEffect, useState } from 'react'
import './LoadingScreen.css'

interface LoadingScreenProps {
  onComplete: () => void
  minDuration?: number // Minimum display time in ms (default: 2000)
}

/**
 * Loading screen with animated Livicat icon
 * Shows on app launch for professional branding experience
 */
export default function LoadingScreen({ onComplete, minDuration = 2000 }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    console.log('[LoadingScreen] Starting timer for', minDuration, 'ms')
    // Show for at least minDuration, then fade out
    const timer = setTimeout(() => {
      console.log('[LoadingScreen] Timer done, starting fade out')
      setIsVisible(false)
      // Wait for fade transition (300ms) before calling onComplete
      setTimeout(() => {
        console.log('[LoadingScreen] Fade complete, calling onComplete')
        onComplete()
      }, 300)
    }, minDuration)

    return () => {
      console.log('[LoadingScreen] Cleanup - clearing timer')
      clearTimeout(timer)
    }
  }, [minDuration]) // Removed onComplete from deps to avoid re-running on every render

  return (
    <div className={`loading-screen ${isVisible ? 'visible' : 'hidden'}`}>
      <div className="loading-content">
        <div className="icon-wrapper">
          <img src="/livicat-icon.png" alt="Livicat" className="livicat-icon" />
        </div>
        <h1 className="livicat-title">Livicat</h1>
      </div>
    </div>
  )
}
