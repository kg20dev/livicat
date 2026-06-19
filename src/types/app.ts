/**
 * Application Types
 */

/* ─── Settings Enums ────────────────────────────────────────────── */

export type Theme = 'dark' | 'light'
export type MessageSpacing = number
export type AnimationSpeed = 'none' | 'slow' | 'normal'
export type AnimationStyle = 'default' | 'blink' | 'glowing' | 'fade' | 'slide' | 'bounce'

/* ─── Layout Options ──────────────────────────────────────────── */

export type NameMessageLayout = 'left-right' | 'top-bottom'
export type BackgroundStyle = 'full-block' | 'inline-text'

/* ─── Chat Settings ─────────────────────────────────────────────── */

/**
 * Comprehensive chat display settings that drive the CSS generator.
 *
 * All color values are hex strings (e.g. "#ff4444").
 * All size/dimension values are in pixels (raw number, no unit suffix).
 */
export interface ChatSettings {
  /* Display toggles */
  showAvatars: boolean
  showTimestamps: boolean
  showHeader: boolean
  showScrollButton: boolean
  showEngagementMessages: boolean
  showChatDisclaimer: boolean
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
  messageInnerPadding: number
  messageBorderRadius: number
  avatarSize: number
  avatarMarginTop: number
  messageMarginBottom: number

  /* Effects */
  messageOpacity: number
  containerOpacity: number
  showGlow: boolean

  /* Scrollbar */
  scrollbarWidth: number
  scrollbarColor: string

  /* Scroll button */
  scrollButtonBackground: string
  scrollButtonColor: string
  scrollButtonBorderRadius: number
  scrollButtonOpacity: number

  /* Layout */
  nameMessageLayout: NameMessageLayout
  backgroundStyle: BackgroundStyle

  /* Other */
  messageSpacing: MessageSpacing
  theme: Theme
  animationSpeed: AnimationSpeed
  newMessageAnimation: AnimationStyle

  /* IM-style bubble settings */
  bubbleBorderWidth: number
  bubbleTailOffset: number
  bubbleMaxWidth: number
  bubblePadding: number

  /* Chroma key mode — forces background to #00b140 for OBS */
  chromaKey: boolean

  /* Preview window */
  alwaysOnTop: boolean

  /* IM-style role colors */
  ownerBg: string
  ownerText: string
  ownerUsername: string
  modBg: string
  modText: string
  modUsername: string
  memberBg: string
  memberText: string
  memberUsername: string
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
