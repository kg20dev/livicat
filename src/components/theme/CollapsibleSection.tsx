/**
 * CollapsibleSection — Expandable/collapsible container for settings groups
 *
 * Supports two modes:
 * - Uncontrolled: manages its own open/closed state via `defaultOpen`
 * - Controlled: parent manages state via `open` + `onToggle` props
 */

import { useState } from 'react'

export function CollapsibleSection({
  icon,
  title,
  defaultOpen = true,
  open,
  onToggle,
  children,
}: {
  icon: string
  title: string
  defaultOpen?: boolean
  /** Controlled mode: external open state (persists across parent re-renders) */
  open?: boolean
  /** Controlled mode: called when user clicks the header */
  onToggle?: () => void
  children: React.ReactNode
}) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen)
  const isOpen = open !== undefined ? open : internalOpen
  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalOpen((v) => !v)
    }
  }

  return (
    <div className="rounded-xl border border-outline-variant/40 bg-surface-container-low/50 backdrop-blur-sm transition-colors duration-200 ring-1 ring-primary/[0.06]">
      <button
        type="button"
        onClick={handleToggle}
        className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-container/50 ${
          isOpen ? 'bg-primary/[0.04] rounded-t-xl' : 'rounded-xl'
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
            isOpen ? 'rotate-180' : ''
          }`}
        >
          expand_more
        </span>
      </button>
      {isOpen && (
        <div className="border-t border-outline-variant/30 px-4 py-4 space-y-4 bg-surface-container-lowest/30 rounded-b-xl">
          {children}
        </div>
      )}
    </div>
  )
}
