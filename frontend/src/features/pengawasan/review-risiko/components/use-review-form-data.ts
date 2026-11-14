import { useQuery } from '@tanstack/react-query'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'

export interface ReviewQueryParams {
  page?: number
  search?: string
  source?: string
  status?: string
}

export interface ReviewFormResult<T = unknown> {
  data: T
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  } | null
}

export function useActiveReviewForm<T = unknown>(
  submissionId: string,
  formCode: string | undefined,
  params: ReviewQueryParams,
  enabled = true
) {
  const normalizedCode = (formCode || '').toLowerCase()
  return useQuery({
    queryKey: [
      'pengawasan',
      'review-form',
      submissionId,
      normalizedCode,
      params.page ?? 1,
      params.search ?? '',
      params.source ?? '',
      params.status ?? '',
    ],
    queryFn: () =>
      pengajuanRisikoService.getReviewFormData<T>(
        submissionId,
        normalizedCode,
        params
      ),
    enabled: Boolean(enabled && submissionId && normalizedCode),
    staleTime: 10_000,
  })
}
