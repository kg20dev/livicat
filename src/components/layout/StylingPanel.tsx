import { createContext, useContext, useCallback, useMemo, useRef, useEffect } from 'react'
import { useChatSettings, settingsToCSS, PRESETS } from '../../hooks/useChatSettings'
import type { ChatSettings } from '../../types/app'
import { loadWebFont } from '../../utils/fonts'

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
    updateSetting,
    updateSettings,
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
    <div className="p-gutter border-b border-outline-variant flex items-center justify-between bg-surface-container-low/50 backdrop-blur-sm">
      <h2 className="font-title-lg text-title-lg text-on-surface font-semibold">{title}</h2>
      <div className="flex items-center gap-2">
        {savedIndicator && (
          <span className="text-label-md text-primary animate-pulse font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            Saved
          </span>
        )}
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
    <div className="relative">
      {/* Section header - minimal */}
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
          {icon}
        </span>
        <h3 className="text-label-md font-medium text-on-surface">{title}</h3>
      </div>

      {/* Section content */}
      <div className="px-1 py-2 space-y-2">{children}</div>

      {/* Section separator */}
      <div className="border-t border-outline-variant/40 my-4" />
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
    <div className="space-y-2">
      {label && (
        <div className="flex items-center gap-1.5 py-1">
          <span className="material-symbols-outlined text-[14px] text-on-surface-variant/70">
            tune
          </span>
          <span className="text-label-sm font-medium text-on-surface-variant/80 uppercase tracking-wide">
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
      <div className="flex justify-between mb-2 items-center">
        <span className="text-label-md text-on-surface-variant font-medium">{label}</span>
        <span className="text-label-md font-bold text-primary text-sm bg-primary/10 px-2 py-0.5 rounded">
          {value}
          {unit}
        </span>
      </div>
      <div className="relative">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) =>
            updateSetting(settingKey, Number(e.target.value) as ChatSettings[typeof settingKey])
          }
          className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer slider-thumb"
          style={{
            background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
              ((value - min) / (max - min)) * 100
            }%, var(--color-surface-container-highest) ${((value - min) / (max - min)) * 100}%, var(--color-surface-container-highest) 100%)`,
          }}
        />
      </div>
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
    <div className="flex justify-between items-center group">
      <span className="text-label-md text-on-surface-variant font-medium group-hover:text-on-surface transition-colors">
        {label}
      </span>
      <button
        onClick={() => updateSetting(settingKey, !value as ChatSettings[typeof settingKey])}
        className={`w-11 h-6 rounded-full relative cursor-pointer transition-all duration-200 ease-out ${
          value
            ? 'bg-primary shadow-lg shadow-primary/30'
            : 'bg-surface-container-highest hover:bg-outline'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ease-out shadow-sm ${
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
      <div className="flex items-center gap-2">
        <span className="text-label-md text-on-surface-variant font-medium">{label}</span>
        <div
          className="w-4 h-4 rounded border border-outline-variant shadow-sm"
          style={{ backgroundColor: value }}
        />
      </div>
      <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-lg p-1.5 hover:border-primary/50 transition-colors">
        <div className="relative w-8 h-8 shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) =>
              updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
            }
            className="absolute inset-[-4px] w-[200%] h-[200%] cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded border border-outline-variant"
            style={{ backgroundColor: value }}
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) =>
            updateSetting(settingKey, e.target.value as ChatSettings[typeof settingKey])
          }
          className="flex-1 bg-transparent text-code-sm font-code-sm uppercase outline-none text-on-surface placeholder:text-on-surface-variant/50"
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
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface outline-none transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 appearance-none cursor-pointer relative"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23cdc3d6' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '16px',
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
    { value: 'fade', label: 'Fade', icon: 'fade_on_image' },
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
            className={`p-2.5 rounded-lg border transition-all duration-200 text-left ${
              value === option.value
                ? 'border-primary bg-primary/10 shadow-sm shadow-primary/10'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/30 hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-[18px] text-primary">
                {option.icon}
              </span>
              <span className="text-label-sm font-medium text-on-surface">{option.label}</span>
            </div>
            {value === option.value && (
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-primary">check</span>
                <span className="text-label-sm text-on-surface-variant/70">Active</span>
              </div>
            )}
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
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2.5 text-on-surface outline-none transition-all hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
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
            className={`text-left p-2.5 rounded-lg border transition-all duration-200 ${
              isActive
                ? 'border-primary bg-primary/10'
                : 'border-outline-variant bg-surface-container-lowest hover:border-primary/30'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-[16px] text-primary">
                auto_awesome
              </span>
              <span className="text-label-sm font-medium text-on-surface">{preset.label}</span>
            </div>
            <span className="text-label-sm text-on-surface-variant/70 block leading-tight">
              {preset.description}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* Hero Section - special treatment for Quick Presets */
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
    <div className="relative mb-4">
      {/* Hero header - minimal */}
      <div className="flex items-center gap-2 px-1 py-2">
        <span className="material-symbols-outlined text-on-surface-variant text-[20px]">
          {icon}
        </span>
        <h3 className="text-label-md font-medium text-on-surface">{title}</h3>
      </div>

      {/* Hero content */}
      <div className="px-1 py-2">{children}</div>

      {/* Section separator */}
      <div className="border-t border-outline-variant/40 my-4" />
    </div>
  )
}

export type { StylingPanelRootProps }
