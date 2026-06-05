import { FC, useState } from 'react'
import { Card } from '../shared/Card'
import type { ChatSettings, MessageSpacing, AnimationSpeed } from '../../hooks/useYouTubeChat'

interface SettingsPanelProps {
  settings: ChatSettings
  onUpdateSetting: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void
  onApplyPreset: (presetName: string) => void
  onResetDefaults: () => void
  savedIndicator: boolean
  presets: Record<string, ChatSettings>
}

export const SettingsPanel: FC<SettingsPanelProps> = ({
  settings,
  onUpdateSetting,
  onApplyPreset,
  onResetDefaults,
  savedIndicator,
}) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    presets: true,
    toggles: true,
    sliders: false,
    appearance: false,
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const SectionHeader: FC<{ title: string; section: string }> = ({ title, section }) => (
    <button
      onClick={() => toggleSection(section)}
      className="w-full flex items-center justify-between py-2 px-3 text-sm font-medium text-gray-300 hover:text-white transition-colors"
    >
      <span>{title}</span>
      <svg
        className={`w-4 h-4 transition-transform ${expandedSections[section] ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  )

  const ToggleSwitch: FC<{ 
    label: string
    checked: boolean
    onChange: (value: boolean) => void
    description?: string
  }> = ({ label, checked, onChange, description }) => (
    <div className="flex items-center justify-between py-2">
      <div className="flex-1">
        <label htmlFor={`toggle-${label.replace(/\s+/g, '-')}`} className="text-sm text-gray-300">{label}</label>
        {description && <p className="text-[10px] text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        id={`toggle-${label.replace(/\s+/g, '-')}`}
        onClick={() => onChange(!checked)}
        aria-label={label}
        aria-checked={checked}
        role="switch"
        className={`relative w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-blue-500' : 'bg-gray-600'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )

  const Slider: FC<{
    label: string
    value: number
    min: number
    max: number
    onChange: (value: number) => void
    unit?: string
  }> = ({ label, value, min, max, onChange, unit }) => (
    <div className="py-2">
      <div className="flex items-center justify-between mb-2">
        <label htmlFor={`slider-${label.replace(/\s+/g, '-')}`} className="text-sm text-gray-300">{label}</label>
        <span className="text-xs text-gray-400">
          {value}{unit}
        </span>
      </div>
      <input
        id={`slider-${label.replace(/\s+/g, '-')}`}
        type="range"
        min={min}
        max={max}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
    </div>
  )

  const SelectDropdown: FC<{
    label: string
    value: string
    options: { value: string; label: string }[]
    onChange: (value: string) => void
  }> = ({ label, value, options, onChange }) => (
    <div className="py-2">
      <label htmlFor={`select-${label.replace(/\s+/g, '-')}`} className="text-sm text-gray-300 block mb-2">{label}</label>
      <select
        id={`select-${label.replace(/\s+/g, '-')}`}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )

  const spacingOptions = [
    { value: 'compact', label: 'Compact' },
    { value: 'normal', label: 'Normal' },
    { value: 'comfortable', label: 'Comfortable' },
  ]

  const animationOptions = [
    { value: 'none', label: 'None' },
    { value: 'slow', label: 'Slow' },
    { value: 'normal', label: 'Normal' },
  ]

  return (
    <Card title="Chat Customization" className="relative">
      {/* Saved indicator badge */}
      {savedIndicator && (
        <div className="absolute top-4 right-4 px-2 py-1 bg-green-500/20 border border-green-500/40 rounded-md">
          <span className="text-xs text-green-400">Saved</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Preset Themes */}
        <div className="border-b border-gray-700/50">
          <SectionHeader title="Preset Themes" section="presets" />
          {expandedSections.presets && (
            <div className="px-3 pb-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => onApplyPreset('default')}
                className="px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Default
              </button>
              <button
                onClick={() => onApplyPreset('minimal')}
                className="px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Minimal
              </button>
              <button
                onClick={() => onApplyPreset('compact')}
                className="px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Compact
              </button>
              <button
                onClick={() => onApplyPreset('large')}
                className="px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Large
              </button>
              <button
                onClick={() => onApplyPreset('stream')}
                className="col-span-2 px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 hover:border-blue-500 hover:text-white transition-colors"
              >
                Stream
              </button>
            </div>
          )}
        </div>

        {/* Toggle Settings */}
        <div className="border-b border-gray-700/50">
          <SectionHeader title="Display Options" section="toggles" />
          {expandedSections.toggles && (
            <div className="px-3">
              <ToggleSwitch
                label="Show Avatars"
                checked={settings.showAvatars}
                onChange={(value) => onUpdateSetting('showAvatars', value)}
                description="Show user profile pictures"
              />
              <ToggleSwitch
                label="Show Timestamps"
                checked={settings.showTimestamps}
                onChange={(value) => onUpdateSetting('showTimestamps', value)}
                description="Display message timestamps"
              />
              <ToggleSwitch
                label="Auto Scroll"
                checked={settings.autoScroll}
                onChange={(value) => onUpdateSetting('autoScroll', value)}
                description="Automatically scroll to new messages"
              />
            </div>
          )}
        </div>

        {/* Slider Settings */}
        <div className="border-b border-gray-700/50">
          <SectionHeader title="Message Limits" section="sliders" />
          {expandedSections.sliders && (
            <div className="px-3">
              <Slider
                label="Font Size"
                value={settings.fontSize}
                min={12}
                max={24}
                onChange={(value) => onUpdateSetting('fontSize', value)}
                unit="px"
              />
              <Slider
                label="Max Messages"
                value={settings.maxMessages}
                min={50}
                max={500}
                onChange={(value) => onUpdateSetting('maxMessages', value)}
              />
              <Slider
                label="Background Opacity"
                value={settings.bgOpacity}
                min={0}
                max={100}
                onChange={(value) => onUpdateSetting('bgOpacity', value)}
                unit="%"
              />
            </div>
          )}
        </div>

        {/* Appearance Settings */}
        <div>
          <SectionHeader title="Appearance" section="appearance" />
          {expandedSections.appearance && (
            <div className="px-3 space-y-3">
              <SelectDropdown
                label="Message Spacing"
                value={settings.messageSpacing}
                options={spacingOptions}
                onChange={(value) => onUpdateSetting('messageSpacing', value as MessageSpacing)}
              />
              <SelectDropdown
                label="Animation Speed"
                value={settings.animationSpeed}
                options={animationOptions}
                onChange={(value) => onUpdateSetting('animationSpeed', value as AnimationSpeed)}
              />
              <div className="py-2">
                <label htmlFor="username-color" className="text-sm text-gray-300 block mb-2">Username Color</label>
                <div className="flex items-center gap-3">
                  <input
                    id="username-color-picker"
                    type="color"
                    value={settings.usernameColor}
                    aria-label="Username Color"
                    onChange={(e) => onUpdateSetting('usernameColor', e.target.value)}
                    className="w-12 h-10 rounded border border-gray-600 cursor-pointer"
                  />
                  <input
                    id="username-color"
                    type="text"
                    value={settings.usernameColor}
                    aria-label="Username Color"
                    onChange={(e) => onUpdateSetting('usernameColor', e.target.value)}
                    className="flex-1 px-3 py-2 bg-[#0a0e27] border border-gray-600 rounded-md text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="#60a5fa"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reset Button */}
        <div className="pt-4 border-t border-gray-700/50">
          <button
            onClick={onResetDefaults}
            className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-md transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </Card>
  )
}

export default SettingsPanel
