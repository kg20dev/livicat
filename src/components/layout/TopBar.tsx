/**
 * TopBar component — simplified layout without search/templates/notifications/help.
 * These features are hidden until they're ready for use.
 */

import packageJson from '../../../package.json'

/* ─── Root ──────────────────────────────────────────────────────── */

interface TopBarRootProps {
  children: React.ReactNode
  className?: string
}

export default function TopBar({ children, className = '' }: TopBarRootProps) {
  return (
    <header
      className={`h-16 fixed top-0 right-0 left-0 z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-container-margin ${className}`}
    >
      {children}
    </header>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

TopBar.LogoButton = function TopBarLogoButton({
  onClick,
  title = 'Open menu',
}: {
  onClick: () => void
  title?: string
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 p-2 pr-4 rounded-lg hover:bg-surface-container-high transition-all active:scale-95 group hover:shadow-sm"
      title={title}
      aria-label={title}
    >
      <img
        src="/livicat-icon.png"
        alt="Livicat"
        className="w-8 h-8 transition-transform group-hover:rotate-12"
      />
      <div className="flex flex-col">
        <span className="font-headline-sm text-headline-sm font-black text-on-surface leading-tight">
          Livicat
        </span>
        <span className="text-[10px] text-on-surface-variant/50 font-normal leading-none -mt-1">
          v{packageJson.version}
        </span>
      </div>
    </button>
  )
}

TopBar.Left = function TopBarLeft({ title = 'Live Chat Studio' }: { title?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-headline-sm text-headline-sm font-black text-on-surface">{title}</span>
    </div>
  )
}

TopBar.MenuButton = function TopBarMenuButton({
  onToggle,
  isCollapsed,
}: {
  onToggle: () => void
  isCollapsed: boolean
}) {
  return (
    <button
      onClick={onToggle}
      className="p-2 rounded-lg hover:bg-surface-container-high transition-colors active:scale-95"
      title={isCollapsed ? 'Open menu' : 'Close menu'}
    >
      <span className="material-symbols-outlined text-on-surface-variant">menu</span>
    </button>
  )
}

TopBar.Right = function TopBarRight({ children }: { children?: React.ReactNode }) {
  return <div className="flex items-center gap-4">{children}</div>
}

export type { TopBarRootProps }
