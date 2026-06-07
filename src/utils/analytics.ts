import { invoke } from '@tauri-apps/api/core'

/**
 * Centralized analytics helper with consent checking and error handling
 * All events respect user consent and never block the UI
 */

/**
 * Track an analytics event if user has consented
 * @param name - Event name
 * @param props - Optional event properties
 */
export async function trackEvent(name: string, props?: Record<string, unknown>): Promise<void> {
  try {
    // Check if analytics is enabled
    const enabled = await invoke<boolean>('is_analytics_enabled')
    if (!enabled) {
      return
    }

    // Track the event
    await invoke('track_event', {
      name,
      props: props || {},
    })
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
