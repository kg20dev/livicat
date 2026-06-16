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
}

export default function Sidebar({
  activeItem = 'workspace-x',
  onNavigate = () => {},
  children,
  className = '',
}: SidebarRootProps) {
  const { isCollapsed, toggle } = useSidebarCollapsed()

  return (
    <SidebarContext.Provider value={{ activeItem, onNavigate, isCollapsed, toggle }}>
      <aside
        className={`h-screen fixed left-0 top-0 bg-surface-container-low backdrop-blur-3xl border-r border-outline-variant flex flex-col z-[60] transition-all duration-300 ease-in-out ${
          isCollapsed ? 'w-16' : 'w-[280px]'
        } ${className}`}
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
  const { isCollapsed, toggle } = useSidebarContext()

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
      {/* Collapsible icon toggle */}
      <button
        onClick={toggle}
        className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-surface-container-high transition-colors active:scale-95 z-10"
        title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <span className="material-symbols-outlined text-on-surface-variant">
          {isCollapsed ? 'menu_open' : 'menu'}
        </span>
      </button>

      {/* Livicat icon - responsive size */}
      <div
        className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'ml-8 scale-75' : 'ml-12'}`}
      >
        <img
          src="/livicat-icon.png"
          alt="Livicat"
          className={`transition-all duration-300 ease-in-out ${isCollapsed ? 'w-8 h-8' : 'w-12 h-12'}`}
        />
      </div>

      {/* Title and subtitle - hide when collapsed */}
      {!isCollapsed && (
        <div className="transition-all duration-300 ease-in-out opacity-100 ml-12">
          <h1 className="font-headline-md text-headline-md font-bold text-primary">{title}</h1>
          <p className="text-on-surface-variant font-label-md text-label-md">{subtitle}</p>
        </div>
      )}
    </div>
  )
}

Sidebar.Nav = function SidebarNav() {
  const { activeItem, onNavigate, isCollapsed } = useSidebarContext()

  return (
    <nav
      className={`flex-1 transition-all duration-300 ease-in-out ${isCollapsed ? 'px-2' : 'px-4'} space-y-1`}
    >
      <SidebarNavItems activeItem={activeItem} onNavigate={onNavigate} isCollapsed={isCollapsed} />
    </nav>
  )
}

function SidebarNavItems({
  activeItem,
  onNavigate,
  isCollapsed,
}: {
  activeItem: string
  onNavigate: (item: string) => void
  isCollapsed: boolean
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
            className={`flex items-center gap-3 rounded-lg transition-colors duration-200 ${
              isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'
            } ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
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
            className={`flex items-center gap-3 rounded-lg transition-colors duration-200 ${
              isCollapsed ? 'px-2 py-3 justify-center' : 'px-4 py-3'
            } ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
            title={isCollapsed ? item.label : undefined}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            {!isCollapsed && <span>{item.label}</span>}
          </a>
        )
      })}
    </>
  )
}

export type { SidebarRootProps }
