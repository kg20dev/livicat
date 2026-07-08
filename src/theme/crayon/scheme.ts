import type { DerivationEntry, SettingDef } from '../types'

/**
 * Crayon — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 */

export const coreCssVarMap: Record<string, string> = {
  bg: 'paperBg',
  'text-color': 'ink',
  'username-color': 'usernameColor',
  'container-opacity': 'containerOpacity',
  'message-opacity': 'messageOpacity',
  'message-spacing': 'chat-message-spacing',
  'animation-speed': 'animationSpeed',
  'username-bold': 'chat-username-font-weight',
  'font-weight-message': 'chat-message-font-weight',
  'chat-avatar-vertical-offset': 'chat-avatar-vertical-offset',
  'letter-spacing': 'chat-letter-spacing',
  'owner-bg': 'ownerBg',
  'owner-text': 'ownerInk',
  'mod-bg': 'modBg',
  'mod-text': 'modInk',
  'member-bg': 'memberBg',
  'member-text': 'memberInk',
  'superchat-bg': 'superchatBg',
  'superchat-text': 'superchatInk',
  'membership-bg': 'membershipBg',
  'membership-text': 'membershipInk',
  'chat-owner-username': 'ownerUsernameColor',
  'chat-mod-username': 'modUsernameColor',
  'chat-member-username': 'memberUsernameColor',
  'chat-superchat-username': 'superchatUsernameColor',
  'chat-membership-username': 'membershipUsernameColor',
}

/**
 * Derive role shadow colors from role ink colors via harmony inversion.
 * Always targets a dark result (l=0.18-0.25) so the shadow looks like
 * a natural dark offset regardless of the source hue.
 */
export const strokeMap: Record<string, DerivationEntry> = {
  ownerInk: {
    target: 'ownerShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  modInk: {
    target: 'modShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  memberInk: {
    target: 'memberShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  superchatInk: {
    target: 'superchatShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  membershipInk: {
    target: 'membershipShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
}

export const scheme: SettingDef[] = [
  /* ── Card ──────────────────────────────────────────────────── */
  {
    key: 'texture-intensity',
    section: 'Card',
    type: 'range',
    label: 'Paper Grain',
    min: 0,
    max: 100,
    default: 50,
    unit: '%',
  },
  {
    key: 'stroke-width',
    section: 'Card',
    type: 'range',
    label: 'Stroke Width',
    min: 1,
    max: 8,
    default: 3,
    unit: 'px',
  },
  {
    key: 'crayon-stroke',
    section: 'Card',
    type: 'color',
    label: 'Stroke Color',
    default: '#1a1a1a',
  },
  {
    key: 'shadow-offset',
    section: 'Card',
    type: 'range',
    label: 'Shadow Offset',
    min: 0,
    max: 16,
    default: 3,
    unit: 'px',
  },
  {
    key: 'shadow-color',
    section: 'Card',
    type: 'color',
    label: 'Shadow Color',
    default: '#1a1a1a',
  },
  {
    key: 'chat-padding',
    section: 'Card',
    type: 'range',
    label: 'Padding',
    min: 4,
    max: 30,
    default: 10,
    unit: 'px',
  },
  {
    key: 'chat-max-width',
    section: 'Card',
    type: 'range',
    label: 'Max Width',
    min: 200,
    max: 800,
    default: 400,
    unit: 'px',
  },

  /* ── Corners (asymmetric = hand-drawn feel) ────────────────── */
  {
    key: 'border-radius-tl',
    section: 'Corners',
    type: 'range',
    label: 'Top-Left',
    min: 0,
    max: 40,
    default: 22,
    unit: 'px',
  },
  {
    key: 'border-radius-tr',
    section: 'Corners',
    type: 'range',
    label: 'Top-Right',
    min: 0,
    max: 40,
    default: 6,
    unit: 'px',
  },
  {
    key: 'border-radius-br',
    section: 'Corners',
    type: 'range',
    label: 'Bottom-Right',
    min: 0,
    max: 40,
    default: 26,
    unit: 'px',
  },
  {
    key: 'border-radius-bl',
    section: 'Corners',
    type: 'range',
    label: 'Bottom-Left',
    min: 0,
    max: 40,
    default: 8,
    unit: 'px',
  },

  /* ── Animation ─────────────────────────────────────────────── */
  {
    key: 'wobble-amount',
    section: 'Animation',
    type: 'range',
    label: 'Wobble Amount',
    min: 0,
    max: 15,
    default: 6,
    unit: 'deg',
  },
]
