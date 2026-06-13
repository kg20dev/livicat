import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import ErrorBoundary from './components/ui/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import PreviewArea from './components/layout/PreviewArea'
import StylingPanel from './components/layout/StylingPanel'
import Settings from './components/layout/Settings'
import LoadingScreen from './components/loading/LoadingScreen'
import AnalyticsConsent from './components/analytics/AnalyticsConsent'
import type { ChatMode } from './components/layout/PreviewArea'
import { generateOBSCSS, downloadCSSFile } from './utils/cssExport'
import { validateYouTubeUrl } from './utils/youtubeValidation'
import { fetchYouTubeMetadata, type YouTubeVideoInfo } from './utils/youtubeMetadata'
import { FONT_OPTIONS } from './utils/fonts'
import { trackEventAsync, isAnalyticsEnabled } from './utils/analytics'

type FetchStatus = 'idle' | 'loading' | 'success' | 'error'

/* ─── Demo data ──────────────────────────────────────────────────── */

const DEMO_MESSAGES = [
  {
    id: '1',
    username: 'NeonNights',
    message: 'How do I save this theme?',
    avatarSeed: 58,
    timestamp: '10:23 AM',
  },
  {
    id: '2',
    username: 'NeonNights',
    message: 'Check out my new stream setup!',
    avatarSeed: 16,
    timestamp: '10:24 AM',
  },
  {
    id: '3',
    username: 'StreamKing',
    message: 'This editor is a lifesaver!',
    avatarSeed: 70,
    timestamp: '10:25 AM',
  },
  {
    id: '4',
    username: 'StreamKing',
    message: 'Can we get more animations?',
    avatarSeed: 82,
    timestamp: '10:26 AM',
  },
  {
    id: '5',
    username: 'GamerPro_99',
    message: 'Can we get more animations?',
    avatarSeed: 5,
    timestamp: '10:27 AM',
  },
  {
    id: '6',
    username: 'NeonNights',
    message: 'This editor is a lifesaver!',
    avatarSeed: 33,
    timestamp: '10:28 AM',
  },
  {
    id: '7',
    username: 'GamerPro_99',
    message: 'Loving the typography options.',
    avatarSeed: 11,
    timestamp: '10:29 AM',
  },
  {
    id: '8',
    username: 'VibeCheck',
    message: 'Check out my new stream setup!',
    avatarSeed: 26,
    timestamp: '10:30 AM',
  },
  {
    id: '9',
    username: 'VibeCheck',
    message: 'Can we get more animations?',
    avatarSeed: 80,
    timestamp: '10:31 AM',
  },
  {
    id: '10',
    username: 'VibeCheck',
    message: 'This editor is a lifesaver!',
    avatarSeed: 13,
    timestamp: '10:32 AM',
  },
]

/* ─── App ────────────────────────────────────────────────────────── */

