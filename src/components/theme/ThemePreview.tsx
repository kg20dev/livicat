/**
 * ThemePreview — Generic chat message preview for YouTube Live Chat
 *
 * Renders demo messages using YouTube's native DOM structure for consistency.
 * The active theme's CSS (injected via <style>) handles all styling.
 *
 * HTML structure (matches YouTube's live_chat popout exactly):
 *   <div class="theme-{id}">
 *     <yt-live-chat-text-message-renderer data-role="...">
 *       <div id="author-photo">
 *         <img src="..." alt="" />
 *       </div>
 *       <div id="content">
 *         <yt-live-chat-author-chip>
 *           <div id="author-name">username</div>
 *         </yt-live-chat-author-chip>
 *         <div id="message-container">
 *           <div id="message">message text</div>
 *         </div>
 *       </div>
 *     </yt-live-chat-text-message-renderer>
 *   </div>
 *
 * CSS isolation:
 *   - Each theme injects its CSS scoped by .theme-{id}
 *   - Prevents cross-contamination between themes
 */

import { useMemo } from 'react'
import { buildCSSVariables } from '../../utils/buildCSSVariables'
import type { ThemeSettings } from '../../theme/types'
import type { SettingDef } from '../../theme/types'

/* ─── Demo Message Data ────────────────────────────────────────── */

export interface PreviewMessage {
  id: string
  username: string
  message: string
  avatarSeed: number
  timestamp: string
  role?: 'default' | 'owner' | 'moderator' | 'member' | 'super-chat' | 'member-ship'
}

const DEMO_MESSAGES: PreviewMessage[] = [
  {
    id: 'p1',
    username: 'StreamKing',
    message: 'Hey everyone! 🎉',
    avatarSeed: 70,
    timestamp: '10:23 AM',
    role: 'owner',
  },
  {
    id: 'p2',
    username: 'NeonNights',
    message: 'Love the stream! 🔥',
    avatarSeed: 58,
    timestamp: '10:23 AM',
  },
  {
    id: 'p3',
    username: 'GamerPro_99',
    message: 'How do I save this theme?',
    avatarSeed: 5,
    timestamp: '10:24 AM',
  },
  {
    id: 'p4',
    username: 'PixelPanda',
    message: 'Can we get more animations?',
    avatarSeed: 33,
    timestamp: '10:24 AM',
    role: 'member',
  },
  {
    id: 'p5',
    username: 'ShadowFox',
    message: '🌟 Super Chat • $10.00 — Awesome content!',
    avatarSeed: 89,
    timestamp: '10:25 AM',
    role: 'super-chat',
  },
  {
    id: 'p6',
    username: 'ChatMaster',
    message: 'First time watching, hi! 👋',
    avatarSeed: 42,
    timestamp: '10:26 AM',
    role: 'member',
  },
  {
    id: 'p7',
    username: 'LiveWire',
    message: 'Welcome to the membership! Member since June 2026',
    avatarSeed: 15,
    timestamp: '10:27 AM',
    role: 'member-ship',
  },
  {
    id: 'p8',
    username: 'CyberBeam',
    message: 'Loving the typography options.',
    avatarSeed: 44,
    timestamp: '10:28 AM',
    role: 'moderator',
  },
]

/* ─── ThemePreview Component ────────────────────────────────────── */

interface ThemePreviewProps {
  themeId: string
  themeCss: string
  resetCss?: string
  settings: ThemeSettings
  scheme: SettingDef[]
  backgroundColor?: string
  /** Override the default demo messages (for live streaming / gallery modes) */
  messages?: PreviewMessage[]
  /** Preview mode: 'live' for vertical stack, 'gallery' for grid showcase */
  mode?: 'live' | 'gallery'
}

