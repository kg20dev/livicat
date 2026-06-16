/**
 * WorkspaceX — Single theme customization page with internal theme selector
 *
 * Architecture:
 *   Top bar (outside key, stays mounted):
 *     Theme selector dropdown — switch between themes
 *
 *   Body (keyed on selectedThemeId, remounts on switch):
 *     Left panel → Scrollable settings grouped by sections (CollapsibleSection)
 *     Right panel → Demo preview (ThemePreview) + YouTube preview integration
 *
 * CSS isolation:
 *   - Each theme injects its CSS via <style id="theme-css-{themeId}">
 *   - On theme switch, the style tag is replaced (cleanup from remount)
 *   - Prevents cross-contamination between themes
 */

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { THEMES, getThemeById } from '../../theme/registry'
import type { ThemeBundle } from '../../theme/types'
import { SettingsPanel } from './SettingsPanel'
import { CollapsibleSection } from './CollapsibleSection'
import { ThemePreview } from './ThemePreview'
import { useThemeSettings } from '../../hooks/useThemeSettings'
import { useElectronPreview } from '../../hooks/useElectronPreview'
import { trackEventAsync } from '../../utils/analytics'
import { validateYouTubeUrl } from '../../utils/youtubeValidation'
import { buildCSSVariables } from '../../utils/buildCSSVariables'

/* ─── Section Name → Icon Mapping ──────────────────────────────── */

const SECTION_ICONS: Record<string, string> = {
  Bubble: 'chat_bubble',
  Username: 'badge',
  Message: 'text_fields',
  Avatar: 'face',
  Common: 'tune',
  Visibility: 'visibility',
  'Role Colors': 'palette',
  Colors: 'palette',
  Typography: 'text_fields',
  Effects: 'brush',
  Frame: 'frame_reload',
}

function getSectionIcon(section: string): string {
  return SECTION_ICONS[section] ?? 'settings'
}

/* ─── Group scheme items by section ────────────────────────────── */

function groupBySection(
  scheme: ThemeBundle['scheme']
): { section: string; items: ThemeBundle['scheme'] }[] {
  const map = new Map<string, ThemeBundle['scheme']>()
  const unsectioned: ThemeBundle['scheme'] = []

  for (const def of scheme) {
    if (def.section) {
      const existing = map.get(def.section)
      if (existing) {
        existing.push(def)
      } else {
        map.set(def.section, [def])
      }
    } else {
      unsectioned.push(def)
    }
  }

  const groups: { section: string; items: ThemeBundle['scheme'] }[] = []
  for (const [section, items] of map) {
    groups.push({ section, items })
  }
  if (unsectioned.length > 0) {
    groups.push({ section: 'Settings', items: unsectioned })
  }

  return groups
}

/* ─── WorkspaceX Component ─────────────────────────────────────── */

export function WorkspaceX() {
  const [selectedThemeId, setSelectedThemeId] = useState(THEMES[0]?.manifest.id ?? '')
  const theme = useMemo(() => getThemeById(selectedThemeId), [selectedThemeId])

  if (!theme) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <p className="text-on-surface-variant">No themes available</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* ─── Top bar: theme selector (outside key — stays mounted) ── */}
      <div className="flex-shrink-0 flex items-center gap-3 px-5 py-3 bg-surface border-b border-outline-variant/50">
        <span className="material-symbols-outlined text-primary">magic_button</span>
        <span className="text-title-md font-bold text-on-surface">Workspace X</span>
        <div className="w-px h-5 bg-outline-variant/30 mx-1" />
        <select
          value={selectedThemeId}
          onChange={(e) => setSelectedThemeId(e.target.value)}
          className="bg-surface-container-high text-on-surface text-label-md font-medium rounded-lg px-3 py-1.5 border border-outline-variant outline-none cursor-pointer hover:border-primary/40 focus:border-primary transition-colors"
        >
          {THEMES.map((t) => (
            <option key={t.manifest.id} value={t.manifest.id}>
              {t.manifest.name}
            </option>
          ))}
        </select>
        <span className="text-label-sm text-on-surface-variant">by {theme.manifest.creator}</span>
      </div>

      {/* ─── Body: settings + preview (keyed — remounts on theme switch) ── */}
      <WorkspaceBody key={selectedThemeId} theme={theme} />
    </div>
  )
}

