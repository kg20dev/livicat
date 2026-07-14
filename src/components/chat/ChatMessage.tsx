import { createElement } from 'react'

interface ChatMessageProps {
  username: string
  message: string
  avatarSeed: string | number
  timestamp?: string
  role?: 'owner' | 'moderator' | 'member' | 'member-ship' | 'super-chat' | 'default'
}

/**
 * Renders a chat message using YouTube's exact live chat DOM structure.
 *
 * Production YouTube structure (from live DOM dump):
 * ```
 * yt-live-chat-text-message-renderer  (style-scope yt-live-chat-item-list-renderer)
 *   yt-img-shadow#author-photo        (no-transition style-scope yt-live-chat-text-message-renderer)
 *     img#img                         (style-scope yt-img-shadow)
 *   div#content                       (style-scope yt-live-chat-text-message-renderer)
 *     span#timestamp                  (style-scope yt-live-chat-text-message-renderer)
 *     yt-live-chat-author-chip        (style-scope yt-live-chat-text-message-renderer)
 *       span#author-name              (style-scope yt-live-chat-author-chip)
 *       span#chat-badges              (style-scope yt-live-chat-author-chip)
 *     div#before-content-buttons      (style-scope yt-live-chat-text-message-renderer)
 *     span#message-container          (style-scope yt-live-chat-text-message-renderer)
 *       span#message                  (style-scope yt-live-chat-text-message-renderer)
 *     span#hover-message              (...)
 *   div#menu                          (style-scope yt-live-chat-text-message-renderer)
 *   div#inline-action-button-container (...)
 * ```
 *
 * We render the core subset needed for CSS preview (avatar, name, message, timestamp).
 * The CSS generator targets these exact tag/ID combinations, so styling in demo mode
 * behaves identically to real YouTube chat.
 */

/**
 * Detects if a message is "insignignificant" (short, no spaces/breaklines)
 * and truncates it with ellipsis to prevent layout issues.
 */
function truncateInsignificantMessage(message: string): string {
  // Check if message is > 15 chars and has no spaces/breaklines
  const isInsignificant = message.length > 15 && !/\s/.test(message)

  if (isInsignificant) {
    // Truncate to 15 chars with ellipsis
    return message.slice(0, 15) + '...'
  }

  return message
}

export default function ChatMessage({
  username,
  message,
  avatarSeed,
  timestamp,
  role = 'default',
}: ChatMessageProps) {
  // ── Author chip children ──
  const authorChildren: React.ReactNode[] = [
    createElement(
      'span',
      {
        id: 'author-name',
        dir: 'auto',
        key: 'name',
        className: 'style-scope yt-live-chat-author-chip',
      },
      username
    ),
  ]

  // Role badge in author chip
  if (role === 'owner') {
    authorChildren.push(
      createElement(
        'span',
        {
          id: 'chat-badges',
          key: 'badge',
          className: 'style-scope yt-live-chat-author-chip owner-badge',
        },
        '🛡️'
      )
    )
  } else if (role === 'moderator') {
    authorChildren.push(
      createElement(
        'span',
        {
          id: 'chat-badges',
          key: 'badge',
          className: 'style-scope yt-live-chat-author-chip mod-badge',
        },
        '🔧'
      )
    )
  } else if (role === 'member') {
    authorChildren.push(
      createElement(
        'span',
        {
          id: 'chat-badges',
          key: 'badge',
          className: 'style-scope yt-live-chat-author-chip member-badge',
        },
        '⭐'
      )
    )
  } else if (role === 'member-ship') {
    authorChildren.push(
      createElement(
        'span',
        {
          id: 'chat-badges',
          key: 'badge',
          className: 'style-scope yt-live-chat-author-chip membership-badge',
        },
        '🌟'
      )
    )
  } else {
    authorChildren.push(
      createElement('span', {
        id: 'chat-badges',
        key: 'badge',
        className: 'style-scope yt-live-chat-author-chip',
      })
    )
  }

  // ── #content children ──
  const contentChildren: React.ReactNode[] = []

  if (role === 'member-ship') {
    contentChildren.push(
      createElement(
        'div',
        {
          id: 'membership-banner',
          key: 'membership',
          className: 'style-scope yt-live-chat-text-message-renderer',
        },
        '🎉 New member! Welcome to the channel!'
      )
    )
  }

  // Timestamp
  if (timestamp) {
    contentChildren.push(
      createElement(
        'span',
        {
          id: 'timestamp',
          className: 'timestamp style-scope yt-live-chat-text-message-renderer',
          key: 'timestamp',
        },
        timestamp
      )
    )
  }

  // Author chip
  contentChildren.push(
    createElement(
      'yt-live-chat-author-chip',
      { className: 'style-scope yt-live-chat-text-message-renderer', key: 'chip' },
      ...authorChildren
    )
  )

  // Message text
  const displayMessage = truncateInsignificantMessage(message)

  contentChildren.push(
    createElement(
      'span',
      {
        id: 'message-container',
        className: 'style-scope yt-live-chat-text-message-renderer',
        key: 'msg-container',
      },
      createElement(
        'span',
        {
          id: 'message',
          dir: 'auto',
          className: 'style-scope yt-live-chat-text-message-renderer',
        },
        displayMessage
      )
    )
  )

  // ── Root renderer children ──
  const rootChildren: React.ReactNode[] = []

  // Super Chat color bar
  if (role === 'super-chat') {
    rootChildren.push(
      createElement('div', {
        id: 'sc-bar',
        key: 'sc-bar',
        className: 'style-scope yt-live-chat-text-message-renderer',
        style: { height: '4px', width: '100%', background: 'var(--chat-accent, #ff69b4)' },
      })
    )
  }

  // Avatar
  rootChildren.push(
    createElement(
      'yt-img-shadow',
      {
        id: 'author-photo',
        key: 'photo',
        className: 'no-transition style-scope yt-live-chat-text-message-renderer',
      },
      createElement('img', {
        id: 'img',
        src: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`,
        alt: username,
        className: 'style-scope yt-img-shadow',
      })
    )
  )

  // #content
  rootChildren.push(
    createElement(
      'div',
      {
        id: 'content',
        key: 'content',
        className: 'style-scope yt-live-chat-text-message-renderer',
      },
      ...contentChildren
    )
  )

  return createElement(
    'yt-live-chat-text-message-renderer',
    {
      className: 'style-scope yt-live-chat-item-list-renderer',
      'data-role': role,
    },
    ...rootChildren
  )
}
