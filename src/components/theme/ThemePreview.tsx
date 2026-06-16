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
}

export function ThemePreview({
  themeId,
  themeCss,
  resetCss,
  settings,
  scheme,
  backgroundColor,
  messages,
}: ThemePreviewProps) {
  const inlineCss = useMemo(() => buildCSSVariables(settings, scheme), [settings, scheme])

  const fullCss = resetCss
    ? [inlineCss, resetCss, themeCss].join('\n\n')
    : [inlineCss, themeCss].join('\n\n')

  const showAvatars = (settings.showAvatars as boolean) ?? true
  const chatMessages = messages ?? DEMO_MESSAGES

  return (
    <div className="w-full h-full flex flex-col">
      {/* Injected theme CSS */}
      <style id={`theme-css-${themeId}`}>{fullCss}</style>

      {/* Chat messages container */}
      <div
        className={`livicat-chat-messages theme-${themeId}`}
        style={{ backgroundColor: backgroundColor ?? 'transparent' }}
      >
        {chatMessages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} showAvatar={showAvatars} />
        ))}
      </div>
    </div>
  )
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
          <div id="author-name">{message.username}</div>
        </yt-live-chat-author-chip>
        <div id="message-container">
          <div id="message">{message.message}</div>
        </div>
      </div>
    </yt-live-chat-text-message-renderer>
  )
}
