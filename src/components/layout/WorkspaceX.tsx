/**
 * Workspace X — A page inspired by doodlekuma's IM Style customizer.
 *
 * Layout:
 *   ┌─ Left Panel (360px, customizer) ─┬─ Right Panel (flex-1, preview) ─┐
 *   │  [Header]                         │  [Preview Toolbar]              │
 *   │  ▼ Text Message                   │  ┌──────────────────────────┐  │
 *   │    Background, Author, Content    │  │                          │  │
 *   │    Typography, Border             │  │   Chat Preview           │  │
 *   │  ▸ Role Colors                    │  │   (iframe w/ CSS)        │  │
 *   │  ▸ Super Chat                     │  │                          │  │
 *   │  ▸ Common Settings                │  └──────────────────────────┘  │
 *   │  ▸ Message Visibility             │                                │
 *   │                                   │                                │
 *   │  [Download CSS]                   │                                │
 *   └───────────────────────────────────┴────────────────────────────────┘
 */

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import ChatPreview from '../chat/ChatPreview'
import { useChatSettings, settingsToCSS } from '../../hooks/useChatSettings'
import { generateOBSCSS, downloadCSSFile } from '../../utils/cssExport'
import { trackEventAsync } from '../../utils/analytics'
import { loadWebFont } from '../../utils/fonts'
import { FONT_OPTIONS } from '../../utils/fonts'
import type { ChatSettings } from '../../types/app'

/* ─── Demo data ──────────────────────────────────────────────── */

const DEMO_MESSAGES = [
  { id: '1', username: 'NeonNights', message: 'How do I save this theme?', avatarSeed: 58, timestamp: '10:23 AM' },
  { id: '2', username: 'NeonNights', message: 'Check out my new stream setup!', avatarSeed: 16, timestamp: '10:24 AM' },
  { id: '3', username: 'StreamKing', message: 'This editor is a lifesaver!', avatarSeed: 70, timestamp: '10:25 AM' },
  { id: '4', username: 'StreamKing', message: 'Can we get more animations?', avatarSeed: 82, timestamp: '10:26 AM' },
  { id: '5', username: 'GamerPro_99', message: 'Can we get more animations?', avatarSeed: 5, timestamp: '10:27 AM' },
  { id: '6', username: 'NeonNights', message: 'This editor is a lifesaver!', avatarSeed: 33, timestamp: '10:28 AM' },
  { id: '7', username: 'GamerPro_99', message: 'Loving the typography options.', avatarSeed: 11, timestamp: '10:29 AM' },
  { id: '8', username: 'VibeCheck', message: 'Check out my new stream setup!', avatarSeed: 26, timestamp: '10:30 AM' },
  { id: '9', username: 'VibeCheck', message: 'Can we get more animations?', avatarSeed: 80, timestamp: '10:31 AM' },
  { id: '10', username: 'VibeCheck', message: 'This editor is a lifesaver!', avatarSeed: 13, timestamp: '10:32 AM' },
]

/* ─── Collapsible Section ─────────────────────────────────────── */

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

function ColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
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

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
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
          {unit && (
            <span className="text-[10px] font-medium text-on-surface-variant/60">{unit}</span>
          )}
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

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-on-surface font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-150 ${
          value ? 'bg-primary' : 'bg-surface-container-highest'
        }`}
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
  const [messageSpeed, setMessageSpeed] = useState(1500)
  const [previewMode, setPreviewMode] = useState<'live' | 'gallery'>('live')
  const [paused, setPaused] = useState(false)
  const [showDownloadOptions, setShowDownloadOptions] = useState(false)

  // We still track messages in a ref for the "live" playback effect
  const [displayIndex, setDisplayIndex] = useState(10)
  const previewTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Generate CSS from settings
  const currentCSS = useMemo(() => settingsToCSS(settings), [settings])

  // Auto-load web font
  useEffect(() => {
    loadWebFont(settings.fontFamily)
  }, [settings.fontFamily])

  // Live playback: add messages over time
  useEffect(() => {
    if (previewMode === 'live' && !paused) {
      previewTimerRef.current = setInterval(() => {
        setDisplayIndex((prev) => Math.min(prev + 1, DEMO_MESSAGES.length))
      }, messageSpeed)
    }
    return () => {
      if (previewTimerRef.current) clearInterval(previewTimerRef.current)
    }
  }, [previewMode, paused, messageSpeed])

  // Reset on mode switch
  useEffect(() => {
    setDisplayIndex(10)
  }, [previewMode])

  const visibleMessages = useMemo(() => {
    if (previewMode === 'gallery') return DEMO_MESSAGES.slice(-6)
    return DEMO_MESSAGES.slice(0, displayIndex)
  }, [previewMode, displayIndex])

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

  /* ─── setting helper wrappers ───────────────────────────────── */

  const update = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      updateSetting(key, value)
      trackEventAsync('customization_changed', {
        setting_type:
          typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'toggle' : 'select',
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
              <ColorRow
                label="Background Color"
                value={s.messageBackgroundColor}
                onChange={(v) => update('messageBackgroundColor', v)}
              />
            </div>

            {/* Author Name */}
            <div>
              <SubHeading label="Author Name" />
              <ColorRow
                label="Background"
                value={s.messageBackgroundColor}
                onChange={(v) => update('messageBackgroundColor', v)}
              />
              <div className="mt-2">
                <ColorRow
                  label="Color"
                  value={s.usernameColor}
                  onChange={(v) => update('usernameColor', v)}
                />
              </div>
              <div className="mt-2">
                <ToggleRow
                  label="Bold"
                  value={s.usernameFontWeight === '700'}
                  onChange={(v) => update('usernameFontWeight', v ? '700' : '400')}
                />
              </div>
            </div>

            {/* Content */}
            <div>
              <SubHeading label="Content" />
              <ColorRow
                label="Color"
                value={s.messageColor}
                onChange={(v) => update('messageColor', v)}
              />
              <div className="mt-2">
                <ToggleRow
                  label="Bold"
                  value={false}
                  onChange={() => {}}
                />
              </div>
            </div>

            {/* Typography */}
            <div>
              <SubHeading label="Typography" />
              <SliderRow
                label="Name Size"
                value={s.usernameFontSize}
                min={10}
                max={40}
                unit="px"
                onChange={(v) => update('usernameFontSize', v)}
              />
              <div className="mt-3">
                <SliderRow
                  label="Content Font Size"
                  value={s.messageFontSize}
                  min={10}
                  max={48}
                  unit="px"
                  onChange={(v) => update('messageFontSize', v)}
                />
              </div>
            </div>

            {/* Border */}
            <div>
              <SubHeading label="Border" />
              <ColorRow
                label="Border Color"
                value={s.scrollbarColor}
                onChange={(v) => update('scrollbarColor', v)}
              />
              <div className="mt-3">
                <SliderRow
                  label="Border Width"
                  value={s.messageBorderRadius}
                  min={0}
                  max={20}
                  unit="px"
                  onChange={(v) => update('messageBorderRadius', v)}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ── Role Colors ────────────────────────────────── */}
          <CollapsibleSection icon="palette" title="Role Colors" defaultOpen={false}>
            {/* Owner */}
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
            <SliderRow
              label="Container Opacity"
              value={s.containerOpacity}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => update('containerOpacity', v)}
            />
            <SliderRow
              label="Message Opacity"
              value={s.messageOpacity}
              min={0}
              max={100}
              unit="%"
              onChange={(v) => update('messageOpacity', v)}
            />
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
            <SelectRow
              label="Font Family"
              value={s.fontFamily}
              options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
              onChange={(v) => update('fontFamily', v)}
            />
            <div className="grid grid-cols-2 gap-3">
              <SliderRow
                label="Max Messages"
                value={s.maxMessages}
                min={10}
                max={500}
                onChange={(v) => update('maxMessages', v)}
              />
              <ToggleRow
                label="Auto Scroll"
                value={s.autoScroll}
                onChange={(v) => update('autoScroll', v)}
              />
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
            <ToggleRow
              label="Text Messages"
              value={true}
              onChange={() => {}}
            />
            <ToggleRow
              label="Super Chat / Paid"
              value={s.showEngagementMessages}
              onChange={(v) => update('showEngagementMessages', v)}
            />
            <ToggleRow
              label="Membership Messages"
              value={s.showChatDisclaimer}
              onChange={(v) => update('showChatDisclaimer', v)}
            />
            <div className="border-t border-outline-variant/20 pt-3 mt-3">
              <ToggleRow
                label="Show Avatars"
                value={s.showAvatars}
                onChange={(v) => update('showAvatars', v)}
              />
              <div className="mt-2">
                <ToggleRow
                  label="Show Timestamps"
                  value={s.showTimestamps}
                  onChange={(v) => update('showTimestamps', v)}
                />
              </div>
              <div className="mt-2">
                <ToggleRow
                  label="Show Header"
                  value={s.showHeader}
                  onChange={(v) => update('showHeader', v)}
                />
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
          </div>

          {/* Right: Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setDisplayIndex(10)}
              className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Refresh"
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
            <button
              onClick={() => setShowDownloadOptions((v) => !v)}
              className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
              title="Settings"
            >
              <span className="material-symbols-outlined text-[16px]">settings</span>
            </button>
          </div>
        </div>

        {/* Settings panel (overlay) */}
        {showDownloadOptions && (
          <div className="absolute top-16 right-6 z-20 bg-surface-container border border-outline-variant rounded-xl p-4 shadow-2xl w-72">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-label-md font-semibold text-on-surface">Preview Settings</h3>
              <button
                onClick={() => setShowDownloadOptions(false)}
                className="text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>

            {/* Message Speed */}
            <div className="mb-4">
              <label className="text-label-sm text-on-surface-variant block mb-1">Message Speed</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={100}
                  max={5000}
                  step={100}
                  value={messageSpeed}
                  onChange={(e) => setMessageSpeed(Number(e.target.value))}
                  className="flex-1 h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                />
                <span className="text-label-sm text-on-surface font-mono tabular-nums w-10 text-right">
                  {(messageSpeed / 1000).toFixed(1)}s
                </span>
              </div>
            </div>

            {/* Download CSS selector */}
            <div className="mb-4">
              <label className="text-label-sm text-on-surface-variant block mb-1">Download CSS</label>
              <select className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 px-2.5 text-label-sm text-on-surface outline-none appearance-none cursor-pointer">
                <option>Current Preview</option>
                <option>Social Stream</option>
                <option>YouTube</option>
                <option>Both</option>
              </select>
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
                    onClick={() => {
                      setPreviewWidth(p.w)
                      setPreviewHeight(p.h)
                    }}
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

        {/* Chat Preview */}
        <div
          className="flex items-center justify-center transition-all duration-200"
          style={{ width: previewWidth, height: previewHeight, maxWidth: '90vw', maxHeight: '80vh' }}
        >
          <ChatPreview messages={visibleMessages} css={currentCSS} showHeader={s.showHeader}>
            <ChatPreview.Header />
            <ChatPreview.Messages />
          </ChatPreview>
        </div>

        {/* How to Use hint */}
        <div className="absolute bottom-6 left-6 z-10">
          <button className="flex items-center gap-1.5 text-label-sm text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-[14px]">info</span>
            How to Use
          </button>
        </div>
      </section>
    </div>
  )
}
