import { useState, useCallback } from 'react'
import type { ChatSettings, Preset } from '../types'
import type { ChatCSSSettings } from '../utils/cssGenerator'
import { generateChatCSS } from '../utils/cssGenerator'

/* ─── Storage Key ───────────────────────────────────────────────── */

const STORAGE_KEY = 'livicat_chat_settings'

/* ─── Defaults ──────────────────────────────────────────────────── */

export const DEFAULT_SETTINGS: ChatSettings = {
  /* Display toggles */
  showAvatars: true,
  showTimestamps: true,
  autoScroll: true,
  maxMessages: 100,

  /* Colors */
  backgroundColor: '#0a0a0a',
  messageBackgroundColor: '#1a1a1a',
  usernameColor: '#d6baff',
  messageColor: '#e5e2e1',
  timestampColor: '#888888',
  accentColor: '#ab73ff',

  /* Typography */
  fontFamily: 'Inter, sans-serif',
  messageFontSize: 14,
  usernameFontSize: 13,
  timestampFontSize: 11,
  usernameFontWeight: '600',

  /* Spacing */
  messagePadding: 8,
  messageBorderRadius: 6,
  avatarSize: 24,

  /* Effects */
  messageOpacity: 100,
  containerOpacity: 100,
  showGlow: false,

  /* Scrollbar */
  scrollbarWidth: 4,
  scrollbarColor: '#444444',

  /* Other */
  messageSpacing: 'normal',
  theme: 'dark',
  animationSpeed: 'normal',
}

/* ─── Presets ───────────────────────────────────────────────────── */

export const PRESETS: Preset[] = [
  {
    name: 'default',
    label: 'Default',
    description: 'Balanced dark theme with purple accents',
    settings: {},
  },
  {
    name: 'minimal',
    label: 'Minimal',
    description: 'Clean, no avatars or timestamps',
    settings: {
      showAvatars: false,
      showTimestamps: false,
      messageFontSize: 13,
      usernameFontSize: 12,
      messageSpacing: 'compact',
      messageOpacity: 95,
      animationSpeed: 'none',
    },
  },
  {
    name: 'compact',
    label: 'Compact',
    description: 'Smaller text with more messages visible',
    settings: {
      showTimestamps: false,
      maxMessages: 150,
      messageFontSize: 12,
      usernameFontSize: 11,
      timestampFontSize: 10,
      messagePadding: 6,
      avatarSize: 20,
      messageSpacing: 'compact',
    },
  },
  {
    name: 'large',
    label: 'Large',
    description: 'Big text for easy reading on stream',
    settings: {
      maxMessages: 50,
      messageFontSize: 20,
      usernameFontSize: 18,
      timestampFontSize: 14,
      messagePadding: 12,
      avatarSize: 32,
      messageSpacing: 'comfortable',
      animationSpeed: 'slow',
    },
  },
  {
    name: 'stream',
    label: 'Stream',
    description: 'Semi-transparent for overlaying on gameplay',
    settings: {
      backgroundColor: '#000000',
      messageBackgroundColor: 'rgba(0, 0, 0, 0.6)',
      containerOpacity: 80,
      messageOpacity: 90,
      messageFontSize: 16,
      showGlow: true,
    },
  },
  {
    name: 'neon',
    label: 'Neon',
    description: 'Vibrant neon colors with glow effects',
    settings: {
      backgroundColor: '#0d0d0d',
      messageBackgroundColor: '#1a0033',
      usernameColor: '#00ffcc',
      messageColor: '#ffffff',
      timestampColor: '#666666',
      accentColor: '#ff00ff',
      messageBorderRadius: 12,
      showGlow: true,
      messageOpacity: 95,
      scrollbarColor: '#ff00ff',
    },
  },
  {
    name: 'light',
    label: 'Light',
    description: 'Clean light theme for daytime streams',
    settings: {
      backgroundColor: '#f5f5f5',
      messageBackgroundColor: '#ffffff',
      usernameColor: '#6200ea',
      messageColor: '#1a1a1a',
      timestampColor: '#999999',
      accentColor: '#6200ea',
      theme: 'light',
      scrollbarColor: '#cccccc',
    },
  },
  {
    name: 'retro',
    label: 'Retro',
    description: 'CRT-inspired green-on-black terminal vibe',
    settings: {
      backgroundColor: '#0a0a0a',
      messageBackgroundColor: '#000000',
      usernameColor: '#00ff41',
      messageColor: '#00cc33',
      timestampColor: '#005500',
      accentColor: '#00ff41',
      fontFamily: '"Courier New", monospace',
      usernameFontWeight: '700',
      messageBorderRadius: 0,
      showGlow: true,
    },
  },
]

/* ─── Load / Save ───────────────────────────────────────────────── */

function loadSettings(): ChatSettings {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      return { ...DEFAULT_SETTINGS, ...parsed }
    }
  } catch {
    // Storage unavailable or corrupted
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: ChatSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or unavailable
  }
}

