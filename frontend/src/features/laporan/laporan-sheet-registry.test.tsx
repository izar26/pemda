import { describe, expect, it } from 'vitest'
import {
  getLaporanSheetRenderer,
  LAPORAN_SHEET_REGISTRY,
} from './laporan-sheet-registry'

describe('LaporanSheetRegistry', () => {
  it('returns valid renderers for registered forms 2b and 2c', () => {
    expect(LAPORAN_SHEET_REGISTRY['2b']).toBeDefined()
    expect(LAPORAN_SHEET_REGISTRY['2c']).toBeDefined()
    expect(typeof getLaporanSheetRenderer('2b')).toBe('function')
    expect(typeof getLaporanSheetRenderer('2c')).toBe('function')
  })

  it('handles case-insensitive form codes', () => {
    expect(getLaporanSheetRenderer('2B')).toBe(LAPORAN_SHEET_REGISTRY['2b'].render)
    expect(getLaporanSheetRenderer('2C')).toBe(LAPORAN_SHEET_REGISTRY['2c'].render)
  })

  it('falls back gracefully to placeholder renderer for un-implemented forms', () => {
    const renderer = getLaporanSheetRenderer('3a')
    expect(typeof renderer).toBe('function')
  })
})
