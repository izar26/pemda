import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePayload } from '@/types/perencanaan'

export const PERIODE_QUERY_KEY = ['perencanaan-periode'] as const

/**
 * Hook to fetch planning cycles & evaluation years with TanStack Query caching.
 * Resolves instant cached data on tab switch without blank screen / reload.
 */
export function usePeriodeOverview() {
  return useQuery({
    queryKey: PERIODE_QUERY_KEY,
    queryFn: () => perencanaanService.getPeriodeOverview(),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 15 * 60 * 1000,
  })
}

/**
 * Hook for mutations with automatic cache invalidation
 */
export function usePeriodeMutations() {
  const queryClient = useQueryClient()

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: PERIODE_QUERY_KEY })
    queryClient.invalidateQueries({ queryKey: ['perencanaan-cascading'] })
  }

  const createCycle = useMutation({
    mutationFn: (payload: PeriodePayload) => perencanaanService.createPeriode(payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Siklus perencanaan baru berhasil dibuat.')
      invalidate()
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Gagal membuat siklus perencanaan.'
      toast.error(errorMsg)
    },
  })

  const updateCycle = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: PeriodePayload }) =>
      perencanaanService.updatePeriode(id, payload),
    onSuccess: (data) => {
      toast.success(data.message || 'Siklus perencanaan berhasil diperbarui.')
      invalidate()
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Gagal memperbarui siklus perencanaan.'
      toast.error(errorMsg)
    },
  })

  const activateYear = useMutation({
    mutationFn: ({ periodeId, tahunId }: { periodeId: string; tahunId: string }) =>
      perencanaanService.activateYear(periodeId, tahunId),
    onSuccess: (data) => {
      toast.success(data.message || 'Tahun penilaian aktif berhasil diubah.')
      invalidate()
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Gagal mengaktifkan tahun penilaian.'
      toast.error(errorMsg)
    },
  })

  const deleteCycle = useMutation({
    mutationFn: (id: string) => perencanaanService.deletePeriode(id),
    onSuccess: (data) => {
      toast.success(data.message || 'Siklus perencanaan berhasil dihapus.')
      invalidate()
    },
    onError: (err: unknown) => {
      const errorMsg =
        (err as { response?: { data?: { message?: string } } }).response?.data?.message ||
        'Gagal menghapus siklus perencanaan.'
      toast.error(errorMsg)
    },
  })

  return {
    createCycle,
    updateCycle,
    activateYear,
    deleteCycle,
  }
}