export default function App() {
  const [activeNav, setActiveNav] = useState('workspace')
  const [activeTab, setActiveTab] = useState('Testing Mode')
  const [url, setUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [generatedCSS, setGeneratedCSS] = useState('')
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  // Analytics states
  const [showLoading, setShowLoading] = useState(true)
  const [showConsent, setShowConsent] = useState(false)
  const [loadingComplete, setLoadingComplete] = useState(false)
  const sessionStartRef = useRef<number | null>(null)

  // Mark loading as complete on mount (2 second delay handled by LoadingScreen component)
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  // Track app launch (runs once on mount)
  useEffect(() => {
    trackEventAsync('app_launched')
  }, [])

  // Track session duration
  useEffect(() => {
    sessionStartRef.current = Date.now()

    return () => {
      if (sessionStartRef.current) {
        const duration = Math.round((Date.now() - sessionStartRef.current) / 1000)
        trackEventAsync('session_duration', { duration_seconds: duration })
      }
    }
  }, [])

  // Handle tab change + clear all state
  const handleTabChange = useCallback((tab: string) => {
    setActiveTab(tab)
    setSubmittedUrl('')
    setFetchStatus('idle')
    setVideoInfo(null)
    setFetchError(null)
  }, [])

  // Handle Fetch Chat button — makes a real fetch to YouTube's public oEmbed API
  const handleFetch = useCallback(async () => {
    const trimmed = url.trim()
    if (!trimmed) return

    const { isValid, videoId } = validateYouTubeUrl(trimmed)
    if (!isValid || !videoId) return

    // Show loading, clear previous results
    setFetchError(null)
    setVideoInfo(null)
    setFetchStatus('loading')
    setSubmittedUrl(trimmed)

    // Fetch video metadata from YouTube's public oEmbed API (no key needed)
    const result = await fetchYouTubeMetadata(videoId)
    if (result.success) {
      setVideoInfo(result.data)
      setFetchStatus('success')
    } else {
      setFetchError(result.error)
      setFetchStatus('error')
    }
  }, [url])

  // Export CSS handler
  const handleExportCSS = useCallback(() => {
    const css = generatedCSS || '/* No custom styles applied */'
    const obsCSS = generateOBSCSS(css, {
      themeName: 'livicat-custom',
    })
    downloadCSSFile(obsCSS, 'youtube-chat-custom').catch((err) =>
      console.error('[App] CSS export failed:', err)
    )
    console.log('[App] CSS export initiated, length:', obsCSS.length)
  }, [generatedCSS])

  // Keyboard shortcut: Ctrl+Shift+E to export CSS
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault()
        handleExportCSS()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleExportCSS])

  // Analytics consent flow
  useEffect(() => {
    console.log('[Analytics Consent] Effect triggered, loadingComplete:', loadingComplete)
    // Only check consent after loading is complete
    if (!loadingComplete) return

    const enabled = isAnalyticsEnabled()

    // If consent is already set (either true or false), don't show modal
    // Check sessionStorage to see if we've already asked in this session
    const askedThisSession = sessionStorage.getItem('analytics_consent_asked')

    console.log('[Analytics Consent Debug]', {
      loadingComplete,
      enabled,
      askedThisSession,
      localStorageConsent: localStorage.getItem('livicat_analytics_consent'),
      sessionStorageAsked: sessionStorage.getItem('analytics_consent_asked'),
      willShowModal: enabled === false && !askedThisSession,
    })

    if (enabled === false && !askedThisSession) {
      // No consent yet and haven't asked this session - show modal after loading
      console.log('[Analytics Consent] Will show modal in 500ms')
      const timer = setTimeout(() => {
        console.log('[Analytics Consent] Setting showConsent=true')
        setShowConsent(true)
      }, 500) // Show 500ms after loading completes
      return () => clearTimeout(timer)
    } else {
      console.log(
        '[Analytics Consent] NOT showing modal - enabled:',
        enabled,
        'askedThisSession:',
        askedThisSession
      )
    }
  }, [loadingComplete])

  // Determine mode based on active tab
  const mode: ChatMode = useMemo(() => {
    return activeTab === 'Testing Mode' ? 'testing' : 'live'
  }, [activeTab])

  // Determine which messages to show
  const displayMessages = useMemo(() => {
    if (mode === 'testing') {
      // Testing mode: always show demo data
      return DEMO_MESSAGES
    } else {
      // Live mode: show demo messages only after user clicks Fetch
      return submittedUrl ? DEMO_MESSAGES : []
    }
  }, [mode, submittedUrl])

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-hidden h-screen select-none">
      {/* Loading Screen */}
      {showLoading && (
        <LoadingScreen
          onComplete={() => {
            console.log('[App] LoadingScreen onComplete called')
            setLoadingComplete(true)
          }}
        />
      )}

      {/* Consent Modal */}
      {showConsent && (
        <AnalyticsConsent
          onDecision={(allowed) => {
            console.log('[Analytics Consent] User decision:', allowed)
            setShowConsent(false)
            sessionStorage.setItem('analytics_consent_asked', 'true')
          }}
        />
      )}

      {/* Sidebar (line 137-161) */}
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav}>
        <Sidebar.Header />
        <Sidebar.Nav />
        <Sidebar.ExportButton onExport={handleExportCSS} />
      </Sidebar>

      {/* TopBar */}
      <TopBar>
        <TopBar.Left />
        <TopBar.Right />
      </TopBar>

      {/* Main Content (line 185) */}
      <main className="ml-[280px] pt-16 h-screen flex">
        <ErrorBoundary>
          {activeNav === 'settings' ? (
            <Settings />
          ) : activeNav === 'workspace' ? (
            <>
              {/* Preview Area (line 187) */}
              <PreviewArea
                messages={displayMessages}
                mode={mode}
                activeTab={activeTab}
                url={url}
                submittedUrl={submittedUrl}
                videoInfo={videoInfo}
                fetchStatus={fetchStatus}
                fetchError={fetchError}
                injectedCSS={generatedCSS}
                onTabChange={handleTabChange}
                onUrlChange={setUrl}
                onFetch={handleFetch}
              >
                <PreviewArea.ToolBar />
                <PreviewArea.VideoInfo />
                <PreviewArea.Chat />
                <PreviewArea.Actions />
              </PreviewArea>

              {/* Styling Panel */}
              <StylingPanel onCSSChange={setGeneratedCSS}>
                <StylingPanel.Header />
                <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter">
                  {/* Hero Section: Quick Presets */}
                  <StylingPanel.HeroSection
                    icon="auto_awesome"
                    title="Quick Presets"
                    collapsible
                    defaultOpen={true}
                  >
                    <StylingPanel.PresetSelector />
                  </StylingPanel.HeroSection>

                  {/* Section: Generic */}
                  <StylingPanel.Section icon="layers" title="Generic">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.ColorField
                          settingKey="backgroundColor"
                          label="Page Background"
                        />
                        <StylingPanel.ColorField settingKey="accentColor" label="Accent" />
                      </div>
                      <StylingPanel.Slider
                        settingKey="containerOpacity"
                        label="Container Opacity"
                        unit="%"
                        min={0}
                        max={100}
                      />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Header */}
                  <StylingPanel.Section icon="title" title="Header">
                    <div className="space-y-2">
                      <StylingPanel.Toggle settingKey="showHeader" label="Show Header" />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Body */}
                  <StylingPanel.Section icon="view_stream" title="Body">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        <StylingPanel.Toggle
                          settingKey="showScrollButton"
                          label="Show Scroll Button"
                        />
                        <StylingPanel.Toggle settingKey="autoScroll" label="Auto-scroll" />
                      </div>
                      <StylingPanel.ColorField
                        settingKey="scrollButtonBackground"
                        label="Scroll Button Background"
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.ColorField settingKey="scrollButtonColor" label="Icon" />
                        <StylingPanel.Slider
                          settingKey="scrollButtonBorderRadius"
                          label="Rounded"
                          unit="px"
                          min={0}
                          max={30}
                        />
                      </div>
                      <StylingPanel.Slider
                        settingKey="scrollButtonOpacity"
                        label="Opacity"
                        unit="%"
                        min={0}
                        max={100}
                      />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Message */}
                  <StylingPanel.Section icon="chat_bubble" title="Message">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.ColorField
                          settingKey="messageBackgroundColor"
                          label="Background"
                        />
                        <StylingPanel.ColorField settingKey="messageColor" label="Text" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.NumberField
                          settingKey="messagePadding"
                          label="Padding"
                          min={0}
                          max={32}
                        />
                        <StylingPanel.NumberField
                          settingKey="messageBorderRadius"
                          label="Radius"
                          min={0}
                          max={32}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.Select
                          settingKey="messageSpacing"
                          label="Spacing"
                          options={[
                            { value: 'compact', label: 'Compact' },
                            { value: 'normal', label: 'Normal' },
                            { value: 'comfortable', label: 'Comfortable' },
                          ]}
                        />
                        <StylingPanel.Slider
                          settingKey="messageOpacity"
                          label="Opacity"
                          unit="%"
                          min={0}
                          max={100}
                        />
                      </div>
                      <StylingPanel.Slider
                        settingKey="messageMarginBottom"
                        label="Bottom Margin"
                        min={0}
                        max={40}
                      />
                      <StylingPanel.Slider
                        settingKey="messageInnerPadding"
                        label="Inner Padding"
                        min={0}
                        max={20}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.Toggle settingKey="showAvatars" label="Avatars" />
                        <StylingPanel.Toggle settingKey="showTimestamps" label="Timestamps" />
                        <StylingPanel.Toggle
                          settingKey="showEngagementMessages"
                          label="Engagement"
                        />
                        <StylingPanel.Toggle settingKey="showChatDisclaimer" label="Disclaimer" />
                      </div>
                      <StylingPanel.NumberField
                        settingKey="maxMessages"
                        label="Max Messages"
                        min={10}
                        max={500}
                      />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Message Layout */}
                  <StylingPanel.Section icon="space_dashboard" title="Message Layout">
                    <div className="space-y-4">
                      <StylingPanel.Field label="Name & Message">
                        <StylingPanel.NameMessageLayout />
                      </StylingPanel.Field>
                      <StylingPanel.Field label="Background Card Area">
                        <StylingPanel.BackgroundStyle />
                      </StylingPanel.Field>
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Avatar */}
                  <StylingPanel.Section icon="face" title="Avatar">
                    <div className="space-y-2">
                      <StylingPanel.NumberField
                        settingKey="avatarSize"
                        label="Avatar Size"
                        min={16}
                        max={64}
                      />
                      <StylingPanel.Slider
                        settingKey="avatarMarginTop"
                        label="Top Margin"
                        min={0}
                        max={40}
                      />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Typography */}
                  <StylingPanel.Section icon="text_fields" title="Typography">
                    <div className="space-y-2">
                      <StylingPanel.Select
                        settingKey="fontFamily"
                        label="Font Family"
                        options={FONT_OPTIONS.map((f) => ({ value: f.value, label: f.label }))}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.ColorField settingKey="usernameColor" label="Username" />
                        <StylingPanel.ColorField settingKey="timestampColor" label="Timestamp" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.NumberField
                          settingKey="messageFontSize"
                          label="Message"
                          min={8}
                          max={48}
                        />
                        <StylingPanel.NumberField
                          settingKey="usernameFontSize"
                          label="Username"
                          min={8}
                          max={48}
                        />
                        <StylingPanel.NumberField
                          settingKey="timestampFontSize"
                          label="Timestamp"
                          min={8}
                          max={48}
                        />
                        <StylingPanel.Select
                          settingKey="usernameFontWeight"
                          label="Username Weight"
                          options={[
                            { value: '400', label: 'Regular' },
                            { value: '500', label: 'Medium' },
                            { value: '600', label: 'Semi Bold' },
                            { value: '700', label: 'Bold' },
                          ]}
                        />
                      </div>
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Scrollbar */}
                  <StylingPanel.Section icon="swipe_vertical" title="Scrollbar">
                    <div className="space-y-2">
                      <StylingPanel.Slider
                        settingKey="scrollbarWidth"
                        label="Width"
                        unit="px"
                        min={2}
                        max={16}
                      />
                      <StylingPanel.ColorField settingKey="scrollbarColor" label="Thumb Color" />
                    </div>
                  </StylingPanel.Section>

                  {/* Section: Animation */}
                  <StylingPanel.Section icon="animation" title="Animation">
                    <div className="space-y-2">
                      <StylingPanel.Toggle settingKey="showGlow" label="Glow Effect" />
                      <StylingPanel.Select
                        settingKey="animationSpeed"
                        label="Speed"
                        options={[
                          { value: 'none', label: 'None' },
                          { value: 'slow', label: 'Slow' },
                          { value: 'normal', label: 'Normal' },
                        ]}
                      />
                      <StylingPanel.AnimationStyleSelector />
                    </div>
                  </StylingPanel.Section>
                </div>
              </StylingPanel>
            </>
          ) : null}
        </ErrorBoundary>
      </main>
    </div>
  )
}
