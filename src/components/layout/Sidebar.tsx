import { createContext, useContext, useEffect, useState } from 'react'
import pkg from '../../../package.json'
import { TauriService } from '../../services'

/* ─── Context ──────────────────────────────────────────────────── */

interface SidebarContext {
  activeItem: string
  onNavigate: (item: string) => void
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
  activeItem = 'workspace',
  onNavigate = () => {},
  children,
  className = '',
}: SidebarRootProps) {
  return (
    <SidebarContext.Provider value={{ activeItem, onNavigate }}>
      <aside
        className={`h-screen w-[280px] fixed left-0 top-0 bg-surface-container-low backdrop-blur-3xl border-r border-outline-variant flex flex-col py-panel-padding z-[60] ${className}`}
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
    <div className="px-gutter mb-8">
      <h1 className="font-headline-md text-headline-md font-bold text-primary">{title}</h1>
      <p className="text-on-surface-variant font-label-md text-label-md">{subtitle}</p>
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
    { id: 'workspace', label: 'Workspace', icon: 'edit_square' },
    { id: 'workspace-x', label: 'Workspace X', icon: 'magic_button' },
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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
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
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
              isActive
                ? 'text-primary font-bold border-r-2 border-primary bg-surface-container-high'
                : 'text-on-surface-variant font-medium hover:bg-surface-container-high active:scale-95 duration-100'
            }`}
          >
            <span className="material-symbols-outlined">{item.icon}</span>
            <span>{item.label}</span>
          </a>
        )
      })}
    </>
  )
}

Sidebar.ExportButton = function SidebarExportButton({
  label = 'Export CSS',
  onExport = () => {},
}: {
  label?: string
  onExport?: () => void
}) {
  return (
    <div className="px-4 mt-auto">
      <button
        onClick={onExport}
        className="w-full bg-primary text-on-primary py-3 rounded-lg font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity active:scale-95"
      >
        <span className="material-symbols-outlined">download</span>
        {label}
      </button>
    </div>
  )
}

export type { SidebarRootProps }
