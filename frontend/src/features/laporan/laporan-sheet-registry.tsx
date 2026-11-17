import type { ReactNode } from 'react'
import type { KonteksPenilaianItem, KonteksOperasionalItem } from '@/types/risiko'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'
import { LaporanTable2B } from './components/laporan-table-2b'
import { LaporanTable2C } from './components/laporan-table-2c'
import { LaporanSheetPlaceholder } from './components/laporan-sheet-placeholder'

export interface LaporanSheetRenderProps {
  data: unknown
  opdNama?: string
  tahun?: number | string
  stepConfig: RisikoWizardStepConfig
}

export interface LaporanSheetRegistryEntry {
  render: (props: LaporanSheetRenderProps) => ReactNode
}

export const LAPORAN_SHEET_REGISTRY: Record<string, LaporanSheetRegistryEntry> = {
  '2b': {
    render: ({ data }) => {
      // Content could be { raw: ... } from backend LaporanRisikoService or direct item
      const item = (data && typeof data === 'object' && 'raw' in data ? (data as { raw: KonteksPenilaianItem | null }).raw : data) as KonteksPenilaianItem | null
      return <LaporanTable2B data={item} />
    },
  },
  '2c': {
    render: ({ data }) => {
      const item = (data && typeof data === 'object' && 'raw' in data ? (data as { raw: KonteksOperasionalItem | null }).raw : data) as KonteksOperasionalItem | null
      return <LaporanTable2C data={item} />
    },
  },
}

/**
 * Helper to get the registry entry or fallback to structured placeholder
 */
export function getLaporanSheetRenderer(
  formCode: string
): (props: LaporanSheetRenderProps) => ReactNode {
  const cleanCode = formCode.toLowerCase().trim()
  if (LAPORAN_SHEET_REGISTRY[cleanCode]) {
    return LAPORAN_SHEET_REGISTRY[cleanCode].render
  }

  // Graceful fallback placeholder
  return ({ opdNama, tahun, stepConfig }) => (
    <LaporanSheetPlaceholder
      formTitle={stepConfig.title}
      shortTitle={stepConfig.shortTitle}
      description={stepConfig.subtitle}
      opdNama={opdNama}
      tahun={tahun}
    />
  )
}
