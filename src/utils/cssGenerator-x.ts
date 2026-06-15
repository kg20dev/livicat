/**
 * CSS Generator X — IM-Style Layout for Workspace X
 *
 * Transforms YouTube's native chat DOM into IM-style chat bubbles using
 * flexbox layout, rotated name chips, and message bubbles with tails.
 *
 * CSS variable naming convention: --chat-* (shared with base generator)
 *
 *   yt-live-chat-text-message-renderer (flex row)
 *   ├── #author-photo (fixed circular avatar)
 *   ├── #content (flex column)
 *   │   ├── #author-name (rotated chip)
 *   │   └── #message (bubble with ::before tail)
 *   ├── #timestamp     → display: none
 *   ├── #menu          → display: none
 *   └── #before-content-buttons → display: none
 */

import type {
  ChatCSSSettings,
  RoleColors,
} from './cssGenerator'
import {
  buildCSSVariables,
  buildContainerRules,
  buildScrollbarRules,
  buildHeaderRules,
  buildScrollButtonRules,
  buildEngagementMessagesRules,
  buildChatDisclaimerRules,
} from './cssGenerator'

/* ─── IM-Style Layout Rules ─────────────────────────────────────── */

/**
 * Generate IM-style flex layout targeting YouTube's native DOM.
 * Includes avatar, content column, name chip, message bubble,
 * bubble tail (::before), hide extra elements, and IM keyframes.
 */
