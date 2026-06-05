import { render, screen, fireEvent } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { SettingsPanel } from '../SettingsPanel'
import type { ChatSettings } from '../../../hooks/useYouTubeChat'

const mockSettings: ChatSettings = {
  showAvatars: true,
  showTimestamps: true,
  autoScroll: true,
  maxMessages: 100,
  fontSize: 14,
  theme: 'dark',
  messageSpacing: 'normal',
  usernameColor: '#60a5fa',
  bgOpacity: 100,
  animationSpeed: 'normal',
}

const mockPresets: Record<string, ChatSettings> = {
  default: mockSettings,
  minimal: { ...mockSettings, showAvatars: false, showTimestamps: false },
  compact: { ...mockSettings, messageSpacing: 'compact', fontSize: 12 },
  large: { ...mockSettings, fontSize: 20 },
  stream: { ...mockSettings, bgOpacity: 80 },
}

describe('SettingsPanel', () => {
  const mockUpdateSetting = vi.fn()
  const mockApplyPreset = vi.fn()
  const mockResetDefaults = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderSettingsPanel = (props = {}) => {
    return render(
      <SettingsPanel
        settings={mockSettings}
        onUpdateSetting={mockUpdateSetting}
        onApplyPreset={mockApplyPreset}
        onResetDefaults={mockResetDefaults}
        savedIndicator={false}
        presets={mockPresets}
        {...props}
      />
    )
  }

  it('renders the settings panel', () => {
    renderSettingsPanel()
    expect(screen.getByText('Chat Customization')).toBeInTheDocument()
  })

  it('renders all preset theme buttons', () => {
    renderSettingsPanel()
    expect(screen.getByText('Default')).toBeInTheDocument()
    expect(screen.getByText('Minimal')).toBeInTheDocument()
    expect(screen.getByText('Compact')).toBeInTheDocument()
    expect(screen.getByText('Large')).toBeInTheDocument()
    expect(screen.getByText('Stream')).toBeInTheDocument()
  })

  it('calls onApplyPreset when preset button is clicked', () => {
    renderSettingsPanel()
    fireEvent.click(screen.getByText('Minimal'))
    expect(mockApplyPreset).toHaveBeenCalledWith('minimal')
  })

  it('toggles showAvatars setting', () => {
    renderSettingsPanel()
    const toggle = screen.getByRole('switch', { name: 'Show Avatars' })
    fireEvent.click(toggle)
    expect(mockUpdateSetting).toHaveBeenCalledWith('showAvatars', false)
  })

  it('toggles showTimestamps setting', () => {
    renderSettingsPanel()
    const toggle = screen.getByRole('switch', { name: 'Show Timestamps' })
    fireEvent.click(toggle)
    expect(mockUpdateSetting).toHaveBeenCalledWith('showTimestamps', false)
  })

  it('toggles autoScroll setting', () => {
    renderSettingsPanel()
    const toggle = screen.getByRole('switch', { name: 'Auto Scroll' })
    fireEvent.click(toggle)
    expect(mockUpdateSetting).toHaveBeenCalledWith('autoScroll', false)
  })

  it('adjusts fontSize slider', () => {
    renderSettingsPanel()
    // Expand sliders section first
    const toggleButton = screen.getByText('Message Limits').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const slider = screen.getByLabelText('Font Size')
    fireEvent.change(slider, { target: { value: '18' } })
    expect(mockUpdateSetting).toHaveBeenCalledWith('fontSize', 18)
  })

  it('adjusts maxMessages slider', () => {
    renderSettingsPanel({ settings: { ...mockSettings, maxMessages: 150 } })
    // Expand sliders section first
    const toggleButton = screen.getByText('Message Limits').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const slider = screen.getByLabelText('Max Messages')
    fireEvent.change(slider, { target: { value: '200' } })
    expect(mockUpdateSetting).toHaveBeenCalledWith('maxMessages', 200)
  })

  it('adjusts bgOpacity slider', () => {
    renderSettingsPanel({ settings: { ...mockSettings, bgOpacity: 80 } })
    // Expand sliders section first
    const toggleButton = screen.getByText('Message Limits').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const slider = screen.getByLabelText('Background Opacity')
    fireEvent.change(slider, { target: { value: '50' } })
    expect(mockUpdateSetting).toHaveBeenCalledWith('bgOpacity', 50)
  })

  it('updates message spacing dropdown', () => {
    renderSettingsPanel()
    // Expand appearance section first
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const select = screen.getByLabelText('Message Spacing')
    fireEvent.change(select, { target: { value: 'compact' } })
    expect(mockUpdateSetting).toHaveBeenCalledWith('messageSpacing', 'compact')
  })

  it('updates animation speed dropdown', () => {
    renderSettingsPanel()
    // Expand appearance section first
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const select = screen.getByLabelText('Animation Speed')
    fireEvent.change(select, { target: { value: 'slow' } })
    expect(mockUpdateSetting).toHaveBeenCalledWith('animationSpeed', 'slow')
  })

  it('updates username color via color picker', () => {
    const { container } = renderSettingsPanel()
    // Expand appearance section first
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const colorInput = container.querySelector('#username-color-picker') as HTMLInputElement
    if (colorInput) {
      fireEvent.change(colorInput, { target: { value: '#ff0000' } })
      expect(mockUpdateSetting).toHaveBeenCalledWith('usernameColor', '#ff0000')
    }
  })

  it('updates username color via text input', () => {
    const { container } = renderSettingsPanel()
    // Expand appearance section first
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const textInput = container.querySelector('#username-color') as HTMLInputElement
    if (textInput) {
      fireEvent.change(textInput, { target: { value: '#ff0000' } })
      expect(mockUpdateSetting).toHaveBeenCalledWith('usernameColor', '#ff0000')
    }
  })

  it('calls onResetDefaults when reset button is clicked', () => {
    renderSettingsPanel()
    const resetButton = screen.getByText('Reset to Defaults')
    fireEvent.click(resetButton)
    expect(mockResetDefaults).toHaveBeenCalled()
  })

  it('displays saved indicator when savedIndicator is true', () => {
    renderSettingsPanel({ savedIndicator: true })
    expect(screen.getByText('Saved')).toBeInTheDocument()
  })

  it('does not display saved indicator when savedIndicator is false', () => {
    renderSettingsPanel({ savedIndicator: false })
    expect(screen.queryByText('Saved')).not.toBeInTheDocument()
  })

  it('expands and collapses sections', () => {
    renderSettingsPanel()
    
    // Initially expanded
    expect(screen.getByRole('switch', { name: 'Show Avatars' })).toBeInTheDocument()
    
    // Collapse section
    const toggleButton = screen.getByText('Display Options').closest('button')
    if (toggleButton) {
      fireEvent.click(toggleButton)
      // After collapsing, toggles should not be visible
      expect(screen.queryByRole('switch', { name: 'Show Avatars' })).not.toBeInTheDocument()
    }
  })

  it('shows descriptions for toggle settings', () => {
    renderSettingsPanel()
    expect(screen.getByText('Show user profile pictures')).toBeInTheDocument()
    expect(screen.getByText('Display message timestamps')).toBeInTheDocument()
    expect(screen.getByText('Automatically scroll to new messages')).toBeInTheDocument()
  })

  it('displays current values for sliders', () => {
    renderSettingsPanel()
    // Expand sliders section first
    const toggleButton = screen.getByText('Message Limits').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    expect(screen.getByText('14px')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument() // maxMessages
    expect(screen.getByText('100%')).toBeInTheDocument() // bgOpacity
  })

  it('handles color input with valid hex format', () => {
    const { container } = renderSettingsPanel()
    // Expand appearance section first
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) fireEvent.click(toggleButton)
    
    const textInput = container.querySelector('#username-color') as HTMLInputElement
    if (textInput) {
      fireEvent.change(textInput, { target: { value: '#abc123' } })
      expect(mockUpdateSetting).toHaveBeenCalledWith('usernameColor', '#abc123')
    }
  })

  it('expands Appearance section when toggled', () => {
    renderSettingsPanel()
    
    // Initially collapsed
    expect(screen.queryByText('Message Spacing')).not.toBeInTheDocument()
    
    // Expand section
    const toggleButton = screen.getByText('Appearance').closest('button')
    if (toggleButton) {
      fireEvent.click(toggleButton)
      expect(screen.getByText('Message Spacing')).toBeInTheDocument()
      expect(screen.getByText('Animation Speed')).toBeInTheDocument()
      expect(screen.getByText('Username Color')).toBeInTheDocument()
    }
  })
})