/* ─── Settings ↔ CSS Generator Converter ───────────────────────── */

/**
 * Convert user-friendly ChatSettings to the CSS generator format.
 */
export function settingsToCSSSettings(settings: ChatSettings): ChatCSSSettings {
  return {
    general: {
      backgroundColor: settings.backgroundColor || undefined,
      fontFamily: settings.fontFamily || undefined,
    },
    container: {
      background: settings.messageBackgroundColor || undefined,
      borderRadius: settings.messageBorderRadius ? `${settings.messageBorderRadius}px` : undefined,
      padding: settings.messagePadding ? `${settings.messagePadding}px` : undefined,
    },
    message: {
      background: settings.messageBackgroundColor || undefined,
      textColor: settings.messageColor || undefined,
      fontSize: settings.messageFontSize ? `${settings.messageFontSize}px` : undefined,
      fontFamily: settings.fontFamily || undefined,
      borderRadius: settings.messageBorderRadius ? `${settings.messageBorderRadius}px` : undefined,
      padding: settings.messagePadding ? `${settings.messagePadding}px` : undefined,
      opacity: settings.messageOpacity ? settings.messageOpacity / 100 : undefined,
    },
    username: {
      color: settings.usernameColor || undefined,
      fontSize: settings.usernameFontSize ? `${settings.usernameFontSize}px` : undefined,
      fontWeight: settings.usernameFontWeight || undefined,
    },
    messageText: {
      color: settings.messageColor || undefined,
      fontSize: settings.messageFontSize ? `${settings.messageFontSize}px` : undefined,
    },
    avatar: {
      width: settings.avatarSize ? `${settings.avatarSize}px` : undefined,
      height: settings.avatarSize ? `${settings.avatarSize}px` : undefined,
      borderRadius: settings.avatarSize ? '50%' : undefined,
      display: settings.showAvatars ? undefined : 'none',
    },
    timestamp: {
      color: settings.timestampColor || undefined,
      fontSize: settings.timestampFontSize ? `${settings.timestampFontSize}px` : undefined,
      display: settings.showTimestamps ? undefined : 'none',
    },
    scrollbar: {
      width: settings.scrollbarWidth ? `${settings.scrollbarWidth}px` : undefined,
      thumbColor: settings.scrollbarColor || undefined,
    },
  }
}

/**
 * Convert ChatSettings to a fully generated CSS string.
 * Convenience wrapper around settingsToCSSSettings + generateChatCSS.
 */
export function settingsToCSS(settings: ChatSettings): string {
  return generateChatCSS(settingsToCSSSettings(settings))
}

/* ─── Hook ──────────────────────────────────────────────────────── */

export function useChatSettings() {
  const [settings, setSettings] = useState<ChatSettings>(loadSettings)
  const [savedIndicator, setSavedIndicator] = useState(false)

  /* Update a single setting */
  const updateSetting = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      setSettings((prev) => {
        const newSettings = { ...prev, [key]: value }
        saveSettings(newSettings)
        return newSettings
      })

      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    },
    []
  )

  /* Batch update multiple settings at once */
  const updateSettings = useCallback((partial: Partial<ChatSettings>) => {
    setSettings((prev) => {
      const newSettings = { ...prev, ...partial }
      saveSettings(newSettings)
      return newSettings
    })

    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 1500)
  }, [])

  /* Apply a preset by name */
  const applyPreset = useCallback((presetName: string) => {
    const preset = PRESETS.find((p) => p.name === presetName)
    if (preset) {
      setSettings((prev) => {
        const newSettings = { ...prev, ...preset.settings }
        saveSettings(newSettings)
        return newSettings
      })

      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
    }
  }, [])

  /* Reset to factory defaults */
  const resetToDefaults = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    saveSettings(DEFAULT_SETTINGS)

    setSavedIndicator(true)
    setTimeout(() => setSavedIndicator(false), 1500)
  }, [])

  /* Export settings as JSON string */
  const exportSettings = useCallback((): string => {
    return JSON.stringify(settings, null, 2)
  }, [settings])

  /* Import settings from JSON string */
  const importSettings = useCallback((jsonString: string): boolean => {
    try {
      const parsed = JSON.parse(jsonString)
      // Validate it's an object
      if (typeof parsed !== 'object' || parsed === null) return false

      // Merge with defaults to fill any missing fields
      const merged = { ...DEFAULT_SETTINGS, ...parsed }
      setSettings(merged)
      saveSettings(merged)

      setSavedIndicator(true)
      setTimeout(() => setSavedIndicator(false), 1500)
      return true
    } catch {
      return false
    }
  }, [])

  return {
    settings,
    updateSetting,
    updateSettings,
    applyPreset,
    resetToDefaults,
    exportSettings,
    importSettings,
    savedIndicator,
    presets: PRESETS,
  }
}
