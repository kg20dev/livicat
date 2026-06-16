/**
 * CollapsibleSection — Expandable/collapsible container for settings groups
 */

import { useState } from 'react'

export function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  children,
}: {
  icon: string
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/50 backdrop-blur-sm transition-colors duration-200 ring-1 ring-primary/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-container/50 ${
          open ? 'bg-primary/[0.04] rounded-t-xl' : 'rounded-xl'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
            <span className="material-symbols-outlined text-[14px]">{icon}</span>
          </span>
          <span className="text-sm font-semibold text-on-surface">{title}</span>
        </div>
        <span
          className={`material-symbols-outlined text-[16px] text-on-surface-variant transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      {open && (
        <div className="border-t border-outline-variant/30 px-4 py-4 space-y-4 bg-surface-container-lowest/30 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  )
}
