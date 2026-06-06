import { createContext, useContext, useCallback, useMemo, useRef, useEffect } from 'react'
import { useChatSettings, settingsToCSS, PRESETS } from '../../hooks/useChatSettings'
import type { ChatSettings } from '../../types/app'

/* ─── Context ──────────────────────────────────────────────────── */

interface StylingPanelContext {
  settings: ChatSettings
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void
  updateSettings: (partial: Partial<ChatSettings>) => void
  resetToDefaults: () => void
  currentCSS: string
  applyCSS: () => void
  savedIndicator: boolean
}

const StylingPanelContext = createContext<StylingPanelContext | null>(null)

function useStylingPanelContext() {
  const ctx = useContext(StylingPanelContext)
  if (!ctx) throw new Error('StylingPanel compound components must be used within <StylingPanel>')
  return ctx
}

/* ─── Root ──────────────────────────────────────────────────────── */

interface StylingPanelRootProps {
  onCSSChange?: (css: string) => void
  children: React.ReactNode
  className?: string
}

export default function StylingPanel({
  onCSSChange,
  children,
  className = '',
}: StylingPanelRootProps) {
  const { settings, updateSetting, updateSettings, resetToDefaults, savedIndicator } =
    useChatSettings()

  const currentCSS = useMemo(() => settingsToCSS(settings), [settings])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Debounced notification to parent
  const notifyParent = useCallback(
    (css: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => onCSSChange?.(css), 100)
    },
    [onCSSChange]
  )

  // Notify parent when CSS changes
  useEffect(() => {
    notifyParent(currentCSS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [currentCSS, notifyParent])

  const applyCSS = useCallback(() => {
    onCSSChange?.(currentCSS)
  }, [onCSSChange, currentCSS])

  const contextValue: StylingPanelContext = {
    settings,
    updateSetting,
    updateSettings,
    resetToDefaults,
    currentCSS,
    applyCSS,
    savedIndicator,
  }

  return (
    <StylingPanelContext.Provider value={contextValue}>
      <aside
        className={`w-[360px] bg-surface-container border-l border-outline-variant flex flex-col h-full overflow-hidden ${className}`}
      >
        {children}
      </aside>
    </StylingPanelContext.Provider>
  )
}

/* ─── Sub-components ────────────────────────────────────────────── */

StylingPanel.Header = function StylingPanelHeader({ title = 'Styling Panel' }: { title?: string }) {
  const { savedIndicator } = useStylingPanelContext()
  return (
    <div className="p-gutter border-b border-outline-variant flex items-center justify-between">
      <h2 className="font-title-lg text-title-lg text-on-surface">{title}</h2>
      <div className="flex items-center gap-2">
        {savedIndicator && <span className="text-label-md text-primary animate-pulse">Saved</span>}
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">
          history
        </span>
      </div>
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
  settingKey,
  label,
  unit = 'px',
  min = 0,
  max = 100,
  step = 1,
}: {
  settingKey: keyof ChatSettings
  label: string
  unit?: string
  min?: number
  max?: number
  step?: number
}) {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings[settingKey] as number

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
        step={step}
        value={value}
        onChange={(e) =>
          updateSetting(settingKey, Number(e.target.value) as ChatSettings[typeof settingKey])
        }
        className="w-full accent-primary bg-outline-variant h-1 rounded-full appearance-none cursor-pointer"
      />
    </div>
  )
}

StylingPanel.Toggle = function StylingPanelToggle({
  settingKey,
  label,
}: {
  settingKey: keyof ChatSettings
  label: string
}) {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings[settingKey] as boolean

  return (
    <div className="flex justify-between items-center">
      <span className="text-label-md text-on-surface-variant">{label}</span>
      <button
        onClick={() => updateSetting(settingKey, !value as ChatSettings[typeof settingKey])}
        className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
          value ? 'bg-primary' : 'bg-outline-variant'
        }`}
      >
        <div
          className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${
            value ? 'right-1' : 'left-1'
          }`}
        />
      </button>
    </div>
  )
}

StylingPanel.ColorField = function StylingPanelColorField({
  settingKey,
  label,
}: {
  settingKey: keyof ChatSettings
  label: string
}) {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings[settingKey] as string

  return (
    <div className="space-y-2">
      <span className="text-label-md text-on-surface-variant block">{label}</span>
      <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) =>
            updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
          }
          className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent p-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) =>
            updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
          }
          className="flex-1 bg-transparent text-code-sm font-code-sm uppercase outline-none text-on-surface"
        />
      </div>
    </div>
  )
}

StylingPanel.Select = function StylingPanelSelect({
  settingKey,
  label,
  options,
}: {
  settingKey: keyof ChatSettings
  label: string
  options: { value: string; label: string }[]
}) {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings[settingKey] as string

  return (
    <StylingPanel.Field label={label}>
      <select
        value={value}
        onChange={(e) =>
          updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
        }
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface focus:ring-2 focus:ring-primary outline-none transition-all"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </StylingPanel.Field>
  )
}

StylingPanel.NumberField = function StylingPanelNumberField({
  settingKey,
  label,
  min = 0,
  max = 9999,
}: {
  settingKey: keyof ChatSettings
  label: string
  min?: number
  max?: number
}) {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings[settingKey] as number

  return (
    <StylingPanel.Field label={label}>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) =>
          updateSetting(settingKey, Number(e.target.value) as ChatSettings[typeof settingKey])
        }
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-on-surface outline-none focus:ring-2 focus:ring-primary"
      />
    </StylingPanel.Field>
  )
}

StylingPanel.PresetSelector = function StylingPanelPresetSelector() {
  const { settings, updateSettings } = useStylingPanelContext()

  return (
    <div className="grid grid-cols-2 gap-2">
      {PRESETS.map((preset) => {
        // "active" if this preset's overrides match the current settings
        const overrideEntries = Object.entries(preset.settings)
        const isActive =
          overrideEntries.length > 0 &&
          overrideEntries.every(([key, val]) => settings[key as keyof ChatSettings] === val)
        return (
          <button
            key={preset.name}
            onClick={() => updateSettings(preset.settings)}
            className={`text-left p-2.5 rounded-lg border transition-all ${
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/50'
            }`}
          >
            <span className="text-label-md font-bold text-on-surface block">{preset.label}</span>
            <span className="text-code-sm text-on-surface-variant block mt-0.5">
              {preset.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

StylingPanel.Actions = function StylingPanelActions() {
  const { resetToDefaults, applyCSS } = useStylingPanelContext()

  return (
    <div className="p-gutter bg-surface-container-high border-t border-outline-variant">
      <div className="flex gap-2">
        <button
          onClick={resetToDefaults}
          className="flex-1 bg-surface-container-lowest border border-outline-variant py-2.5 rounded-lg font-bold hover:bg-surface-container transition-colors"
        >
          Reset
        </button>
        <button
          onClick={applyCSS}
          className="flex-1 bg-primary text-on-primary py-2.5 rounded-lg font-bold hover:opacity-90 active:scale-95 transition-all shadow-lg shadow-primary/20"
        >
          Apply
        </button>
      </div>
    </div>
  )
}

export type { StylingPanelRootProps }
