import { createContext, useContext } from 'react'

/* ─── Context ──────────────────────────────────────────────────── */

interface TopBarContext {
  searchQuery: string
  onSearchChange: (query: string) => void
}

const TopBarContext = createContext<TopBarContext | null>(null)

function useTopBarContext() {
  const ctx = useContext(TopBarContext)
  if (!ctx) throw new Error('TopBar compound components must be used within <TopBar>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface TopBarRootProps {
  searchQuery?: string
  onSearchChange?: (query: string) => void
  children: React.ReactNode
  className?: string
}

export default function TopBar({
  searchQuery = '',
  onSearchChange = () => {},
  children,
  className = '',
}: TopBarRootProps) {
  return (
    <TopBarContext.Provider value={{ searchQuery, onSearchChange }}>
      <header
        className={`h-16 fixed top-0 right-0 left-[280px] z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-container-margin ${className}`}
      >
        {children}
      </header>
    </TopBarContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

TopBar.Left = function TopBarLeft({ title = 'Live Chat Studio' }: { title?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-headline-sm text-headline-sm font-black text-on-surface">{title}</span>
      <div className="h-6 w-px bg-outline-variant" />
      <TopBar.Search />
    </div>
  )
}

TopBar.Search = function TopBarSearch() {
  const { searchQuery, onSearchChange } = useTopBarContext()

  return (
    <div className="flex items-center bg-surface-container-high px-3 py-1.5 rounded-full border border-outline-variant">
      <span className="material-symbols-outlined text-on-surface-variant text-[20px] mr-2">
        search
      </span>
      <input
        type="text"
        placeholder="Search templates..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        className="bg-transparent border-none outline-none text-body-md w-48 placeholder:text-on-surface-variant"
      />
    </div>
  )
}

TopBar.Right = function TopBarRight({ children }: { children?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      {children ?? (
        <>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-opacity">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-primary transition-opacity">
            <span className="material-symbols-outlined">help_outline</span>
          </button>
        </>
      )}
    </div>
  )
}

export type { TopBarRootProps }
