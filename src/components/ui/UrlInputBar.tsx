import { createContext, useContext } from 'react'

/* ─── Types ──────────────────────────────────────────────────────── */

export type ChatMode = 'live' | 'testing'

/* ─── Context ──────────────────────────────────────────────────── */

interface UrlInputBarContext {
  mode: ChatMode
  activeTab: string
  url: string
  onTabChange: (tab: string) => void
  onUrlChange: (url: string) => void
  onFetch: () => void
}

const UrlInputBarContext = createContext<UrlInputBarContext | null>(null)

function useUrlInputBarContext() {
  const ctx = useContext(UrlInputBarContext)
  if (!ctx) throw new Error('UrlInputBar compound components must be used within <UrlInputBar>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface UrlInputBarRootProps {
  mode?: ChatMode
  activeTab?: string
  url?: string
  onTabChange?: (tab: string) => void
  onUrlChange?: (url: string) => void
  onFetch?: () => void
  children?: React.ReactNode
  className?: string
}

export default function UrlInputBar({
  mode = 'live',
  activeTab = 'Live/Past Video',
  url = '',
  onTabChange = () => {},
  onUrlChange = () => {},
  onFetch = () => {},
  children,
  className = '',
}: UrlInputBarRootProps) {
  return (
    <UrlInputBarContext.Provider
      value={{ mode, activeTab, url, onTabChange, onUrlChange, onFetch }}
    >
      <div className={`flex items-center gap-3 ${className}`}>{children}</div>
    </UrlInputBarContext.Provider>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

UrlInputBar.Tabs = function UrlInputBarTabs() {
  const { activeTab, onTabChange } = useUrlInputBarContext()
  const tabs = ['Testing Mode', 'Live/Past Video']

  return (
    <div className="flex bg-surface-container-highest rounded-lg p-1 gap-1">
      {tabs.map((tab) => {
        const isActive = activeTab === tab
        const isTestingMode = tab === 'Testing Mode'
        return (
          <button
            key={tab}
            onClick={() => onTabChange(tab)}
            className={`px-4 py-1.5 rounded-md text-label-md font-bold transition-all ${
              isActive
                ? 'bg-primary text-on-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {isTestingMode ? (
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px]">science</span>
                {tab}
              </span>
            ) : (
              tab
            )}
          </button>
        )
      })}
    </div>
  )
}

UrlInputBar.InputSection = function UrlInputBarInputSection() {
  const { mode, url, onUrlChange, onFetch } = useUrlInputBarContext()

  // In testing mode, hide input and fetch button
  if (mode === 'testing') {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative w-64">
        <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[18px] text-on-surface-variant">
          link
        </span>
        <input
          type="text"
          placeholder="Paste YouTube URL..."
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg pl-9 pr-3 py-1.5 text-body-md outline-none focus:border-primary transition-colors"
        />
      </div>
      <button
        onClick={onFetch}
        className="bg-primary/10 hover:bg-primary/20 text-primary px-4 py-1.5 rounded-lg text-label-md font-bold transition-all border border-primary/20 whitespace-nowrap"
      >
        Fetch Chat
      </button>
    </div>
  )
}

export type { UrlInputBarRootProps }
