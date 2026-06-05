import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatMessage } from '../ChatMessage'
import type { YouTubeChatMessage } from '../../../types/youtube'

const baseMessage: YouTubeChatMessage = {
  id: 'msg-1',
  snippet: {
    displayMessage: 'Hello, world!',
    publishedAt: '2024-01-15T10:30:00Z',
  },
  authorDetails: {
    displayName: 'TestUser',
    profileImageUrl: 'https://example.com/avatar.png',
    channelId: 'UC-test',
  },
}

describe('ChatMessage', () => {
  it('renders author display name', () => {
    render(<ChatMessage message={baseMessage} />)
    expect(screen.getByText('TestUser')).toBeInTheDocument()
  })

  it('renders message text', () => {
    render(<ChatMessage message={baseMessage} />)
    expect(screen.getByText('Hello, world!')).toBeInTheDocument()
  })

  it('renders avatar image with correct alt text', () => {
    render(<ChatMessage message={baseMessage} />)
    const img = screen.getByAltText('TestUser')
    expect(img).toBeInTheDocument()
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.png')
  })

  it('renders timestamp in 12-hour format', () => {
    render(<ChatMessage message={baseMessage} showTimestamp={true} />)
    // Time should match HH:MM AM/PM format
    expect(screen.getByText(/^\d{2}:\d{2} (AM|PM)$/)).toBeInTheDocument()
  })

  it('hides avatar when showAvatar is false', () => {
    render(<ChatMessage message={baseMessage} showAvatar={false} />)
    expect(screen.queryByAltText('TestUser')).not.toBeInTheDocument()
  })

  it('hides timestamp when showTimestamp is false', () => {
    render(<ChatMessage message={baseMessage} showTimestamp={false} />)
    expect(screen.queryByText(/10:30/)).not.toBeInTheDocument()
  })

  it('renders with custom style prop', () => {
    const { container } = render(
      <ChatMessage message={baseMessage} style={{ padding: '20px' }} />
    )
    const div = container.firstChild as HTMLElement
    expect(div.style.padding).toBe('20px')
  })

  it('handles message with special characters', () => {
    const specialMessage: YouTubeChatMessage = {
      ...baseMessage,
      snippet: {
        ...baseMessage.snippet,
        displayMessage: '<script>alert("xss")</script> 🎉',
      },
    }
    render(<ChatMessage message={specialMessage} />)
    expect(screen.getByText(/<script>/)).toBeInTheDocument()
    expect(screen.getByText(/🎉/)).toBeInTheDocument()
  })
})
