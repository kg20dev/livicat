import type { DerivationEntry, SettingDef } from '../types'

/**
 * Crayon — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 */

export const coreCssVarMap: Record<string, string> = {
  bg: 'paper-bg',
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
  'owner-bg': 'owner-bg',
  'owner-text': 'owner-ink',
  'mod-bg': 'mod-bg',
  'mod-text': 'mod-ink',
  'member-bg': 'member-bg',
  'member-text': 'member-ink',
  'superchat-bg': 'superchat-bg',
  'superchat-text': 'superchat-ink',
  'membership-bg': 'membership-bg',
  'membership-text': 'membership-ink',
  'chat-owner-username': 'owner-username-color',
  'chat-mod-username': 'mod-username-color',
  'chat-member-username': 'member-username-color',
  'chat-superchat-username': 'superchat-username-color',
  'chat-membership-username': 'membership-username-color',
}

/**
 * Derive role shadow colors from role ink colors via harmony inversion.
 * Always targets a dark result (l=0.18-0.25) so the shadow looks like
 * a natural dark offset regardless of the source hue.
 */
export const strokeMap: Record<string, DerivationEntry> = {
  /**
   * Default shadow derives from the message text color (ink).
   * Always dark — a shadow should be darker than the source.
   */
  ink: {
    target: 'shadow-color',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  'owner-ink': {
    target: 'ownerShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  'mod-ink': {
    target: 'modShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  'member-ink': {
    target: 'memberShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  'superchat-ink': {
    target: 'superchatShadow',
    options: { lightThreshold: 0.4, darkTargetL: 0.18, lightTargetL: 0.25, satScale: 0.5 },
  },
  'membership-ink': {
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
