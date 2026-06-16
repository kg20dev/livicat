/**
 * SettingsPanel — Generic settings panel that renders controls from a scheme
 *
 * Reads an array of SettingDef and renders the appropriate control type:
 *   color  → ColorPicker with hex input
 *   range  → SliderRow with number input
 *   toggle → ToggleRow switch
 *   select → SelectRow dropdown
 *
 * Uses the same sub-components from WorkspaceX to maintain visual consistency.
 */

import type { SettingDef } from '../../theme/types'

/* ─── Sub-components (extracted inline for independence) ────────── */

function ColorPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const hex = value.replace('#', '')
  return (
    <div className="color-picker-container">
      <div className="flex items-center gap-0 bg-surface-container-lowest border border-outline-variant rounded-md overflow-hidden">
        <div className="relative w-8 h-8 shrink-0">
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-[-3px] w-[130%] h-[130%] cursor-pointer opacity-0"
          />
          <div
            className="w-full h-full rounded-l-md"
            style={{
              backgroundColor: value,
              backgroundImage:
                'linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)',
              backgroundSize: '6px 6px',
              backgroundPosition: '0 0, 0 3px, 3px -3px, -3px 0px',
            }}
          />
        </div>
        <span className="text-[11px] text-on-surface-variant/60 pl-1 font-mono">#</span>
        <input
          type="text"
          value={hex}
          onChange={(e) => onChange('#' + e.target.value.replace('#', '').toUpperCase())}
          className="flex-1 bg-transparent text-[12px] font-mono font-medium text-on-surface outline-none px-1 py-1.5 w-14 uppercase placeholder:text-on-surface-variant/30"
          placeholder="RRGGBB"
          maxLength={6}
        />
      </div>
    </div>
  )
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[12px] text-on-surface font-medium">{label}</span>
        <div className="flex items-center gap-1 bg-surface-container-lowest border border-outline-variant rounded-md px-2 py-0.5">
          <input
            type="number"
            value={value}
            min={min}
            max={max}
            step={step}
            onChange={(e) => onChange(Number(e.target.value))}
            className="w-10 text-[12px] font-semibold text-on-surface bg-transparent border-none outline-none text-right tabular-nums"
          />
          {unit && (
            <span className="text-[10px] font-medium text-on-surface-variant/60">{unit}</span>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary slider-thumb"
        style={{
          background: `linear-gradient(to right, var(--color-primary) 0%, var(--color-primary) ${
            ((value - min) / (max - min)) * 100
          }%, var(--color-surface-container-highest) ${((value - min) / (max - min)) * 100}%, var(--color-surface-container-highest) 100%)`,
        }}
      />
    </div>
  )
}

function ToggleRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[12px] text-on-surface font-medium">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative w-9 h-5 rounded-full transition-colors duration-150 active:scale-[0.97] cursor-pointer ${value ? 'bg-primary' : 'bg-surface-container-highest'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-150 ease-out ${
            value ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (v: string) => void
}) {
  return (
    <div>
      <span className="text-[12px] text-on-surface font-medium block mb-1.5">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-surface-container-lowest border border-outline-variant rounded-md py-1.5 px-2.5 text-[12px] text-on-surface outline-none appearance-none cursor-pointer hover:border-primary/40 focus:border-primary"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none'%3E%3Cpath d='M7 10l5 5 5-5' stroke='%23998ba2' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          backgroundSize: '12px',
        }}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/* ─── SettingsPanel ─────────────────────────────────────────────── */

interface SettingsPanelProps {
  scheme: SettingDef[]
  values: Record<string, string | number | boolean>
  onChange: (key: string, value: string | number | boolean) => void
}

export function SettingsPanel({ scheme, values, onChange }: SettingsPanelProps) {
  return (
    <div className="space-y-4">
      {scheme.map((def) => {
        const currentValue = values[def.key] ?? def.default

        switch (def.type) {
          case 'color':
            return (
              <div key={def.key}>
                <ColorRow
                  label={def.label}
                  value={currentValue as string}
                  onChange={(v) => onChange(def.key, v)}
                />
              </div>
            )

          case 'range':
            return (
              <div key={def.key}>
                <SliderRow
                  label={def.label}
                  value={currentValue as number}
                  min={def.min ?? 0}
                  max={def.max ?? 100}
                  step={def.step ?? 1}
                  unit={def.unit ?? ''}
                  onChange={(v) => onChange(def.key, v)}
                />
              </div>
            )

          case 'toggle':
            return (
              <div key={def.key}>
                <ToggleRow
                  label={def.label}
                  value={currentValue as boolean}
                  onChange={(v) => onChange(def.key, v)}
                />
              </div>
            )

          case 'select':
            return (
              <div key={def.key}>
                <SelectRow
                  label={def.label}
                  value={currentValue as string}
                  options={def.options ?? []}
                  onChange={(v) => onChange(def.key, v)}
                />
              </div>
            )

          default:
            return null
        }
      })}
    </div>
  )
}

/* ─── Helper: Color row (label + picker) ────────────────────────── */

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[12px] text-on-surface font-medium">{label}</span>
      <ColorPicker value={value} onChange={onChange} />
    </div>
  )
}
