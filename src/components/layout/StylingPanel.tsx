import { createContext, useContext } from 'react'

/* ─── Context ──────────────────────────────────────────────────── */

interface StylingPanelContext {
  onReset: () => void
  onApply: () => void
}

const StylingPanelContext = createContext<StylingPanelContext | null>(null)

function useStylingPanelContext() {
  const ctx = useContext(StylingPanelContext)
  if (!ctx) throw new Error('StylingPanel compound components must be used within <StylingPanel>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface StylingPanelRootProps {
  onReset?: () => void
  onApply?: () => void
  children: React.ReactNode
  className?: string
}

export default function StylingPanel({
  onReset = () => {},
  onApply = () => {},
  children,
  className = '',
}: StylingPanelRootProps) {
  return (
    <StylingPanelContext.Provider value={{ onReset, onApply }}>
      <aside
        className={`w-[360px] bg-surface-container border-l border-outline-variant flex flex-col h-full overflow-hidden ${className}`}
      >
        {children}
      </aside>
    </StylingPanelContext.Provider>
  )
}

/* ─── Sub-components (exact HTML classes) ────────────────────────── */

StylingPanel.Header = function StylingPanelHeader({ title = 'Styling Panel' }: { title?: string }) {
  return (
    <div className="p-gutter border-b border-outline-variant flex items-center justify-between">
      <h2 className="font-title-lg text-title-lg text-on-surface">{title}</h2>
      <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
        history
      </span>
    </div>
  )
}

StylingPanel.Section = function StylingPanelSection({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h3 className="text-label-md font-bold uppercase tracking-wider text-on-surface-variant">
          {title}
        </h3>
      </div>
      {children}
    </div>
  )
}

StylingPanel.Field = function StylingPanelField({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="text-label-md text-on-surface-variant mb-1 block">{label}</span>
      {children}
    </label>
  )
}

StylingPanel.Slider = function StylingPanelSlider({
  label,
  value,
  unit = 'px',
  min = 0,
  max = 100,
  onChange = () => {},
}: {
  label: string
  value: number
  unit?: string
  min?: number
  max?: number
  onChange?: (value: number) => void
}) {
  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-label-md text-on-surface-variant">{label}</span>
        <span className="text-label-md font-bold text-primary">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-primary bg-outline-variant h-1 rounded-full appearance-none cursor-pointer"
      />
    </div>
  )
}

StylingPanel.Actions = function StylingPanelActions() {
  const { onReset, onApply } = useStylingPanelContext()

  return (
    <div className="p-gutter bg-surface-container-high border-t border-outline-variant">
      <div className="flex gap-2">
        <button
          onClick={onReset}
          className="flex-1 bg-surface-container-lowest border border-outline-variant py-2.5 rounded-lg font-bold hover:bg-surface-container transition-colors"
        >
          Reset
        </button>
        <button
          onClick={onApply}
          className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export type { StylingPanelRootProps }
