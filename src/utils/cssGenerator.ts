/**
 * CSS Generator for YouTube Live Chat customization
 *
 * Converts a settings object into a CSS string targeting YouTube's live chat
 * DOM structure. All rules use !important to override YouTube's built-in styles.
 *
 * CSS variable naming convention: --chat-*
 */

/* ─── Layout Types ────────────────────────────────────────────── */

export type NameMessageLayout = 'left-right' | 'top-bottom'
export type BackgroundStyle = 'full-block' | 'inline-text'

/* ─── Interfaces ───────────────────────────────────────────────── */

export interface ContainerSettings {
  background?: string
  borderRadius?: string
  padding?: string
  width?: string
  height?: string
}

export interface MessageSettings {
  background?: string
  textColor?: string
  fontSize?: string
  fontFamily?: string
  borderRadius?: string
  padding?: string
  margin?: string
  opacity?: number
}

export interface UsernameSettings {
  color?: string
  fontSize?: string
  fontWeight?: string
}

export interface MessageTextSettings {
  color?: string
  fontSize?: string
}

export interface AvatarSettings {
  width?: string
  height?: string
  borderRadius?: string
  display?: string
}

export interface TimestampSettings {
  color?: string
  fontSize?: string
  display?: string
}

export interface ScrollbarSettings {
  width?: string
  trackColor?: string
  thumbColor?: string
  thumbBorderRadius?: string
}

export interface GeneralSettings {
  fontFamily?: string
  backgroundColor?: string
}

export interface HeaderSettings {
  display?: string
}

export interface ScrollButtonSettings {
  display?: string
  background?: string
  color?: string
  borderRadius?: string
  opacity?: number
}

export interface EngagementMessagesSettings {
  display?: string
}

export interface ChatDisclaimerSettings {
  display?: string
}

export interface AnimationSettings {
  style?: 'default' | 'blink' | 'glowing' | 'fade' | 'slide' | 'bounce'
  speed?: 'none' | 'slow' | 'normal'
}

export interface LayoutSettings {
  nameMessageLayout?: NameMessageLayout
  backgroundStyle?: BackgroundStyle
}

export interface ChatCSSSettings {
  fontUrl?: string
  container?: ContainerSettings
  message?: MessageSettings
  username?: UsernameSettings
  messageText?: MessageTextSettings
  avatar?: AvatarSettings
  timestamp?: TimestampSettings
  header?: HeaderSettings
  scrollButton?: ScrollButtonSettings
  engagementMessages?: EngagementMessagesSettings
  chatDisclaimer?: ChatDisclaimerSettings
  scrollbar?: ScrollbarSettings
  general?: GeneralSettings
  animation?: AnimationSettings
  layout?: LayoutSettings
}

/* ─── CSS Variable Helpers ─────────────────────────────────────── */

/**
 * Build a `:root` block with --chat-* CSS variables from the settings.
 * These act as the single source of truth so individual rule blocks
 * can reference them with var().
 */
