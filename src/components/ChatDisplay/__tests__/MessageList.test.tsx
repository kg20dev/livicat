import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MessageList } from '../MessageList'
import type { YouTubeChatMessage } from '../../../types/youtube'

function makeMessage(id: string, text: string): YouTubeChatMessage {
  return {
    id,
    snippet: {
      displayMessage: text,
      publishedAt: new Date().toISOString(),
    },
    authorDetails: {
      displayName: 'User',
      profileImageUrl: 'https://example.com/avatar.png',
      channelId: 'UC-test',
    },
  }
}

describe('MessageList', () => {
  it('shows waiting state when empty', () => {
    render(<MessageList messages={[]} />)
    expect(screen.getByText('Waiting for messages...')).toBeInTheDocument()
  })

  it('renders messages', () => {
    const messages = [
      makeMessage('1', 'First'),
      makeMessage('2', 'Second'),
    ]
    render(<MessageList messages={messages} />)
    expect(screen.getByText('First')).toBeInTheDocument()
    expect(screen.getByText('Second')).toBeInTheDocument()
  })

  it('limits messages to maxMessages', () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      makeMessage(`${i}`, `Message ${i}`)
    )
    render(<MessageList messages={messages} maxMessages={3} />)
    // Should only show last 3 messages
    expect(screen.getByText('Message 7')).toBeInTheDocument()
    expect(screen.getByText('Message 9')).toBeInTheDocument()
    expect(screen.queryByText('Message 0')).not.toBeInTheDocument()
  })

  it('renders with aria attributes for accessibility', () => {
    const messages = [makeMessage('1', 'Hello')]
    const { container } = render(<MessageList messages={messages} />)
    const list = container.querySelector('[role="log"]')
    expect(list).toBeInTheDocument()
    expect(list).toHaveAttribute('aria-live', 'polite')
    expect(list).toHaveAttribute('aria-label', 'Chat messages')
  })

  it('hides avatars when showAvatars is false', () => {
    const messages = [makeMessage('1', 'Hello')]
    render(<MessageList messages={messages} showAvatars={false} />)
    expect(screen.queryByAltText('User')).not.toBeInTheDocument()
  })

  it('resets scroll tracking when messages are cleared', () => {
    const { rerender } = render(<MessageList messages={[makeMessage('1', 'Hi')]} />)
    expect(screen.getByText('Hi')).toBeInTheDocument()

    // Clear messages
    rerender(<MessageList messages={[]} />)
    expect(screen.getByText('Waiting for messages...')).toBeInTheDocument()
  })
})
