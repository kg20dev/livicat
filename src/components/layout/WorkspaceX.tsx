/**
 * Workspace X — A page inspired by doodlekuma's IM Style customizer.
 *
 * Preview modes:
 *   Live    → Real-time message streaming (variable timing, loops)
 *   Gallery → Showcases each message state (role-based display)
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import ChatPreview from '../chat/ChatPreview'
import type { Message } from '../chat/ChatPreview'
import { useChatSettings, settingsToCSS } from '../../hooks/useChatSettings'
import { generateOBSCSS, downloadCSSFile } from '../../utils/cssExport'
import { trackEventAsync } from '../../utils/analytics'
import { loadWebFont } from '../../utils/fonts'
import { FONT_OPTIONS } from '../../utils/fonts'
import type { ChatSettings } from '../../types/app'

/* ══════════════════════════════════════════════════════════════════
   ║  Demo Data                                                      ║
   ══════════════════════════════════════════════════════════════════ */

const LIVE_MESSAGES: Message[] = [
  { id: 'l1', username: 'NeonNights', message: 'Hey everyone! 🎉', avatarSeed: 58, timestamp: '10:23 AM' },
  { id: 'l2', username: 'StreamKing', message: 'Love the stream! 🔥', avatarSeed: 70, timestamp: '10:23 AM' },
  { id: 'l3', username: 'GamerPro_99', message: 'How do I save this theme?', avatarSeed: 5, timestamp: '10:24 AM' },
  { id: 'l4', username: 'PixelPanda', message: 'Can we get more animations?', avatarSeed: 33, timestamp: '10:24 AM' },
  { id: 'l5', username: 'VibeCheck', message: 'This editor is a lifesaver!', avatarSeed: 26, timestamp: '10:25 AM' },
  { id: 'l6', username: 'ChatMaster', message: 'Check out my new stream setup!', avatarSeed: 42, timestamp: '10:25 AM' },
  { id: 'l7', username: 'LiveWire', message: 'First time watching, hi! 👋', avatarSeed: 15, timestamp: '10:26 AM' },
  { id: 'l8', username: 'NeonNights', message: 'Loving the typography options.', avatarSeed: 58, timestamp: '10:26 AM' },
  { id: 'l9', username: 'ShadowFox', message: 'That play was insane! 😱', avatarSeed: 89, timestamp: '10:27 AM' },
  { id: 'l10', username: 'CyberBeam', message: 'What song is this? 🎵', avatarSeed: 44, timestamp: '10:27 AM' },
  { id: 'l11', username: 'VelvetVoice', message: 'Can someone explain the rules?', avatarSeed: 12, timestamp: '10:28 AM' },
  { id: 'l12', username: 'StreamKing', message: 'Hype! Hype! Hype! 🔥🔥🔥', avatarSeed: 70, timestamp: '10:28 AM' },
  { id: 'l13', username: 'GamerPro_99', message: 'GG everyone!', avatarSeed: 5, timestamp: '10:29 AM' },
  { id: 'l14', username: 'PixelPanda', message: 'New subscriber here! 🎊', avatarSeed: 33, timestamp: '10:29 AM' },
  { id: 'l15', username: 'VibeCheck', message: 'This is so relaxing to watch', avatarSeed: 26, timestamp: '10:30 AM' },
  { id: 'l16', username: 'ShadowFox', message: 'The quality is amazing', avatarSeed: 89, timestamp: '10:30 AM' },
  { id: 'l17', username: 'ChatMaster', message: 'How long have you been streaming?', avatarSeed: 42, timestamp: '10:31 AM' },
  { id: 'l18', username: 'VelvetVoice', message: 'Keep it up, you\'re doing great!', avatarSeed: 12, timestamp: '10:31 AM' },
  { id: 'l19', username: 'LiveWire', message: 'LMAO 😂😂😂', avatarSeed: 15, timestamp: '10:32 AM' },
  { id: 'l20', username: 'CyberBeam', message: 'What\'s your rank?', avatarSeed: 44, timestamp: '10:32 AM' },
  { id: 'l21', username: 'NeonNights', message: 'Do you stream every day?', avatarSeed: 58, timestamp: '10:33 AM' },
  { id: 'l22', username: 'StreamKing', message: 'Just raided! 🔴', avatarSeed: 70, timestamp: '10:33 AM' },
  { id: 'l23', username: 'GamerPro_99', message: 'The chat is moving so fast 🏃', avatarSeed: 5, timestamp: '10:34 AM' },
  { id: 'l24', username: 'PixelPanda', message: 'Hello from Canada! 🍁', avatarSeed: 33, timestamp: '10:34 AM' },
  { id: 'l25', username: 'VibeCheck', message: 'Late but here! 🙌', avatarSeed: 26, timestamp: '10:35 AM' },
]

