import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChatDisplay } from '../ChatDisplay'
import { ConnectionStatus } from '../../../services/YouTubeService'
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

describe('ChatDisplay', () => {
  it('renders header', () => {
    render(<ChatDisplay />)
    expect(screen.getByText('Live Chat')).toBeInTheDocument()
  })

  it('shows empty state when disconnected and no messages', () => {
    render(
      <ChatDisplay
        connectionStatus={ConnectionStatus.DISCONNECTED}
        messageCount={0}
      />
    )
    expect(screen.getByText('No messages yet')).toBeInTheDocument()
  })

  it('shows connecting state', () => {
    render(
      <ChatDisplay
        connectionStatus={ConnectionStatus.CONNECTING}
        messageCount={0}
      />
    )
    expect(screen.getByText('Connecting to chat...')).toBeInTheDocument()
  })

  it('shows error state', () => {
    render(
      <ChatDisplay
        connectionStatus={ConnectionStatus.ERROR}
        error="API key invalid"
        messageCount={0}
      />
    )
    expect(screen.getByText('API key invalid')).toBeInTheDocument()
  })

  it('shows error state from error prop even when connected', () => {
    render(
      <ChatDisplay
        connectionStatus={ConnectionStatus.CONNECTED}
        error="Polling failed"
        messageCount={0}
      />
    )
    expect(screen.getByText('Polling failed')).toBeInTheDocument()
  })

  it('shows Live status and message count when connected with messages', () => {
    const messages = [makeMessage('1', 'Hello')]
    render(
      <ChatDisplay
        messages={messages}
        connectionStatus={ConnectionStatus.CONNECTED}
        messageCount={1}
      />
    )
    expect(screen.getByText('Live')).toBeInTheDocument()
    // Message count appears in both the status bar and footer
    const countElements = screen.getAllByText('1 message')
    expect(countElements.length).toBe(2)
  })

  it('shows plural message count', () => {
    const messages = [
      makeMessage('1', 'Hello'),
      makeMessage('2', 'World'),
    ]
    render(
      <ChatDisplay
        messages={messages}
        connectionStatus={ConnectionStatus.CONNECTED}
        messageCount={2}
      />
    )
    const countElements = screen.getAllByText('2 messages')
    expect(countElements.length).toBe(2)
  })

  it('renders messages when provided', () => {
    const messages = [makeMessage('1', 'Test message content')]
    render(<ChatDisplay messages={messages} />)
    expect(screen.getByText('Test message content')).toBeInTheDocument()
  })

  it('shows that only last N messages are displayed', () => {
    const messages = Array.from({ length: 150 }, (_, i) =>
      makeMessage(`${i}`, `Msg ${i}`)
    )
    render(
      <ChatDisplay
        messages={messages}
        maxMessages={100}
        messageCount={150}
      />
    )
    expect(screen.getByText(/Showing last 100 of 150 messages/)).toBeInTheDocument()
  })
})
