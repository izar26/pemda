import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  pengajuanRisikoService,
  type ReadinessResponse,
} from '@/services/pengajuan-risiko-service'

interface UseRisikoSubmissionProps {
  readiness?: ReadinessResponse
  effectiveOpdId?: string
  activePeriodeId?: string
  onSubmissionSuccess?: () => void
  controlledSubmitDialogOpen?: boolean
  controlledSetIsSubmitDialogOpen?: (open: boolean) => void
}

export function useRisikoSubmission({
  readiness,
  effectiveOpdId,
  activePeriodeId,
  onSubmissionSuccess,
  controlledSubmitDialogOpen,
  controlledSetIsSubmitDialogOpen,
}: UseRisikoSubmissionProps) {
  const queryClient = useQueryClient()
  const [internalSubmitDialogOpen, setInternalSubmitDialogOpen] = useState(false)

  // Dialog states for Kepala OPD
  const [isKepalaReviewOpen, setIsKepalaReviewOpen] = useState(false)
  const [kepalaAction, setKepalaAction] = useState<'approved' | 'rejected'>('approved')
  const [kepalaNotes, setKepalaNotes] = useState('')

  const [isKepalaDelegateOpen, setIsKepalaDelegateOpen] = useState(false)
  const [delegateNotes, setDelegateNotes] = useState('')

  const isSubmitOpen =
    controlledSubmitDialogOpen !== undefined
      ? controlledSubmitDialogOpen
      : internalSubmitDialogOpen
  const setSubmitOpen =
    controlledSetIsSubmitDialogOpen || setInternalSubmitDialogOpen

  // 1. Operator submit to Kepala OPD mutation
  const submitToKepalaMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.submitToKepalaOpd({
        opd_id: effectiveOpdId!,
        periode_penilaian_id: activePeriodeId,
      }),
    onMutate: async () => {
      queryClient.setQueriesData<ReadinessResponse>(
        { queryKey: ['risiko-pengajuan-readiness'] },
        (old) => {
          if (!old) return old
          return {
            ...old,
            is_ready_to_submit: false,
            can_submit_to_kepala: false,
            is_locked: true,
            is_locked_for_operator: true,
            status: 'submitted_to_kepala_opd',
            current_tier: 'kepala_opd',
          }
        }
      )
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Lembar kerja risiko berhasil diajukan kepada Kepala OPD.')
      setSubmitOpen(false)

      try {
        const freshReadiness = await pengajuanRisikoService.getReadiness({
          opd_id: effectiveOpdId,
          periode_penilaian_id: activePeriodeId,
        })
        queryClient.setQueriesData(
          { queryKey: ['risiko-pengajuan-readiness'] },
          freshReadiness
        )
      } catch {
        // Retain optimistic status
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['pengawasan'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
      ])
      onSubmissionSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] })
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.forms?.[0] ||
        err.response?.data?.errors?.auditor?.[0] ||
        'Gagal mengajukan lembar kerja ke Kepala OPD.'
      toast.error(msg)
    },
  })

  // 2. Kepala OPD review mutation (Approve or Reject internal)
  const reviewKepalaMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.reviewByKepalaOpd(readiness!.submission.id, {
        status: kepalaAction,
        catatan: kepalaNotes.trim(),
      }),
    onSuccess: async (res) => {
      toast.success(res.message || 'Keputusan Kepala OPD berhasil disimpan.')
      setIsKepalaReviewOpen(false)
      setKepalaNotes('')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['pengawasan'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
      ])
      onSubmissionSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan?.[0] ||
        'Gagal memproses persetujuan Kepala OPD.'
      toast.error(msg)
    },
  })

  // 3. Kepala OPD delegate mutation
  const delegateMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.delegateToOperator(readiness!.submission.id, {
        catatan: delegateNotes.trim() || undefined,
      }),
    onSuccess: async (res) => {
      toast.success(res.message || 'Instruksi revisi berhasil didelegasikan kepada Operator.')
      setIsKepalaDelegateOpen(false)
      setDelegateNotes('')

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['pengawasan'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
      ])
      onSubmissionSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      const msg = err.response?.data?.message || 'Gagal mendelegasikan revisi ke Operator.'
      toast.error(msg)
    },
  })

  const showOperatorSubmitButton = Boolean(
    readiness?.can_submit_to_kepala &&
      !readiness?.is_locked_for_operator &&
      !submitToKepalaMutation.isPending
  )

  const showKepalaReviewButton = Boolean(
    readiness?.can_review_kepala && !reviewKepalaMutation.isPending
  )

  const showKepalaDelegateButton = Boolean(
    readiness?.can_delegate_operator && !delegateMutation.isPending
  )

  return {
    isSubmitOpen,
    setSubmitOpen,
    isKepalaReviewOpen,
    setIsKepalaReviewOpen,
    kepalaAction,
    setKepalaAction,
    kepalaNotes,
    setKepalaNotes,
    isKepalaDelegateOpen,
    setIsKepalaDelegateOpen,
    delegateNotes,
    setDelegateNotes,
    submitToKepalaMutation,
    reviewKepalaMutation,
    delegateMutation,
    showOperatorSubmitButton,
    showKepalaReviewButton,
    showKepalaDelegateButton,
  }
}
