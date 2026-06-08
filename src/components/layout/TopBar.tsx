/**
 * TopBar component — simplified layout without search/templates/notifications/help.
 * These features are hidden until they're ready for use.
 */

/* ─── Root ──────────────────────────────────────────────────────── */

interface TopBarRootProps {
  children: React.ReactNode
  className?: string
}

export default function TopBar({ children, className = '' }: TopBarRootProps) {
  return (
    <header
      className={`h-16 fixed top-0 right-0 left-[280px] z-50 bg-surface/80 backdrop-blur-xl border-b border-outline-variant flex items-center justify-between px-container-margin ${className}`}
    >
      {children}
    </header>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

TopBar.Left = function TopBarLeft({ title = 'Live Chat Studio' }: { title?: string }) {
  return (
    <div className="flex items-center gap-4">
      <span className="font-headline-sm text-headline-sm font-black text-on-surface">{title}</span>
    </div>
  )
}

TopBar.Right = function TopBarRight({ children }: { children?: React.ReactNode }) {
  return <div className="flex items-center gap-4">{children}</div>
}

export type { TopBarRootProps }
