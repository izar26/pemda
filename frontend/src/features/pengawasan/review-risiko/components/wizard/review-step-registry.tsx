import type { ReactNode } from 'react'
import type {
  KonteksPenilaianItem,
  KonteksOperasionalItem,
  IdentifikasiRisikoPemda,
  IdentifikasiRisikoOpd,
  IdentifikasiRisikoOpdOperasional,
  RootCauseAnalysis,
} from '@/types/risiko'
import type { AnalisisRow } from '@/features/risiko/analisis-risiko/api'
import type { TindakRow } from '@/features/risiko/tindak-pengendalian/api'
import type { PetaRisikoData } from '@/features/risiko/peta-risiko/types'
import type { KomunikasiRow } from '@/features/risiko/komunikasi-pengendalian/api'
import type { PemantauanRow } from '@/features/risiko/pemantauan-pengendalian/api'
import { ReviewStep2B } from './steps/review-step-2b'
import { ReviewStep2C } from './steps/review-step-2c'
import { ReviewStep3A } from './steps/review-step-3a'
import { ReviewStep3B } from './steps/review-step-3b'
import { ReviewStep3C } from './steps/review-step-3c'
import { ReviewStep4 } from './steps/review-step-4'
import { ReviewStep5 } from './steps/review-step-5'
import { ReviewStep6 } from './steps/review-step-6'
import { ReviewStep7 } from './steps/review-step-7'
import { ReviewStep8 } from './steps/review-step-8'
import { ReviewStep9 } from './steps/review-step-9'
import { ReviewStepRca } from './steps/review-step-rca'

export interface StepFilterConfig {
  hasSearch?: boolean
  hasRcaFilters?: boolean
  searchPlaceholder?: string
}

export interface StepRenderProps {
  data: unknown
  isLoading: boolean
  formCode: string
}

export interface StepRegistryEntry {
  render: (props: StepRenderProps) => ReactNode
  filters?: StepFilterConfig
  isPaginated?: boolean
}

export const REVIEW_STEP_REGISTRY: Record<string, StepRegistryEntry> = {
  '2b': {
    isPaginated: false,
    render: ({ data, isLoading }) => (
      <ReviewStep2B
        konteks2B={data as KonteksPenilaianItem | null}
        isLoading={isLoading}
      />
    ),
  },
  '2c': {
    isPaginated: false,
    render: ({ data, isLoading }) => (
      <ReviewStep2C
        konteks2C={data as KonteksOperasionalItem | null}
        isLoading={isLoading}
      />
    ),
  },
  '3a': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep3A
        dokumen3A={data as IdentifikasiRisikoPemda | null}
        isLoading={isLoading}
      />
    ),
  },
  '3b': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep3B
        dokumen3B={data as IdentifikasiRisikoOpd | null}
        isLoading={isLoading}
      />
    ),
  },
  '3c': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep3C
        dokumen3C={data as IdentifikasiRisikoOpdOperasional | null}
        isLoading={isLoading}
      />
    ),
  },
  rca: {
    isPaginated: true,
    filters: {
      hasSearch: true,
      hasRcaFilters: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStepRca
        rcaList={(data as RootCauseAnalysis[]) || []}
        isLoading={isLoading}
      />
    ),
  },
  '4': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep4
        items={(data as AnalisisRow[]) || []}
        isLoading={isLoading}
      />
    ),
  },
  '5': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep5 items={(data as TindakRow[]) || []} isLoading={isLoading} />
    ),
  },
  '6': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep6 items={(data as TindakRow[]) || []} isLoading={isLoading} />
    ),
  },
  '7': {
    isPaginated: false,
    render: ({ data, isLoading }) => (
      <ReviewStep7
        data={data as PetaRisikoData | null}
        isLoading={isLoading}
      />
    ),
  },
  '8': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep8
        items={(data as KomunikasiRow[]) || []}
        isLoading={isLoading}
      />
    ),
  },
  '9': {
    isPaginated: true,
    filters: {
      hasSearch: true,
      searchPlaceholder: 'Cari kode atau pernyataan risiko',
    },
    render: ({ data, isLoading }) => (
      <ReviewStep9
        items={(data as PemantauanRow[]) || []}
        isLoading={isLoading}
      />
    ),
  },
}

export function getReviewStepConfig(
  formCode: string
): StepRegistryEntry | undefined {
  return REVIEW_STEP_REGISTRY[formCode.toLowerCase()]
}
