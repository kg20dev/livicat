/**
 * Application Types
 */

/* ─── Settings Enums ────────────────────────────────────────────── */

export type Theme = 'dark' | 'light'
export type MessageSpacing = 'compact' | 'normal' | 'comfortable'
export type AnimationSpeed = 'none' | 'slow' | 'normal'

/* ─── Chat Settings ─────────────────────────────────────────────── */

/**
 * Comprehensive chat display settings that drive the CSS generator.
 *
 * All color values are hex strings (e.g. "#d6baff").
 * All size/dimension values are in pixels (raw number, no unit suffix).
 */
export interface ChatSettings {
  /* Display toggles */
  showAvatars: boolean
  showTimestamps: boolean
  autoScroll: boolean
  maxMessages: number

  /* Colors */
  backgroundColor: string
  messageBackgroundColor: string
  usernameColor: string
  messageColor: string
  timestampColor: string
  accentColor: string

  /* Typography */
  fontFamily: string
  messageFontSize: number
  usernameFontSize: number
  timestampFontSize: number
  usernameFontWeight: string

  /* Spacing */
  messagePadding: number
  messageBorderRadius: number
  avatarSize: number

  /* Effects */
  messageOpacity: number
  containerOpacity: number
  showGlow: boolean

  /* Scrollbar */
  scrollbarWidth: number
  scrollbarColor: string

  /* Other */
  messageSpacing: MessageSpacing
  theme: Theme
  animationSpeed: AnimationSpeed
}

/* ─── Preset ────────────────────────────────────────────────────── */

export interface Preset {
  name: string
  label: string
  description: string
  settings: Partial<ChatSettings>
}

/* ─── Stream Info ───────────────────────────────────────────────── */

export interface StreamInfo {
  streamId: string
  channelName: string
  title: string
  isLive: boolean
  viewerCount?: number
}
