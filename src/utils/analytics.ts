import { invoke } from '@tauri-apps/api/core'

/**
 * Centralized analytics helper with consent checking and error handling
 * Uses the official Aptabase Tauri plugin for event tracking.
 * All events respect user consent and never block the UI.
 *
 * Note: Using official tauri-plugin-aptabase v1.0.0 with direct Rust invoke calls
 * - We bypass the @aptabase/tauri JS package due to IPC compatibility issues with Tauri v2
 * - Instead, we call plugin:aptabase|track_event directly via Tauri's invoke()
 * - Events flushed on app exit via flush_events_blocking()
 * - Batching and automatic flushing handled by plugin
 * - Session IDs are generated per app launch (timeout after 4 hours)
 * - User IDs can be included for cross-session tracking (see getUserId())
 */

const CONSENT_KEY = 'livicat_analytics_consent'
const USER_ID_KEY = 'livicat_user_id'

/**
 * Get or generate a persistent user ID for cross-session tracking
 * This ID persists across app restarts and links sessions to the same user
 */
export function getUserId(): string {
  let userId = localStorage.getItem(USER_ID_KEY)

  if (!userId) {
    // Generate a new user ID (timestamp + random)
    userId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`
    localStorage.setItem(USER_ID_KEY, userId)
    console.log('[Analytics] Generated new user ID:', userId)
  }

  return userId
}

/**
 * Set a custom user ID (for advanced use cases like account systems)
 */
export function setUserId(userId: string): void {
  localStorage.setItem(USER_ID_KEY, userId)
  console.log('[Analytics] Set custom user ID:', userId)
}

/**
 * Clear the user ID (for testing or privacy)
 */
export function clearUserId(): void {
  localStorage.removeItem(USER_ID_KEY)
  console.log('[Analytics] User ID cleared')
}

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
  console.log('[Analytics] Consent changed:', enabled ? 'enabled' : 'disabled')
}

/**
 * Track an analytics event if user has consented
 * @param name - Event name
 * @param props - Optional event properties
 * @param includeUserId - Whether to include persistent user ID (default: true)
 */
export async function trackEvent(
  name: string,
  props?: Record<string, unknown>,
  includeUserId: boolean = true
): Promise<void> {
  const timestamp = new Date().toISOString()
  const eventId = Math.random().toString(36).substring(2, 9)

  try {
    if (!isAnalyticsEnabled()) {
      console.log(`[Analytics] ${timestamp} [${eventId}] SKIPPED (disabled): ${name}`, props ?? '')
      return
    }

    // Include user ID for cross-session tracking
    const propsWithUser = includeUserId
      ? { ...props, user_id: getUserId() }
      : props

    console.log(`[Analytics] ${timestamp} [${eventId}] SENDING: ${name}`, propsWithUser ?? '')
    console.log(`[Analytics] ${timestamp} [${eventId}] PAYLOAD:`, JSON.stringify({ name, props: propsWithUser, timestamp }))

    // Track via the official Aptabase plugin (direct Rust invoke, bypassing JS package)
    await invoke('plugin:aptabase|track_event', {
      name,
      props: propsWithUser ?? {}
    })

    console.log(`[Analytics] ${timestamp} [${eventId}] SUCCESS: ${name}`)
  } catch (error) {
    // Silently fail - never break the app due to analytics errors
    console.error(`[Analytics] ${timestamp} [${eventId}] FAILED: ${name}`, error)
  }
}

/**
 * Track an event without waiting for the promise (fire-and-forget)
 * Use this when you don't want to await the result
 * @param name - Event name
 * @param props - Optional event properties
 * @param includeUserId - Whether to include persistent user ID (default: true)
 */
export function trackEventAsync(
  name: string,
  props?: Record<string, unknown>,
  includeUserId: boolean = true
): void {
  // Fire and forget - don't await
  trackEvent(name, props, includeUserId).catch((error) => {
    const timestamp = new Date().toISOString()
    const eventId = Math.random().toString(36).substring(2, 9)
    console.error(`[Analytics] ${timestamp} [${eventId}] ASYNC FAILED: ${name}`, error)
  })
}
