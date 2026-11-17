import type { ReactNode } from 'react'
import type {
  KonteksPenilaianItem,
  KonteksOperasionalItem,
  IdentifikasiRisikoPemda,
  IdentifikasiRisikoOpd,
  IdentifikasiRisikoOpdOperasional,
  RootCauseAnalysis,
} from '@/types/risiko'
import type { PetaRisikoData } from '@/features/risiko/peta-risiko/types'
import type { RisikoWizardStepConfig } from '@/features/risiko/shared/risiko-wizard-store'
import { LaporanTable2B } from './components/laporan-table-2b'
import { LaporanTable2C } from './components/laporan-table-2c'
import { LaporanTable3A } from './components/laporan-table-3a'
import { LaporanTable3B } from './components/laporan-table-3b'
import { LaporanTable3C } from './components/laporan-table-3c'
import { LaporanTableRca } from './components/laporan-table-rca'
import { LaporanTable4 } from './components/laporan-table-4'
import { LaporanTable5 } from './components/laporan-table-5'
import { LaporanTable6 } from './components/laporan-table-6'
import { LaporanTable7 } from './components/laporan-table-7'
import { LaporanTable8 } from './components/laporan-table-8'
import { LaporanTable9 } from './components/laporan-table-9'
import { LaporanTable10 } from './components/laporan-table-10'
import { LaporanTableFra } from './components/laporan-table-fra'
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
  '4': {
    render: ({ data }) => {
      return <LaporanTable4 data={data as Parameters<typeof LaporanTable4>[0]['data']} />
    },
  },
  '5': {
    render: ({ data }) => {
      return <LaporanTable5 data={data as Parameters<typeof LaporanTable5>[0]['data']} />
    },
  },
  '6': {
    render: ({ data }) => {
      return <LaporanTable6 data={data as Parameters<typeof LaporanTable6>[0]['data']} />
    },
  },
  '7': {
    render: ({ data }) => {
      const item = resolveRaw<PetaRisikoData>(data)
      return <LaporanTable7 data={item} />
    },
  },
  '8': {
    render: ({ data }) => {
      return <LaporanTable8 data={data as Parameters<typeof LaporanTable8>[0]['data']} />
    },
  },
  '9': {
    render: ({ data }) => {
      return <LaporanTable9 data={data as Parameters<typeof LaporanTable9>[0]['data']} />
    },
  },
  '10': {
    render: ({ data }) => {
      return <LaporanTable10 data={data as Parameters<typeof LaporanTable10>[0]['data']} />
    },
  },
  'fra': {
    render: ({ data }) => {
      return <LaporanTableFra data={data as Parameters<typeof LaporanTableFra>[0]['data']} />
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