function buildIMLayoutRules(settings: ChatCSSSettings): string {
  const parts: string[] = []

  const bubbleBorderWidth = settings.bubbleTail?.borderWidth ?? 2
  const bubbleBg = 'var(--chat-msg-bg, #222)'
  // Default border uses scrollbar color (neutral gray) — matches demo preview.
  // Role messages override border-color via buildIMRoleColorRules.
  const bubbleBorderColor = 'var(--chat-scrollbar-thumb, #555)'
  const tailOffset = settings.bubbleTail?.offset ?? -8
  const avatarSize = 'var(--chat-avatar-width, 36px)'

  // Determine animation speed
  const animSpeed = settings.animation?.speed ?? 'normal'
  const animDuration = animSpeed === 'slow' ? '0.6s' : animSpeed === 'none' ? '0s' : '0.4s'
  const animEasing = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)' // gentle spring

  // ── Animation Keyframes ─────────────────────────────────
  // Renderer pop-in — the whole message group slides and bounces in
  parts.push(`@keyframes livicat-message-pop-in {
  0% {
    opacity: 0;
    transform: scale(0.3) translateY(20px);
  }
  50% {
    transform: scale(1.05) translateY(-5px);
  }
  70% {
    transform: scale(0.95) translateY(2px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}`)

  // Name chip tilt-in — rotates and slides in with its own bounce
  const chipEasing = 'cubic-bezier(0.68, -0.55, 0.265, 1.55)' // overshoot back then forward
  const chipDuration = animSpeed === 'slow' ? '0.5s' : animSpeed === 'none' ? '0s' : '0.35s'
  const chipDelay = animSpeed === 'none' ? '0s' : '0.05s'
  parts.push(`@keyframes livicat-chip-tilt-in {
  0% {
    opacity: 0;
    transform: rotate(10deg) translate(-20px, 0) scale(0.7);
  }
  60% {
    opacity: 1;
    transform: rotate(-8deg) translate(5px, 8px) scale(1.1);
  }
  80% {
    transform: rotate(-2deg) translate(0, 5px) scale(0.98);
  }
  100% {
    transform: rotate(-4deg) translate(2px, 6px) scale(1);
  }
}`)

  // Avatar scale-in — pops in from zero
  const avatarDuration = animSpeed === 'slow' ? '0.45s' : animSpeed === 'none' ? '0s' : '0.3s'
  parts.push(`@keyframes livicat-avatar-scale {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  70% {
    transform: scale(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}`)

  // ── Renderer — flex row, transparent, with IM animation
  const animCSS = animSpeed === 'none'
    ? ''
    : `  animation: livicat-message-pop-in ${animDuration} ${animEasing} both !important;`
  parts.push(`yt-live-chat-text-message-renderer {
  display: flex !important;
  flex-direction: row !important;
  align-items: flex-start !important;
  gap: 8px !important;
  padding: 4px 0 !important;
  margin: 0 !important;
  overflow: visible !important;
  max-width: 100% !important;
  transform-origin: left center !important;
${animCSS}}`)

  // ── Avatar wrapper — fixed size, circular, with configurable vertical offset
  const avatarAnimCSS = animSpeed === 'none'
    ? ''
    : `  animation: livicat-avatar-scale ${avatarDuration} ease-out both !important;`
  parts.push(`yt-live-chat-text-message-renderer #author-photo {
  flex-shrink: 0 !important;
  width: ${avatarSize} !important;
  height: ${avatarSize} !important;
  border-radius: 50% !important;
  overflow: hidden !important;
  margin-top: var(--chat-avatar-margin-top, 0px) !important;
${avatarAnimCSS}}`)
  parts.push(`yt-live-chat-text-message-renderer #author-photo img {
  width: 100% !important;
  height: 100% !important;
  border-radius: 50% !important;
  object-fit: cover !important;
}`)

  // Content — column layout for name + message, zero gap
  // font-size: 0 trick collapses whitespace text nodes between inline elements
  parts.push(`yt-live-chat-text-message-renderer #content {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  gap: 0 !important;
  min-width: 0 !important;
  max-width: 100% !important;
  font-size: 0 !important;
}
yt-live-chat-text-message-renderer #content > * {
  margin: 0 !important;
}
/* Restore font-size on visible content children */
yt-live-chat-text-message-renderer #content > yt-live-chat-author-chip,
yt-live-chat-text-message-renderer #content > #message,
yt-live-chat-text-message-renderer #content > #message-container {
  font-size: var(--chat-message-font-size, 14px) !important;
}`)

  // Author chip — YouTube's native wrapper must be completely reset to
  // remove padding/margin/line-height that would create a gap before the bubble.
  // overflow:visible allows the chip transform to overlap the message.
  parts.push(`yt-live-chat-author-chip,
yt-live-chat-text-message-renderer #content > yt-live-chat-author-chip {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  overflow: visible !important;
  background: transparent !important;
  line-height: 1 !important;
}
yt-live-chat-author-chip * {
  margin: 0 !important;
  padding: 0 !important;
}`)

  // Name chip — rotated badge overlapping the message bubble, with own entrance animation
  const chipAnimCSS = animSpeed === 'none'
    ? ''
    : `  animation: livicat-chip-tilt-in ${chipDuration} ${chipEasing} backwards !important;
  animation-delay: ${chipDelay} !important;`
  parts.push(`yt-live-chat-text-message-renderer #author-name-chip,
yt-live-chat-text-message-renderer #author-name {
  position: relative !important;
  z-index: 2 !important;
  display: inline-block !important;
  width: fit-content !important;
  max-width: 100% !important;
  padding: 2px 10px !important;
  border-radius: 12px !important;
  background: var(--chat-msg-bg) !important;
  color: var(--chat-username-color) !important;
  font-size: var(--chat-username-font-size, 14px) !important;
  font-weight: var(--chat-username-font-weight) !important;
  font-family: inherit !important;
  line-height: 1.3 !important;
  transform: rotate(-4deg) translate(2px, 6px) !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15) !important;
${chipAnimCSS}}`)

  // Message bubble — inline-block with border, tail-ready positioning
  parts.push(`yt-live-chat-text-message-renderer #message {
  display: inline-block !important;
  background: ${bubbleBg} !important;
  color: var(--chat-msg-color, #fff) !important;
  padding: var(--chat-msg-padding, 8px 14px) !important;
  border-radius: var(--chat-msg-radius, 12px) !important;
  border: ${bubbleBorderWidth}px solid ${bubbleBorderColor} !important;
  font-size: var(--chat-message-font-size, 14px) !important;
  line-height: 1.5 !important;
  position: relative !important;
  overflow: visible !important;
  max-width: 100% !important;
}`)

  // Bubble tail — rotated square ::before pseudo-element
  parts.push(`yt-live-chat-text-message-renderer #message::before {
  content: "" !important;
  display: block !important;
  position: absolute !important;
  left: ${tailOffset}px !important;
  top: 14px !important;
  width: 12px !important;
  height: 12px !important;
  background: ${bubbleBg} !important;
  transform: rotate(45deg) !important;
  border-radius: 3px 0 3px 3px !important;
  border-left: ${bubbleBorderWidth}px solid ${bubbleBorderColor} !important;
  border-bottom: ${bubbleBorderWidth}px solid ${bubbleBorderColor} !important;
  z-index: 1 !important;
}`)

  // Hide extra YouTube elements that interfere with IM layout
  parts.push(`yt-live-chat-text-message-renderer #timestamp,
yt-live-chat-text-message-renderer #menu,
yt-live-chat-text-message-renderer #before-content-buttons,
yt-live-chat-text-message-renderer yt-live-chat-badge-renderer,
yt-live-chat-text-message-renderer #author-badges,
yt-live-chat-text-message-renderer #chat-badges,
yt-live-chat-text-message-renderer #chip-badges,
yt-live-chat-text-message-renderer #deleted-state,
yt-live-chat-text-message-renderer #show-original {
  display: none !important;
}
yt-live-chat-text-message-renderer #message-container {
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
}`)

  return parts.join('\n\n')
}

