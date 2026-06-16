import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from '../SettingsPanel'
import type { SettingDef } from '../../../theme/types'

const mixedScheme: SettingDef[] = [
  { key: 'msgBg', type: 'color', label: 'Background', default: '#1a1a1a' },
  {
    key: 'fontSize',
    type: 'range',
    label: 'Font Size',
    min: 10,
    max: 48,
    default: 14,
    step: 1,
    unit: 'px',
  },
  { key: 'showAvatars', type: 'toggle', label: 'Show Avatars', default: true },
  {
    key: 'animSpeed',
    type: 'select',
    label: 'Animation Speed',
    default: 'normal',
    options: [
      { value: 'none', label: 'None' },
      { value: 'slow', label: 'Slow' },
      { value: 'normal', label: 'Normal' },
    ],
  },
]

const values = {
  msgBg: '#ffffff',
  fontSize: 20,
  showAvatars: false,
  animSpeed: 'slow',
}

describe('SettingsPanel', () => {
  it('renders all control types from a mixed scheme', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    expect(screen.getByText('Background')).toBeInTheDocument()
    expect(screen.getByText('Font Size')).toBeInTheDocument()
    expect(screen.getByText('Show Avatars')).toBeInTheDocument()
    expect(screen.getByText('Animation Speed')).toBeInTheDocument()
  })

  it('color control shows current hex value', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    // The hex text input uses lowercase from value.replace('#', '')
    const hexInput = screen.getByDisplayValue('ffffff')
    expect(hexInput).toBeInTheDocument()
  })

  it('color control triggers onChange when hex input changes', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const hexInput = screen.getByDisplayValue('ffffff')
    fireEvent.change(hexInput, { target: { value: '000000' } })

    expect(onChange).toHaveBeenCalledWith('msgBg', '#000000')
  })

  it('range control shows current value in number spinbutton', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const numberInput = screen.getByRole('spinbutton')
    expect(numberInput).toHaveValue(20)
  })

  it('range control triggers onChange when number input changes', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const numberInput = screen.getByRole('spinbutton')
    fireEvent.change(numberInput, { target: { value: '30' } })

    expect(onChange).toHaveBeenCalledWith('fontSize', 30)
  })

  it('range control triggers onChange when slider changes', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const slider = document.querySelector('input[type="range"]') as HTMLInputElement
    expect(slider).not.toBeNull()
    fireEvent.change(slider, { target: { value: '36' } })
    expect(onChange).toHaveBeenCalledWith('fontSize', 36)
  })

  it('toggle control shows current state', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const toggle = screen.getByRole('switch')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('toggle control triggers onChange on click', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    const toggle = screen.getByRole('switch')
    fireEvent.click(toggle)

    expect(onChange).toHaveBeenCalledWith('showAvatars', true)
  })

  it('select control shows current value in dropdown', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    // The select displays "Slow" as text (the label for value "slow")
    expect(screen.getByText('Slow')).toBeInTheDocument()
  })

  it('select control triggers onChange on selection change', () => {
    const onChange = vi.fn()
    render(<SettingsPanel scheme={mixedScheme} values={values} onChange={onChange} />)

    // Find the select element by its role
    const select = screen.getByRole('combobox')
    fireEvent.change(select, { target: { value: 'none' } })

    expect(onChange).toHaveBeenCalledWith('animSpeed', 'none')
  })

  it('renders without crashing with unknown control type', () => {
    const onChange = vi.fn()
    const badScheme: SettingDef[] = [
      { key: 'bad', type: 'color' as any, label: 'Bad', default: '' },
    ]
    expect(() =>
      render(<SettingsPanel scheme={badScheme} values={{}} onChange={onChange} />)
    ).not.toThrow()
  })
})
