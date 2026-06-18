import { createContext, useContext, useEffect, useState } from 'react'
import pkg from '../../../package.json'
import { TauriService } from '../../services'
import { useSidebarCollapsed } from '../../hooks/useSidebarCollapsed'

/* ─── Context ──────────────────────────────────────────────────── */

interface SidebarContext {
  activeItem: string
  onNavigate: (item: string) => void
  isCollapsed: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContext | null>(null)

function useSidebarContext() {
  const ctx = useContext(SidebarContext)
  if (!ctx) throw new Error('Sidebar compound components must be used within <Sidebar>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface SidebarRootProps {
  activeItem?: string
  onNavigate?: (item: string) => void
  children: React.ReactNode
  className?: string
  /** Shared collapsed state from parent — avoids duplicate hook instances */
  isCollapsed?: boolean
  toggle?: () => void
}

export default function Sidebar({
  activeItem = 'workspace-x',
  onNavigate = () => {},
  children,
  className = '',
  isCollapsed: externalCollapsed,
  toggle: externalToggle,
}: SidebarRootProps) {
  const internal = useSidebarCollapsed()
  const isCollapsed = externalCollapsed ?? internal.isCollapsed
  const toggle = externalToggle ?? internal.toggle
  const isVisible = !isCollapsed

  const handleBackdropClick = () => {
    if (isVisible) {
      toggle()
    }
  }

  return (
    <SidebarContext.Provider value={{ activeItem, onNavigate, isCollapsed, toggle }}>
      {/* Backdrop overlay */}
      {isVisible && (
        <div
          className="fixed inset-0 bg-black/50 z-[55] transition-opacity duration-300 ease-in-out"
          onClick={handleBackdropClick}
          aria-hidden="true"
        />
      )}

      {/* Floating sidebar */}
      <aside
        className={`h-screen fixed left-0 top-0 bg-surface-container-low backdrop-blur-3xl border-r border-outline-variant flex flex-col z-[60] transition-transform duration-300 ease-in-out ${
          isVisible ? 'translate-x-0' : '-translate-x-full'
        } w-[280px] ${className}`}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

Sidebar.Header = function SidebarHeader({
  title = 'Livicat',
  subtitle: subtitleProp,
}: {
  title?: string
  subtitle?: string
}) {
  const { toggle } = useSidebarContext()

  // Read version from Rust binary at runtime (more reliable than build-time import)
  // Falls back to pkg.version when Tauri is not available (web dev mode)
  const [runtimeVersion, setRuntimeVersion] = useState<string | null>(null)

  useEffect(() => {
    TauriService.getAppVersion().then((v) => {
      if (v) setRuntimeVersion(v)
    })
  }, [])

  const subtitle = subtitleProp ?? `v${runtimeVersion ?? pkg.version}`

  return (
    <div className="px-gutter mb-8 relative">
      {/* Close button for floating sidebar */}
      <button
        onClick={toggle}
        className="absolute right-2 top-2 p-2 rounded-lg hover:bg-surface-container-high transition-colors active:scale-95 z-10"
        title="Close menu"
        aria-label="Close menu"
      >
        <span className="material-symbols-outlined text-on-surface-variant">close</span>
      </button>

      {/* Livicat icon — clickable to toggle sidebar */}
      <button onClick={toggle} className="ml-2 mt-6 text-left">
        <img src="/livicat-icon.png" alt="Livicat" className="w-12 h-12" />
      </button>

      {/* Title and subtitle — clickable to toggle sidebar */}
      <button onClick={toggle} className="ml-2 mt-4 text-left">
        <h1 className="font-headline-md text-headline-md font-bold text-primary">{title}</h1>
        <p className="text-on-surface-variant font-label-md text-label-md">{subtitle}</p>
      </button>
    </div>
  )
}

Sidebar.Nav = function SidebarNav() {
  const { activeItem, onNavigate } = useSidebarContext()

  return (
    <nav className="flex-1 px-4 space-y-1">
      <SidebarNavItems activeItem={activeItem} onNavigate={onNavigate} />
    </nav>
  )
}

function SidebarNavItems({
  activeItem,
  onNavigate,
}: {
  activeItem: string
  onNavigate: (item: string) => void
}) {
  const mainItems: { id: string; label: string; icon: string }[] = [
    { id: 'workspace-x', label: 'Workspace', icon: 'magic_button' },
  ]

  const settingsItems = [{ id: 'settings', label: 'Settings', icon: 'settings' }]

  return (
    <>
      {mainItems.map((item) => {
        const isActive = activeItem === item.id
        return (
          <a
            key={item.id}
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onNavigate(item.id)
            }}
            className={`flex items-center gap-3 rounded-lg transition-colors duration-200 px-4 py-3 ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        )
      })}

      {/* Divider before settings */}
      <div className="my-4 border-t border-outline-variant" />

      {/* Settings items */}
      {settingsItems.map((item) => {
        const isActive = activeItem === item.id
        return (
          <a
            key={item.id}
            href="#"
            onClick={(e) => {
              e.preventDefault()
              onNavigate(item.id)
            }}
            className={`flex items-center gap-3 rounded-lg transition-colors duration-200 px-4 py-3 ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
            title={item.label}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        )
      })}
    </>
  )
}

export type { SidebarRootProps }
