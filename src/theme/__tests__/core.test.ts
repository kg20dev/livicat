/**
 * Tests for the CORE_SCHEME settings definitions.
 *
 * Verifies that all core settings have valid definitions with
 * correct types, sections, and defaults.
 */

import { describe, it, expect } from 'vitest'
import { CORE_SCHEME } from '../base/core'

describe('CORE_SCHEME', () => {
  describe('forced-auto-scroll', () => {
    const def = CORE_SCHEME.find((d) => d.key === 'forced-auto-scroll')

    it('is defined in the CORE_SCHEME', () => {
      expect(def).toBeDefined()
    })

    it('is a toggle', () => {
      expect(def!.type).toBe('toggle')
    })

    it('is in the Preview section', () => {
      expect(def!.section).toBe('Preview')
    })

    it('defaults to true', () => {
      expect(def!.default).toBe(true)
    })
  })

  describe('always-on-top', () => {
    const def = CORE_SCHEME.find((d) => d.key === 'always-on-top')

    it('is defined in the CORE_SCHEME', () => {
      expect(def).toBeDefined()
    })

    it('is a toggle', () => {
      expect(def!.type).toBe('toggle')
    })

    it('is in the Preview section', () => {
      expect(def!.section).toBe('Preview')
    })

    it('defaults to false', () => {
      expect(def!.default).toBe(false)
    })
  })
})
