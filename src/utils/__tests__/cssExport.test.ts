import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateOBSCSS } from '../cssExport'

describe('generateOBSCSS', () => {
  it('includes OBS setup instructions in a comment header', () => {
    const result = generateOBSCSS('body { color: red; }')
    expect(result).toContain('OBS Browser Source Setup')
    expect(result).toContain('Custom CSS')
    expect(result).toContain('youtube.com/live_chat')
  })

  it('includes the generated CSS in the output', () => {
    const css = 'body { color: red !important; }'
    const result = generateOBSCSS(css)
    expect(result).toContain(css)
  })

  it('includes a fallback comment when no CSS is provided', () => {
    const result = generateOBSCSS('')
    expect(result).toContain('No custom styles applied')
  })

  it('includes the date in the header', () => {
    const result = generateOBSCSS('body { color: red; }')
    const date = new Date().toISOString().split('T')[0]
    expect(result).toContain(`Date: ${date}`)
  })

  it('uses the provided theme name in the header', () => {
    const result = generateOBSCSS('body { color: red; }', { themeName: 'neon-theme' })
    expect(result).toContain('Theme: neon-theme')
  })

  it('uses the provided videoId for the URL', () => {
    const result = generateOBSCSS('body { color: red; }', { videoId: 'abc123' })
    expect(result).toContain('live_chat?v=abc123')
  })

  it('returns a string that starts with a CSS comment', () => {
    const result = generateOBSCSS('body { color: red; }')
    expect(result.trim()).toMatch(/^\/\*/)
  })

  it('returns a string that ends with newline', () => {
    const result = generateOBSCSS('body { color: red; }')
    expect(result.endsWith('\n')).toBe(true)
  })
})

describe('downloadCSSFile', () => {
  beforeEach(() => {
    // Mock DOM APIs needed for download
    const mockAnchor = document.createElement('a')
    const mockClick = vi.fn()
    mockAnchor.click = mockClick
    document.createElement = vi.fn().mockImplementation((tag: string) => {
      if (tag === 'a') return mockAnchor
      return document.createElement(tag)
    })
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('can be imported without errors', async () => {
    const mod = await import('../cssExport')
    expect(typeof mod.downloadCSSFile).toBe('function')
  })
})
