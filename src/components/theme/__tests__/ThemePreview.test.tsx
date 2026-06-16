import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { ThemePreview } from '../ThemePreview'
import type { SettingDef } from '../../theme/types'

const mockScheme: SettingDef[] = [
  { key: 'messageBg', type: 'color', label: 'Background', default: '#1a1a1a' },
  { key: 'fontSize', type: 'range', label: 'Font Size', min: 10, max: 48, default: 14, unit: 'px' },
  { key: 'showAvatars', type: 'toggle', label: 'Show Avatars', default: true },
]

const mockSettings = {
  messageBg: '#ff0000',
  fontSize: 20,
  showAvatars: true,
}

const mockCss = `
.theme-test #author-photo {
  width: 28px;
  height: 28px;
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

    // Should have avatar
    const avatars = container.querySelector('#author-photo')
    expect(avatars).not.toBeNull()

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

    const avatars = container.querySelector('#author-photo')
    expect(avatars).not.toBeNull()
  })

  it('hides avatars when showAvatars is false', () => {
    const { container } = render(
      <ThemePreview
        themeId="test"
        themeCss={mockCss}
        settings={{ ...mockSettings, showAvatars: false }}
        scheme={mockScheme}
      />
    )

    const avatars = container.querySelector('#author-photo')
    expect(avatars).toBeNull()
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
    expect(chatMessages.style.backgroundColor).toBe('rgb(0, 177, 64)')
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
})