function buildCSSVariables(settings: ChatCSSSettings): string {
  const vars: string[] = ['  /* Chat CSS Variables */']

  if (settings.general?.backgroundColor) {
    vars.push(`  --chat-bg: ${settings.general.backgroundColor};`)
  }
  if (settings.general?.fontFamily) {
    vars.push(`  --chat-font-family: ${settings.general.fontFamily};`)
  }

  if (settings.container?.background) {
    vars.push(`  --chat-container-bg: ${settings.container.background};`)
  }
  if (settings.container?.borderRadius) {
    vars.push(`  --chat-container-radius: ${settings.container.borderRadius};`)
  }
  if (settings.container?.padding) {
    vars.push(`  --chat-container-padding: ${settings.container.padding};`)
  }

  if (settings.message?.background) {
    vars.push(`  --chat-msg-bg: ${settings.message.background};`)
  }
  if (settings.message?.textColor) {
    vars.push(`  --chat-msg-color: ${settings.message.textColor};`)
  }
  if (settings.message?.fontSize) {
    vars.push(`  --chat-msg-font-size: ${settings.message.fontSize};`)
  }
  if (settings.message?.fontFamily) {
    vars.push(`  --chat-msg-font-family: ${settings.message.fontFamily};`)
  }
  if (settings.message?.borderRadius) {
    vars.push(`  --chat-msg-radius: ${settings.message.borderRadius};`)
  }
  if (settings.message?.padding) {
    vars.push(`  --chat-msg-padding: ${settings.message.padding};`)
  }
  if (settings.message?.margin) {
    vars.push(`  --chat-msg-margin: ${settings.message.margin};`)
  }
  if (settings.message?.opacity !== undefined) {
    vars.push(`  --chat-msg-opacity: ${settings.message.opacity};`)
  }

  if (settings.username?.color) {
    vars.push(`  --chat-username-color: ${settings.username.color};`)
  }
  if (settings.username?.fontSize) {
    vars.push(`  --chat-username-font-size: ${settings.username.fontSize};`)
  }
  if (settings.username?.fontWeight) {
    vars.push(`  --chat-username-font-weight: ${settings.username.fontWeight};`)
  }

  if (settings.messageText?.color) {
    vars.push(`  --chat-message-color: ${settings.messageText.color};`)
  }
  if (settings.messageText?.fontSize) {
    vars.push(`  --chat-message-font-size: ${settings.messageText.fontSize};`)
  }

  if (settings.avatar?.width) {
    vars.push(`  --chat-avatar-width: ${settings.avatar.width};`)
  }
  if (settings.avatar?.height) {
    vars.push(`  --chat-avatar-height: ${settings.avatar.height};`)
  }
  if (settings.avatar?.borderRadius) {
    vars.push(`  --chat-avatar-radius: ${settings.avatar.borderRadius};`)
  }
  if (settings.avatar?.display) {
    vars.push(`  --chat-avatar-display: ${settings.avatar.display};`)
  }

  if (settings.timestamp?.color) {
    vars.push(`  --chat-timestamp-color: ${settings.timestamp.color};`)
  }
  if (settings.timestamp?.fontSize) {
    vars.push(`  --chat-timestamp-font-size: ${settings.timestamp.fontSize};`)
  }
  if (settings.timestamp?.display) {
    vars.push(`  --chat-timestamp-display: ${settings.timestamp.display};`)
  }

  if (settings.scrollbar?.width) {
    vars.push(`  --chat-scrollbar-width: ${settings.scrollbar.width};`)
  }
  if (settings.scrollbar?.trackColor) {
    vars.push(`  --chat-scrollbar-track: ${settings.scrollbar.trackColor};`)
  }
  if (settings.scrollbar?.thumbColor) {
    vars.push(`  --chat-scrollbar-thumb: ${settings.scrollbar.thumbColor};`)
  }
  if (settings.scrollbar?.thumbBorderRadius) {
    vars.push(`  --chat-scrollbar-thumb-radius: ${settings.scrollbar.thumbBorderRadius};`)
  }

  if (vars.length === 1) return '' // only the comment, no vars

  return `:root {\n${vars.join('\n')}\n}\n`
}

/* ─── Rule Generators ──────────────────────────────────────────── */

function buildContainerRules(settings: ContainerSettings): string {
  const rules: string[] = []

  if (settings.background) rules.push(`  background: ${settings.background} !important;`)
  if (settings.borderRadius) rules.push(`  border-radius: ${settings.borderRadius} !important;`)
  if (settings.padding) rules.push(`  padding: ${settings.padding} !important;`)
  if (settings.width) rules.push(`  width: ${settings.width} !important;`)
  if (settings.height) rules.push(`  height: ${settings.height} !important;`)

  if (rules.length === 0) return ''

  return `#contents, #chat {\n${rules.join('\n')}\n}\n`
}

