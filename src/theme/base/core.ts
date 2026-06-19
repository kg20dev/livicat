/**
 * Core Settings Scheme — shared across ALL themes
 *
 * These settings use normalized UI keys so values persist when switching themes.
 * Settings with consistent CSS variable names across themes (chroma-key,
 * margin-left, font-family, YouTube hiders) emit `--{key}` directly.
 *
 * Settings whose CSS variable name differs per theme have NO `cssVar` here.
 * Each theme's scheme exports `coreCssVarMap` which the registry applies
 * during merge so buildCSSVariables can emit the correct `--var-name`.
 */

import type { SettingDef } from '../types'
import { FONT_OPTIONS } from '../../utils/fonts'

export const CORE_SCHEME: SettingDef[] = [
  /* ── OBS ───────────────────────────────────────────────── */
  {
    key: 'chroma-key',
    section: 'OBS',
    type: 'toggle',
    label: 'Chroma Key Ready',
    default: false,
  },

  /* ── Role Colors (includes general defaults) ────────────── */
  {
    key: 'bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Background',
    default: '#1a1a1a',
  },
  {
    key: 'text-color',
    section: 'Role Colors',
    type: 'color',
    label: 'Text Color',
    default: '#e5e2e1',
  },
  {
    key: 'username-color',
    section: 'Role Colors',
    type: 'color',
    label: 'Username Color',
    default: '#ff4444',
  },
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

  /* ── Common ──────────────────────────────────────────────── */
  {
    key: 'container-opacity',
    section: 'Common',
    type: 'range',
    label: 'Container Opacity',
    min: 0,
    max: 100,
    default: 100,
    unit: '%',
  },
  {
    key: 'message-opacity',
    section: 'Common',
    type: 'range',
    label: 'Message Opacity',
    min: 0,
    max: 100,
    default: 100,
    unit: '%',
  },
  {
    key: 'message-spacing',
    section: 'Common',
    type: 'range',
    label: 'Message Spacing',
    min: 0,
    max: 40,
    default: 10,
    unit: 'px',
  },
  {
    key: 'animation-speed',
    section: 'Common',
    type: 'select',
    label: 'Animation Speed',
    default: 'normal',
    options: [
      { value: 'none', label: 'None' },
      { value: 'slow', label: 'Slow' },
      { value: 'normal', label: 'Normal' },
    ],
  },
  {
    key: 'margin-left',
    cssVar: 'chat-margin-left',
    section: 'Common',
    type: 'range',
    label: 'Screen Margin Left',
    min: 0,
    max: 100,
    default: 0,
    unit: 'px',
  },

  /* ── YouTube ──────────────────────────────────────────── */
  {
    key: 'hide-youtube-generic',
    section: 'YouTube',
    type: 'toggle',
    label: 'Hide Generic Messages',
    default: false,
  },
  {
    key: 'hide-youtube-header',
    section: 'YouTube',
    type: 'toggle',
    label: 'Hide Chat Header',
    default: false,
  },
  {
    key: 'hide-youtube-footer',
    section: 'YouTube',
    type: 'toggle',
    label: 'Hide Chat Footer',
    default: false,
  },
  {
    key: 'hide-youtube-signin',
    section: 'YouTube',
    type: 'toggle',
    label: 'Hide Sign-in Prompt',
    default: false,
  },

  /* ── Preview ──────────────────────────────────────────── */
  {
    key: 'always-on-top',
    section: 'Preview',
    type: 'toggle',
    label: 'Always on Top',
    default: false,
  },

  /* ── Typography ────────────────────────────────────────── */
  {
    key: 'font-family',
    cssVar: 'chat-font-family',
    section: 'Typography',
    type: 'select',
    label: 'Font Family',
    default: 'inherit',
    options: [
      { value: 'inherit', label: 'Default' },
      ...FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label })),
    ],
  },
  {
    key: 'usernameFontSize',
    section: 'Typography',
    type: 'range',
    label: 'Username Size',
    min: 10,
    max: 40,
    default: 14,
    unit: 'px',
    cssVar: 'usernameFontSize',
  },
  {
    key: 'messageFontSize',
    section: 'Typography',
    type: 'range',
    label: 'Message Size',
    min: 10,
    max: 48,
    default: 14,
    unit: 'px',
    cssVar: 'messageFontSize',
  },
  {
    key: 'font-weight-message',
    section: 'Typography',
    type: 'select',
    label: 'Message Weight',
    default: '400',
    options: [
      { value: '300', label: 'Light (300)' },
      { value: '400', label: 'Normal (400)' },
      { value: '500', label: 'Medium (500)' },
      { value: '600', label: 'Semibold (600)' },
      { value: '700', label: 'Bold (700)' },
      { value: '800', label: 'Extra Bold (800)' },
      { value: '900', label: 'Black (900)' },
    ],
    cssVar: 'chat-message-font-weight',
  },
  {
    key: 'username-bold',
    section: 'Typography',
    type: 'toggle',
    label: 'Bold Username',
    default: true,
  },
  {
    key: 'letter-spacing',
    section: 'Typography',
    type: 'range',
    label: 'Character Spacing',
    min: -3,
    max: 12,
    default: 0,
    unit: 'px',
  },

  /* ── Avatar ────────────────────────────────────────────── */
  {
    key: 'avatarSize',
    section: 'Avatar',
    type: 'range',
    label: 'Size',
    min: 16,
    max: 80,
    default: 28,
    unit: 'px',
    cssVar: 'avatarSize',
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
    cssVar: 'chat-avatar-vertical-offset',
  },
  {
    key: 'show-avatars',
    section: 'Avatar',
    type: 'toggle',
    label: 'Show Avatars',
    default: true,
  },

  /* ── Role-specific colors ─────────────────────────────── */
  {
    key: 'owner-bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Owner Bubble Background',
    default: '#2d1b00',
  },
  {
    key: 'owner-text',
    section: 'Role Colors',
    type: 'color',
    label: 'Owner Text',
    default: '#ffb347',
  },
  {
    key: 'mod-bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Mod Bubble Background',
    default: '#001a2d',
  },
  {
    key: 'mod-text',
    section: 'Role Colors',
    type: 'color',
    label: 'Mod Text',
    default: '#47b5ff',
  },
  {
    key: 'member-bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Member Bubble Background',
    default: '#1a2d00',
  },
  {
    key: 'member-text',
    section: 'Role Colors',
    type: 'color',
    label: 'Member Text',
    default: '#8bcc47',
  },

  /* ── Super Chat ───────────────────────────────────────── */
  {
    key: 'superchat-bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Super Chat Bubble Background',
    default: '#ffd700',
  },
  {
    key: 'superchat-text',
    section: 'Role Colors',
    type: 'color',
    label: 'Super Chat Accent',
    default: '#1a1a1a',
  },

  /* ── Membership ───────────────────────────────────────── */
  {
    key: 'membership-bg',
    section: 'Role Colors',
    type: 'color',
    label: 'Membership Bubble Background',
    default: '#0d2818',
  },
  {
    key: 'membership-text',
    section: 'Role Colors',
    type: 'color',
    label: 'Membership Accent',
    default: '#00ff66',
  },
]
