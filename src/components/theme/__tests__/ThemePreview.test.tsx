import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThemePreview } from '../ThemePreview'
import type { SettingDef } from '../../../theme/types'

const mockScheme: SettingDef[] = [
  { key: 'messageBg', type: 'color', label: 'Background', default: '#1a1a1a' },
  { key: 'fontSize', type: 'range', label: 'Font Size', min: 10, max: 48, default: 14, unit: 'px' },
  { key: 'show-avatars', type: 'toggle', label: 'Show Avatars', default: true },
]

const mockSettings = {
  messageBg: '#ff0000',
  fontSize: 20,
  'show-avatars': true,
}

const mockCss = `
.theme-test #author-photo {
  width: 28px;
  height: 28px;
  border-radius: 50%;
}
.theme-test #author-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}
.theme-test #author-name {
  padding: 2px 10px;
  background: var(--messageBg);
  color: #d6baff;
  border-radius: 12px;
}
.theme-test #message {
  padding: 8px 14px;
  border: 2px solid #888;
  border-radius: 12px;
  background: var(--messageBg);
  color: #e5e2e1;
}
`

describe('ThemePreview', () => {
  it('renders messages with theme class wrapper', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={mockSettings}
        scheme={mockScheme}
        backgroundColor="#00b140"
      />
    )

    // Should render theme class on container
    const themeWrapper = container.querySelector('.theme-test')
    expect(themeWrapper).not.toBeNull()

    // Should render messages
    const messages = container.querySelectorAll('[data-role]')
    expect(messages.length).toBeGreaterThan(0)

    // Should have avatar wrapper
    const photos = container.querySelector('#author-photo')
    expect(photos).not.toBeNull()

    // Should have avatar image
    const avatarImgs = container.querySelector('#author-photo img')
    expect(avatarImgs).not.toBeNull()

    // Should have username
    const names = container.querySelector('#author-name')
    expect(names).not.toBeNull()

    // Should have message text
    const messageText = container.querySelector('#message')
    expect(messageText).not.toBeNull()
  })

  it('injects CSS as <style> tag with theme-specific id', () => {
    const { container } = render(
      <ThemePreview themeId="test" themeCss={mockCss} settings={mockSettings} scheme={mockScheme} />
    )

    const styleTag = container.querySelector('#theme-css-test')
    expect(styleTag).not.toBeNull()
    expect(styleTag!.textContent).toContain('--messageBg: #ff0000;')
    expect(styleTag!.textContent).toContain('--fontSize: 20px;')
    expect(styleTag!.textContent).toContain(mockCss.trim())
  })

  it('shows avatars when showAvatars is true', () => {
    const { container } = render(
      <ThemePreview themeId="test" themeCss={mockCss} settings={mockSettings} scheme={mockScheme} />
    )

    const photos = container.querySelector('#author-photo')
    expect(photos).not.toBeNull()
  })

  it('hides avatars when showAvatars is false', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={{ ...mockSettings, 'show-avatars': false }}
        scheme={mockScheme}
      />
    )

    const photos = container.querySelector('#author-photo')
    expect(photos).toBeNull()
  })

  it('uses the provided backgroundColor', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={mockSettings}
        scheme={mockScheme}
        backgroundColor="#00b140"
      />
    )

    const chatMessages = container.querySelector('.livicat-chat-messages') as HTMLElement
    expect(chatMessages).not.toBeNull()
    // Background color is now on parent wrapper div
    const wrapper = chatMessages.parentElement as HTMLElement
    expect(wrapper.style.backgroundColor).toBe('rgb(0, 177, 64)')
  })

  it('renders role-based messages with data-role attribute', () => {
    const { container } = render(
      <ThemePreview themeId="test" themeCss={mockCss} settings={mockSettings} scheme={mockScheme} />
    )

    const ownerMsg = container.querySelector('[data-role="owner"]')
    expect(ownerMsg).not.toBeNull()

    const modMsg = container.querySelector('[data-role="moderator"]')
    expect(modMsg).not.toBeNull()
  })

  it('renders gallery mode with grid layout', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={mockSettings}
        scheme={mockScheme}
        mode="gallery"
      />
    )

    // Should render gallery grid container
    const galleryGrid = container.querySelector('.livicat-gallery-grid')
    expect(galleryGrid).not.toBeNull()

    // Should render gallery cards
    const galleryCards = container.querySelectorAll('.livicat-gallery-card')
    expect(galleryCards.length).toBeGreaterThan(0)

    // Each card should have theme class
    const firstCard = galleryCards[0] as HTMLElement
    expect(firstCard.classList.contains('theme-test')).toBe(true)

    // Should inject gallery-specific styles in one of the style tags
    const styleTags = container.querySelectorAll('style')
    const hasGalleryStyles = Array.from(styleTags).some(
      (style) => style.textContent && style.textContent.includes('livicat-gallery-grid')
    )
    expect(hasGalleryStyles).toBe(true)
  })

  it('renders live mode with vertical stack layout', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={mockSettings}
        scheme={mockScheme}
        mode="live"
      />
    )

    // Should render chat messages container (not gallery grid)
    const chatMessages = container.querySelector('.livicat-chat-messages')
    expect(chatMessages).not.toBeNull()

    // Should not render gallery grid
    const galleryGrid = container.querySelector('.livicat-gallery-grid')
    expect(galleryGrid).toBeNull()

    // Should not inject gallery-specific styles
    const styleTags = container.querySelectorAll('style')
    const hasGalleryStyles = Array.from(styleTags).some(
      (style) => style.textContent && style.textContent.includes('livicat-gallery-grid')
    )
    expect(hasGalleryStyles).toBe(false)
  })
})