export function ThemePreview({
  themeId,
  themeCss,
  resetCss,
  settings,
  scheme,
  backgroundColor,
  messages,
  mode = 'live',
}: ThemePreviewProps) {
  const inlineCss = useMemo(() => buildCSSVariables(settings, scheme), [settings, scheme])

  const cssHash = useMemo(() => {
    // Simple hash of inlineCss to force style element recreation
    let hash = 0
    for (let i = 0; i < inlineCss.length; i++) {
      hash = ((hash << 5) - hash + inlineCss.charCodeAt(i)) | 0
    }
    return Math.abs(hash).toString(36)
  }, [inlineCss])

  const fullCss = resetCss
    ? [inlineCss, resetCss, themeCss].join('\n\n')
    : [inlineCss, themeCss].join('\n\n')

  const showAvatars = (settings['show-avatars'] as boolean) ?? true
  const hideAtsign = !!(settings['hide-username-atsign'] as boolean)
  const chatMessages =
    messages ??
    (hideAtsign
      ? DEMO_MESSAGES.map((msg) => ({ ...msg, username: `@${msg.username}` }))
      : DEMO_MESSAGES)

  const isGallery = mode === 'gallery'

  return (
    <div className={`w-full h-full flex flex-col theme-${themeId}`}>
      {/* Injected theme CSS */}
      <style key={cssHash} id={`theme-css-${themeId}`}>
        {fullCss}
      </style>

      {/* Gallery-specific layout styles */}
      {isGallery && (
        <style>{`
          /* ── Bento-style Gallery Grid ───────────────────────────────── */
          .livicat-gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 0.75rem;
            padding: 1rem;
            align-content: start;
            grid-auto-rows: min-content;
          }

          /* Mobile-first responsive breakpoints */
          @media (min-width: 480px) {
            .livicat-gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
              gap: 1rem;
              padding: 1.25rem;
            }
          }

          @media (min-width: 640px) {
            .livicat-gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
              gap: 1.25rem;
            }
          }

          @media (min-width: 768px) {
            .livicat-gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
              gap: 1.5rem;
              padding: 1.5rem;
            }
          }

          @media (min-width: 1024px) {
            .livicat-gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
              gap: 1.75rem;
              padding: 1.75rem;
            }
          }

          @media (min-width: 1280px) {
            .livicat-gallery-grid {
              grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
              gap: 2rem;
              padding: 2rem;
            }
          }

          /* ── Gallery Message Card ───────────────────────────────────── */
          .livicat-gallery-card {
            background: rgba(255, 255, 255, 0.05);
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08),
                        0 4px 16px rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(255, 255, 255, 0.1);
            transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
            overflow: hidden;
            display: grid;
            grid-template-rows: auto 1fr;
            align-items: center;
            justify-items: center;
            min-height: 100px;
            padding: 0.75rem;
          }

          /* Bento box: Some cards span multiple cells */
          .livicat-gallery-card:nth-child(4n) {
            grid-column: span 1;
            grid-row: span 1;
          }

          @media (min-width: 640px) {
            .livicat-gallery-card:nth-child(5n) {
              grid-column: span 2;
              aspect-ratio: 16 / 9;
            }

            .livicat-gallery-card:nth-child(3n) {
              grid-row: span 2;
              aspect-ratio: 9 / 16;
            }
          }

          @media (min-width: 1024px) {
            .livicat-gallery-card:nth-child(7n) {
              grid-column: span 2;
              grid-row: span 2;
              aspect-ratio: 1 / 1;
            }
          }

          /* ── Gallery Role Label ─────────────────────────────────────── */
          .livicat-gallery-label {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: rgba(255, 255, 255, 0.6);
            background: rgba(255, 255, 255, 0.12);
            padding: 4px 8px;
            border-radius: 4px;
            line-height: 1.4;
            white-space: nowrap;
            margin-bottom: 6px;
            backdrop-filter: blur(4px);
          }

          .livicat-gallery-card:hover {
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12),
                        0 4px 8px rgba(0, 0, 0, 0.08);
            border-color: rgba(255, 255, 255, 0.2);
            transform: translateY(-2px);
          }

          /* Scale chat message to fit within card */
          .livicat-gallery-card > yt-live-chat-text-message-renderer {
            transform-origin: center center;
            transform: scale(0.4);
            width: 100%;
            max-width: 350px;
            flex-shrink: 0;
          }

          /* Responsive scaling */
          @media (min-width: 480px) {
            .livicat-gallery-card > yt-live-chat-text-message-renderer {
              transform: scale(0.45);
            }
          }

          @media (min-width: 640px) {
            .livicat-gallery-card > yt-live-chat-text-message-renderer {
              transform: scale(0.5);
            }
          }

          @media (min-width: 768px) {
            .livicat-gallery-card > yt-live-chat-text-message-renderer {
              transform: scale(0.55);
              max-width: 400px;
            }
          }

          @media (min-width: 1024px) {
            .livicat-gallery-card > yt-live-chat-text-message-renderer {
              transform: scale(0.6);
              max-width: 450px;
            }
          }
        `}</style>
      )}

      {/* Chat messages container */}
      <div
        className="w-full flex flex-col"
        style={{
          backgroundColor: backgroundColor ?? 'transparent',
        }}
      >
        {isGallery ? (
          /* Gallery mode: Bento grid layout with themed cards */
          <div className="livicat-gallery-grid h-full">
            {chatMessages.map((msg) => (
              <div key={msg.id} className={`livicat-gallery-card theme-${themeId}`}>
                <span className="livicat-gallery-label">
                  {ROLE_LABELS[msg.role ?? 'default'] ?? msg.role}
                </span>
                <ChatMessage message={msg} showAvatar={showAvatars} />
              </div>
            ))}
          </div>
        ) : (
          /* Live mode: Vertical stack (original layout) */
          <div className="livicat-chat-messages w-full h-full flex flex-col items-center overflow-auto">
            {chatMessages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} showAvatar={showAvatars} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── Gallery role labels ────────────────────────────────────────── */

const ROLE_LABELS: Record<string, string> = {
  default: 'Default',
  owner: 'Owner',
  moderator: 'Moderator',
  member: 'Member',
  'super-chat': 'Super Chat',
  'member-ship': 'Membership',
}

/* ─── Single YouTube-Style Message ─────────────────────────────────── */

function ChatMessage({ message, showAvatar }: { message: PreviewMessage; showAvatar: boolean }) {
  const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${message.avatarSeed}`

  return (
    <yt-live-chat-text-message-renderer data-role={message.role ?? 'default'}>
      {showAvatar && (
        <div id="author-photo">
          <img src={avatarUrl} alt="" />
        </div>
      )}
      <div id="content">
        <yt-live-chat-author-chip>
          <div id="author-name">
            <span className="flag-text">{message.username}</span>
          </div>
        </yt-live-chat-author-chip>
        <div id="message-container">
          <div
            id="message"
            data-punct={/^.*[?!]$/.test(message.message) ? message.message.slice(-1) : undefined}
          >
            <span className="message-text">{message.message}</span>
          </div>
        </div>
      </div>
    </yt-live-chat-text-message-renderer>
  )
}
