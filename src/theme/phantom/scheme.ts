import type { DerivationEntry, HarmonyInvertOptions, SettingDef } from '../types'

/**
 * Post-derivations: derive CSS variables from OTHER derived variables.
 * Runs after the main scheme loop. The source must be a variable that
 * was already emitted (either from a scheme setting or a strokeMap derivation).
 *
 * Example: flagOutline is derived from flagChipBg (which was derived from usernameColor).
 */
export const postDerivations: Record<string, { source: string; options?: HarmonyInvertOptions }> = {
  /** Flag outline — pure black or white based on chip bg lightness.
      Light chip → black outline, dark chip → white outline. */
  flagOutline: {
    source: 'flagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
  /** Per-role outlines — pure black or white based on role chip bg. */
  ownerFlagOutline: {
    source: 'ownerFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
  modFlagOutline: {
    source: 'modFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
  memberFlagOutline: {
    source: 'memberFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
  superchatFlagOutline: {
    source: 'superchatFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
  membershipFlagOutline: {
    source: 'membershipFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0, lightTargetL: 1, satScale: 0 },
  },
}

/**
 * Phantom — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/base/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 *
 * Design philosophy: the P5 look comes from the SVG ribbon + flag
 * artwork and the red/black/white palette, NOT from a tangle of
 * per-role settings. Core role-bg/role-text settings still drive
 * panel + text color; Phantom adds only a few visual controls.
 */

export const coreCssVarMap: Record<string, string> = {
  bg: 'phantom-bg',
  'text-color': 'phantom-ink',
  'username-color': 'usernameColor',
  'container-opacity': 'containerOpacity',
  'message-opacity': 'messageOpacity',
  'message-spacing': 'chat-message-spacing',
  'animation-speed': 'animationSpeed',
  'username-bold': 'chat-username-font-weight',
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
 * Derive the username FLAG BACKGROUND from the username text color.
 * The flag fill recolors to the OPPOSITE lightness of the name text
 * (dark name → light flag, light name → dark flag) so the name stays
 * readable against its chip — the same contrast contract the sibling
 * themes use for chip backgrounds. Saturation is muted to keep the
 * P5 mono-graphic identity.
 *
 * Keys MUST be the resolved cssVar name (post-coreCssVarMap mapping),
 * not the original core key — see buildCSSVariables.ts consumer.
 */
export const strokeMap: Record<string, DerivationEntry> = {
  /** Default flag bg — contrast with the base username text color. */
  usernameColor: {
    target: 'flagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
  'owner-username-color': {
    target: 'ownerFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
  'mod-username-color': {
    target: 'modFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
  'member-username-color': {
    target: 'memberFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
  'superchat-username-color': {
    target: 'superchatFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
  'membership-username-color': {
    target: 'membershipFlagChipBg',
    options: { lightThreshold: 0.5, darkTargetL: 0.12, lightTargetL: 0.92, satScale: 0.3 },
  },
}

export const scheme: SettingDef[] = [
  /* ── Motion (slide-in) ────────────────────────────────────── */
  /* How far a new message slides in from the left with a skew
      overshoot — P5's kinetic entrance. 0 = pure fade. */
  {
    key: 'slide-distance',
    section: 'Motion',
    type: 'range',
    label: 'Slide Distance',
    min: 0,
    max: 100,
    default: 24,
    unit: 'px',
  },

  /* ── Flag Shape ────────────────────────────────────────────── */
  /* The flag plate's rotation — the signature P5 tilt. Applied to
     the SVG name flag (#author-name). Default -22° = authentic P5
     angle; 0 = flat. This is the single authoritative rotation. */
  {
    key: 'flag-tilt',
    section: 'Flag Shape',
    type: 'range',
    label: 'Flag Tilt',
    min: -30,
    max: 0,
    default: -22,
    step: 1,
    unit: 'deg',
  },

  /* Rotation of the text inside the name flag, independent from
     --flag-tilt (which rotates the whole plate). Applied to the
     inner .flag-text span, not the ribbon element. */
  {
    key: 'text-rotate',
    section: 'Flag Shape',
    type: 'range',
    label: 'Text Rotation',
    min: -30,
    max: 30,
    default: 0,
    step: 1,
    unit: 'deg',
  },

  /* Minimum height ensures the flag has visual presence even for short usernames. */
  {
    key: 'flag-min-height',
    section: 'Flag Shape',
    type: 'range',
    label: 'Min Height',
    min: 0,
    max: 100,
    default: 0,
    step: 2,
    unit: 'px',
  },

  /* ── Thunder Tail ────────────────────────────────────────── */
  /* Horizontal/vertical offset and scale of the zigzag tail
     connecting avatar to message ribbon. */
  {
    key: 'tail-offset-x',
    section: 'Thunder Tail',
    type: 'range',
    label: 'Tail Offset X',
    min: -40,
    max: 10,
    default: -24,
    step: 1,
    unit: 'px',
  },
  {
    key: 'tail-offset-y',
    section: 'Thunder Tail',
    type: 'range',
    label: 'Tail Offset Y',
    min: -20,
    max: 20,
    default: 0,
    step: 1,
    unit: 'px',
  },
  {
    key: 'tail-scale',
    section: 'Thunder Tail',
    type: 'range',
    label: 'Tail Scale',
    min: 0.5,
    max: 2,
    default: 1,
    step: 0.1,
    unit: '',
  },

  /* ── Message Box ────────────────────────────────────────── */
  /* Gap between the outer white outline and inner black fill.
     Controls the visible spacing between ::before (outline) and
     .message-text (fill). Larger = wider visible border. */
  {
    key: 'msg-outline-gap',
    section: 'Message Box',
    type: 'range',
    label: 'Outline Gap',
    min: 0,
    max: 20,
    default: 4,
    step: 1,
    unit: 'px',
  },
  /* Individual padding around text inside the message ribbon. */
  {
    key: 'msg-pad-top',
    section: 'Message Box',
    type: 'range',
    label: 'Top Padding',
    min: 2,
    max: 40,
    default: 14,
    step: 1,
    unit: 'px',
  },
  {
    key: 'msg-pad-bottom',
    section: 'Message Box',
    type: 'range',
    label: 'Bottom Padding',
    min: 2,
    max: 40,
    default: 14,
    step: 1,
    unit: 'px',
  },
  {
    key: 'msg-pad-left',
    section: 'Message Box',
    type: 'range',
    label: 'Left Padding',
    min: 4,
    max: 100,
    default: 20,
    step: 1,
    unit: 'px',
  },

  /* ── Texture (magazine grain) ─────────────────────────────── */
  /* Subtle noise evoking P5's picaresque-novel print texture.
     Applied as a blended overlay via mix-blend-mode: overlay. */
  {
    key: 'grain-intensity',
    section: 'Texture',
    type: 'range',
    label: 'Grain',
    min: 0,
    max: 100,
    default: 0,
    unit: '%',
  },
]
