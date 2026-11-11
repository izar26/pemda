import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { KonteksPenilaianItem, KonteksOperasionalItem, IdentifikasiRisikoPemda, IdentifikasiRisikoOpd, IdentifikasiRisikoOpdOperasional, RootCauseAnalysis } from '@/types/risiko'
import type { AnalisisRow } from '@/features/risiko/analisis-risiko/api'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'

export function useReviewFormData(submissionId: string, effectiveOpdId: string, effectivePeriodeId: string, activeStepId: string, enabled: boolean) {
  const [pages, setPages] = useState<Record<string, number>>({})
  const [searches, setSearches] = useState<Record<string, string>>({})
  const [rcaSource, setRcaSource] = useState('')
  const [rcaStatus, setRcaStatus] = useState('')
  const pageFor = (form: string) => pages[form] || 1
  const searchFor = (form: string) => searches[form] || ''

  // 2. Fetch Form 2B detail
  const { data: konteks2BData, isLoading: isLoading2B, isError: error2B, refetch: refetch2B } = useQuery({
    queryKey: ['risiko-2b-detail', submissionId],
    queryFn: async () => ({ data: await pengajuanRisikoService.getReviewForm<KonteksPenilaianItem | null>(submissionId, '2b') }),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && activeStepId === '2b'),
  })

  // 3. Fetch Form 2C detail
  const { data: konteks2CData, isLoading: isLoading2C, isError: error2C, refetch: refetch2C } = useQuery({
    queryKey: ['risiko-2c-detail', submissionId],
    queryFn: async () => pengajuanRisikoService.getReviewForm<KonteksOperasionalItem | null>(submissionId, '2c'),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && activeStepId === '2c'),
  })

  // 4. Fetch Form 3A detail
  const { data: identifikasi3AData, isLoading: isLoading3A, isError: error3A, refetch: refetch3A } = useQuery({
    queryKey: ['risiko-3a-review-detail', submissionId, pageFor('3a'), searchFor('3a')],
    queryFn: () => pengajuanRisikoService.getReviewPage<IdentifikasiRisikoPemda | null>(submissionId, '3a', pageFor('3a'), searchFor('3a')),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && ['3a', '3b', '3c'].includes(activeStepId)),
  })

  // 4b. Fetch Form 3B detail
  const { data: identifikasi3BData, isLoading: isLoading3B, isError: error3B, refetch: refetch3B } = useQuery({
    queryKey: ['risiko-3b-review-detail', submissionId, pageFor('3b'), searchFor('3b')],
    queryFn: () => pengajuanRisikoService.getReviewPage<IdentifikasiRisikoOpd | null>(submissionId, '3b', pageFor('3b'), searchFor('3b')),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && activeStepId === '3b'),
  })

  // 4c. Fetch Form 3C detail
  const { data: identifikasi3CData, isLoading: isLoading3C, isError: error3C, refetch: refetch3C } = useQuery({
    queryKey: ['risiko-3c-review-detail', submissionId, pageFor('3c'), searchFor('3c')],
    queryFn: () => pengajuanRisikoService.getReviewPage<IdentifikasiRisikoOpdOperasional | null>(submissionId, '3c', pageFor('3c'), searchFor('3c')),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && activeStepId === '3c'),
  })

  // 5. Fetch Form RCA detail
  const { data: rcaPage, isLoading: isLoadingRca, isError: errorRca, refetch: refetchRca } = useQuery({
    queryKey: ['risiko-rca-review-detail', submissionId, pageFor('rca'), searchFor('rca'), rcaSource, rcaStatus],
    queryFn: () => pengajuanRisikoService.getReviewPage<RootCauseAnalysis[]>(submissionId, 'rca', pageFor('rca'), searchFor('rca'), rcaSource, rcaStatus),
    enabled: Boolean(enabled && effectiveOpdId && effectivePeriodeId && activeStepId === 'rca'),
  })

  const { data: form4Page, isLoading: isLoading4, isError: error4, refetch: refetch4 } = useQuery({
    queryKey: ['risiko-form4-review', submissionId, pageFor('4'), searchFor('4')],
    queryFn: () => pengajuanRisikoService.getReviewPage<AnalisisRow[]>(submissionId, '4', pageFor('4'), searchFor('4')),
    enabled: Boolean(enabled && activeStepId === '4'),
  })

  return {
    form4: form4Page?.data || [], form4Page, isLoading4, error4, refetch4,
    pages, setPages, searches, setSearches, rcaSource, setRcaSource, rcaStatus, setRcaStatus, pageFor, searchFor,
    konteks2BData, isLoading2B, error2B, refetch2B, konteks2CData, isLoading2C, error2C, refetch2C,
    identifikasi3AData, isLoading3A, error3A, refetch3A, identifikasi3BData, isLoading3B, error3B, refetch3B,
    identifikasi3CData, isLoading3C, error3C, refetch3C, rcaPage, isLoadingRca, errorRca, refetchRca,
  }
}
