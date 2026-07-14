import type { DerivationEntry, SettingDef } from '../types'

/**
 * Block — theme-specific settings only.
 *
 * Settings shared across all themes live in `src/theme/core.ts`.
 * `coreCssVarMap` maps each core key → this theme's CSS variable name
 * so buildCSSVariables emits the correct `--var-name`.
 */

export const coreCssVarMap: Record<string, string> = {
  bg: 'stone-bg',
  'text-color': 'stone-ink',
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
 * Always targets a dark result (l=0.18-0.25) so the drop shadow reads as
 * a solid block offset regardless of the source hue.
 */
export const strokeMap: Record<string, DerivationEntry> = {
  /**
   * Default shadow derives from the message text color (stone ink).
   * Always dark — a block shadow should be darker than the source.
   */
  'stone-ink': {
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
  /* ── Text Shadow (THE Minecraft signature) ────────────────── */
  /* Every glyph in Minecraft has a hard black drop shadow. This is
     the single most recognizable visual trait of the aesthetic.
     Depth 0 = no shadow (flat), 4 = the authentic MC look. */
  {
    key: 'shadow-depth',
    section: 'Text Shadow',
    type: 'range',
    label: 'Shadow Depth',
    min: 0,
    max: 4,
    default: 2,
    unit: 'px',
  },

  /* ── Texture (optional pixel grain) ───────────────────────── */
  /* Off by default — the theme looks cleanest without heavy noise.
     Raise it to add a subtle stone/pixel texture to the rows. */
  {
    key: 'grain-intensity',
    section: 'Texture',
    type: 'range',
    label: 'Pixel Grain',
    min: 0,
    max: 100,
    default: 0,
    unit: '%',
  },

  /* ── Corners (square by default) ──────────────────────────── */
  /* Applies to the avatar block. 0 = square (authentic), raise to
     soften slightly. */
  {
    key: 'block-corner',
    section: 'Corners',
    type: 'range',
    label: 'Corner Radius',
    min: 0,
    max: 8,
    default: 0,
    unit: 'px',
  },

  /* ── Animation (entrance rise) ────────────────────────────── */
  /* How far a new message rises into place from below. 0 = no
     vertical motion (pure fade). */
  {
    key: 'drop-bounce',
    section: 'Animation',
    type: 'range',
    label: 'Rise Amount',
    min: 0,
    max: 20,
    default: 6,
    unit: 'px',
  },

  /* ── Grass (animated top strip) ───────────────────────────── */
  /* A procedural pixel-grass layer along the top edge of each row —
     like the green top of a Minecraft grass block. 0 = hidden (off).
     Generated entirely in CSS (inline SVG pixel art), no asset file. */
  {
    key: 'grass-height',
    section: 'Grass',
    type: 'range',
    label: 'Grass Height',
    min: 0,
    max: 12,
    default: 4,
    unit: 'px',
  },
]
