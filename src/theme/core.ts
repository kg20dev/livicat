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

import type { SettingDef } from './types'
import { FONT_OPTIONS } from '../utils/fonts'

export const CORE_SCHEME: SettingDef[] = [
  /* ── OBS ───────────────────────────────────────────────── */
  {
    key: 'chroma-key',
    section: 'OBS',
    type: 'toggle',
    label: 'Chroma Key Ready',
    default: false,
  },

  /* ── Colors ──────────────────────────────────────────────── */
  {
    key: 'bg',
    section: 'Colors',
    type: 'color',
    label: 'Background',
    default: '#1a1a1a',
  },
  {
    key: 'text-color',
    section: 'Colors',
    type: 'color',
    label: 'Text Color',
    default: '#e5e2e1',
  },
  {
    key: 'username-color',
    section: 'Colors',
    type: 'color',
    label: 'Username',
    default: '#d6baff',
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
    type: 'select',
    label: 'Message Spacing',
    default: 'normal',
    options: [
      { value: 'compact', label: 'Compact' },
      { value: 'normal', label: 'Normal' },
      { value: 'comfortable', label: 'Comfortable' },
    ],
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
    key: 'username-bold',
    section: 'Common',
    type: 'toggle',
    label: 'Bold Username',
    default: true,
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
  {
    key: 'font-family',
    cssVar: 'chat-font-family',
    section: 'Common',
    type: 'select',
    label: 'Font Family',
    default: 'inherit',
    options: [
      { value: 'inherit', label: 'Default' },
      ...FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label })),
    ],
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

  /* ── Typography ────────────────────────────────────────── */
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

  /* ── Common ──────────────────────────────────────────────── */

  /* ── Role Colors ────────────────────────────────────────── */
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
