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

            {/* Styling Panel (line 364-571) */}
            <StylingPanel onReset={() => {}} onApply={() => {}}>
              <StylingPanel.Header />
              <div className="flex-1 overflow-y-auto custom-scrollbar p-gutter space-y-8">
                {/* Section: Container Styling (line 371-391) */}
                <StylingPanel.Section icon="settings_overscan" title="Container Styling">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-label-md text-on-surface-variant">Border Glow</span>
                      <div className="w-10 h-5 bg-primary/20 rounded-full relative cursor-pointer">
                        <div className="absolute right-1 top-1 w-3 h-3 bg-primary rounded-full" />
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-label-md text-on-surface-variant">Drop Shadow</span>
                      <select className="bg-surface-container-lowest border border-outline-variant rounded-lg px-2 py-1 text-code-sm text-on-surface outline-none">
                        <option>None</option>
                        <option selected>Soft XL</option>
                        <option>Hard</option>
                      </select>
                    </div>
                  </div>
                </StylingPanel.Section>

                {/* Section: Header Styling (line 392-409) */}
                <StylingPanel.Section icon="dock_to_bottom" title="Header Styling">
                  <div className="grid grid-cols-2 gap-3">
                    <StylingPanel.Field label="Bg Opacity">
                      <input
                        type="number"
                        defaultValue={100}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface outline-none"
                      />
                    </StylingPanel.Field>
                    <StylingPanel.Field label="Text Align">
                      <div className="flex border border-outline-variant rounded-lg overflow-hidden">
                        <button className="flex-1 p-1 bg-surface-container-highest">
                          <span className="material-symbols-outlined text-[18px]">
                            format_align_left
                          </span>
                        </button>
                        <button className="flex-1 p-1">
                          <span className="material-symbols-outlined text-[18px]">
                            format_align_center
                          </span>
                        </button>
                      </div>
                    </StylingPanel.Field>
                  </div>
                </StylingPanel.Section>

                {/* Section: Typography (line 410-440) */}
                <StylingPanel.Section icon="text_fields" title="Typography">
                  <div className="space-y-3">
                    <StylingPanel.Field label="Primary Font">
                      <select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all">
                        <option>Inter</option>
                        <option>Roboto</option>
                        <option>JetBrains Mono</option>
                        <option>Open Sans</option>
                      </select>
                    </StylingPanel.Field>
                    <div className="grid grid-cols-2 gap-3">
                      <StylingPanel.Field label="Size">
                        <input
                          type="number"
                          defaultValue={14}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
                        />
                      </StylingPanel.Field>
                      <StylingPanel.Field label="Weight">
                        <select className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all">
                          <option>Regular</option>
                          <option selected>Medium</option>
                          <option>Bold</option>
                        </select>
                      </StylingPanel.Field>
                    </div>
                  </div>
                </StylingPanel.Section>

                {/* Section: Color Palette (line 441-476) */}
                <StylingPanel.Section icon="colorize" title="Color Palette">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'User Color', color: 'bg-primary', hex: '#A970FF' },
                      { label: 'Text Color', color: 'bg-white', hex: '#FFFFFF' },
                      { label: 'Bg Color', color: 'bg-surface', hex: '#131313' },
                      { label: 'Accent', color: 'bg-red-500', hex: '#FF5555' },
                    ].map((item) => (
                      <div key={item.label} className="space-y-2">
                        <span className="text-label-md text-on-surface-variant block">
                          {item.label}
                        </span>
                        <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-2">
                          <div className={`w-6 h-6 rounded ${item.color}`} />
                          <span className="text-code-sm font-code-sm uppercase">{item.hex}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </StylingPanel.Section>

                {/* Section: Message Box Styling (line 477-499) */}
                <StylingPanel.Section icon="chat_bubble" title="Message Box Styling">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <StylingPanel.Field label="Bubble Radius">
                        <input
                          type="number"
                          defaultValue={8}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface outline-none"
                        />
                      </StylingPanel.Field>
                      <StylingPanel.Field label="Border Width">
                        <input
                          type="number"
                          defaultValue={1}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface outline-none"
                        />
                      </StylingPanel.Field>
                    </div>
                    <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-2">
                      <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20" />
                      <span className="text-code-sm font-code-sm uppercase">#A970FF1A</span>
                      <span className="text-label-md text-on-surface-variant ml-auto">
                        Bubble BG
                      </span>
                    </div>
                  </div>
                </StylingPanel.Section>

                {/* Section: Background (line 500-511) */}
                <StylingPanel.Section icon="image" title="Background">
                  <div className="bg-surface-container-lowest border-2 border-dashed border-outline-variant rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors group">
                    <span className="material-symbols-outlined text-outline group-hover:text-primary mb-2 text-[32px] transition-colors">
                      cloud_upload
                    </span>
                    <p className="text-body-md font-medium">Upload Image</p>
                    <p className="text-label-md text-on-surface-variant mt-1">PNG, JPG up to 5MB</p>
                  </div>
                </StylingPanel.Section>

                {/* Section: Spacing & Radius (line 512-541) */}
                <StylingPanel.Section icon="space_bar" title="Spacing & Radius">
                  <div className="space-y-6">
                    <StylingPanel.Slider label="Message Padding" value={9} unit="px" />
                    <StylingPanel.Slider label="Corner Radius" value={23} unit="px" />
                    <StylingPanel.Slider label="Bubble Transparency" value={80} unit="%" />
                  </div>
                </StylingPanel.Section>

                {/* Advanced CSS Editor (line 542-547) */}
                <div className="pt-6 border-t border-outline-variant">
                  <button className="w-full flex items-center justify-between group text-on-surface-variant hover:text-on-surface transition-colors">
                    <span className="font-bold">Advanced CSS Editor</span>
                    <span className="material-symbols-outlined transition-transform group-hover:translate-x-1">
                      chevron_right
                    </span>
                  </button>
                </div>

                {/* Section: Frame & Assets (line 548-563) */}
                <StylingPanel.Section icon="frame_inspect" title="Frame & Assets">
                  <div className="space-y-3">
                    <div className="bg-surface-container-lowest border border-dashed border-outline-variant rounded-lg p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary transition-colors">
                      <span className="material-symbols-outlined text-outline mb-1 text-[24px]">
                        add_photo_alternate
                      </span>
                      <p className="text-label-md font-medium">Import Frame Image</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-label-md text-on-surface-variant">Single Item BG</span>
                      <button className="text-primary text-label-md font-bold">
                        Browse Assets
                      </button>
                    </div>
                  </div>
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