const GALLERY_MESSAGES: Message[] = [
  { id: 'g1', username: 'StreamKing', message: 'Regular chat message with default styling', avatarSeed: 70, timestamp: '10:25 AM', role: 'default' },
  { id: 'g2', username: 'NeonNights', message: 'Owner message with special role colors 🛡️', avatarSeed: 58, timestamp: '10:26 AM', role: 'owner' },
  { id: 'g3', username: 'ChatMaster', message: 'Moderator message with moderation styling 🔧', avatarSeed: 42, timestamp: '10:27 AM', role: 'moderator' },
  { id: 'g4', username: 'PixelPanda', message: 'Member message with membership badge ⭐', avatarSeed: 33, timestamp: '10:28 AM', role: 'member' },
  { id: 'g5', username: 'VelvetVoice', message: '🌟 Super Chat • $10.00 — This is a highlighted paid message with super chat styling', avatarSeed: 12, timestamp: '10:29 AM', role: 'super-chat' },
  { id: 'g6', username: 'LiveWire', message: 'Welcome to the membership! Member since June 2026', avatarSeed: 15, timestamp: '10:30 AM', role: 'member-ship' },
]

/**
 * Role-based CSS injected in Gallery mode so each data-role gets distinct
 * visual treatment. This gives users a preview of how role-specific
 * styling could look in their exported CSS.
 */
const ROLE_STYLES_CSS = `
/* ── Owner role ── */
yt-live-chat-text-message-renderer[data-role="owner"] {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.12), rgba(255, 200, 0, 0.06)) !important;
  border-left: 3px solid #ffd700 !important;
}
yt-live-chat-text-message-renderer[data-role="owner"] #author-name {
  color: #ffd700 !important;
  font-weight: 700 !important;
}

/* ── Moderator role ── */
yt-live-chat-text-message-renderer[data-role="moderator"] {
  background: linear-gradient(135deg, rgba(66, 133, 244, 0.10), rgba(66, 133, 244, 0.04)) !important;
  border-left: 3px solid #4285f4 !important;
}
yt-live-chat-text-message-renderer[data-role="moderator"] #author-name {
  color: #4285f4 !important;
  font-weight: 700 !important;
}

/* ── Member role ── */
yt-live-chat-text-message-renderer[data-role="member"] {
  background: linear-gradient(135deg, rgba(52, 168, 83, 0.10), rgba(52, 168, 83, 0.04)) !important;
  border-left: 3px solid #34a853 !important;
}
yt-live-chat-text-message-renderer[data-role="member"] #author-name {
  color: #34a853 !important;
  font-weight: 600 !important;
}

/* ── Super Chat ── */
yt-live-chat-text-message-renderer[data-role="super-chat"] {
  background: linear-gradient(135deg, rgba(255, 105, 180, 0.15), rgba(255, 105, 180, 0.06)) !important;
  border: 2px solid rgba(255, 105, 180, 0.4) !important;
  border-radius: 8px !important;
  box-shadow: 0 0 20px rgba(255, 105, 180, 0.15) !important;
}
yt-live-chat-text-message-renderer[data-role="super-chat"] #sc-bar {
  display: block !important;
  flex: 0 0 auto !important;
}
yt-live-chat-text-message-renderer[data-role="super-chat"] #author-name {
  color: #ff69b4 !important;
  font-weight: 700 !important;
}

/* ── Membership ── */
yt-live-chat-text-message-renderer[data-role="member-ship"] {
  background: linear-gradient(135deg, rgba(147, 51, 234, 0.10), rgba(147, 51, 234, 0.04)) !important;
  border-left: 3px solid #9333ea !important;
}
yt-live-chat-text-message-renderer[data-role="member-ship"] #membership-banner {
  display: block !important;
  font-size: 13px !important;
  padding: 4px 0 !important;
  color: #9333ea !important;
  font-weight: 600 !important;
}
yt-live-chat-text-message-renderer[data-role="member-ship"] #author-name {
  color: #9333ea !important;
  font-weight: 700 !important;
}
`

