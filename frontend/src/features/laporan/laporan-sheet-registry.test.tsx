import { describe, expect, it } from 'vitest'
import {
  getLaporanSheetRenderer,
  LAPORAN_SHEET_REGISTRY,
} from './laporan-sheet-registry'

describe('LaporanSheetRegistry', () => {
  it('returns valid renderers for registered forms 2b, 2c, 3a, 3b, 3c, rca, 4, 5, 6, and 7', () => {
    const registeredCodes = ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7']
    registeredCodes.forEach((code) => {
      expect(LAPORAN_SHEET_REGISTRY[code]).toBeDefined()
      expect(typeof getLaporanSheetRenderer(code)).toBe('function')
    })
  })

  it('handles case-insensitive form codes for cluster 1, 2, and 3 forms', () => {
    expect(getLaporanSheetRenderer('2B')).toBe(LAPORAN_SHEET_REGISTRY['2b'].render)
    expect(getLaporanSheetRenderer('2C')).toBe(LAPORAN_SHEET_REGISTRY['2c'].render)
    expect(getLaporanSheetRenderer('3A')).toBe(LAPORAN_SHEET_REGISTRY['3a'].render)
    expect(getLaporanSheetRenderer('3B')).toBe(LAPORAN_SHEET_REGISTRY['3b'].render)
    expect(getLaporanSheetRenderer('3C')).toBe(LAPORAN_SHEET_REGISTRY['3c'].render)
    expect(getLaporanSheetRenderer('RCA')).toBe(LAPORAN_SHEET_REGISTRY['rca'].render)
    expect(getLaporanSheetRenderer('4')).toBe(LAPORAN_SHEET_REGISTRY['4'].render)
    expect(getLaporanSheetRenderer('5')).toBe(LAPORAN_SHEET_REGISTRY['5'].render)
    expect(getLaporanSheetRenderer('6')).toBe(LAPORAN_SHEET_REGISTRY['6'].render)
    expect(getLaporanSheetRenderer('7')).toBe(LAPORAN_SHEET_REGISTRY['7'].render)
  })

  it('falls back gracefully to placeholder renderer for cluster 4 forms', () => {
    const unImplementedCodes = ['8', '9', '10', 'fra']
    unImplementedCodes.forEach((code) => {
      const renderer = getLaporanSheetRenderer(code)
      expect(typeof renderer).toBe('function')
    })
  })
})
