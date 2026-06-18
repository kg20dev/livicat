import type { SettingDef } from '../types'

/**
 * Colour Bubble (IM) — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 */
export const coreCssVarMap: Record<string, string> = {
  bg: 'chat-msg-bg',
  'text-color': 'chat-msg-color',
  'username-color': 'chat-username-color',
  'container-opacity': 'chat-container-opacity',
  'message-opacity': 'chat-message-opacity',
  'message-spacing': 'chat-message-spacing',
  'animation-speed': 'chat-animation-speed',
  'username-bold': 'chat-username-font-weight',
  'owner-bg': 'chat-owner-bg',
  'owner-text': 'chat-owner-text',
  'mod-bg': 'chat-mod-bg',
  'mod-text': 'chat-mod-text',
  'member-bg': 'chat-member-bg',
  'member-text': 'chat-member-text',
  'superchat-bg': 'chat-superchat-bg',
  'superchat-text': 'chat-superchat-text',
  'membership-bg': 'chat-membership-bg',
  'membership-text': 'chat-membership-text',
}

export const scheme: SettingDef[] = [
  /* ── Bubble ────────────────────────────────────────────── */
  {
    key: 'chat-scrollbar-thumb',
    section: 'Bubble',
    type: 'color',
    label: 'Border Color',
    default: '#888888',
  },
  {
    key: 'chat-border-width',
    section: 'Bubble',
    type: 'range',
    label: 'Border Width',
    min: 0,
    max: 10,
    default: 2,
    unit: 'px',
  },
  {
    key: 'chat-border-radius',
    section: 'Bubble',
    type: 'range',
    label: 'Corner Radius',
    min: 0,
    max: 30,
    default: 12,
    unit: 'px',
  },
  {
    key: 'chat-msg-padding',
    section: 'Bubble',
    type: 'range',
    label: 'Padding',
    min: 4,
    max: 30,
    default: 8,
    unit: 'px',
  },
  {
    key: 'chat-tail-offset',
    section: 'Bubble',
    type: 'range',
    label: 'Tail Offset',
    min: -20,
    max: 10,
    default: -8,
    unit: 'px',
  },
  {
    key: 'chat-avatar-vertical-offset',
    section: 'Avatar',
    type: 'range',
    label: 'Vertical Offset',
    min: -20,
    max: 60,
    default: 0,
    unit: 'px',
  },
  {
    key: 'chat-max-width',
    section: 'Bubble',
    type: 'range',
    label: 'Max Width',
    min: 200,
    max: 800,
    default: 400,
    unit: 'px',
  },
  {
    key: 'chat-punct-size',
    section: 'Bubble',
    type: 'range',
    label: 'Punct Badge Size',
    min: 16,
    max: 40,
    default: 24,
    unit: 'px',
  },

  /* ── Username ──────────────────────────────────────────── */
  {
    key: 'chat-username-font-size',
    section: 'Username',
    type: 'range',
    label: 'Size',
    min: 10,
    max: 40,
    default: 13,
    unit: 'px',
  },
  {
    key: 'chat-username-vertical-offset',
    section: 'Username',
    type: 'range',
    label: 'Vertical Offset',
    min: -20,
    max: 20,
    default: 0,
    unit: 'px',
  },

  /* ── Message ──────────────────────────────────────────── */
  {
    key: 'chat-message-font-size',
    section: 'Message',
    type: 'range',
    label: 'Content Font Size',
    min: 10,
    max: 48,
    default: 14,
    unit: 'px',
  },

  /* ── Avatar ────────────────────────────────────────────── */
  {
    key: 'chat-avatar-width',
    section: 'Avatar',
    type: 'range',
    label: 'Size',
    min: 16,
    max: 80,
    default: 24,
    unit: 'px',
  },

  /* ── Animation (Colour Bubble specific) ───────────────── */
  {
    key: 'chat-username-animation',
    section: 'Animation',
    type: 'select',
    label: 'Username Entrance',
    default: 'slide',
    options: [
      { value: 'slide', label: 'Slide Left' },
      { value: 'wiggle', label: 'Wiggle' },
      { value: 'pop', label: 'Pop' },
      { value: 'fade', label: 'Fade' },
    ],
  },
  {
    key: 'chat-message-animation',
    section: 'Animation',
    type: 'select',
    label: 'Message Entrance',
    default: 'slide',
    options: [
      { value: 'slide', label: 'Slide Left' },
      { value: 'bounce', label: 'Bounce' },
      { value: 'pop', label: 'Pop' },
      { value: 'fade', label: 'Fade' },
    ],
  },

  /* ── Visibility ────────────────────────────────────────── */
  {
    key: 'show-avatars',
    section: 'Visibility',
    type: 'toggle',
    label: 'Show Avatars',
    default: true,
  },

  /* ── Role Colors ───────────────────────────────────────── */
  {
    key: 'chat-owner-username',
    section: 'Role Colors',
    type: 'color',
    label: 'Owner Username',
    default: '#ffb347',
  },
  {
    key: 'chat-mod-username',
    section: 'Role Colors',
    type: 'color',
    label: 'Mod Username',
    default: '#47b5ff',
  },
  {
    key: 'chat-member-username',
    section: 'Role Colors',
    type: 'color',
    label: 'Member Username',
    default: '#ce93d8',
  },
  {
    key: 'chat-superchat-username',
    section: 'Role Colors',
    type: 'color',
    label: 'Super Chat Username',
    default: '#ffd700',
  },
  {
    key: 'chat-membership-username',
    section: 'Role Colors',
    type: 'color',
    label: 'Membership Username',
    default: '#ffffff',
  },
]