/* ══════════════════════════════════════════════════════════════════
   ║  Collapsible Section                                             ║
   ══════════════════════════════════════════════════════════════════ */

function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/50 backdrop-blur-sm transition-all duration-200 ring-1 ring-primary/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-container/50 ${
          open ? 'bg-primary/[0.04] rounded-t-xl' : 'rounded-xl'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
          </span>
          <span className="text-sm font-semibold text-on-surface">{title}</span>
        </div>
        <span
          className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="border-t border-outline-variant/30 px-4 py-4 space-y-4 bg-surface-container-lowest/30 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  )
}

/* ─── Sub-section label ───────────────────────────────────────── */

function SubHeading({ label }: { label: string }) {
  return (
    <div className="text-[11px] font-semibold text-on-surface-variant/60 uppercase tracking-[0.5px] mb-2">
      {label}
    </div>
  )
}

/* ─── Color Picker (inline, like doodlekuma) ──────────────────── */

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = value.replace('#', '')
  return (
    <div className="color-picker-container">
      <div className="flex items-center gap-0 bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden">
        <div className="relative w-8 h-8 shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-[-3px] w-[130%] h-[130%] cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded-l-md"
            style={{
              backgroundColor: value,
              backgroundImage:
                'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '6px 6px',
              backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
            }}
          />
        </div>
        <span className="text-[11px] text-on-surface-variant/60 pl-1 font-mono">#</span>
        <input
          type="text"
          value={hex}
          onChange={(e) => onChange('#' + e.target.value.replace('#', '').toUpperCase())}
          className="flex-1 bg-transparent text-[12px] font-mono font-medium text-on-surface outline-none px-1 py-1.5 w-14 uppercase placeholder:text-on-surface-variant/30"
          placeholder="RRGGBB"
          maxLength={6}
        />
      </div>
    </div>
  )
}

/* ─── Inline Color Row ────────────────────────────────────────── */

