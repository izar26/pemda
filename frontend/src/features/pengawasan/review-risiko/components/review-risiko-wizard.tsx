import { useState } from 'react'
import type { AxiosError } from 'axios'
import { format, parseISO } from 'date-fns'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  pengajuanRisikoService,
  type SubmissionItem,
  type SubmissionTier,
} from '@/services/pengajuan-risiko-service'
import { id as idLocale } from 'date-fns/locale'
import {
  CheckCircle2,
  History,
  Loader2,
  RefreshCw,
  Send,
} from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'
import { useActiveReviewForm } from './use-review-form-data'
import { ReviewRejectionDialog } from './wizard/review-rejection-dialog'
import { ReviewStepContent } from './wizard/review-step-content'
import { ReviewWizardFooter } from './wizard/review-wizard-footer'
import {
  ReviewWizardHeader,
  type ReviewStepVisualStatus,
} from './wizard/review-wizard-header'
import { ReviewWizardStepHeader } from './wizard/review-wizard-step-header'

interface ReviewRisikoWizardProps {
  submissionId: string
  opdId: string
  periodeId: string
  onBack: () => void
  onSuccess?: () => void
}

const TIER_ORDER: Record<SubmissionTier, number> = {
  operator: 0,
  kepala_opd: 1,
  auditor: 2,
  pengawas: 3,
  completed: 4,
}

function getTierLocationLabel(tier: SubmissionTier): string {
  switch (tier) {
    case 'operator':
      return 'Di Operator OPD'
    case 'kepala_opd':
      return 'Di Kepala OPD'
    case 'auditor':
      return 'Di Evaluator'
    case 'pengawas':
      return 'Di Pengawas'
    default:
      return 'Selesai'
  }
}