/* ─── WorkspaceBody — All stateful content, remounts on theme switch ── */

function WorkspaceBody({ theme }: { theme: ThemeBundle }) {
  const { manifest, scheme } = theme
  const { settings, updateSetting } = useThemeSettings(manifest.storageKey, scheme)

  const effectiveBg = (settings['chroma-key'] as boolean)
    ? '#00b140'
    : ((settings.backgroundColor as string) ?? 'transparent')

  const { openPreview, updateCSS, closePreview } = useElectronPreview()
  const [previewWidth] = useState(600)
  const [previewHeight] = useState(800)
  const [messageSpeed] = useState(1200)
  const [previewMode, setPreviewMode] = useState<'live' | 'gallery'>('live')
  const [paused, setPaused] = useState(false)
  const [displayIndex, setDisplayIndex] = useState(0)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [previewOpen, setPreviewOpen] = useState(false)
  const previewStartRef = useRef<number | null>(null)

  /* ─── Live message streaming ─────────────────────────────────── */

  const LIVE_MESSAGES = useMemo(
    () => [
      {
        id: 'l1',
        username: 'NeonNights',
        message: 'Hey everyone! 🎉',
        avatarSeed: 58,
        timestamp: '10:23 AM',
      },
      {
        id: 'l2',
        username: 'StreamKing',
        message: 'Love the stream! 🔥',
        avatarSeed: 70,
        timestamp: '10:23 AM',
      },
      {
        id: 'l3',
        username: 'GamerPro_99',
        message: 'How do I save this theme?',
        avatarSeed: 5,
        timestamp: '10:24 AM',
      },
      {
        id: 'l4',
        username: 'PixelPanda',
        message: 'Can we get more animations?',
        avatarSeed: 33,
        timestamp: '10:24 AM',
      },
      {
        id: 'l5',
        username: 'VibeCheck',
        message: 'This editor is a lifesaver!',
        avatarSeed: 26,
        timestamp: '10:25 AM',
      },
      {
        id: 'l6',
        username: 'ChatMaster',
        message: 'Check out my new stream setup!',
        avatarSeed: 42,
        timestamp: '10:25 AM',
      },
      {
        id: 'l7',
        username: 'LiveWire',
        message: 'First time watching, hi! 👋',
        avatarSeed: 15,
        timestamp: '10:26 AM',
      },
      {
        id: 'l8',
        username: 'NeonNights',
        message: 'Loving the typography options.',
        avatarSeed: 58,
        timestamp: '10:26 AM',
      },
      {
        id: 'l9',
        username: 'ShadowFox',
        message: 'That play was insane! 😱',
        avatarSeed: 89,
        timestamp: '10:27 AM',
      },
      {
        id: 'l10',
        username: 'CyberBeam',
        message: 'What song is this? 🎵',
        avatarSeed: 44,
        timestamp: '10:27 AM',
      },
      {
        id: 'l11',
        username: 'VelvetVoice',
        message: 'Can someone explain the rules?',
        avatarSeed: 12,
        timestamp: '10:28 AM',
      },
      {
        id: 'l12',
        username: 'StreamKing',
        message: 'Hype! Hype! Hype! 🔥🔥🔥',
        avatarSeed: 70,
        timestamp: '10:28 AM',
      },
      {
        id: 'l13',
        username: 'GamerPro_99',
        message: 'GG everyone!',
        avatarSeed: 5,
        timestamp: '10:29 AM',
      },
      {
        id: 'l14',
        username: 'PixelPanda',
        message: 'New subscriber here! 🎊',
        avatarSeed: 33,
        timestamp: '10:29 AM',
      },
      {
        id: 'l15',
        username: 'VibeCheck',
        message: 'This is so relaxing to watch',
        avatarSeed: 26,
        timestamp: '10:30 AM',
      },
      {
        id: 'l16',
        username: 'ShadowFox',
        message: 'The quality is amazing',
        avatarSeed: 89,
        timestamp: '10:30 AM',
      },
      {
        id: 'l17',
        username: 'ChatMaster',
        message: 'How long have you been streaming?',
        avatarSeed: 42,
        timestamp: '10:31 AM',
      },
      {
        id: 'l18',
        username: 'VelvetVoice',
        message: "Keep it up, you're doing great!",
        avatarSeed: 12,
        timestamp: '10:31 AM',
      },
      {
        id: 'l19',
        username: 'LiveWire',
        message: 'LMAO 😂😂😂',
        avatarSeed: 15,
        timestamp: '10:32 AM',
      },
      {
        id: 'l20',
        username: 'CyberBeam',
        message: "What's your rank?",
        avatarSeed: 44,
        timestamp: '10:32 AM',
      },
    ],
    []
  )

  const GALLERY_MESSAGES = useMemo(
    () => [
      {
        id: 'g1',
        username: 'StreamKing',
        message: 'Regular chat message with default styling',
        avatarSeed: 70,
        timestamp: '10:25 AM',
        role: 'default' as const,
      },
      {
        id: 'g2',
        username: 'NeonNights',
        message: 'Owner message with special role colors 🛡️',
        avatarSeed: 58,
        timestamp: '10:26 AM',
        role: 'owner' as const,
      },
      {
        id: 'g3',
        username: 'ChatMaster',
        message: 'Moderator message with moderation styling 🔧',
        avatarSeed: 42,
        timestamp: '10:27 AM',
        role: 'moderator' as const,
      },
      {
        id: 'g4',
        username: 'PixelPanda',
        message: 'Member message with membership badge ⭐',
        avatarSeed: 33,
        timestamp: '10:28 AM',
        role: 'member' as const,
      },
      {
        id: 'g5',
        username: 'VelvetVoice',
        message: '🌟 Super Chat • $10.00 — Highlighted paid message',
        avatarSeed: 12,
        timestamp: '10:29 AM',
        role: 'super-chat' as const,
      },
      {
        id: 'g6',
        username: 'LiveWire',
        message: 'Welcome to the membership! Member since June 2026',
        avatarSeed: 15,
        timestamp: '10:30 AM',
        role: 'member-ship' as const,
      },
    ],
    []
  )

  const scheduleNextMessage = useCallback(() => {
    if (previewMode !== 'live' || paused) return
    const delay = Math.floor(Math.random() * (messageSpeed * 0.7)) + messageSpeed * 0.3
    previewTimerRef.current = setTimeout(() => {
      setDisplayIndex((prev) => {
        const next = prev + 1
        if (next > LIVE_MESSAGES.length) return 1
        return next
      })
    }, delay)
  }, [previewMode, paused, messageSpeed, LIVE_MESSAGES.length])

  useEffect(() => {
    if (previewMode === 'live' && !paused) {
      scheduleNextMessage()
    }
    return () => {
      if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    }
  }, [previewMode, paused, displayIndex, scheduleNextMessage])

  useEffect(() => {
    if (previewMode === 'live') {
      setDisplayIndex(0)
      setPaused(false)
    }
  }, [previewMode])

  /* ─── Preview window events ──────────────────────────────────── */

  useEffect(() => {
    const handleClosed = () => {
      setPreviewOpen(false)
      if (previewStartRef.current) {
        const duration = Math.round((Date.now() - previewStartRef.current) / 1000)
        trackEventAsync('preview_duration', { duration_seconds: duration })
        previewStartRef.current = null
      }
    }
    window.addEventListener('electron-preview-closed', handleClosed)
    return () => window.removeEventListener('electron-preview-closed', handleClosed)
  }, [])

  /* ─── Build CSS for YouTube injection ──────────────────────────── */

  const buildYoutubeCss = useCallback(() => {
    const inlineCss = buildCSSVariables(settings, scheme)
    // Strip .theme-{id} scoping prefix for YouTube injection —
    // YouTube's page has no .theme-{id} wrapper element, so selectors
    // like `.theme-im #author-photo` would never match.
    const unscopedCss = theme.css.replace(new RegExp(`\\.theme-${manifest.id}\\s`, 'g'), '')
    return theme.reset
      ? [inlineCss, theme.reset, unscopedCss].join('\n\n')
      : [inlineCss, unscopedCss].join('\n\n')
  }, [settings, scheme, theme.css, theme.reset, manifest.id])

  /* ─── YouTube preview ────────────────────────────────────────── */

  const validation = useMemo(() => validateYouTubeUrl(youtubeUrl), [youtubeUrl])
  const urlError = validation.isValid || !youtubeUrl ? null : (validation.errorMessage ?? null)
  const videoId = validation.isValid ? validation.videoId : null

  const handleYoutubePreview = useCallback(() => {
    if (previewOpen) {
      closePreview()
      setPreviewOpen(false)
      if (previewStartRef.current) {
        const duration = Math.round((Date.now() - previewStartRef.current) / 1000)
        trackEventAsync('preview_duration', { duration_seconds: duration })
        previewStartRef.current = null
      }
    } else if (videoId) {
      // Pass real CSS to openPreview so the Tauri on_page_load handler
      // injects it when YouTube's DOM is ready — 300ms after setPreviewOpen
      // is too early for YouTube's page to have finished loading.
      const css = buildYoutubeCss()
      openPreview(videoId, css)
      setPreviewOpen(true)
      previewStartRef.current = Date.now()
      trackEventAsync('preview_opened', {
        has_video_id: !!videoId,
        video_provided: !!videoId,
      })
    }
  }, [previewOpen, videoId, openPreview, closePreview, buildYoutubeCss])

  /* ─── CSS re-injection on settings change ──────────────────── */

  useEffect(() => {
    if (!previewOpen) return
    const timer = setTimeout(() => {
      updateCSS(buildYoutubeCss())
    }, 300)
    return () => clearTimeout(timer)
  }, [previewOpen, buildYoutubeCss, updateCSS])

  /* ─── Layout ─────────────────────────────────────────────────── */

  const sections = useMemo(() => groupBySection(scheme), [scheme])
  const themeCss = theme.css

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* ─── Left Panel ──────────────────────────────────────── */}
      <aside className="w-[360px] bg-surface border-r border-outline-variant flex flex-col h-full overflow-hidden shadow-xl flex-shrink-0">
        {/* Scrollable settings */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-4 space-y-3">
          {sections.map(({ section, items }) => (
            <CollapsibleSection
              key={section}
              icon={getSectionIcon(section)}
              title={section}
              defaultOpen={section !== 'Role Colors' && section !== 'Visibility'}
            >
              <SettingsPanel scheme={items} values={settings} onChange={updateSetting} />
            </CollapsibleSection>
          ))}
        </div>
      </aside>

      {/* ─── Right Panel: Preview ────────────────────────────── */}
      <section className="flex-1 flex flex-col bg-surface-container-lowest relative min-w-0">
        {/* Toolbar */}
        <div className="absolute top-4 left-6 right-6 z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
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

            {previewMode === 'live' && (
              <span className="flex items-center gap-1.5 text-label-sm text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                {paused ? 'Paused' : `${displayIndex}/${LIVE_MESSAGES.length}`}
              </span>
            )}
            {previewMode === 'gallery' && (
              <span className="text-label-sm text-on-surface-variant">
                {GALLERY_MESSAGES.length} states
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {previewMode === 'live' && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="YouTube URL or ID..."
                  className={`w-48 bg-surface-container-high border rounded-md py-1.5 px-2.5 text-[11px] text-on-surface outline-none placeholder:text-on-surface-variant/40 hover:border-primary/40 focus:border-primary transition-colors ${
                    urlError ? 'border-red-500/50' : 'border-outline-variant'
                  }`}
                />
                <button
                  onClick={handleYoutubePreview}
                  disabled={!videoId}
                  className={`p-1.5 rounded-md transition-colors flex items-center gap-1 ${
                    videoId
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-surface-container-high text-on-surface-variant cursor-not-allowed'
                  }`}
                  title={previewOpen ? 'Close Preview' : 'Open YouTube Preview'}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.5 6.2c-.3-1-1-1.8-2-2.1C19.6 3.6 12 3.6 12 3.6s-7.6 0-9.5.5c-1 .3-1.7 1.1-2 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8c.3 1 1 1.8 2 2.1 1.9.5 9.5.5 9.5.5s7.6 0 9.5-.5c1-.3 1.7-1.1 2-2.1.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5v-7l6.4 3.5-6.4 3.5z" />
                  </svg>
                  {previewOpen && (
                    <span className="material-symbols-outlined text-[12px]">close</span>
                  )}
                </button>
              </div>
            )}

            {previewMode === 'live' && (
              <>
                <div className="w-px h-4 bg-outline-variant/30" />
                <button
                  onClick={() => {
                    setDisplayIndex(0)
                    setPaused(false)
                  }}
                  className="p-1.5 rounded-md text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
                  title="Restart"
                >
                  <span className="material-symbols-outlined text-[16px]">refresh</span>
                </button>
                <button
                  onClick={() => setPaused((v) => !v)}
                  className={`p-1.5 rounded-md transition-colors ${
                    paused
                      ? 'text-primary bg-primary/10'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
                  }`}
                  title={paused ? 'Resume' : 'Pause'}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {paused ? 'play_arrow' : 'pause'}
                  </span>
                </button>
              </>
            )}

            <div className="w-px h-4 bg-outline-variant/30" />
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-surface-container-high text-label-sm text-on-surface-variant">
              <span className="material-symbols-outlined text-[13px]">info</span>
              {previewWidth}×{previewHeight}
            </div>
          </div>
        </div>

        {/* Preview content */}
        <div
          className="flex-1 transition-all duration-200"
          style={{ maxHeight: 'calc(100vh - 180px)' }}
        >
          <div
            className="w-full h-full flex items-center justify-center p-6 pt-16"
            style={{ maxHeight: '100%' }}
          >
            {previewMode === 'live' && displayIndex === 0 && !paused ? (
              <div className="w-full max-w-full h-full glass-panel rounded-xl shadow-2xl flex flex-col items-center justify-center p-8 mt-16">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-body-md text-on-surface-variant text-center">
                  Waiting for chat...
                </p>
                <p className="text-label-sm text-on-surface-variant/60 text-center mt-2">
                  Messages will appear in ~{(messageSpeed / 1000).toFixed(1)}s
                </p>
              </div>
            ) : (
              <div
                className="rounded-xl shadow-2xl overflow-hidden"
                style={{
                  width: '100%',
                  height: `${previewHeight}px`,
                  maxWidth: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  background: effectiveBg,
                }}
              >
                <ThemePreview
                  themeId={manifest.id}
                  themeCss={themeCss}
                  resetCss={theme.reset}
                  settings={settings}
                  scheme={scheme}
                  backgroundColor={effectiveBg}
                  messages={
                    previewMode === 'gallery'
                      ? GALLERY_MESSAGES
                      : LIVE_MESSAGES.slice(0, displayIndex)
                  }
                />
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div className="absolute bottom-6 left-6 right-6 z-10 flex items-center justify-between">
          <span className="text-label-sm text-on-surface-variant">
            {previewOpen && (
              <span className="flex items-center gap-1.5 text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                Preview Window Open
              </span>
            )}
          </span>
        </div>
      </section>
    </div>
  )
}
