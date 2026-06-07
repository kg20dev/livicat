import { trackEvent as aptabaseTrackEvent } from '@aptabase/tauri'

/**
 * Centralized analytics helper with consent checking and error handling
 * Uses the official Aptabase Tauri plugin for event tracking.
 * All events respect user consent and never block the UI.
 */

const CONSENT_KEY = 'livicat_analytics_consent'

/**
 * Check if user has consented to analytics
 */
export function isAnalyticsEnabled(): boolean {
  return localStorage.getItem(CONSENT_KEY) === 'true'
}

/**
 * Set analytics consent status
 */
export function setAnalyticsEnabled(enabled: boolean): void {
  localStorage.setItem(CONSENT_KEY, enabled ? 'true' : 'false')
}

/**
 * Track an analytics event if user has consented
 * @param name - Event name
 * @param props - Optional event properties
 */
export async function trackEvent(name: string, props?: Record<string, unknown>): Promise<void> {
  try {
    if (!isAnalyticsEnabled()) {
      console.log('[Analytics] Analytics disabled, skipping event:', name)
      return
    }

    console.log('[Analytics] Tracking event:', name, 'props:', props)

    // Track via the official Aptabase plugin
    await aptabaseTrackEvent(name, props as Record<string, string | number>)
    console.log('[Analytics] Event tracked successfully')
  } catch (error) {
    // Silently fail - never break the app due to analytics errors
    console.error('[Analytics] Failed to track event:', name, error)
  }
}

/**
 * Track an event without waiting for the promise (fire-and-forget)
 * Use this when you don't want to await the result
 * @param name - Event name
 * @param props - Optional event properties
 */
export function trackEventAsync(name: string, props?: Record<string, unknown>): void {
  // Fire and forget - don't await
  trackEvent(name, props).catch((error) => {
    console.error('[Analytics] Async event tracking failed:', name, error)
  })
}
