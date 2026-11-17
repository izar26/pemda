import type { ReactNode } from 'react'
import type {
  KonteksPenilaianItem,
  KonteksOperasionalItem,
  IdentifikasiRisikoPemda,
  IdentifikasiRisikoOpd,
  IdentifikasiRisikoOpdOperasional,
  RootCauseAnalysis,
} from '@/types/risiko'
import type { RisikoWizardStepConfig } from '@/features/risiko/shared/risiko-wizard-store'
import { LaporanTable2B } from './components/laporan-table-2b'
import { LaporanTable2C } from './components/laporan-table-2c'
import { LaporanTable3A } from './components/laporan-table-3a'
import { LaporanTable3B } from './components/laporan-table-3b'
import { LaporanTable3C } from './components/laporan-table-3c'
import { LaporanTableRca } from './components/laporan-table-rca'
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

function resolveRaw<T>(data: unknown): T | null {
  if (!data) return null
  if (typeof data === 'object' && 'raw' in data) {
    return (data as { raw: T }).raw
  }
  return data as T
}

export const LAPORAN_SHEET_REGISTRY: Record<string, LaporanSheetRegistryEntry> = {
  '2b': {
    render: ({ data }) => {
      const item = resolveRaw<KonteksPenilaianItem>(data)
      return <LaporanTable2B data={item} />
    },
  },
  '2c': {
    render: ({ data }) => {
      const item = resolveRaw<KonteksOperasionalItem>(data)
      return <LaporanTable2C data={item} />
    },
  },
  '3a': {
    render: ({ data }) => {
      const item = resolveRaw<IdentifikasiRisikoPemda>(data)
      return <LaporanTable3A data={item} />
    },
  },
  '3b': {
    render: ({ data }) => {
      const item = resolveRaw<IdentifikasiRisikoOpd>(data)
      return <LaporanTable3B data={item} />
    },
  },
  '3c': {
    render: ({ data }) => {
      const item = resolveRaw<IdentifikasiRisikoOpdOperasional>(data)
      return <LaporanTable3C data={item} />
    },
  },
  'rca': {
    render: ({ data }) => {
      const items = resolveRaw<RootCauseAnalysis[]>(data)
      return <LaporanTableRca data={items} />
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
