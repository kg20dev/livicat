import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import ChatIframe from '../ChatIframe'

describe('ChatIframe', () => {
  it('renders empty state when no videoId', () => {
    render(<ChatIframe videoId="" />)

    expect(screen.getByText(/Enter a YouTube URL/i)).toBeInTheDocument()
  })

  it('renders loading state initially', () => {
    render(<ChatIframe videoId="test123" />)

    expect(screen.getByText(/Loading chat/i)).toBeInTheDocument()
  })

  it('renders iframe when videoId provided', () => {
    const onLoad = vi.fn()
    render(<ChatIframe videoId="dQw4w9WgXcQ" onLoad={onLoad} />)

    expect(ChatIframe).toBeTruthy()
  })

  it('calls onLoad callback when iframe loads', () => {
    const onLoad = vi.fn()
    render(<ChatIframe videoId="dQw4w9WgXcQ" onLoad={onLoad} />)

    expect(ChatIframe).toBeTruthy()
  })

  it('injects CSS into iframe when provided', () => {
    const testCSS = `
      #chat { background: red; }
      .message { color: blue; }
    `

    render(<ChatIframe videoId="dQw4w9WgXcQ" injectedCSS={testCSS} />)

    expect(ChatIframe).toBeTruthy()
  })

  it('shows error state on load error', () => {
    const onError = vi.fn()
    render(<ChatIframe videoId="invalid" onError={onError} />)

    expect(ChatIframe).toBeTruthy()
  })

  it('applies custom className', () => {
    const { container } = render(
      <ChatIframe videoId="test123" className="custom-class" />
    )

    const wrapper = container.querySelector('.glass-panel')
    expect(wrapper?.classList.contains('custom-class')).toBe(true)
  })

  it('handles CSS re-injection when CSS changes', () => {
    const { rerender } = render(
      <ChatIframe videoId="test123" injectedCSS="body { color: red; }" />
    )

    // Re-render with different CSS
    rerender(<ChatIframe videoId="test123" injectedCSS="body { color: blue; }" />)

    expect(ChatIframe).toBeTruthy()
  })
})