function buildMessageRules(settings: MessageSettings): string {
  const rules: string[] = []

  if (settings.background) rules.push(`  background: var(--chat-msg-bg) !important;`)
  if (settings.textColor) rules.push(`  color: var(--chat-msg-color) !important;`)
  if (settings.fontSize) rules.push(`  font-size: var(--chat-msg-font-size) !important;`)
  if (settings.fontFamily) rules.push(`  font-family: var(--chat-msg-font-family) !important;`)
  if (settings.borderRadius) rules.push(`  border-radius: var(--chat-msg-radius) !important;`)
  if (settings.padding) rules.push(`  padding: var(--chat-msg-padding) !important;`)
  if (settings.margin) rules.push(`  margin: var(--chat-msg-margin) !important;`)
  if (settings.opacity !== undefined) rules.push(`  opacity: var(--chat-msg-opacity);`)

  if (rules.length === 0) return ''

  return `yt-live-chat-text-message-renderer {\n${rules.join('\n')}\n}\n`
}

function buildUsernameRules(settings: UsernameSettings): string {
  const rules: string[] = []

  if (settings.color) rules.push(`  color: var(--chat-username-color) !important;`)
  if (settings.fontSize) rules.push(`  font-size: var(--chat-username-font-size) !important;`)
  if (settings.fontWeight) rules.push(`  font-weight: var(--chat-username-font-weight) !important;`)

  if (rules.length === 0) return ''

  return `#author-name {\n${rules.join('\n')}\n}\n`
}

function buildMessageTextRules(settings: MessageTextSettings): string {
  const rules: string[] = []

  if (settings.color) rules.push(`  color: var(--chat-message-color) !important;`)
  if (settings.fontSize) {
    rules.push(`  font-size: var(--chat-message-font-size) !important;`)
    rules.push(`  line-height: 1.5 !important;`)
  }

  if (rules.length === 0) return ''

  return `#message {\n${rules.join('\n')}\n}\n`
}

function buildAvatarRules(settings: AvatarSettings): string {
  const rules: string[] = []

  if (settings.width) rules.push(`  width: var(--chat-avatar-width) !important;`)
  if (settings.height) rules.push(`  height: var(--chat-avatar-height) !important;`)
  if (settings.borderRadius) rules.push(`  border-radius: var(--chat-avatar-radius) !important;`)
  if (settings.display) rules.push(`  display: var(--chat-avatar-display) !important;`)

  if (rules.length === 0) return ''

  return `#author-photo img {\n${rules.join('\n')}\n}\n`
}

function buildTimestampRules(settings: TimestampSettings): string {
  const rules: string[] = []

  if (settings.color) rules.push(`  color: var(--chat-timestamp-color) !important;`)
  if (settings.fontSize) rules.push(`  font-size: var(--chat-timestamp-font-size) !important;`)
  if (settings.display) rules.push(`  display: var(--chat-timestamp-display) !important;`)

  if (rules.length === 0) return ''

  return `.timestamp, #timestamp {\n${rules.join('\n')}\n}\n`
}

function buildScrollbarRules(settings: ScrollbarSettings): string {
  const parts: string[] = []

  if (settings.width || settings.trackColor) {
    const trackRules: string[] = []
    if (settings.width) trackRules.push(`  width: var(--chat-scrollbar-width) !important;`)
    if (settings.trackColor)
      trackRules.push(`  background: var(--chat-scrollbar-track) !important;`)
    if (trackRules.length > 0) {
      parts.push(`#chat::-webkit-scrollbar-track {\n${trackRules.join('\n')}\n}`)
    }
  }

  if (settings.thumbColor || settings.thumbBorderRadius) {
    const thumbRules: string[] = []
    if (settings.thumbColor)
      thumbRules.push(`  background: var(--chat-scrollbar-thumb) !important;`)
    if (settings.thumbBorderRadius)
      thumbRules.push(`  border-radius: var(--chat-scrollbar-thumb-radius) !important;`)
    if (thumbRules.length > 0) {
      parts.push(`#chat::-webkit-scrollbar-thumb {\n${thumbRules.join('\n')}\n}`)
    }
  }

  if (parts.length === 0) return ''

  return `#chat::-webkit-scrollbar {\n  width: var(--chat-scrollbar-width, 8px) !important;\n}\n${parts.join('\n')}\n`
}

function buildHeaderRules(settings: HeaderSettings): string {
  const rules: string[] = []

  if (settings.display) rules.push(`  display: ${settings.display} !important;`)

  if (rules.length === 0) return ''

  return `yt-live-chat-header-renderer {\n${rules.join('\n')}\n}\n`
}

