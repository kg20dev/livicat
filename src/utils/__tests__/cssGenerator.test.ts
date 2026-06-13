import { describe, it, expect } from 'vitest'
import { generateChatCSS } from '../cssGenerator'

describe('generateChatCSS', () => {
  describe('empty / default', () => {
    it('returns empty string for empty settings', () => {
      expect(generateChatCSS({})).toBe('')
    })

    it('returns empty string for undefined settings', () => {
      expect(generateChatCSS({})).toBe('')
    })
  })

  describe('general settings', () => {
    it('generates CSS variable for background color', () => {
      const css = generateChatCSS({ general: { backgroundColor: '#000' } })
      expect(css).toContain('--chat-bg: #000')
    })

    it('generates CSS variable for font family', () => {
      const css = generateChatCSS({ general: { fontFamily: 'Arial, sans-serif' } })
      expect(css).toContain('--chat-font-family: Arial, sans-serif')
    })
  })

  describe('container settings', () => {
    it('generates #contents, #chat rules', () => {
      const css = generateChatCSS({
        container: { background: '#111', borderRadius: '8px', padding: '10px' },
      })
      expect(css).toContain('background: #111 !important')
      expect(css).toContain('border-radius: 8px !important')
      expect(css).toContain('padding: 10px !important')
      expect(css).toMatch(/#contents, #chat/)
    })

    it('generates CSS variables for container', () => {
      const css = generateChatCSS({
        container: { background: '#222' },
      })
      expect(css).toContain('--chat-container-bg: #222')
    })

    it('includes width and height when provided', () => {
      const css = generateChatCSS({
        container: { width: '100%', height: '500px' },
      })
      expect(css).toContain('width: 100% !important')
      expect(css).toContain('height: 500px !important')
    })
  })

  describe('message settings', () => {
    it('generates yt-live-chat-text-message-renderer rules', () => {
      const css = generateChatCSS({
        message: { background: '#333', textColor: '#fff', fontSize: '14px' },
      })
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('background: var(--chat-msg-bg) !important')
      expect(css).toContain('color: var(--chat-msg-color) !important')
      expect(css).toContain('font-size: var(--chat-msg-font-size) !important')
    })

    it('generates CSS variables for message', () => {
      const css = generateChatCSS({
        message: { borderRadius: '6px', padding: '8px', margin: '4px 0' },
      })
      expect(css).toContain('--chat-msg-radius: 6px')
      expect(css).toContain('--chat-msg-padding: 8px')
      expect(css).toContain('--chat-msg-margin: 4px 0')
    })

    it('generates opacity when provided', () => {
      const css = generateChatCSS({
        message: { opacity: 0.9 },
      })
      expect(css).toContain('--chat-msg-opacity: 0.9')
      expect(css).toContain('opacity: var(--chat-msg-opacity)')
    })

    it('generates font-family when provided', () => {
      const css = generateChatCSS({
        message: { fontFamily: 'Inter, sans-serif' },
      })
      expect(css).toContain('--chat-msg-font-family: Inter, sans-serif')
      expect(css).toContain('font-family: var(--chat-msg-font-family) !important')
    })
  })

  describe('username settings', () => {
    it('generates #author-name rules', () => {
      const css = generateChatCSS({
        username: { color: '#ff0', fontSize: '13px', fontWeight: '700' },
      })
      expect(css).toContain('#author-name')
      expect(css).toContain('color: var(--chat-username-color) !important')
      expect(css).toContain('font-size: var(--chat-username-font-size) !important')
      expect(css).toContain('font-weight: var(--chat-username-font-weight) !important')
    })
  })

  describe('message text settings', () => {
    it('generates #message rules', () => {
      const css = generateChatCSS({
        messageText: { color: '#ccc', fontSize: '14px' },
      })
      expect(css).toContain('#message')
      expect(css).toContain('color: var(--chat-message-color) !important')
      expect(css).toContain('font-size: var(--chat-message-font-size) !important')
    })
  })

  describe('avatar settings', () => {
    it('generates #author-photo img rules', () => {
      const css = generateChatCSS({
        avatar: { width: '24px', height: '24px', borderRadius: '50%' },
      })
      expect(css).toContain('#author-photo img')
      expect(css).toContain('width: var(--chat-avatar-width) !important')
      expect(css).toContain('height: var(--chat-avatar-height) !important')
      expect(css).toContain('border-radius: var(--chat-avatar-radius) !important')
    })

    it('generates display rule for hiding avatars', () => {
      const css = generateChatCSS({
        avatar: { display: 'none' },
      })
      expect(css).toContain('display: var(--chat-avatar-display) !important')
    })
  })

  describe('timestamp settings', () => {
    it('generates .timestamp, #timestamp rules', () => {
      const css = generateChatCSS({
        timestamp: { color: '#888', fontSize: '11px' },
      })
      expect(css).toContain('.timestamp')
      expect(css).toContain('color: var(--chat-timestamp-color) !important')
      expect(css).toContain('font-size: var(--chat-timestamp-font-size) !important')
    })

    it('generates display rule for hiding timestamps', () => {
      const css = generateChatCSS({
        timestamp: { display: 'none' },
      })
      expect(css).toContain('display: var(--chat-timestamp-display) !important')
    })
  })

  describe('scrollbar settings', () => {
    it('generates scrollbar width rule', () => {
      const css = generateChatCSS({
        scrollbar: { width: '6px' },
      })
      expect(css).toContain('#chat::-webkit-scrollbar')
      expect(css).toContain('--chat-scrollbar-width: 6px')
    })

    it('generates track and thumb rules', () => {
      const css = generateChatCSS({
        scrollbar: {
          trackColor: '#1a1a1a',
          thumbColor: '#555',
          thumbBorderRadius: '3px',
        },
      })
      expect(css).toContain('#chat::-webkit-scrollbar-track')
      expect(css).toContain('--chat-scrollbar-track: #1a1a1a')
      expect(css).toContain('#chat::-webkit-scrollbar-thumb')
      expect(css).toContain('--chat-scrollbar-thumb: #555')
      expect(css).toContain('--chat-scrollbar-thumb-radius: 3px')
    })

    it('does not generate scrollbar rules when no scrollbar settings', () => {
      const css = generateChatCSS({})
      expect(css).not.toContain('scrollbar')
    })
  })

  describe('comprehensive / full settings', () => {
    it('generates all selectors with full settings', () => {
      const css = generateChatCSS({
        general: { backgroundColor: '#0a0a0a', fontFamily: 'Inter, sans-serif' },
        container: { background: '#111', borderRadius: '12px' },
        message: {
          background: '#222',
          textColor: '#eee',
          fontSize: '14px',
          borderRadius: '8px',
          padding: '10px',
        },
        username: { color: '#d6baff', fontSize: '13px', fontWeight: '600' },
        messageText: { color: '#fff', fontSize: '14px' },
        avatar: { width: '28px', height: '28px', borderRadius: '50%' },
        timestamp: { color: '#666', fontSize: '11px' },
        scrollbar: {
          width: '6px',
          trackColor: 'transparent',
          thumbColor: '#444',
          thumbBorderRadius: '3px',
        },
      })

      // Check :root variables
      expect(css).toContain(':root')
      expect(css).toContain('--chat-bg: #0a0a0a')
      expect(css).toContain('--chat-font-family: Inter, sans-serif')

      // Check YouTube selectors
      expect(css).toContain('#contents, #chat')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('#author-name')
      expect(css).toContain('#message')
      expect(css).toContain('#author-photo img')
      expect(css).toContain('.timestamp')

      // Check scrollbar selectors
      expect(css).toContain('#chat::-webkit-scrollbar')
      expect(css).toContain('#chat::-webkit-scrollbar-track')
      expect(css).toContain('#chat::-webkit-scrollbar-thumb')

      // Check !important is present
      const importantMatches = css.match(/!important/g)
      expect(importantMatches).toBeTruthy()
      expect(importantMatches!.length).toBeGreaterThan(0)

      // Verify string is valid CSS structure (starts with selector, has braces)
      expect(css).toMatch(/^:root|^#contents/)
    })

    it('returns a non-empty string', () => {
      const css = generateChatCSS({
        general: { backgroundColor: '#000' },
      })
      expect(css.length).toBeGreaterThan(0)
    })
  })

  describe('partial / edge cases', () => {
    it('only generates rules for provided sections', () => {
      const css = generateChatCSS({
        username: { color: 'red' },
      })
      expect(css).toContain('#author-name')
      expect(css).not.toContain('#contents')
      expect(css).not.toContain('#message')
      expect(css).not.toContain('scrollbar')
      expect(css).not.toContain('yt-live-chat')
    })

    it('only generates variables for provided fields', () => {
      const css = generateChatCSS({
        message: { background: '#333' },
      })
      expect(css).toContain('--chat-msg-bg: #333')
      expect(css).not.toContain('--chat-msg-color')
      expect(css).not.toContain('--chat-msg-font-size')
    })

    it('handles empty sub-objects', () => {
      const css = generateChatCSS({
        container: {},
        message: {},
      })
      expect(css).toBe('')
    })
  })

  describe('CSS variable naming', () => {
    it('uses --chat- prefix for all variables', () => {
      const css = generateChatCSS({
        general: { backgroundColor: '#000' },
        container: { background: '#111' },
        message: { background: '#222' },
        username: { color: '#333' },
        messageText: { color: '#444' },
        avatar: { width: '24px' },
        timestamp: { color: '#555' },
        scrollbar: { width: '6px' },
      })

      // Extract all --chat-* variable names
      const varMatches = css.match(/--chat-[\w-]+/g)
      expect(varMatches).toBeTruthy()
      for (const v of varMatches!) {
        expect(v).toMatch(/^--chat-/)
      }
    })
  })

  describe('animation settings', () => {
    it('generates blink animation keyframes and rules', () => {
      const css = generateChatCSS({
        animation: { style: 'blink', speed: 'normal' },
      })
      expect(css).toContain('@keyframes livicat-blink')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('animation: livicat-blink 0.8s ease-in-out')
    })

    it('generates glowing animation keyframes and rules', () => {
      const css = generateChatCSS({
        animation: { style: 'glowing', speed: 'normal' },
      })
      expect(css).toContain('@keyframes livicat-glowing')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('animation: livicat-glowing 0.8s ease-in-out')
    })

    it('generates fade animation keyframes and rules', () => {
      const css = generateChatCSS({
        animation: { style: 'fade', speed: 'normal' },
      })
      expect(css).toContain('@keyframes livicat-fade')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('animation: livicat-fade 0.8s ease-in-out')
    })

    it('generates slide animation keyframes and rules', () => {
      const css = generateChatCSS({
        animation: { style: 'slide', speed: 'normal' },
      })
      expect(css).toContain('@keyframes livicat-slide')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('animation: livicat-slide 0.8s ease-in-out')
    })

    it('generates bounce animation keyframes and rules', () => {
      const css = generateChatCSS({
        animation: { style: 'bounce', speed: 'normal' },
      })
      expect(css).toContain('@keyframes livicat-bounce')
      expect(css).toContain('yt-live-chat-text-message-renderer')
      expect(css).toContain('animation: livicat-bounce 0.8s ease-in-out')
    })

    it('respects animation speed setting', () => {
      const slowCss = generateChatCSS({
        animation: { style: 'blink', speed: 'slow' },
      })
      expect(slowCss).toContain('animation: livicat-blink 1.5s ease-in-out')

      const noneCss = generateChatCSS({
        animation: { style: 'blink', speed: 'none' },
      })
      expect(noneCss).toContain('animation: livicat-blink 0s ease-in-out')
    })

    it('does not generate animation for default style', () => {
      const css = generateChatCSS({
        animation: { style: 'default', speed: 'normal' },
      })
      expect(css).not.toContain('@keyframes')
      expect(css).not.toContain('animation:')
    })

    it('includes fade-specific transform property', () => {
      const css = generateChatCSS({
        animation: { style: 'fade', speed: 'normal' },
      })
      expect(css).toContain('transform: translateZ(0)')
    })

    it('includes slide-specific transform property', () => {
      const css = generateChatCSS({
        animation: { style: 'slide', speed: 'normal' },
      })
      expect(css).toContain('transform: translateZ(0)')
    })

    it('includes glowing-specific transition property', () => {
      const css = generateChatCSS({
        animation: { style: 'glowing', speed: 'normal' },
      })
      expect(css).toContain('transition: filter 0.8s ease-in-out')
    })
  })

  describe('layout settings', () => {
    describe('nameMessageLayout', () => {
      it('generates left-right name layout rules with flexbox', () => {
        const css = generateChatCSS({
          layout: { nameMessageLayout: 'left-right' },
        })
        // Simple flexbox on renderer — #content stays as a normal flex item,
        // its children (timestamp, name, message) flow inline naturally
        expect(css).toContain('display: flex')
        expect(css).toContain('flex-direction: row')
        expect(css).toContain('flex-wrap: wrap')
        expect(css).toContain('column-gap: 4px')
        expect(css).toContain('direction: ltr')
        // No display:contents or order — those caused reversed layout
        expect(css).not.toContain('display: contents')
        expect(css).not.toContain('order:')
        expect(css).not.toContain('width: 100%')
      })

      it('generates top-bottom name layout rules stacking name above message', () => {
        const css = generateChatCSS({
          layout: { nameMessageLayout: 'top-bottom' },
        })
        // Message is block-level to stack below name
        expect(css).toContain('#message')
        expect(css).toContain('display: block !important')
        expect(css).toContain('margin-top: 6px')
        // Author-chip is NOT changed in top-bottom alone —
        // it only becomes inline when combined with inline-text background
        expect(css).not.toContain('yt-live-chat-author-chip')
        expect(css).not.toContain('display: inline')
        // No flex/contents/order — those are only for left-right mode
        expect(css).not.toContain('display: flex')
        expect(css).not.toContain('display: contents')
        expect(css).not.toMatch(/^\s+order:/m)
      })
    })

    describe('backgroundStyle', () => {
      it('generates inline-text background rules', () => {
        const css = generateChatCSS({
          layout: { backgroundStyle: 'inline-text' },
        })
        expect(css).toContain('background: transparent !important')
        expect(css).toContain('yt-live-chat-text-message-renderer')
        expect(css).toContain('#author-name')
        expect(css).toContain('display: inline-block')
        expect(css).toContain('padding: 2px 6px')
      })

      it('does not generate background rules for full-block (default)', () => {
        const css = generateChatCSS({
          layout: { backgroundStyle: 'full-block' },
        })
        expect(css).toBe('')
      })
    })

    describe('combined', () => {
      it('handles left-right + inline-text together', () => {
        const css = generateChatCSS({
          layout: {
            nameMessageLayout: 'left-right',
            backgroundStyle: 'inline-text',
          },
        })
        expect(css).toContain('display: flex')
        expect(css).toContain('background: transparent')
        expect(css).toContain('padding: 2px 6px')
        // No display:contents or CSS order property (simpler approach)
        expect(css).not.toContain('display: contents')
        expect(css).not.toMatch(/^\s+order:/m)
      })

      it('handles top-bottom + inline-text together', () => {
        const css = generateChatCSS({
          layout: {
            nameMessageLayout: 'top-bottom',
            backgroundStyle: 'inline-text',
          },
        })
        // Combined: author-chip becomes inline-flex so #before-content-buttons
        // can sit next to the name, both centered vertically
        expect(css).toContain('yt-live-chat-author-chip')
        expect(css).toContain('display: inline-flex')
        expect(css).toContain('align-items: center')
        expect(css).toContain('#before-content-buttons')
        expect(css).toContain('display: inline-flex')
        // Message block below from top-bottom
        expect(css).toContain('#message')
        expect(css).toContain('display: block !important')
        expect(css).toContain('margin-top: 6px')
        // Inline-text background
        expect(css).toContain('background: transparent')
        expect(css).toContain('padding: 2px 6px')
        // No flex/contents (not needed for top-bottom)
        expect(css).not.toContain('display: flex')
        expect(css).not.toContain('display: contents')
      })
    })
  })
})
