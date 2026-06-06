import { createElement } from 'react'

interface ChatMessageProps {
  username: string
  message: string
  avatarSeed: string | number
  timestamp?: string
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
 *     span#message                    (style-scope yt-live-chat-text-message-renderer)
 *   div#menu                          (style-scope yt-live-chat-text-message-renderer)
 *   div#inline-action-button-container (...)
 * ```
 *
 * We render the core subset needed for CSS preview (avatar, name, message, timestamp).
 * The CSS generator targets these exact tag/ID combinations, so styling in demo mode
 * behaves identically to real YouTube chat.
 */
export default function ChatMessage({
  username,
  message,
  avatarSeed,
  timestamp,
}: ChatMessageProps) {
  return createElement(
    'yt-live-chat-text-message-renderer',
    { className: 'style-scope yt-live-chat-item-list-renderer' },

    /* ── Avatar: yt-img-shadow#author-photo > img#img ── */
    createElement(
      'yt-img-shadow',
      {
        id: 'author-photo',
        className: 'no-transition style-scope yt-live-chat-text-message-renderer',
      },
      createElement('img', {
        id: 'img',
        src: `https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`,
        alt: username,
        className: 'style-scope yt-img-shadow',
      })
    ),

    /* ── #content wrapper (timestamp, author chip, message) ── */
    createElement(
      'div',
      { id: 'content', className: 'style-scope yt-live-chat-text-message-renderer' },

      /* Timestamp (optional) */
      timestamp &&
        createElement(
          'span',
          {
            id: 'timestamp',
            className: 'timestamp style-scope yt-live-chat-text-message-renderer',
            key: 'timestamp',
          },
          timestamp
        ),

      /* Author chip: yt-live-chat-author-chip > #author-name + #chat-badges */
      createElement(
        'yt-live-chat-author-chip',
        { className: 'style-scope yt-live-chat-text-message-renderer', key: 'chip' },
        createElement(
          'span',
          {
            id: 'author-name',
            dir: 'auto',
            className: 'style-scope yt-live-chat-author-chip',
          },
          username
        ),
        createElement('span', {
          id: 'chat-badges',
          className: 'style-scope yt-live-chat-author-chip',
        })
      ),

      /* Message text */
      createElement(
        'span',
        {
          id: 'message',
          dir: 'auto',
          className: 'style-scope yt-live-chat-text-message-renderer',
          key: 'message',
        },
        message
      )
    )
  )
}
