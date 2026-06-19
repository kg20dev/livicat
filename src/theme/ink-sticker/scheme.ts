import type { SettingDef, DerivationEntry } from '../types'

/**
 * Neon Sticker (Ink Sticker) — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 */

/**
 * Maps source CSS variable names → derived CSS variable details.
 * buildCSSVariables uses this to auto-derive harmonious colors
 * via harmonyInvertColor(). Only themes that export this get auto-derivation.
 *
 * A plain string target uses default harmonyInvertColor options (stroke style).
 * An object with `target` + `options` allows per-entry tuning.
 */
export const strokeMap: Record<string, DerivationEntry> = {
  messageColor: 'strokeColor',
  usernameColor: {
    target: 'glowColor',
    options: { darkTargetL: 0.65, lightTargetL: 0.65, satScale: 0.85 },
  },
  ownerText: 'ownerStroke',
  modText: 'modStroke',
  memberText: 'memberStroke',
  superchatText: 'superchatStroke',
  membershipText: 'membershipStroke',
  'chat-owner-username': 'ownerUsernameStroke',
  'chat-mod-username': 'modUsernameStroke',
  'chat-member-username': 'memberUsernameStroke',
  'chat-superchat-username': 'superchatUsernameStroke',
  'chat-membership-username': 'membershipUsernameStroke',
}

export const coreCssVarMap: Record<string, string> = {
  bg: 'messageBg',
  'text-color': 'messageColor',
  'username-color': 'usernameColor',
  'container-opacity': 'containerOpacity',
  'message-opacity': 'messageOpacity',
  'message-spacing': 'chat-message-spacing',
  'animation-speed': 'animationSpeed',
  'username-bold': 'chat-username-font-weight',
  'font-weight-message': 'messageFontWeight',
  'chat-avatar-vertical-offset': 'chat-avatar-vertical-offset',
  'owner-bg': 'ownerBg',
  'owner-text': 'ownerText',
  'mod-bg': 'modBg',
  'mod-text': 'modText',
  'member-bg': 'memberBg',
  'member-text': 'memberText',
  'superchat-bg': 'superchatBg',
  'superchat-text': 'superchatText',
  'membership-bg': 'membershipBg',
  'membership-text': 'membershipText',
  'chat-owner-username': 'ownerUsername',
  'chat-mod-username': 'modUsername',
  'chat-member-username': 'memberUsername',
  'chat-superchat-username': 'superchatUsername',
  'chat-membership-username': 'membershipUsername',
}

export const scheme: SettingDef[] = [
  /* ── Effects ────────────────────────────────────────────── */
  {
    key: 'skewAngle',
    section: 'Effects',
    type: 'range',
    label: 'Skew Angle',
    min: -45,
    max: 45,
    default: 0,
    step: 1,
    unit: 'deg',
  },
  {
    key: 'shadowOffset',
    section: 'Effects',
    type: 'range',
    label: 'Shadow Offset',
    min: 0,
    max: 20,
    default: 3,
    step: 1,
    unit: 'px',
  },
  {
    key: 'shadowColor',
    section: 'Effects',
    type: 'color',
    label: 'Shadow Color',
    default: '#000000',
  },
  {
    key: 'strokeWidth',
    section: 'Effects',
    type: 'range',
    label: 'Stroke Width',
    min: 0,
    max: 5,
    default: 1,
    step: 0.5,
    unit: 'px',
  },
  {
    key: 'glowSpread',
    section: 'Effects',
    type: 'range',
    label: 'Glow Spread',
    min: 0,
    max: 30,
    default: 6,
    unit: 'px',
  },
  {
    key: 'chat-max-width',
    section: 'Effects',
    type: 'range',
    label: 'Max Width',
    min: 200,
    max: 800,
    default: 400,
    unit: 'px',
  },
  {
    key: 'chat-border-radius',
    section: 'Effects',
    type: 'range',
    label: 'Corner Radius',
    min: 0,
    max: 30,
    default: 6,
    unit: 'px',
  },

  /* ── Frame ──────────────────────────────────────────────── */
  { key: 'includeFrame', section: 'Frame', type: 'toggle', label: 'Include Frame', default: false },
  {
    key: 'frameMargin',
    section: 'Frame',
    type: 'range',
    label: 'Frame Margin',
    min: 10,
    max: 100,
    default: 40,
    step: 5,
    unit: 'px',
  },
]
