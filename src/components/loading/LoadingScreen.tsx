import { useEffect, useState, useRef } from 'react'
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
  // Store onComplete in a ref so the timer effect can always call the latest version
  // without needing it in the dependency array (which would reset the timer on every render)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    console.log('[LoadingScreen] Starting timer for', minDuration, 'ms')
    // Show for at least minDuration, then fade out
    const timer = setTimeout(() => {
      console.log('[LoadingScreen] Timer done, starting fade out')
      setIsVisible(false)
      // Wait for fade transition (300ms) before calling onComplete
      setTimeout(() => {
        console.log('[LoadingScreen] Fade complete, calling onComplete')
        onCompleteRef.current()
      }, 300)
    }, minDuration)

    return () => {
      console.log('[LoadingScreen] Cleanup - clearing timer')
      clearTimeout(timer)
    }
  }, [minDuration])

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