export function ReviewRisikoWizard({
  submissionId,
  opdId,
  periodeId,
  onBack,
  onSuccess,
}: ReviewRisikoWizardProps) {
  const queryClient = useQueryClient()
  const { hasPermission, hasRole } = usePermissions()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Per-form Rejection / Forward / Delegation Dialog state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')
  const [targetFormCode, setTargetFormCode] = useState<string>('')
  const [rejectMode, setRejectMode] = useState<
    'reject' | 'delegate_operator' | 'forward_kepala'
  >('reject')

  // Clarify to Pengawas Dialog state (per-form)
  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false)
  const [resubmitFormCode, setResubmitFormCode] = useState<string>('')
  const [resubmitNotes, setResubmitNotes] = useState('')

  // Explicit Forward / Finalize Confirmation Dialog
  const [isForwardConfirmOpen, setIsForwardConfirmOpen] = useState(false)
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  const {
    data: submission,
    isLoading: isLoadingSubmission,
    isError: submissionError,
    refetch: refetchSubmission,
  } = useQuery({
    queryKey: ['pengawasan', 'review-detail', submissionId],
    queryFn: () => pengajuanRisikoService.startReview(submissionId),
    staleTime: 5_000,
    retry: false,
  })

  const reviewSteps = RISIKO_WIZARD_STEPS.filter(
    (step) =>
      !['5', '6'].includes(step.id) ||
      submission?.items?.some(
        (item) => item.form_code.toLowerCase() === step.id
      )
  )
  const hasForm4Item = Boolean(
    submission?.items?.some((item) => item.form_code.toLowerCase() === '4')
  )

  const effectiveOpdId = submission?.opd_id || opdId
  const effectivePeriodeId = submission?.periode_penilaian_id || periodeId

  const [pages, setPages] = useState<Record<string, number>>({})
  const [searches, setSearches] = useState<Record<string, string>>({})
  const [rcaSource, setRcaSource] = useState('')
  const [rcaStatus, setRcaStatus] = useState('')

  const pageFor = (form: string) => pages[form] || 1
  const searchFor = (form: string) => searches[form] || ''

  const activeStepId = reviewSteps[currentStepIndex]?.id
  const {
    data: activeFormResponse,
    isLoading: isActiveFormLoading,
    isError: isActiveFormError,
    refetch: refetchActiveForm,
  } = useActiveReviewForm(
    submissionId,
    activeStepId,
    {
      page: pageFor(activeStepId || ''),
      search: searchFor(activeStepId || ''),
      source: rcaSource,
      status: rcaStatus,
    },
    Boolean(submission)
  )

  const authUser = useAuthStore((state) => state.auth.user)
  const isRegionalAdmin = hasRole('Superadmin') || hasRole('Administrator')
  const isKepalaOpdUser = hasRole('Executive') && Boolean(authUser?.opd_id)

  const canActAsKepalaOpd =
    isRegionalAdmin ||
    (isKepalaOpdUser &&
      hasPermission('review_risiko.review_kepala') &&
      String(authUser?.opd_id) === String(submission?.opd_id))

  const canActAsAuditor =
    isRegionalAdmin ||
    (hasRole('Evaluator / Reviewer') && hasPermission('review_risiko.approve'))

  const canActAsPengawas =
    isRegionalAdmin ||
    (hasRole('Koordinator Pengawas') &&
      hasPermission('review_risiko.review_pengawas'))

  // Resolve active viewer tier
  const viewerTier: 'kepala_opd' | 'auditor' | 'pengawas' = !isRegionalAdmin
    ? hasRole('Koordinator Pengawas')
      ? 'pengawas'
      : hasRole('Evaluator / Reviewer')
        ? 'auditor'
        : 'kepala_opd'
    : submission?.current_tier === 'kepala_opd'
      ? 'kepala_opd'
      : submission?.current_tier === 'auditor'
        ? 'auditor'
        : 'pengawas'

  const isKepalaViewer = viewerTier === 'kepala_opd'
  const isAuditorViewer = viewerTier === 'auditor'
  const isPengawasViewer = viewerTier === 'pengawas'

  function invalidateAllReviewQueries() {
    queryClient.invalidateQueries({
      queryKey: ['pengawasan', 'review-detail', submissionId],
    })
    queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
    queryClient.invalidateQueries({
      queryKey: ['risiko-pengajuan-readiness'],
    })
    queryClient.invalidateQueries({ queryKey: ['risiko-pending-counts'] })
  }

  // Unified Per-Form Approve / Reject Mutation across all 3 tiers
  const reviewMutation = useMutation({
    mutationFn: async ({
      formCode,
      status,
      catatan,
      mode = 'reject',
    }: {
      formCode: string
      status: 'approved' | 'rejected'
      catatan?: string
      mode?: 'reject' | 'delegate_operator' | 'forward_kepala'
    }) => {
      if (status === 'rejected' && mode === 'delegate_operator') {
        return pengajuanRisikoService.delegateToOperator(submissionId, {
          form_code: formCode,
          catatan,
        })
      }
      if (status === 'rejected' && mode === 'forward_kepala') {
        return pengajuanRisikoService.forwardRevisionFromAuditor(submissionId, {
          form_code: formCode,
          catatan,
        })
      }

      if (isKepalaViewer) {
        return pengajuanRisikoService.reviewByKepalaOpd(submissionId, {
          form_code: formCode,
          status,
          catatan,
        })
      }
      if (isPengawasViewer) {
        return pengajuanRisikoService.reviewByPengawas(submissionId, {
          form_code: formCode,
          status,
          catatan_revisi: catatan,
        })
      }
      return pengajuanRisikoService.reviewItem(submissionId, {
        form_code: formCode,
        status,
        catatan_revisi: catatan,
      })
    },
    onSuccess: (res, vars) => {
      toast.success(
        res.message ||
          (vars.status === 'approved'
            ? `Form ${vars.formCode.toUpperCase()} berhasil disetujui.`
            : `Form ${vars.formCode.toUpperCase()} dikembalikan dengan catatan revisi.`)
      )
      setIsRejectDialogOpen(false)
      setRejectionNote('')
      invalidateAllReviewQueries()
      onSuccess?.()
    },
    onError: (
      err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>
    ) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan_revisi?.[0] ||
        err.response?.data?.errors?.catatan?.[0] ||
        err.response?.data?.errors?.form_code?.[0] ||
        'Gagal memproses keputusan form.'
      toast.error(msg)
    },
  })

  // Evaluator clarifies & resubmits 1 form directly back to Pengawas
  const resubmitPengawasMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.resubmitToPengawas(submissionId, {
        form_code: resubmitFormCode || undefined,
        catatan: resubmitNotes.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(
        res.message || 'Klarifikasi berhasil dikirimkan kembali ke Pengawas.'
      )
      setIsResubmitModalOpen(false)
      setResubmitNotes('')
      setResubmitFormCode('')
      invalidateAllReviewQueries()
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(
        err.response?.data?.message || 'Gagal mengirimkan klarifikasi.'
      )
    },
  })

  // Explicit Forward / Finalize Mutation (only permitted at 100% approval)
  const forwardTierMutation = useMutation({
    mutationFn: async () => {
      if (isKepalaViewer) {
        return pengajuanRisikoService.forwardToAuditor(submissionId)
      }
      if (isAuditorViewer) {
        return pengajuanRisikoService.forwardToPengawas(submissionId)
      }
      return pengajuanRisikoService.finalizeByPengawas(submissionId)
    },
    onSuccess: (res) => {
      toast.success(res.message || 'Berkas berhasil diteruskan ke tahap berikutnya.')
      setIsForwardConfirmOpen(false)
      invalidateAllReviewQueries()
      onSuccess?.()
    },
    onError: (
      err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>
    ) => {
      toast.error(
        err.response?.data?.message ||
          err.response?.data?.errors?.status?.[0] ||
          'Gagal meneruskan berkas.'
      )
    },
  })

  function getItemStatusForStep(stepConfig: RisikoWizardStepConfig): {
    status: ReviewStepVisualStatus
    revisionLocation?: string
    revisionNote?: string | null
    incomingRevisionSource?: string
    incomingRevisionNote?: string | null
    item?: SubmissionItem
  } {
    const item = submission?.items?.find(
      (i) => i.form_code.toLowerCase() === stepConfig.id.toLowerCase()
    )

    if (!item) {
      if (stepConfig.id === '4') return { status: 'draft' }
      return {
        status: submission?.status === 'draft' ? 'draft' : 'submitted',
      }
    }

    const itemTier: SubmissionTier =
      item.current_tier || submission?.current_tier || 'operator'

    if (submission?.status === 'approved' || itemTier === 'completed') {
      return { status: 'approved', item }
    }

    if (submission?.status === 'draft') {
      return { status: 'draft', item }
    }

    const itemRank = TIER_ORDER[itemTier] ?? 0
    const viewerRank = TIER_ORDER[viewerTier]

    if (isKepalaViewer) {
      if (itemRank < viewerRank) {
        return {
          status: 'in_revision',
          revisionLocation: getTierLocationLabel(itemTier),
          revisionNote: item.catatan_kepala_opd || item.catatan_revisi,
          item,
        }
      }
      if (itemTier === 'kepala_opd' && item.status_auditor === 'rejected') {
        return {
          status: 'needs_action',
          incomingRevisionSource: 'Evaluator',
          incomingRevisionNote: item.catatan_auditor || item.catatan_revisi,
          item,
        }
      }
      if (item.status_kepala_opd === 'approved' && itemRank >= viewerRank) {
        return { status: 'approved', item }
      }
      return { status: 'submitted', item }
    }

    if (isAuditorViewer) {
      if (itemRank < viewerRank) {
        return {
          status: 'in_revision',
          revisionLocation: getTierLocationLabel(itemTier),
          revisionNote: item.catatan_auditor || item.catatan_revisi,
          item,
        }
      }
      if (itemTier === 'auditor' && item.status_pengawas === 'rejected') {
        return {
          status: 'needs_action',
          incomingRevisionSource: 'Pengawas APIP',
          incomingRevisionNote: item.catatan_pengawas || item.catatan_revisi,
          item,
        }
      }
      if (item.status_auditor === 'approved' && itemRank >= viewerRank) {
        return { status: 'approved', item }
      }
      return { status: 'submitted', item }
    }

    // Pengawas viewer
    if (itemRank < viewerRank) {
      return {
        status: 'in_revision',
        revisionLocation: getTierLocationLabel(itemTier),
        revisionNote: item.catatan_pengawas || item.catatan_revisi,
        item,
      }
    }
    if (item.status_pengawas === 'approved') {
      return { status: 'approved', item }
    }
    return { status: 'submitted', item }
  }

  const currentStep = reviewSteps[currentStepIndex] || reviewSteps[0]
  const currentStepState = getItemStatusForStep(currentStep)
  const currentItem = currentStepState.item
  const currentItemTier: SubmissionTier =
    currentItem?.current_tier || submission?.current_tier || 'operator'

  const isDraftSubmission = submission?.status === 'draft'

  const totalSteps = reviewSteps.length
  const requiredSteps = reviewSteps.filter(
    (step) => step.id !== '4' || hasForm4Item
  )
  const stepStates = requiredSteps.map((s) => getItemStatusForStep(s))
  const approvedCount = stepStates.filter((s) => s.status === 'approved').length
  const inRevisionCount = stepStates.filter(
    (s) => s.status === 'in_revision'
  ).length
  const needsActionCount = stepStates.filter(
    (s) => s.status === 'needs_action'
  ).length
  const pendingCount =
    requiredSteps.length - approvedCount - inRevisionCount
  const progressPercentage =
    requiredSteps.length > 0
      ? Math.round((approvedCount / requiredSteps.length) * 100)
      : 0

  const canDecideCurrentStep =
    !isDraftSubmission &&
    submission?.status !== 'approved' &&
    ((isKepalaViewer && canActAsKepalaOpd && currentItemTier === 'kepala_opd') ||
      (isAuditorViewer && canActAsAuditor && currentItemTier === 'auditor') ||
      (isPengawasViewer && canActAsPengawas && currentItemTier === 'pengawas'))

  const showForwardBanner =
    !isDraftSubmission &&
    submission?.status !== 'approved' &&
    submission?.current_tier === viewerTier &&
    ((isKepalaViewer && canActAsKepalaOpd) ||
      (isAuditorViewer && canActAsAuditor) ||
      (isPengawasViewer && canActAsPengawas))

  const isReadyToForward =
    requiredSteps.length > 0 &&
    approvedCount === requiredSteps.length &&
    inRevisionCount === 0 &&
    needsActionCount === 0

  const forwardActionLabel = isKepalaViewer
    ? 'Kirim ke Evaluator'
    : isAuditorViewer
      ? 'Kirim ke Pengawas'
      : 'Sahkan Final'

  const forwardConfirmTitle = isKepalaViewer
    ? 'Kirim Seluruh Berkas ke Evaluator APIP?'
    : isAuditorViewer
      ? 'Kirim Seluruh Berkas ke Pengawas Inspektorat?'
      : 'Sahkan Final Lembar Kerja Risiko OPD?'

  const forwardConfirmDesc = isKepalaViewer
    ? `Seluruh ${requiredSteps.length} formulir telah disetujui (100% hijau). Berkas akan dikirim resmi ke tahap pemeriksaan Evaluator.`
    : isAuditorViewer
      ? `Seluruh ${requiredSteps.length} formulir telah disetujui Evaluator (100% hijau). Berkas akan dikirim ke Pengawas untuk pengesahan akhir.`
      : `Seluruh ${requiredSteps.length} formulir telah disetujui Pengawas (100% hijau). Dokumen akan disahkan final dan dikunci sebagai arsip resmi.`

  function handleApprove(formCode: string) {
    reviewMutation.mutate({ formCode, status: 'approved' })
  }

  function handleOpenReject(formCode: string) {
    const existing = submission?.items?.find(
      (i) => i.form_code.toLowerCase() === formCode.toLowerCase()
    )
    setTargetFormCode(formCode)

    // Pre-fill editable notes when forwarding upper-tier rejection down the waterfall
    if (isAuditorViewer && existing?.status_pengawas === 'rejected') {
      setRejectMode('forward_kepala')
      setRejectionNote(
        existing.catatan_pengawas || existing.catatan_revisi || ''
      )
    } else if (isKepalaViewer && existing?.status_auditor === 'rejected') {
      setRejectMode('delegate_operator')
      setRejectionNote(
        existing.catatan_auditor || existing.catatan_revisi || ''
      )
    } else {
      setRejectMode('reject')
      const existingNote = isKepalaViewer
        ? existing?.catatan_kepala_opd
        : isPengawasViewer
          ? existing?.catatan_pengawas
          : existing?.catatan_auditor
      setRejectionNote(existingNote || '')
    }

    setIsRejectDialogOpen(true)
  }

  function handleConfirmReject() {
    if (!rejectionNote || rejectionNote.trim().length < 5) {
      toast.error('Catatan revisi wajib diisi minimal 5 karakter.')
      return
    }

    reviewMutation.mutate({
      formCode: targetFormCode,
      status: 'rejected',
      catatan: rejectionNote.trim(),
      mode: rejectMode,
    })
  }

  if (isLoadingSubmission) {
    return (
      <div className='flex flex-col items-center justify-center gap-3 rounded-2xl border bg-card p-20'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-xs text-muted-foreground'>
          Memuat data pemeriksaan risiko perangkat daerah...
        </p>
      </div>
    )
  }

  if (
    submissionError ||
    !submission ||
    !effectiveOpdId ||
    !effectivePeriodeId
  ) {
    return (
      <div
        className='space-y-3 rounded-lg border border-destructive/40 p-4 text-sm'
        role='alert'
      >
        <p>
          Data pengajuan, OPD, atau periode tidak dapat dimuat. Periksa akses
          dan coba lagi.
        </p>
        <Button variant='outline' onClick={() => void refetchSubmission()}>
          Coba lagi
        </Button>
      </div>
    )
  }

  const rejectButtonLabel =
    isAuditorViewer && currentStepState.status === 'needs_action'
      ? 'Teruskan ke Kepala OPD'
      : isKepalaViewer && currentStepState.status === 'needs_action'
        ? 'Delegasikan ke Operator'
        : isPengawasViewer
          ? 'Tolak ke Evaluator'
          : isKepalaViewer
            ? 'Tolak ke Operator'
            : 'Tolak ke Kepala OPD'

  const approveButtonLabel =
    currentStepState.status === 'approved'
      ? 'Sudah Disetujui'
      : isKepalaViewer && submission.current_tier !== 'kepala_opd'
        ? `Setujui Ulang Form ${currentStep.code}`
        : isAuditorViewer && submission.current_tier === 'pengawas'
          ? `Setujui Ulang Form ${currentStep.code}`
          : `Setujui Form ${currentStep.code}`

  return (
    <div className='flex flex-1 flex-col gap-4 pb-16'>
      {/* 1. COMPACT STICKY HEADER & STEPPER TRACK */}
      <ReviewWizardHeader
        steps={reviewSteps}
        submission={submission}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        approvedCount={approvedCount}
        rejectedCount={inRevisionCount}
        pendingCount={pendingCount}
        progressPercentage={progressPercentage}
        currentStep={currentStep}
        getItemStatusForStep={getItemStatusForStep}
        onBack={onBack}
        onSelectStep={setCurrentStepIndex}
      />

      {/* EXPLICIT FORWARD / FINALIZE ACTION BAR (Enabled ONLY when 100% green) */}
      {showForwardBanner && (
        <div
          className={
            isReadyToForward
              ? 'flex flex-col justify-between gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-3.5 text-emerald-900 sm:flex-row sm:items-center dark:text-emerald-200'
              : 'flex flex-col justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3.5 text-foreground sm:flex-row sm:items-center'
          }
        >
          <div className='flex items-center gap-2.5 text-xs'>
            {isReadyToForward ? (
              <CheckCircle2 className='h-4 w-4 shrink-0 text-emerald-600' />
            ) : (
              <RefreshCw className='h-4 w-4 shrink-0 text-amber-600' />
            )}
            <span>
              {isReadyToForward ? (
                <>
                  <strong>Siap Diteruskan (100% Disetujui):</strong> Seluruh{' '}
                  {requiredSteps.length} formulir telah disetujui tanpa catatan
                  revisi tersisa. Klik tombol di samping untuk meneruskan
                  berkas.
                </>
              ) : (
                <>
                  <strong>Progres Penilaian Per-Form:</strong> {approvedCount}/
                  {requiredSteps.length} formulir disetujui
                  {inRevisionCount > 0 && (
                    <span className='font-semibold text-amber-700 dark:text-amber-400'>
                      {' '}
                      • {inRevisionCount} sedang direvisi (kuning)
                    </span>
                  )}
                  . Tombol <strong>{forwardActionLabel}</strong> akan aktif
                  setelah seluruh formulir disetujui (100%).
                </>
              )}
            </span>
          </div>
          <Button
            type='button'
            size='sm'
            disabled={!isReadyToForward || forwardTierMutation.isPending}
            onClick={() => setIsForwardConfirmOpen(true)}
            className='h-8 shrink-0 gap-1.5 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50'
          >
            {forwardTierMutation.isPending ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Send className='h-3.5 w-3.5' />
            )}
            <span>{forwardActionLabel}</span>
          </Button>
        </div>
      )}

      {/* 2. STEP REVIEW CARD & WORKSPACE */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2 px-1'>
          <span className='text-xs font-semibold text-muted-foreground'>
            Lembar Kerja {currentStep.code.toUpperCase()}: {currentStep.title}
          </span>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='h-7.5 gap-1.5 text-xs font-medium shadow-2xs'
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <History className='h-3.5 w-3.5 text-primary' />
            <span>
              Riwayat & Catatan Berkas ({submission?.histories?.length || 0})
            </span>
          </Button>
        </div>

        <div className='overflow-hidden rounded-xl border bg-card shadow-xs'>
          <ReviewWizardStepHeader
            informationOnly={currentStep.id === '4' && !hasForm4Item}
            canDecide={canDecideCurrentStep}
            stepNumber={currentStep.stepNumber}
            totalSteps={totalSteps}
            stepCode={currentStep.code}
            stepTitle={currentStep.title}
            stepSubtitle={currentStep.subtitle}
            isApproved={currentStepState.status === 'approved'}
            isRejected={currentStepState.status === 'in_revision'}
            isInRevision={currentStepState.status === 'in_revision'}
            revisionLocation={currentStepState.revisionLocation}
            revisionNote={currentStepState.revisionNote}
            isNeedsAction={currentStepState.status === 'needs_action'}
            incomingRevisionSource={currentStepState.incomingRevisionSource}
            incomingRevisionNote={currentStepState.incomingRevisionNote}
            isDraftSubmission={isDraftSubmission}
            isPendingMutation={
              reviewMutation.isPending ||
              isActiveFormError ||
              isActiveFormLoading
            }
            isPengawasTier={isPengawasViewer}
            isKepalaTier={isKepalaViewer}
            currentItem={currentItem}
            rejectButtonLabel={rejectButtonLabel}
            approveButtonLabel={approveButtonLabel}
            onApprove={() => handleApprove(currentStep.id)}
            onOpenReject={() => handleOpenReject(currentStep.id)}
            onClarifyToPengawas={
              isAuditorViewer && currentStepState.status === 'needs_action'
                ? () => {
                    setResubmitFormCode(currentStep.id)
                    setResubmitNotes('')
                    setIsResubmitModalOpen(true)
                  }
                : undefined
            }
          />

          {/* Step Data Content Area via Registry */}
          <ReviewStepContent
            formCode={currentStep.id}
            data={
              currentStep.id === '10' || currentStep.id === 'fra'
                ? activeFormResponse
                : activeFormResponse?.data
            }
            isLoading={isActiveFormLoading}
            isError={isActiveFormError}
            onRetry={() => void refetchActiveForm()}
            meta={activeFormResponse?.meta}
            search={searchFor(currentStep.id)}
            onSearchChange={(value) => {
              const code = currentStep.id
              setSearches((prev) => ({ ...prev, [code]: value }))
              setPages((prev) => ({ ...prev, [code]: 1 }))
            }}
            page={pageFor(currentStep.id)}
            onPageChange={(page) => {
              setPages((prev) => ({ ...prev, [currentStep.id]: page }))
            }}
            rcaSource={rcaSource}
            onRcaSourceChange={(source) => {
              setRcaSource(source)
              setPages((prev) => ({ ...prev, rca: 1 }))
            }}
            rcaStatus={rcaStatus}
            onRcaStatusChange={(status) => {
              setRcaStatus(status)
              setPages((prev) => ({ ...prev, rca: 1 }))
            }}
          />

          {/* Stepper Footer Navigation */}
          <ReviewWizardFooter
            currentStepIndex={currentStepIndex}
            totalSteps={totalSteps}
            currentStepCode={currentStep.code}
            currentStepTitle={currentStep.shortTitle}
            onPrev={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
            onNext={() =>
              setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))
            }
          />
        </div>
      </div>

      {/* 3. PER-FORM REJECTION / DELEGATION / FORWARD NOTES DIALOG (Pre-filled & Editable) */}
      <ReviewRejectionDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        targetFormCode={targetFormCode}
        note={rejectionNote}
        onNoteChange={setRejectionNote}
        onConfirm={handleConfirmReject}
        isPending={reviewMutation.isPending}
      />

      {/* 4. MODAL CLARIFY & RESUBMIT FORM DIRECTLY TO PENGAWAS */}
      <Dialog open={isResubmitModalOpen} onOpenChange={setIsResubmitModalOpen}>
        <DialogContent className='flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-md'>
          <DialogHeader className='shrink-0 border-b px-4 py-4 sm:px-6'>
            <DialogTitle className='flex items-center gap-2 text-sm font-bold'>
              <Send className='h-4 w-4 text-primary' />
              Kirim Klarifikasi Form {resubmitFormCode.toUpperCase()} ke
              Pengawas
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Kirimkan kembali formulir ini disertai catatan klarifikasi
              langsung kepada Pengawas APIP tanpa perlu mengembalikan ke OPD.
            </DialogDescription>
          </DialogHeader>
          <div className='min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-4 text-xs sm:px-6'>
            <Label className='text-xs font-semibold'>
              Catatan Penjelasan Klarifikasi:
            </Label>
            <Textarea
              rows={3}
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              placeholder='Jelaskan hasil konfirmasi atau rujukan data...'
              className='text-xs'
            />
          </div>
          <DialogFooter className='flex shrink-0 items-center justify-end gap-2 border-t bg-muted/10 px-4 py-3 sm:px-6'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsResubmitModalOpen(false)}
              disabled={resubmitPengawasMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size='sm'
              disabled={resubmitPengawasMutation.isPending}
              onClick={() => resubmitPengawasMutation.mutate()}
            >
              {resubmitPengawasMutation.isPending
                ? 'Mengirim...'
                : 'Kirim Klarifikasi ke Pengawas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL AUDIT TRAIL / RIWAYAT PERSETUJUAN */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className='flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-lg'>
          <DialogHeader className='shrink-0 border-b px-4 py-4 sm:px-6'>
            <DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'>
              <History className='h-4.5 w-4.5 text-primary' />
              <span>Jejak Audit & Riwayat Verifikasi Berjenjang</span>
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Histori kronologis pengajuan, catatan revisi per-form, dan
              keputusan persetujuan berkas ini.
            </DialogDescription>
          </DialogHeader>

          <div className='min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-xs sm:px-6'>
            {submission?.histories && submission.histories.length > 0 ? (
              <div className='relative space-y-4 pl-6 before:absolute before:top-2 before:bottom-2 before:left-2 before:w-[2px] before:bg-border'>
                {submission.histories.map((hist) => {
                  let dateFormatted: string
                  try {
                    dateFormatted = format(
                      parseISO(hist.created_at),
                      'dd MMM yyyy, HH:mm',
                      { locale: idLocale }
                    )
                  } catch {
                    dateFormatted = hist.created_at
                  }

                  return (
                    <div key={hist.id} className='relative space-y-1 text-xs'>
                      <span className='absolute top-0.5 -left-6 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-primary/20 text-primary'>
                        <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                      </span>
                      <div className='flex flex-wrap items-center gap-2'>
                        <span className='font-bold text-foreground'>
                          {hist.user?.name || 'Sistem'}
                        </span>
                        {hist.form_code && (
                          <Badge
                            variant='secondary'
                            className='font-mono text-[10px]'
                          >
                            Form {hist.form_code.toUpperCase()}
                          </Badge>
                        )}
                        <Badge
                          variant='outline'
                          className='font-mono text-[10px]'
                        >
                          {hist.action}
                        </Badge>
                        <span className='text-[10px] text-muted-foreground'>
                          {dateFormatted}
                        </span>
                      </div>
                      {hist.catatan && (
                        <p className='rounded border border-border/40 bg-muted/40 p-2 text-[11px] text-muted-foreground italic'>
                          &ldquo;{hist.catatan}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground'>
                Belum ada jejak audit atau riwayat revisi pada pengajuan ini.
              </div>
            )}
          </div>

          <DialogFooter className='flex shrink-0 items-center justify-end gap-2 border-t bg-muted/10 px-4 py-3 sm:px-6'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs'
              onClick={() => setIsHistoryModalOpen(false)}
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. EXPLICIT FORWARD / FINALIZE CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={isForwardConfirmOpen}
        onOpenChange={setIsForwardConfirmOpen}
        title={forwardConfirmTitle}
        desc={forwardConfirmDesc}
        confirmText={
          forwardTierMutation.isPending ? (
            <>
              <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
              Memproses...
            </>
          ) : (
            `Ya, ${forwardActionLabel}`
          )
        }
        handleConfirm={() => forwardTierMutation.mutate()}
        isLoading={forwardTierMutation.isPending}
      />
    </div>
  )
}