/* ─── IM Role Color Rules ────────────────────────────────────────── */

/**
 * Role-based color overrides for IM bubbles.
 * Extends the message bubble background/text/border and the
 * bubble tail background/border for owner/moderator/member roles.
 */
function buildIMRoleColorRules(settings: ChatCSSSettings): string {
  if (!settings.roleColors) return ''

  const parts: string[] = []

  interface RoleInfo {
    type: string
    bgVar: string
    textVar: string
    usernameVar: string
    weight: string
  }

  const roles: RoleInfo[] = [
    { type: 'owner', bgVar: '--chat-owner-bg', textVar: '--chat-owner-text', usernameVar: '--chat-owner-username', weight: '700' },
    { type: 'moderator', bgVar: '--chat-mod-bg', textVar: '--chat-mod-text', usernameVar: '--chat-mod-username', weight: '700' },
    { type: 'member', bgVar: '--chat-member-bg', textVar: '--chat-member-text', usernameVar: '--chat-member-username', weight: '600' },
  ]

  for (const role of roles) {
    const rc = settings.roleColors[role.type as keyof RoleColors]
    if (!rc) continue

    const selector = `yt-live-chat-text-message-renderer[author-type="${role.type}"]`

    // #message background + text color + border color
    const msgRules: string[] = []
    if (rc.background) msgRules.push(`  background: var(${role.bgVar}) !important;`)
    if (rc.textColor) {
      msgRules.push(`  color: var(${role.textVar}) !important;`)
      msgRules.push(`  border-color: var(${role.textVar}) !important;`)
    }
    if (msgRules.length > 0) {
      parts.push(`${selector} #message {\n${msgRules.join('\n')}\n}`)
    }

    // #message::before tail background + border colors
    const tailRules: string[] = []
    if (rc.background) tailRules.push(`  background: var(${role.bgVar}) !important;`)
    if (rc.textColor) {
      tailRules.push(`  border-left-color: var(${role.textVar}) !important;`)
      tailRules.push(`  border-bottom-color: var(${role.textVar}) !important;`)
    }
    if (tailRules.length > 0) {
      parts.push(`${selector} #message::before {\n${tailRules.join('\n')}\n}`)
    }

    // #author-name color + background
    const nameRules: string[] = []
    if (rc.usernameColor) {
      nameRules.push(`  color: var(${role.usernameVar}) !important;`)
      nameRules.push(`  font-weight: ${role.weight} !important;`)
    }
    if (rc.background) nameRules.push(`  background: var(${role.bgVar}) !important;`)
    if (nameRules.length > 0) {
      parts.push(`${selector} #author-name {\n${nameRules.join('\n')}\n}`)
    }
  }

  return parts.length > 0 ? parts.join('\n\n') : ''
}

/* ─── Main Generator X ──────────────────────────────────────────── */

/**
 * Generate a complete CSS string for IM-style YouTube chat bubbles.
 *
 * The output includes:
 * - :root CSS variables (--chat-*)
 * - Container rules
 * - IM-style layout (flex, avatar, chip, bubble, tail, hide, keyframes)
 * - IM role colors with border and tail overrides
 * - Scrollbar, header, scroll button, engagement, disclaimer rules
 */
export function generateChatCSSX(settings: ChatCSSSettings): string {
  const parts: string[] = []

  // Font @import must come before any CSS variable or rule blocks
  if (settings.fontUrl) {
    parts.push(`@import url('${settings.fontUrl}');\n`)
  }

  const variables = buildCSSVariables(settings)
  if (variables) parts.push(variables)

  if (settings.container) {
    const rules = buildContainerRules(settings.container)
    if (rules) parts.push(rules)
  }

  // IM-specific parts
  const imLayout = buildIMLayoutRules(settings)
  if (imLayout) parts.push(imLayout)

  const imRoleColors = buildIMRoleColorRules(settings)
  if (imRoleColors) parts.push(imRoleColors)

  // Shared utility rules
  if (settings.scrollbar) {
    const rules = buildScrollbarRules(settings.scrollbar)
    if (rules) parts.push(rules)
  }

  if (settings.header) {
    const rules = buildHeaderRules(settings.header)
    if (rules) parts.push(rules)
  }

  if (settings.scrollButton) {
    const rules = buildScrollButtonRules(settings.scrollButton)
    if (rules) parts.push(rules)
  }

  if (settings.engagementMessages) {
    const rules = buildEngagementMessagesRules(settings.engagementMessages)
    if (rules) parts.push(rules)
  }

  if (settings.chatDisclaimer) {
    const rules = buildChatDisclaimerRules(settings.chatDisclaimer)
    if (rules) parts.push(rules)
  }

  return parts.join('\n')
}