function ColorRow({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-on-surface font-medium">{label}</span>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  )
}

/* ─── Slider + number input combo ─────────────────────────────── */

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-on-surface font-medium">{label}</span>
        <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-0.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-10 text-[12px] font-semibold text-on-surface bg-transparent border-none outline-none text-right tabular-nums"
          />
          {unit && <span className="text-[10px] font-medium text-on-surface-variant/60">{unit}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary slider-thumb"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
            ((value - min) / (max - min)) * 100
          }%, var(--color-surface-container-highest) ${((value - min) / (max - min)) * 100}%, var(--color-surface-container-highest) 100%)`,
        }}
      />
    </div>
  )
}

/* ─── Toggle Switch ───────────────────────────────────────────── */

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-on-surface font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${value ? 'bg-primary' : 'bg-surface-container-highest'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

/* ─── Select Dropdown ─────────────────────────────────────────── */

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="text-[12px] text-on-surface font-medium block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 px-2.5 text-[12px] text-on-surface outline-none appearance-none cursor-pointer hover:border-primary/40 focus:border-primary"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23998ba2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '12px',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ─── Preview Size Presets ────────────────────────────────────── */

const SIZE_PRESETS = [
  { w: 400, h: 500, label: '400×500' },
  { w: 500, h: 700, label: '500×700' },
  { w: 600, h: 900, label: '600×900' },
]

/* ══════════════════════════════════════════════════════════════════
   ║  Workspace X Root                                               ║
   ══════════════════════════════════════════════════════════════════ */

export default function WorkspaceX() {
  const { settings, updateSetting, savedIndicator } = useChatSettings()
  const [previewWidth, setPreviewWidth] = useState(500)
  const [previewHeight, setPreviewHeight] = useState(700)
  const [messageSpeed, setMessageSpeed] = useState(1200)
  const [previewMode, setPreviewMode] = useState<'live' | 'gallery'>('live')
  const [paused, setPaused] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Generate CSS from settings
  const currentCSS = useMemo(() => settingsToCSS(settings), [settings])

  // Auto-load web font
  useEffect(() => {
    loadWebFont(settings.fontFamily)
  }, [settings.fontFamily])

  /* ─── Live mode: stream messages with variable timing ──────────── */

  const scheduleNextMessage = useCallback(() => {
    if (previewMode !== 'live' || paused) return

    const delay = Math.floor(Math.random() * (messageSpeed * 0.7)) + messageSpeed * 0.3 // 30-100% of speed
    previewTimerRef.current = setTimeout(() => {
      setDisplayIndex((prev) => {
        const next = prev + 1
        // Loop back to 0 after all messages shown (keep a few as buffer)
        if (next > LIVE_MESSAGES.length) return 1
        return next
      })
    }, delay)
  }, [previewMode, paused, messageSpeed])

  // Start/restart the message stream
  useEffect(() => {
    if (previewMode === 'live' && !paused) {
      scheduleNextMessage()
    }
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [previewMode, paused, displayIndex, scheduleNextMessage])

  // Reset when switching to Live mode
  useEffect(() => {
    if (previewMode === 'live') {
      setDisplayIndex(0)
      setPaused(false)
    }
  }, [previewMode])

  const visibleMessages = useMemo(() => {
    if (previewMode === 'gallery') return GALLERY_MESSAGES
    return LIVE_MESSAGES.slice(0, displayIndex)
  }, [previewMode, displayIndex])

  // Combined CSS: generated + role styles for gallery
  const previewCSS = useMemo(() => {
    if (previewMode === 'gallery') {
      return currentCSS + '\n' + ROLE_STYLES_CSS
    }
    return currentCSS
  }, [currentCSS, previewMode])

  // Export handler
  const handleExportCSS = useCallback(() => {
    const css = currentCSS || '/* No custom styles applied */'
    const obsCSS = generateOBSCSS(css, {
      themeName: 'livicat-workspace-x',
    })
    downloadCSSFile(obsCSS, 'youtube-chat-workspace-x')
      .then(() => {
        trackEventAsync('css_exported', {
          format: 'css',
          method: 'download',
          had_customizations: css.length > 0,
        })
      })
      .catch((err) => console.error('[WorkspaceX] CSS export failed:', err))
  }, [currentCSS])

  /* ─── setting helper wrappers ─────────────────────────────────── */

  const update = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      updateSetting(key, value)
      trackEventAsync('customization_changed', {
        setting_type: typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'toggle' : 'select',
        setting_key: String(key),
      })
    },
    [updateSetting]
  )

  const s = settings // shorthand

  return (
    <div className="flex h-full">
      {/* ─── Left Panel: Customizer ─────────────────────────── */}
      <aside className="w-[360px] bg-surface border-r border-outline-variant flex flex-col h-full overflow-hidden shadow-xl flex-shrink-0">
        {/* Header */}
        <div className="px-5 py-4 border-b border-outline-variant/50 flex items-center gap-3">
          <div>
            <h2 className="text-title-lg font-bold text-on-surface">IM Style</h2>
            <p className="text-label-md text-on-surface-variant">Style Customizer</p>
          </div>
        </div>

        {/* Scrollable sections */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
          {/* ── Text Message ──────────────────────────────── */}
          <CollapsibleSection icon="message_square" title="Text Message">
            {/* Background */}
            <div>
              <SubHeading label="Background" />
              <ColorRow label="Background Color" value={s.messageBackgroundColor} onChange={(v) => update('messageBackgroundColor', v)} />
            </div>

            {/* Author Name */}
            <div>
              <SubHeading label="Author Name" />
              <ColorRow label="Background" value={s.messageBackgroundColor} onChange={(v) => update('messageBackgroundColor', v)} />
              <div className="mt-2">
                <ColorRow label="Color" value={s.usernameColor} onChange={(v) => update('usernameColor', v)} />
              </div>
              <div className="mt-2">
                <ToggleRow label="Bold" value={s.usernameFontWeight === '700'} onChange={(v) => update('usernameFontWeight', v ? '700' : '400')} />
              </div>
            </div>

            {/* Content */}
            <div>
              <SubHeading label="Content" />
              <ColorRow label="Color" value={s.messageColor} onChange={(v) => update('messageColor', v)} />
            </div>

            {/* Typography */}
            <div>
              <SubHeading label="Typography" />
              <SliderRow label="Name Size" value={s.usernameFontSize} min={10} max={40} unit="px" onChange={(v) => update('usernameFontSize', v)} />
              <div className="mt-3">
                <SliderRow label="Content Font Size" value={s.messageFontSize} min={10} max={48} unit="px" onChange={(v) => update('messageFontSize', v)} />
              </div>
            </div>

            {/* Border */}
            <div>
              <SubHeading label="Border" />
              <ColorRow label="Border Color" value={s.scrollbarColor} onChange={(v) => update('scrollbarColor', v)} />
              <div className="mt-3">
                <SliderRow label="Border Width" value={s.messageBorderRadius} min={0} max={20} unit="px" onChange={(v) => update('messageBorderRadius', v)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Role Colors ────────────────────────────────── */}
          <CollapsibleSection icon="palette" title="Role Colors" defaultOpen={false}>
            <div>
              <div className="text-[13px] font-semibold text-on-surface mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                Owner
              </div>
              <ColorRow label="Background" value={s.accentColor} onChange={(v) => update('accentColor', v)} />
              <div className="mt-2">
                <ColorRow label="Text Color" value={s.messageColor} onChange={(v) => update('messageColor', v)} />
              </div>
              <div className="mt-2">
                <ColorRow label="Username Color" value={s.usernameColor} onChange={(v) => update('usernameColor', v)} />
              </div>
            </div>
            <div className="border-t border-outline-variant/20 pt-4 mt-4">
              <div className="text-[13px] font-semibold text-on-surface mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                Moderator
              </div>
              <ColorRow label="Background" value={s.messageBackgroundColor} onChange={(v) => update('messageBackgroundColor', v)} />
              <div className="mt-2">
                <ColorRow label="Text Color" value={s.messageColor} onChange={(v) => update('messageColor', v)} />
              </div>
              <div className="mt-2">
                <ColorRow label="Username Color" value={s.usernameColor} onChange={(v) => update('usernameColor', v)} />
              </div>
            </div>
            <div className="border-t border-outline-variant/20 pt-4 mt-4">
              <div className="text-[13px] font-semibold text-on-surface mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Member
              </div>
              <ColorRow label="Background" value={s.messageBackgroundColor} onChange={(v) => update('messageBackgroundColor', v)} />
              <div className="mt-2">
                <ColorRow label="Text Color" value={s.messageColor} onChange={(v) => update('messageColor', v)} />
              </div>
              <div className="mt-2">
                <ColorRow label="Username Color" value={s.usernameColor} onChange={(v) => update('usernameColor', v)} />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Common Settings ────────────────────────────── */}
          <CollapsibleSection icon="tune" title="Common Settings" defaultOpen={false}>
            <SliderRow label="Container Opacity" value={s.containerOpacity} min={0} max={100} unit="%" onChange={(v) => update('containerOpacity', v)} />
            <SliderRow label="Message Opacity" value={s.messageOpacity} min={0} max={100} unit="%" onChange={(v) => update('messageOpacity', v)} />
            <SelectRow
              label="Message Spacing"
              value={s.messageSpacing}
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'normal', label: 'Normal' },
                { value: 'comfortable', label: 'Comfortable' },
              ]}
              onChange={(v) => update('messageSpacing', v as ChatSettings['messageSpacing'])}
            />
            <SelectRow label="Font Family" value={s.fontFamily} options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))} onChange={(v) => update('fontFamily', v)} />
            <div className="grid grid-cols-2 gap-3">
              <SliderRow label="Max Messages" value={s.maxMessages} min={10} max={500} onChange={(v) => update('maxMessages', v)} />
              <ToggleRow label="Auto Scroll" value={s.autoScroll} onChange={(v) => update('autoScroll', v)} />
            </div>
            <SelectRow
              label="Animation Speed"
              value={s.animationSpeed}
              options={[
                { value: 'none', label: 'None' },
                { value: 'slow', label: 'Slow' },
                { value: 'normal', label: 'Normal' },
              ]}
              onChange={(v) => update('animationSpeed', v as ChatSettings['animationSpeed'])}
            />
          </CollapsibleSection>

          {/* ── Message Visibility ─────────────────────────── */}
          <CollapsibleSection icon="visibility" title="Message Visibility" defaultOpen={false}>
            <ToggleRow label="Text Messages" value={true} onChange={() => {}} />
            <ToggleRow label="Super Chat / Paid" value={s.showEngagementMessages} onChange={(v) => update('showEngagementMessages', v)} />
            <ToggleRow label="Membership Messages" value={s.showChatDisclaimer} onChange={(v) => update('showChatDisclaimer', v)} />
            <div className="border-t border-outline-variant/20 pt-3 mt-3">
              <ToggleRow label="Show Avatars" value={s.showAvatars} onChange={(v) => update('showAvatars', v)} />
              <div className="mt-2">
                <ToggleRow label="Show Timestamps" value={s.showTimestamps} onChange={(v) => update('showTimestamps', v)} />
              </div>
              <div className="mt-2">
                <ToggleRow label="Show Header" value={s.showHeader} onChange={(v) => update('showHeader', v)} />
              </div>
            </div>
          </CollapsibleSection>
        </div>

        {/* Footer: Download + Saved indicator */}
        <div className="px-4 py-4 border-t border-outline-variant/50 flex items-center gap-3">
          <button
            onClick={handleExportCSS}
            className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg text-label-md font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Download CSS
          </button>
          {savedIndicator && (
            <span className="text-label-sm text-primary font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Saved
            </span>
          )}
        </div>
      </aside>

      {/* ─── Right Panel: Preview ──────────────────────────── */}
      <section className="flex-1 flex flex-col items-center justify-center bg-surface-container-lowest relative">
        {/* Preview Toolbar */}
        <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between">
          {/* Left: Mode + Platform toggles */}
          <div className="flex items-center gap-2">
            {/* Mode toggle: Live / Gallery */}
            <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/50">
              <button
                onClick={() => setPreviewMode('live')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label-sm font-medium transition-colors ${
                  previewMode === 'live'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">play_arrow</span>
                Live
              </button>
              <button
                onClick={() => setPreviewMode('gallery')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-label-sm font-medium transition-colors ${
                  previewMode === 'gallery'
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">grid_view</span>
                Gallery
              </button>
            </div>

            {/* Platform selector */}
            <div className="flex bg-surface-container-high rounded-lg p-0.5 border border-outline-variant/50">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-medium bg-primary text-on-primary shadow-sm">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4.9 19.1a10 10 0 0 1 0-14.2" />
                  <path d="M7.8 16.2a6 6 0 0 1 0-8.4" />
                  <circle cx="12" cy="12" r="2" />
                  <path d="M16.2 7.8a6 6 0 0 1 0 8.4" />
                  <path d="M19.1 4.9a10 10 0 0 1 0 14.2" />
                </svg>
                SS
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-label-sm font-medium text-on-surface-variant hover:text-on-surface">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.5.5c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.5 9.5.5 9.5.5s7.6 0 9.5-.5c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                </svg>
                YT
              </button>
            </div>

            {/* Dimension display */}
            <span className="text-label-sm text-on-surface-variant font-mono tabular-nums ml-2">
              {previewWidth}×{previewHeight}
            </span>

            {/* Mode indicator */}
            {previewMode === 'live' && (
              <span className="flex items-center gap-1 text-label-sm text-green-400 ml-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {paused ? 'Paused' : `${displayIndex}/${LIVE_MESSAGES.length}`}
              </span>
            )}
            {previewMode === 'gallery' && (
              <span className="text-label-sm text-on-surface-variant ml-1">
                {GALLERY_MESSAGES.length} states
              </span>
            )}
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1">
            {previewMode === 'live' && (
              <>
                <button
                  onClick={() => { setDisplayIndex(0); setPaused(false) }}
                  className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Restart"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                </button>
                <button
                  onClick={() => setPaused((v) => !v)}
                  className={`p-1.5 rounded-md transition-colors ${
                    paused ? 'text-primary bg-primary/10' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                  title={paused ? 'Resume' : 'Pause'}
                >
                  <span className="material-symbols-outlined text-[16px]">{paused ? 'play_arrow' : 'pause'}</span>
                </button>
              </>
            )}
            <button
              onClick={() => setShowSettings((v) => !v)}
              className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Settings"
            >
              <span className="material-symbols-outlined text-[16px]">settings</span>
            </button>
          </div>
        </div>

        {/* Settings panel (overlay) */}
        {showSettings && (
          <div className="absolute top-16 right-6 z-20 bg-surface-container border border-outline-variant rounded-xl p-4 shadow-2xl w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-label-md font-semibold text-on-surface">Preview Settings</h3>
              <button onClick={() => setShowSettings(false)} className="text-on-surface-variant hover:text-on-surface">
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Message Speed */}
            <div className="mb-4">
              <label className="text-label-sm text-on-surface-variant block mb-1">
                {previewMode === 'live' ? 'Message Speed' : 'Switch to Live to adjust speed'}
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={400}
                  max={3000}
                  step={100}
                  value={messageSpeed}
                  onChange={(e) => setMessageSpeed(Number(e.target.value))}
                  className={`flex-1 h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary ${previewMode === 'gallery' ? 'opacity-40 pointer-events-none' : ''}`}
                />
                <span className="text-label-sm text-on-surface font-mono tabular-nums w-12 text-right">
                  {(messageSpeed / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Preview Size */}
            <div>
              <label className="text-label-sm text-on-surface-variant block mb-1">Preview Size</label>
              <div className="flex gap-2 mb-2">
                <div className="flex-1">
                  <span className="text-[10px] text-on-surface-variant block">Width</span>
                  <input
                    type="number"
                    value={previewWidth}
                    min={200}
                    max={1200}
                    step={10}
                    onChange={(e) => setPreviewWidth(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1 px-2 text-label-sm text-on-surface outline-none tabular-nums"
                  />
                </div>
                <div className="flex-1">
                  <span className="text-[10px] text-on-surface-variant block">Height</span>
                  <input
                    type="number"
                    value={previewHeight}
                    min={200}
                    max={1200}
                    step={10}
                    onChange={(e) => setPreviewHeight(Number(e.target.value))}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1 px-2 text-label-sm text-on-surface outline-none tabular-nums"
                  />
                </div>
              </div>
              <div className="flex gap-1.5">
                {SIZE_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => { setPreviewWidth(p.w); setPreviewHeight(p.h) }}
                    className={`flex-1 py-1 rounded-md text-label-sm font-medium transition-colors ${
                      previewWidth === p.w && previewHeight === p.h
                        ? 'bg-primary text-on-primary'
                        : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── Preview Content ────────────────────────────── */}
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ width: previewWidth, height: previewHeight, maxWidth: '90vw', maxHeight: '80vh' }}
        >
          {previewMode === 'live' && displayIndex === 0 && !paused ? (
            /* Empty state while waiting for first message */
            <div className="w-full max-w-[400px] h-full glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center p-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-body-md text-on-surface-variant text-center">
                Waiting for chat...
              </p>
              <p className="text-label-sm text-on-surface-variant/60 text-center mt-2">
                Messages will appear in ~{(messageSpeed / 1000).toFixed(1)}s
              </p>
            </div>
          ) : previewMode === 'gallery' ? (
            /* Gallery: ChatPreview with role-styled messages */
            <ChatPreview messages={GALLERY_MESSAGES} css={previewCSS} showHeader={s.showHeader}>
              <ChatPreview.Header />
              <ChatPreview.Messages />
            </ChatPreview>
          ) : (
            /* Live: ChatPreview with streaming messages */
            <ChatPreview messages={visibleMessages} css={currentCSS} showHeader={s.showHeader}>
              <ChatPreview.Header />
              <ChatPreview.Messages />
            </ChatPreview>
          )}
        </div>

        {/* Mode hint at bottom */}
        <div className="absolute bottom-6 left-6 right-6 z-10 flex items-center justify-between">
          <button className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[14px]">info</span>
            How to Use
          </button>
          {previewMode === 'live' && displayIndex > 0 && (
            <span className="text-label-sm text-on-surface-variant/60">
              {displayIndex < LIVE_MESSAGES.length ? 'Streaming...' : '🔁 Looping'}
            </span>
          )}
        </div>
      </section>
    </div>
  )
}
