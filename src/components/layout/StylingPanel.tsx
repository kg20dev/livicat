import { createContext, useContext, useCallback, useMemo, useRef, useEffect } from 'react'
import { useChatSettings, settingsToCSS, PRESETS } from '../../hooks/useChatSettings'
import type { ChatSettings } from '../../types/app'
import { loadWebFont } from '../../utils/fonts'
import { trackEventAsync } from '../../utils/analytics'

/* ─── Context ──────────────────────────────────────────────────── */

interface StylingPanelContext {
  settings: ChatSettings
  updateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void
  updateSettings: (partial: Partial<ChatSettings>) => void
  currentCSS: string
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
  const { settings, updateSetting, updateSettings, savedIndicator } = useChatSettings()

  // Wrapped updateSetting with analytics tracking
  const trackedUpdateSetting = useCallback(
    <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => {
      updateSetting(key, value)
      trackEventAsync('customization_changed', {
        setting_type:
          typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'toggle' : 'select',
        setting_key: String(key),
      })
    },
    [updateSetting]
  )

  // Wrapped updateSettings with analytics tracking (used for presets)
  const trackedUpdateSettings = useCallback(
    (partial: Partial<ChatSettings>) => {
      updateSettings(partial)
      trackEventAsync('preset_selected', {
        theme: partial.theme || 'custom',
        previous_theme: settings.theme || null,
      })
    },
    [updateSettings, settings.theme]
  )

  const currentCSS = useMemo(() => settingsToCSS(settings), [settings])
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  // Auto-load web font when font family changes
  useEffect(() => {
    loadWebFont(settings.fontFamily)
  }, [settings.fontFamily])

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

  const contextValue: StylingPanelContext = {
    settings,
    updateSetting: trackedUpdateSetting,
    updateSettings: trackedUpdateSettings,
    currentCSS,
    savedIndicator,
  }

  return (
    <StylingPanelContext.Provider value={contextValue}>
      <aside
        className={`w-[360px] bg-surface border-l border-outline-variant flex flex-col h-full overflow-hidden shadow-xl ${className}`}
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
    <div className="px-5 py-4 border-b border-outline-variant/50 flex items-center justify-between">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{title}</h2>
      <div className="flex items-center gap-3">
        {savedIndicator && (
          <span className="text-label-md text-primary font-medium flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            Saved
          </span>
        )}
        <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary text-[20px]">
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
    <div className="bg-surface-container-low rounded-xl px-4 py-4 mb-3">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h3 className="text-label-md font-semibold text-on-surface">{title}</h3>
      </div>
      <div className="space-y-3">{children}</div>
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
    <label className="block cursor-pointer">
      <span className="text-label-md text-on-surface-variant mb-1.5 block font-medium">
        {label}
      </span>
      {children}
    </label>
  )
}

/* ControlGroup - visually group related controls (minimal) */
StylingPanel.ControlGroup = function StylingPanelControlGroup({
  label,
  children,
}: {
  label?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center gap-1.5 py-0.5">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">
            tune
          </span>
          <span className="text-label-sm font-medium text-on-surface-variant/70 uppercase tracking-wider">
            {label}
          </span>
        </div>
      )}
      {children}
    </div>
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
      <div className="flex justify-between mb-1.5 items-center">
        <span className="text-label-md text-on-surface font-medium">{label}</span>
        <span className="text-label-sm text-on-surface-variant tabular-nums">
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
        className="w-full h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer slider-thumb"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
            ((value - min) / (max - min)) * 100
          }%, var(--color-surface-container-highest) ${((value - min) / (max - min)) * 100}%, var(--color-surface-container-highest) 100%)`,
        }}
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
    <div className="flex justify-between items-center py-0.5">
      <span className="text-label-md text-on-surface font-medium">{label}</span>
      <button
        onClick={() => updateSetting(settingKey, !value as ChatSettings[typeof settingKey])}
        className={`w-11 h-6 rounded-full relative cursor-pointer transition-colors duration-150 ${
          value ? 'bg-primary' : 'bg-surface-container-highest'
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-150 ${
            value ? 'translate-x-5' : 'translate-x-0.5'
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
    <div>
      <span className="text-label-md text-on-surface-variant mb-1.5 block font-medium">
        {label}
      </span>
      <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-md p-1.5">
        <div className="relative w-7 h-7 shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) =>
              updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
            }
            className="absolute inset-[-2px] w-[120%] h-[120%] cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded border border-outline-variant/60"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) =>
            updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
          }
          className="flex-1 bg-transparent text-code-sm font-code-sm uppercase outline-none text-on-surface placeholder:text-on-surface-variant/40"
          placeholder="#000000"
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
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-2 px-3 text-on-surface outline-none appearance-none cursor-pointer hover:border-primary/40 focus:border-primary text-label-md"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23998ba2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          backgroundSize: '14px',
        }}
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

StylingPanel.AnimationStyleSelector = function StylingPanelAnimationStyleSelector() {
  const { settings, updateSetting } = useStylingPanelContext()
  const value = settings.newMessageAnimation as string

  const animationOptions = [
    { value: 'default', label: 'None', icon: 'block' },
    { value: 'blink', label: 'Blink', icon: 'visibility' },
    { value: 'glowing', label: 'Glowing', icon: 'auto_awesome' },
    { value: 'fade', label: 'Fade', icon: 'opacity' },
    { value: 'slide', label: 'Slide', icon: 'arrow_right_alt' },
    { value: 'bounce', label: 'Bounce', icon: 'restart_alt' },
  ]

  return (
    <StylingPanel.Field label="New Message Animation">
      <div className="grid grid-cols-2 gap-2">
        {animationOptions.map((option) => (
          <button
            key={option.value}
            onClick={() =>
              updateSetting(
                'newMessageAnimation',
                option.value as ChatSettings['newMessageAnimation']
              )
            }
            className={`p-2.5 rounded-md border text-left transition-colors duration-150 ${
              value === option.value
                ? 'border-primary bg-primary/8'
                : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                {option.icon}
              </span>
              <span className="text-label-sm font-medium text-on-surface">{option.label}</span>
            </div>
          </button>
        ))}
      </div>
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
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-2 px-3 text-on-surface outline-none hover:border-primary/40 focus:border-primary text-label-md tabular-nums"
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
            className={`text-left p-2.5 rounded-md border transition-colors duration-150 ${
              isActive
                ? 'border-primary bg-primary/8'
                : 'border-outline-variant bg-surface-container-lowest hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isActive ? 'text-primary' : 'text-on-surface-variant/60'
                }`}
              >
                auto_awesome
              </span>
              <span className="text-label-sm font-medium text-on-surface">{preset.label}</span>
            </div>
            <span className="text-label-sm text-on-surface-variant/60 block leading-tight">
              {preset.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* Hero Section - subtle primary tint for Quick Presets */
StylingPanel.HeroSection = function StylingPanelHeroSection({
  icon,
  title,
  children,
}: {
  icon: string
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-primary/[0.04] rounded-xl px-4 py-4 mb-3 border border-primary/10">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
        <h3 className="text-label-md font-semibold text-on-surface">{title}</h3>
      </div>
      <div>{children}</div>
    </div>
  )
}

export type { StylingPanelRootProps }
