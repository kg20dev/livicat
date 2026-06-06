import { useState, useMemo, useCallback, useEffect } from 'react'
import ErrorBoundary from './components/ui/ErrorBoundary'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import PreviewArea from './components/layout/PreviewArea'
import StylingPanel from './components/layout/StylingPanel'
import AssetsPage, { type AssetItem } from './components/layout/AssetsPage'
import type { ChatMode } from './components/layout/PreviewArea'
import { generateOBSCSS, downloadCSSFile } from './utils/cssExport'
import { validateYouTubeUrl } from './utils/youtubeValidation'
import { fetchYouTubeMetadata, type YouTubeVideoInfo } from './utils/youtubeMetadata'
import { FONT_OPTIONS } from './utils/fonts'

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

const DEMO_ASSETS: AssetItem[] = [
  {
    id: '1',
    name: 'Neon Purple Theme',
    type: 'theme',
    thumbnail: '/themes/neon-purple.png',
    createdAt: '2 days ago',
  },
  {
    id: '2',
    name: 'Minimal Dark',
    type: 'theme',
    createdAt: '5 days ago',
  },
  {
    id: '3',
    name: 'Gaming Overlay Template',
    type: 'template',
    createdAt: '1 week ago',
  },
  {
    id: '4',
    name: 'Stream Chat Export',
    type: 'export',
    createdAt: '2 weeks ago',
  },
  {
    id: '5',
    name: 'Custom Frame Border',
    type: 'frame',
    createdAt: '3 weeks ago',
  },
  {
    id: '6',
    name: 'Retro Wave Theme',
    type: 'theme',
    createdAt: '1 month ago',
  },
]

/* ─── App ────────────────────────────────────────────────────────── */

export default function App() {
  const [activeNav, setActiveNav] = useState('workspace')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('Testing Mode')
  const [url, setUrl] = useState('')
  const [submittedUrl, setSubmittedUrl] = useState('')
  const [generatedCSS, setGeneratedCSS] = useState('')
  const [fetchStatus, setFetchStatus] = useState<FetchStatus>('idle')
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

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
    if (!generatedCSS) return
    const obsCSS = generateOBSCSS(generatedCSS, {
      themeName: 'livicat-custom',
    })
    downloadCSSFile(obsCSS, 'youtube-chat-custom')
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
      {/* Sidebar (line 137-161) */}
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav}>
        <Sidebar.Header />
        <Sidebar.Nav />
        <Sidebar.ExportButton onExport={handleExportCSS} />
      </Sidebar>

      {/* TopBar (line 163-183) */}
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <TopBar.Left />
        <TopBar.Right />
      </TopBar>

      {/* Main Content (line 185) */}
      <main className="ml-[280px] pt-16 h-screen flex">
        <ErrorBoundary>
          {activeNav === 'workspace' ? (
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
                <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter space-y-1">
                  {/* Hero Section: Quick Presets */}
                  <StylingPanel.HeroSection icon="auto_awesome" title="Quick Presets">
                    <StylingPanel.PresetSelector />
                  </StylingPanel.HeroSection>

                  {/* Section: Generic */}
                  <StylingPanel.Section icon="layers" title="Generic">
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-3">
                        <StylingPanel.ColorField settingKey="backgroundColor" label="Background" />
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
                  <StylingPanel.Section icon="header" title="Header">
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

                  {/* Section: Avatar */}
                  <StylingPanel.Section icon="face" title="Avatar">
                    <div className="space-y-2">
                      <StylingPanel.NumberField
                        settingKey="avatarSize"
                        label="Avatar Size"
                        min={16}
                        max={64}
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
                  <StylingPanel.Section icon="scroll" title="Scrollbar">
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
          ) : (
            <AssetsPage filter={searchQuery} onFilterChange={setSearchQuery}>
              <AssetsPage.Header />
              <AssetsPage.Toolbar />
              <AssetsPage.Grid
                assets={DEMO_ASSETS}
                onSelectAsset={(asset) => console.log('Selected asset:', asset)}
              />
            </AssetsPage>
          )}
        </ErrorBoundary>
      </main>
    </div>
  )
}