function buildScrollButtonRules(settings: ScrollButtonSettings): string {
  const rules: string[] = []
  if (settings.display) rules.push(`  display: ${settings.display} !important;`)
  if (settings.background) rules.push(`  background: ${settings.background} !important;`)
  if (settings.color) rules.push(`  color: ${settings.color} !important;`)
  if (settings.borderRadius) rules.push(`  border-radius: ${settings.borderRadius} !important;`)
  if (settings.opacity !== undefined) rules.push(`  opacity: ${settings.opacity} !important;`)
  if (rules.length === 0) return ''
  return `yt-live-chat-renderer yt-icon-button,\n#chat-scroll-button {\n${rules.join('\n')}\n}\n`
}

function buildEngagementMessagesRules(settings: EngagementMessagesSettings): string {
  const rules: string[] = []

  if (settings.display) rules.push(`  display: ${settings.display} !important;`)

  if (rules.length === 0) return ''

  return `yt-live-chat-viewer-engagement-message-renderer {\n${rules.join('\n')}\n}\n`
}

function buildChatDisclaimerRules(settings: ChatDisclaimerSettings): string {
  const rules: string[] = []

  if (settings.display) rules.push(`  display: ${settings.display} !important;`)

  if (rules.length === 0) return ''

  return `#input-panel.style-scope.yt-live-chat-renderer {\n${rules.join('\n')}\n}\n`
}

function buildAnimationRules(settings: AnimationSettings): string {
  const parts: string[] = []

  // Map animation speeds to durations
  const speedMap: Record<string, string> = {
    none: '0s',
    slow: '1.5s',
    normal: '0.8s',
  }

  const duration = settings.speed ? speedMap[settings.speed] : '0.8s'

  // Define keyframes for each animation style
  const keyframes: Record<string, string> = {
    blink: `@keyframes livicat-blink {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}`,
    glowing: `@keyframes livicat-glowing {
  0% { 
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
  50% { 
    box-shadow: 0 0 20px rgba(255, 255, 255, 0.4), 0 0 30px rgba(255, 255, 255, 0.2);
  }
  100% { 
    box-shadow: 0 0 5px rgba(255, 255, 255, 0.1);
  }
}`,
    fade: `@keyframes livicat-fade {
  from { 
    opacity: 0;
    transform: translateY(-10px);
  }
  to { 
    opacity: var(--chat-msg-opacity, 1);
    transform: translateY(0);
  }
}`,
    slide: `@keyframes livicat-slide {
  from { 
    transform: translateX(-20px);
    opacity: 0;
  }
  to { 
    transform: translateX(0);
    opacity: var(--chat-msg-opacity, 1);
  }
}`,
    bounce: `@keyframes livicat-bounce {
  0% { 
    transform: scale(0.95);
  }
  50% { 
    transform: scale(1.02);
  }
  100% { 
    transform: scale(1);
  }
}`,
  }

  // Apply animation based on style
  if (settings.style && settings.style !== 'default') {
    const animationName = `livicat-${settings.style}`

    // Add keyframes
    if (keyframes[settings.style]) {
      parts.push(keyframes[settings.style])
    }

    // Build animation rule
    const rules: string[] = []

    // Base animation properties
    rules.push(`  animation: ${animationName} ${duration} ease-out !important;`)

    // Style-specific additions
    if (settings.style === 'glowing') {
      rules.push(`  transition: box-shadow ${duration} ease-out !important;`)
    }
    if (settings.style === 'fade' || settings.style === 'slide') {
      rules.push(`  transform: translateZ(0);`) // Enable hardware acceleration (no !important — animation keyframes must override transform)
    }

    parts.push(`yt-live-chat-text-message-renderer {\n${rules.join('\n')}\n}`)
  }

  return parts.join('\n\n')
}

