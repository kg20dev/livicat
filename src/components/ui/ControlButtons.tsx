import { createContext, useContext } from 'react'

/* ─── Context ──────────────────────────────────────────────────── */

interface ControlButtonsContext {
  onRandomize: () => void
  onToggle: () => void
}

const ControlButtonsContext = createContext<ControlButtonsContext | null>(null)

function useControlButtonsContext() {
  const ctx = useContext(ControlButtonsContext)
  if (!ctx)
    throw new Error('ControlButtons compound components must be used within <ControlButtons>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface ControlButtonsRootProps {
  onRandomize?: () => void
  onToggle?: () => void
  children: React.ReactNode
  className?: string
}

export default function ControlButtons({
  onRandomize = () => {},
  onToggle = () => {},
  children,
  className = '',
}: ControlButtonsRootProps) {
  return (
    <ControlButtonsContext.Provider value={{ onRandomize, onToggle }}>
      <div className={`flex gap-4 mt-4 ${className}`}>{children}</div>
    </ControlButtonsContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

ControlButtons.Randomize = function ControlButtonsRandomize({
  label = 'Randomize Chat',
}: {
  label?: string
}) {
  const { onRandomize } = useControlButtonsContext()

  return (
    <button
      onClick={onRandomize}
      className="bg-surface-container hover:bg-surface-container-high px-4 py-2 rounded border border-outline-variant flex items-center gap-2 transition-all"
    >
      <span className="material-symbols-outlined">refresh</span>
      {label}
    </button>
  )
}

ControlButtons.Toggle = function ControlButtonsToggle({ label = 'Toggle UI' }: { label?: string }) {
  const { onToggle } = useControlButtonsContext()

  return (
    <button
      onClick={onToggle}
      className="bg-surface-container hover:bg-surface-container-high px-4 py-2 rounded border border-outline-variant flex items-center gap-2 transition-all"
    >
      <span className="material-symbols-outlined">visibility</span>
      {label}
    </button>
  )
}

export type { ControlButtonsRootProps }
