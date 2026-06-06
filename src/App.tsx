import { useState, useMemo } from 'react'
import Sidebar from './components/layout/Sidebar'
import TopBar from './components/layout/TopBar'
import PreviewArea from './components/layout/PreviewArea'
import StylingPanel from './components/layout/StylingPanel'
import AssetsPage, { type AssetItem } from './components/layout/AssetsPage'
import type { ChatMode } from './components/layout/PreviewArea'

/* ─── Demo data ──────────────────────────────────────────────────── */

const DEMO_MESSAGES = [
  { id: '1', username: 'NeonNights', message: 'How do I save this theme?', avatarSeed: 58 },
  { id: '2', username: 'NeonNights', message: 'Check out my new stream setup!', avatarSeed: 16 },
  { id: '3', username: 'StreamKing', message: 'This editor is a lifesaver!', avatarSeed: 70 },
  { id: '4', username: 'StreamKing', message: 'Can we get more animations?', avatarSeed: 82 },
  { id: '5', username: 'GamerPro_99', message: 'Can we get more animations?', avatarSeed: 5 },
  { id: '6', username: 'NeonNights', message: 'This editor is a lifesaver!', avatarSeed: 33 },
  { id: '7', username: 'GamerPro_99', message: 'Loving the typography options.', avatarSeed: 11 },
  { id: '8', username: 'VibeCheck', message: 'Check out my new stream setup!', avatarSeed: 26 },
  { id: '9', username: 'VibeCheck', message: 'Can we get more animations?', avatarSeed: 80 },
  { id: '10', username: 'VibeCheck', message: 'This editor is a lifesaver!', avatarSeed: 13 },
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
  const [generatedCSS, setGeneratedCSS] = useState('')

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
      // Live mode: show demo only if URL is filled (simulating fetch)
      // In real app, this would be fetched from YouTube API
      return url ? DEMO_MESSAGES : []
    }
  }, [mode, url])

  return (
    <div className="bg-background text-on-surface font-body-md text-body-md overflow-hidden h-screen select-none">
      {/* Sidebar (line 137-161) */}
      <Sidebar activeItem={activeNav} onNavigate={setActiveNav}>
        <Sidebar.Header />
        <Sidebar.Nav />
        <Sidebar.ExportButton />
      </Sidebar>

      {/* TopBar (line 163-183) */}
      <TopBar searchQuery={searchQuery} onSearchChange={setSearchQuery}>
        <TopBar.Left />
        <TopBar.Right />
      </TopBar>

      {/* Main Content (line 185) */}
      <main className="ml-[280px] pt-16 h-screen flex">
        {activeNav === 'workspace' ? (
          <>
            {/* Preview Area (line 187) */}
            <PreviewArea
              messages={displayMessages}
              mode={mode}
              activeTab={activeTab}
              url={url}
              injectedCSS={generatedCSS}
              onTabChange={setActiveTab}
              onUrlChange={setUrl}
              onFetch={() => {
                // In real app, this would fetch from YouTube API
                console.log('Fetching chat for URL:', url)
              }}
              onRandomize={() => {}}
              onToggle={() => {}}
            >
              <PreviewArea.ToolBar />
              <PreviewArea.LiveBadge />
              <PreviewArea.Chat />
              <PreviewArea.Actions />
            </PreviewArea>

            {/* Styling Panel */}
            <StylingPanel onCSSChange={setGeneratedCSS}>
              <StylingPanel.Header />
              <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter space-y-8">
                {/* Section: Presets */}
                <StylingPanel.Section icon="auto_awesome" title="Quick Presets">
                  <StylingPanel.PresetSelector />
                </StylingPanel.Section>

                {/* Section: Display */}
                <StylingPanel.Section icon="visibility" title="Display">
                  <div className="space-y-3">
                    <StylingPanel.Toggle settingKey="showAvatars" label="Show Avatars" />
                    <StylingPanel.Toggle settingKey="showTimestamps" label="Show Timestamps" />
                    <StylingPanel.Toggle settingKey="autoScroll" label="Auto-scroll" />
                    <StylingPanel.Toggle settingKey="showGlow" label="Glow Effect" />
                    <StylingPanel.NumberField
                      settingKey="maxMessages"
                      label="Max Messages"
                      min={10}
                      max={500}
                    />
                  </div>
                </StylingPanel.Section>

                {/* Section: Color Palette */}
                <StylingPanel.Section icon="colorize" title="Color Palette">
                  <div className="grid grid-cols-2 gap-4">
                    <StylingPanel.ColorField settingKey="backgroundColor" label="Background" />
                    <StylingPanel.ColorField
                      settingKey="messageBackgroundColor"
                      label="Message BG"
                    />
                    <StylingPanel.ColorField settingKey="usernameColor" label="Username" />
                    <StylingPanel.ColorField settingKey="messageColor" label="Message" />
                    <StylingPanel.ColorField settingKey="timestampColor" label="Timestamp" />
                    <StylingPanel.ColorField settingKey="accentColor" label="Accent" />
                  </div>
                </StylingPanel.Section>

                {/* Section: Typography */}
                <StylingPanel.Section icon="text_fields" title="Typography">
                  <div className="space-y-3">
                    <StylingPanel.Select
                      settingKey="fontFamily"
                      label="Font Family"
                      options={[
                        { value: 'Inter, sans-serif', label: 'Inter' },
                        { value: 'Roboto, sans-serif', label: 'Roboto' },
                        { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
                        { value: '"Open Sans", sans-serif', label: 'Open Sans' },
                      ]}
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <StylingPanel.NumberField
                        settingKey="messageFontSize"
                        label="Message Size"
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
                    <div className="grid grid-cols-2 gap-3">
                      <StylingPanel.NumberField
                        settingKey="usernameFontSize"
                        label="Username Size"
                        min={8}
                        max={48}
                      />
                      <StylingPanel.NumberField
                        settingKey="timestampFontSize"
                        label="Timestamp Size"
                        min={8}
                        max={48}
                      />
                    </div>
                  </div>
                </StylingPanel.Section>

                {/* Section: Message Styling */}
                <StylingPanel.Section icon="chat_bubble" title="Message Styling">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <StylingPanel.NumberField
                        settingKey="messagePadding"
                        label="Padding"
                        min={0}
                        max={32}
                      />
                      <StylingPanel.NumberField
                        settingKey="messageBorderRadius"
                        label="Border Radius"
                        min={0}
                        max={32}
                      />
                    </div>
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
                </StylingPanel.Section>

                {/* Section: Avatar */}
                <StylingPanel.Section icon="face" title="Avatar">
                  <div className="space-y-3">
                    <StylingPanel.NumberField
                      settingKey="avatarSize"
                      label="Avatar Size"
                      min={16}
                      max={64}
                    />
                  </div>
                </StylingPanel.Section>

                {/* Section: Scrollbar */}
                <StylingPanel.Section icon="scroll" title="Scrollbar">
                  <div className="space-y-3">
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

                {/* Section: Container */}
                <StylingPanel.Section icon="settings_overscan" title="Container">
                  <div className="space-y-3">
                    <StylingPanel.Slider
                      settingKey="containerOpacity"
                      label="Opacity"
                      unit="%"
                      min={0}
                      max={100}
                    />
                  </div>
                </StylingPanel.Section>

                {/* Section: Animation */}
                <StylingPanel.Section icon="animation" title="Animation">
                  <StylingPanel.Select
                    settingKey="animationSpeed"
                    label="Speed"
                    options={[
                      { value: 'none', label: 'None' },
                      { value: 'slow', label: 'Slow' },
                      { value: 'normal', label: 'Normal' },
                    ]}
                  />
                </StylingPanel.Section>
              </div>
              <StylingPanel.Actions />
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
      </main>
    </div>
  )
}