function buildLayoutRules(settings: LayoutSettings): string {
  const parts: string[] = []

  /*
   * Name & Message Layout ──────────────────────────────────
   * Controls whether author name and message appear side-by-side
   * (left-right, YouTube default) or stacked (top-bottom).
   *
   * Left-right: uses flexbox on the parent renderer so all children
   * (avatar, #content, #before-content-buttons, #menu) are flex items
   * and flow inline in natural DOM order — no display:contents or
   * CSS order needed.
   *
   * Top-bottom: message is block-level with margin-top so it always
   * stacks below the name line, regardless of inline-text background.
   */
  if (settings.nameMessageLayout === 'left-right') {
    parts.push(`yt-live-chat-text-message-renderer {
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: wrap !important;
  align-items: center !important;
  column-gap: 4px !important;
  direction: ltr !important;
}
/* Keep #content as a normal flex item — its children flow inline naturally */
#author-photo {
  flex-shrink: 0 !important;
}`)
  } else if (settings.nameMessageLayout === 'top-bottom') {
    // Message always stacks below name in top-bottom mode
    // author-chip only becomes inline when combined with inline-text (see below)
    parts.push(`#message {
  display: block !important;
  margin-top: 6px !important;
}`)
  }

  /*
   * Background Card Area ────────────────────────────────────
   * Controls whether the message background fills the entire
   * block (full-block, current default) or only wraps the text
   * content (inline-text).
   */
  if (settings.backgroundStyle === 'inline-text') {
    let inlineTextCSS = `yt-live-chat-text-message-renderer {
  background: transparent !important;
  padding: 0 !important;
  border-radius: 0 !important;
  border: none !important;
}
#author-name {
  display: inline-block !important;
  background: var(--chat-msg-bg) !important;
  border-radius: var(--chat-msg-radius) !important;
  padding: 2px 6px !important;
}
#message {
  background: var(--chat-msg-bg) !important;
  border-radius: var(--chat-msg-radius) !important;
  padding: 2px 6px !important;
}`

    // When combined with top-bottom, make author-chip inline-flex so
    // #before-content-buttons sits next to the name on the same line.
    // Both use inline-flex + align-items:center + vertical-align:middle
    // so the badge and name are perfectly centered horizontally.
    if (settings.nameMessageLayout === 'top-bottom') {
      inlineTextCSS =
        `yt-live-chat-author-chip {
  display: inline-flex !important;
  align-items: center !important;
  vertical-align: middle !important;
}
#before-content-buttons {
  display: inline-flex !important;
  align-items: center !important;
  vertical-align: middle !important;
}
` + inlineTextCSS
    }

    parts.push(inlineTextCSS)
  }

  return parts.join('\n\n')
}

/* ─── Main Generator ───────────────────────────────────────────── */

/**
 * Generate a complete CSS string from a ChatCSSSettings object.
 *
 * The output includes:
 * - :root CSS variables (--chat-*)
 * - YouTube chat container rules (#contents, #chat)
 * - Message rules (yt-live-chat-text-message-renderer)
 * - Username rules (#author-name)
 * - Message text rules (#message)
 * - Avatar rules (#author-photo img)
 * - Timestamp rules (.timestamp, #timestamp)
 * - Scrollbar rules (#chat::-webkit-scrollbar-*)
 *
 * All rules use !important to override YouTube's built-in styles.
 */
export function generateChatCSS(settings: ChatCSSSettings): string {
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

  if (settings.message) {
    const rules = buildMessageRules(settings.message)
    if (rules) parts.push(rules)
  }

  if (settings.username) {
    const rules = buildUsernameRules(settings.username)
    if (rules) parts.push(rules)
  }

  if (settings.messageText) {
    const rules = buildMessageTextRules(settings.messageText)
    if (rules) parts.push(rules)
  }

  if (settings.avatar) {
    const rules = buildAvatarRules(settings.avatar)
    if (rules) parts.push(rules)
  }

  if (settings.timestamp) {
    const rules = buildTimestampRules(settings.timestamp)
    if (rules) parts.push(rules)
  }

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

  if (settings.animation) {
    const rules = buildAnimationRules(settings.animation)
    if (rules) parts.push(rules)
  }

  if (settings.layout) {
    const rules = buildLayoutRules(settings.layout)
    if (rules) parts.push(rules)
  }

  return parts.join('\n')
}
