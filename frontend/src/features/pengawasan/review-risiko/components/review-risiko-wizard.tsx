import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRightCircle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  Send,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { useAuthStore } from '@/stores/auth-store'
import { format, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'
import {
  pengajuanRisikoService,
  type SubmissionItem,
} from '@/services/pengajuan-risiko-service'
import { risikoService } from '@/services/risiko-service'
import { ReviewWizardHeader } from './wizard/review-wizard-header'
import { ReviewWizardStepHeader } from './wizard/review-wizard-step-header'
import { ReviewWizardFooter } from './wizard/review-wizard-footer'
import { ReviewRejectionDialog } from './wizard/review-rejection-dialog'
import { ReviewStep2B } from './wizard/steps/review-step-2b'
import { ReviewStep2C } from './wizard/steps/review-step-2c'
import { ReviewStepPlaceholder } from './wizard/steps/review-step-placeholder'

interface ReviewRisikoWizardProps {
  submissionId: string
  opdId: string
  periodeId: string
  onBack: () => void
  onSuccess?: () => void
}

export function ReviewRisikoWizard({
  submissionId,
  opdId,
  periodeId,
  onBack,
  onSuccess,
}: ReviewRisikoWizardProps) {
  const queryClient = useQueryClient()
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  // Rejection Dialog state
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false)
  const [rejectionNote, setRejectionNote] = useState('')
  const [targetFormCode, setTargetFormCode] = useState<string>('')

  // Auditor action on Pengawas rejection dialogs
  const [isForwardModalOpen, setIsForwardModalOpen] = useState(false)
  const [forwardNotes, setForwardNotes] = useState('')

  const [isResubmitModalOpen, setIsResubmitModalOpen] = useState(false)
  const [resubmitNotes, setResubmitNotes] = useState('')
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)

  // 1. Fetch submission detail with items & history
  const { data: submission, isLoading: isLoadingSubmission } = useQuery({
    queryKey: ['pengawasan', 'review-detail', submissionId],
    queryFn: () => pengajuanRisikoService.getSubmissionDetail(submissionId),
    staleTime: 5_000,
  })

  const effectiveOpdId = submission?.opd_id || opdId
  const effectivePeriodeId = submission?.periode_penilaian_id || periodeId

  // 2. Fetch Form 2B detail
  const { data: konteks2BData, isLoading: isLoading2B } = useQuery({
    queryKey: ['risiko-2b-detail', effectiveOpdId, effectivePeriodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksWithMeta({
        opd_id: effectiveOpdId,
        periode_penilaian_id: effectivePeriodeId,
      }),
    enabled: Boolean(effectiveOpdId),
  })

  // 3. Fetch Form 2C detail
  const { data: konteks2CData, isLoading: isLoading2C } = useQuery({
    queryKey: ['risiko-2c-detail', effectiveOpdId, effectivePeriodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: effectiveOpdId,
        periode_penilaian_id: effectivePeriodeId,
      }),
    enabled: Boolean(effectiveOpdId),
  })

  const authUser = useAuthStore((state) => state.auth.user)
  const isSuperadmin =
    authUser?.roles?.includes('Superadmin') || authUser?.role === 'Superadmin'
  const isKepalaOpdUser =
    authUser?.roles?.includes('Executive') || authUser?.role === 'Executive'

  const canActAsKepalaOpd =
    isSuperadmin ||
    (isKepalaOpdUser && Boolean(authUser?.opd_id && String(authUser.opd_id) === String(submission?.opd_id)))

  const isKepalaTier =
    submission?.current_tier === 'kepala_opd' ||
    submission?.status === 'submitted_to_kepala_opd' ||
    submission?.status === 'revision_by_auditor'
  const isPengawasTier =
    submission?.current_tier === 'pengawas' ||
    submission?.status === 'submitted_to_pengawas' ||
    submission?.status === 'in_review_pengawas'

  // Kepala OPD Dialogs State
  const [isKepalaApproveOpen, setIsKepalaApproveOpen] = useState(false)
  const [isKepalaRejectOpen, setIsKepalaRejectOpen] = useState(false)
  const [kepalaRejectNotes, setKepalaRejectNotes] = useState('')
  const [isKepalaDelegateOpen, setIsKepalaDelegateOpen] = useState(false)
  const [kepalaDelegateNotes, setKepalaDelegateNotes] = useState('')

  // Kepala OPD Review Mutation
  const reviewKepalaMutation = useMutation({
    mutationFn: ({ status, catatan }: { status: 'approved' | 'rejected'; catatan?: string }) =>
      pengajuanRisikoService.reviewByKepalaOpd(submissionId, { status, catatan }),
    onSuccess: (res, vars) => {
      toast.success(
        res.message ||
          (vars.status === 'approved'
            ? 'Lembar kerja risiko berhasil disetujui dan diteruskan ke Auditor.'
            : 'Pengajuan berhasil dikembalikan kepada Operator untuk perbaikan internal.')
      )
      setIsKepalaApproveOpen(false)
      setIsKepalaRejectOpen(false)
      setKepalaRejectNotes('')
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      queryClient.invalidateQueries({ queryKey: ['risiko-pending-counts'] })
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan?.[0] ||
        'Gagal memproses persetujuan Kepala OPD.'
      toast.error(msg)
    },
  })

  // Kepala OPD Delegate Mutation
  const delegateOperatorMutation = useMutation({
    mutationFn: (catatan: string) =>
      pengajuanRisikoService.delegateToOperator(submissionId, {
        catatan: catatan.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Catatan revisi auditor berhasil didelegasikan kepada Operator.')
      setIsKepalaDelegateOpen(false)
      setKepalaDelegateNotes('')
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      queryClient.invalidateQueries({ queryKey: ['risiko-pending-counts'] })
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Gagal mendelegasikan catatan revisi.')
    },
  })

  // Review mutation (Auditor or Pengawas based on current tier)
  const reviewMutation = useMutation({
    mutationFn: ({
      formCode,
      status,
      catatan,
    }: {
      formCode: string
      status: 'approved' | 'rejected'
      catatan?: string
    }) => {
      if (isPengawasTier) {
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
            : `Form ${vars.formCode.toUpperCase()} ditolak dengan catatan revisi.`)
      )
      setIsRejectDialogOpen(false)
      setRejectionNote('')
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] })
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan_revisi?.[0] ||
        'Gagal memproses review form.'
      toast.error(msg)
    },
  })

  // Auditor forwards Pengawas rejection down to Kepala OPD
  const forwardRevisionMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.forwardRevisionFromAuditor(submissionId, {
        catatan: forwardNotes.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Catatan revisi berhasil diteruskan ke Kepala OPD.')
      setIsForwardModalOpen(false)
      setForwardNotes('')
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Gagal meneruskan catatan revisi.')
    },
  })

  // Auditor clarifies and re-submits directly back to Pengawas
  const resubmitPengawasMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.resubmitToPengawas(submissionId, {
        catatan: resubmitNotes.trim() || undefined,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Klarifikasi berhasil dikirimkan kembali ke Pengawas.')
      setIsResubmitModalOpen(false)
      setResubmitNotes('')
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      onSuccess?.()
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err.response?.data?.message || 'Gagal mengirimkan klarifikasi.')
    },
  })

  const currentStep = RISIKO_WIZARD_STEPS[currentStepIndex] || RISIKO_WIZARD_STEPS[0]
  const currentItem = submission?.items?.find(
    (i) => i.form_code.toLowerCase() === currentStep.id.toLowerCase()
  )

  const isCurrentApproved = currentItem?.status === 'approved'
  const isCurrentRejected = currentItem?.status === 'rejected'
  const isDraftSubmission =
    submission?.status === 'draft' ||
    submission?.status === 'submitted_to_kepala_opd' ||
    submission?.status === 'revision_by_kepala_opd'

  function handleApprove(formCode: string) {
    reviewMutation.mutate({ formCode, status: 'approved' })
  }

  function handleOpenReject(formCode: string) {
    const existing = submission?.items?.find(
      (i) => i.form_code.toLowerCase() === formCode.toLowerCase()
    )
    setTargetFormCode(formCode)
    setRejectionNote(existing?.catatan_revisi || '')
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
    })
  }

  function getItemStatusForStep(stepConfig: RisikoWizardStepConfig): {
    status: 'approved' | 'rejected' | 'submitted' | 'draft'
    item?: SubmissionItem
  } {
    const item = submission?.items?.find(
      (i) => i.form_code.toLowerCase() === stepConfig.id.toLowerCase()
    )

    if (!item) {
      if (
        submission?.status &&
        submission.status !== 'draft' &&
        submission.status !== 'revision_by_kepala_opd'
      ) {
        return { status: 'submitted' }
      }
      return { status: 'draft' }
    }

    return { status: item.status, item }
  }

  const totalSteps = RISIKO_WIZARD_STEPS.length
  const approvedCount = RISIKO_WIZARD_STEPS.filter(
    (s) => getItemStatusForStep(s).status === 'approved'
  ).length
  const rejectedCount = RISIKO_WIZARD_STEPS.filter(
    (s) => getItemStatusForStep(s).status === 'rejected'
  ).length
  const pendingCount = totalSteps - approvedCount - rejectedCount
  const progressPercentage = Math.round((approvedCount / totalSteps) * 100)

  const konteks2B = konteks2BData?.data
  const konteks2C = konteks2CData

  if (isLoadingSubmission) {
    return (
      <div className='flex flex-col items-center justify-center p-20 gap-3 rounded-2xl border bg-card'>
        <Loader2 className='h-8 w-8 animate-spin text-primary' />
        <p className='text-xs text-muted-foreground'>
          Memuat data pemeriksaan risiko perangkat daerah...
        </p>
      </div>
    )
  }

  const isRevisionByPengawas = submission?.status === 'revision_by_pengawas'

  return (
    <div className='flex flex-1 flex-col gap-4 pb-16'>
      {/* 1. COMPACT STICKY HEADER & STEPPER TRACK */}
      <ReviewWizardHeader
        submission={submission}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        pendingCount={pendingCount}
        progressPercentage={progressPercentage}
        currentStep={currentStep}
        getItemStatusForStep={getItemStatusForStep}
        onBack={onBack}
        onSelectStep={setCurrentStepIndex}
      />

      {/* Kepala OPD Action Banner when in Tier 2 */}
      {isKepalaTier && canActAsKepalaOpd && (
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-900 dark:text-sky-200'>
          <div className='flex items-center gap-2.5 text-xs'>
            <CheckCircle2 className='h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400' />
            <span>
              <strong>Persetujuan Pimpinan OPD:</strong>{' '}
              {submission?.status === 'revision_by_auditor'
                ? 'Auditor APIP telah memberikan catatan revisi teknis. Anda dapat mendelegasikannya kepada Operator untuk diperbaiki atau langsung menyetujui ulang.'
                : 'Operator OPD telah mengajukan draf lembar kerja risiko (Form 2B & 2C). Periksa keselarasan sasaran dan target sebelum diteruskan ke Auditor APIP.'}
            </span>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            {submission?.status === 'revision_by_auditor' ? (
              <>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className='text-xs h-8 border-sky-600/40 text-sky-800 dark:text-sky-200 gap-1.5'
                  onClick={() => setIsKepalaDelegateOpen(true)}
                >
                  <ArrowRightCircle className='h-3.5 w-3.5' />
                  <span>Delegasikan ke Operator</span>
                </Button>
                <Button
                  type='button'
                  size='sm'
                  className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold'
                  onClick={() => setIsKepalaApproveOpen(true)}
                >
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  <span>Setujui Ulang ke Auditor</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  type='button'
                  size='sm'
                  variant='destructive'
                  className='text-xs h-8 gap-1.5 font-medium'
                  onClick={() => setIsKepalaRejectOpen(true)}
                >
                  <XCircle className='h-3.5 w-3.5' />
                  <span>Kembalikan ke Operator (Revisi)</span>
                </Button>
                <Button
                  type='button'
                  size='sm'
                  className='text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-semibold'
                  onClick={() => setIsKepalaApproveOpen(true)}
                >
                  <CheckCircle2 className='h-3.5 w-3.5' />
                  <span>Setujui & Teruskan ke Auditor</span>
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      {isKepalaTier && !canActAsKepalaOpd && (
        <div className='p-3 rounded-xl border border-muted bg-muted/40 text-muted-foreground text-xs flex items-center gap-2'>
          <Clock className='h-4 w-4 shrink-0 text-muted-foreground' />
          <span>
            Berkas saat ini sedang dalam proses <strong>Persetujuan Internal Kepala OPD</strong> sebelum dapat diperiksa oleh Auditor Pengawas.
          </span>
        </div>
      )}

      {/* Auditor Action Bar when Pengawas has rejected */}
      {isRevisionByPengawas && (
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300'>
          <div className='flex items-center gap-2 text-xs'>
            <AlertCircle className='h-4 w-4 shrink-0 text-amber-600' />
            <span>
              <strong>Perhatian Auditor:</strong> Pengawas APIP mengembalikan berkas ini dengan catatan. Anda dapat meneruskannya ke Kepala OPD atau mengirimkan klarifikasi ulang ke Pengawas.
            </span>
          </div>
          <div className='flex items-center gap-2 shrink-0'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='text-xs h-8 border-amber-600/40 text-amber-800 dark:text-amber-200 gap-1.5'
              onClick={() => setIsResubmitModalOpen(true)}
            >
              <Send className='h-3 w-3' />
              <span>Kirim Klarifikasi ke Pengawas</span>
            </Button>
            <Button
              type='button'
              size='sm'
              className='text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold'
              onClick={() => setIsForwardModalOpen(true)}
            >
              <ArrowRightCircle className='h-3.5 w-3.5' />
              <span>Teruskan ke Kepala OPD</span>
            </Button>
          </div>
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
            className='h-7.5 text-xs gap-1.5 font-medium shadow-2xs'
            onClick={() => setIsHistoryModalOpen(true)}
          >
            <History className='h-3.5 w-3.5 text-primary' />
            <span>Riwayat & Catatan Berkas ({submission?.histories?.length || 0})</span>
          </Button>
        </div>

        <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
          {/* Step Header with Decision Bar */}
          <ReviewWizardStepHeader
            stepNumber={currentStep.stepNumber}
            totalSteps={totalSteps}
            stepCode={currentStep.code}
            stepTitle={currentStep.title}
            stepSubtitle={currentStep.subtitle}
            isApproved={isCurrentApproved}
            isRejected={isCurrentRejected}
            isDraftSubmission={isDraftSubmission}
            isPendingMutation={reviewMutation.isPending}
            isPengawasTier={isPengawasTier}
            isKepalaTier={isKepalaTier}
            currentItem={currentItem}
            onApprove={() => handleApprove(currentStep.id)}
            onOpenReject={() => handleOpenReject(currentStep.id)}
          />

        {/* Step Data Content Area */}
        <div className='p-3.5 sm:p-4'>
          {currentStep.id === '2b' && (
            <ReviewStep2B konteks2B={konteks2B} isLoading={isLoading2B} />
          )}

          {currentStep.id === '2c' && (
            <ReviewStep2C konteks2C={konteks2C} isLoading={isLoading2C} />
          )}

          {currentStep.id !== '2b' && currentStep.id !== '2c' && (
            <ReviewStepPlaceholder stepId={currentStep.id} />
          )}
        </div>

        {/* Stepper Footer Navigation */}
        <ReviewWizardFooter
          currentStepIndex={currentStepIndex}
          totalSteps={totalSteps}
          currentStepCode={currentStep.code}
          currentStepTitle={currentStep.shortTitle}
          onPrev={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
          onNext={() => setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))}
        />
      </div>
    </div>

      {/* 3. REJECTION NOTES MODAL DIALOG */}
      <ReviewRejectionDialog
        open={isRejectDialogOpen}
        onOpenChange={setIsRejectDialogOpen}
        targetFormCode={targetFormCode}
        note={rejectionNote}
        onNoteChange={setRejectionNote}
        onConfirm={handleConfirmReject}
        isPending={reviewMutation.isPending}
      />

      {/* 4. MODAL FORWARD REVISION TO KEPALA OPD */}
      <Dialog open={isForwardModalOpen} onOpenChange={setIsForwardModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-sm font-bold flex items-center gap-2'>
              <ArrowRightCircle className='h-4 w-4 text-amber-600' />
              Teruskan Catatan Revisi ke Kepala OPD
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Berkas akan dikembalikan ke Kepala OPD agar dikoordinasikan kepada Operator OPD terkait.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Catatan Pengantar Auditor (Opsional):</Label>
            <Textarea
              rows={3}
              value={forwardNotes}
              onChange={(e) => setForwardNotes(e.target.value)}
              placeholder='Tambahkan instruksi pengantar ke pimpinan OPD...'
              className='text-xs'
            />
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              size='sm'
              onClick={() => setIsForwardModalOpen(false)}
              disabled={forwardRevisionMutation.isPending}
            >
              Batal
            </Button>
            <Button
              size='sm'
              className='bg-amber-600 hover:bg-amber-700 text-white'
              disabled={forwardRevisionMutation.isPending}
              onClick={() => forwardRevisionMutation.mutate()}
            >
              {forwardRevisionMutation.isPending ? 'Meneruskan...' : 'Teruskan ke Kepala OPD'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. MODAL RESUBMIT TO PENGAWAS */}
      <Dialog open={isResubmitModalOpen} onOpenChange={setIsResubmitModalOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-sm font-bold flex items-center gap-2'>
              <Send className='h-4 w-4 text-primary' />
              Kirim Klarifikasi ke Pengawas
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Kirimkan kembali berkas disertai catatan klarifikasi penjelasan langsung kepada Pengawas APIP.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-2 py-2 text-xs'>
            <Label className='text-xs font-semibold'>Catatan Penjelasan Klarifikasi:</Label>
            <Textarea
              rows={3}
              value={resubmitNotes}
              onChange={(e) => setResubmitNotes(e.target.value)}
              placeholder='Jelaskan hasil konfirmasi atau rujukan data...'
              className='text-xs'
            />
          </div>
          <DialogFooter>
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
              {resubmitPengawasMutation.isPending ? 'Mengirim...' : 'Kirim ke Pengawas'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. MODAL AUDIT TRAIL / RIWAYAT PERSETUJUAN */}
      <Dialog open={isHistoryModalOpen} onOpenChange={setIsHistoryModalOpen}>
        <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col'>
          <DialogHeader className='pb-2 border-b'>
            <DialogTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
              <History className='h-4.5 w-4.5 text-primary' />
              <span>Jejak Audit & Riwayat Verifikasi Berjenjang</span>
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Histori kronologis pengajuan, catatan revisi, dan keputusan persetujuan berkas ini.
            </DialogDescription>
          </DialogHeader>

          <div className='flex-1 overflow-y-auto py-3 pr-1 space-y-3 text-xs'>
            {submission?.histories && submission.histories.length > 0 ? (
              <div className='relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[2px] before:bg-border'>
                {submission.histories.map((hist) => {
                  let dateFormatted: string
                  try {
                    dateFormatted = format(parseISO(hist.created_at), 'dd MMM yyyy, HH:mm', {
                      locale: idLocale,
                    })
                  } catch {
                    dateFormatted = hist.created_at
                  }

                  return (
                    <div key={hist.id} className='relative space-y-1 text-xs'>
                      <span className='absolute -left-6 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary/20 text-primary border border-background'>
                        <span className='h-1.5 w-1.5 rounded-full bg-primary' />
                      </span>
                      <div className='flex items-center gap-2 flex-wrap'>
                        <span className='font-bold text-foreground'>
                          {hist.user?.name || (hist as unknown as { actor?: { name?: string } }).actor?.name || 'Sistem'}
                        </span>
                        <Badge variant='outline' className='text-[10px] font-mono'>
                          {hist.action}
                        </Badge>
                        <span className='text-[10px] text-muted-foreground'>
                          {dateFormatted}
                        </span>
                      </div>
                      {(hist.catatan || (hist as unknown as { notes?: string }).notes) && (
                        <p className='p-2 rounded bg-muted/40 border border-border/40 text-[11px] text-muted-foreground italic'>
                          &ldquo;{hist.catatan || (hist as unknown as { notes?: string }).notes}&rdquo;
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg border-dashed'>
                Belum ada jejak audit atau riwayat revisi pada pengajuan ini.
              </div>
            )}
          </div>

          <DialogFooter className='pt-2 border-t'>
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

      {/* 7. MODAL KEPALA OPD: APPROVE CONFIRMATION */}
      <ConfirmDialog
        open={isKepalaApproveOpen}
        onOpenChange={setIsKepalaApproveOpen}
        title='Setujui Lembar Kerja Risiko OPD'
        desc='Apakah Anda yakin seluruh lembar kerja pengelolaan risiko (Form 2B dan Form 2C) telah selaras dengan arah kebijakan dinas dan siap diteruskan kepada Auditor APIP?'
        confirmText={
          reviewKepalaMutation.isPending ? (
            <>
              <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' />
              Memproses...
            </>
          ) : (
            'Ya, Setujui & Kirim'
          )
        }
        handleConfirm={() => reviewKepalaMutation.mutate({ status: 'approved' })}
        isLoading={reviewKepalaMutation.isPending}
      />

      {/* 8. MODAL KEPALA OPD: REJECTION NOTES */}
      <Dialog open={isKepalaRejectOpen} onOpenChange={setIsKepalaRejectOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base font-bold text-destructive flex items-center gap-2'>
              <XCircle className='h-4 w-4' />
              Kembalikan Berkas ke Operator (Revisi Internal)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Berikan catatan arahan perbaikan internal yang harus ditindaklanjuti oleh staf teknis/operator dinas sebelum diajukan kembali ke pimpinan.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-2 py-2'>
            <Label htmlFor='kepala-reject-notes' className='text-xs font-semibold'>
              Catatan Arahan Revisi Pimpinan <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='kepala-reject-notes'
              rows={4}
              placeholder='Contoh: Mohon sesuaikan kembali target IKU pada sasaran kedua dan perbaiki kriteria kemungkinan risiko...'
              value={kepalaRejectNotes}
              onChange={(e) => setKepalaRejectNotes(e.target.value)}
              className='text-xs resize-none'
            />
            <p className='text-[11px] text-muted-foreground'>
              Minimal 5 karakter. Catatan ini akan tampil jelas pada akun Operator.
            </p>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setIsKepalaRejectOpen(false)}
            >
              Batal
            </Button>
            <Button
              type='button'
              variant='destructive'
              size='sm'
              className='text-xs h-8 gap-1.5'
              disabled={reviewKepalaMutation.isPending || kepalaRejectNotes.trim().length < 5}
              onClick={() =>
                reviewKepalaMutation.mutate({
                  status: 'rejected',
                  catatan: kepalaRejectNotes.trim(),
                })
              }
            >
              {reviewKepalaMutation.isPending && (
                <Loader2 className='h-3 w-3 animate-spin mr-1.5' />
              )}
              Kirim Arahan Revisi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 9. MODAL KEPALA OPD: DELEGATE AUDITOR REVISION TO OPERATOR */}
      <Dialog open={isKepalaDelegateOpen} onOpenChange={setIsKepalaDelegateOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base font-bold text-foreground flex items-center gap-2'>
              <ArrowRightCircle className='h-4 w-4 text-amber-600' />
              Delegasikan Revisi Auditor ke Operator
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Teruskan temuan/catatan perbaikan dari Auditor APIP kepada Operator OPD untuk diperbaiki secara teknis.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-2 py-2'>
            <Label htmlFor='kepala-delegate-notes' className='text-xs font-semibold'>
              Instruksi Tambahan untuk Operator (Opsional)
            </Label>
            <Textarea
              id='kepala-delegate-notes'
              rows={3}
              placeholder='Contoh: Tolong tim teknis operator segera sesuaikan parameter pengawasan sesuai catatan auditor di atas...'
              value={kepalaDelegateNotes}
              onChange={(e) => setKepalaDelegateNotes(e.target.value)}
              className='text-xs resize-none'
            />
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs h-8'
              onClick={() => setIsKepalaDelegateOpen(false)}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              className='text-xs h-8 bg-amber-600 hover:bg-amber-700 text-white gap-1.5 font-semibold'
              disabled={delegateOperatorMutation.isPending}
              onClick={() => delegateOperatorMutation.mutate(kepalaDelegateNotes)}
            >
              {delegateOperatorMutation.isPending && (
                <Loader2 className='h-3 w-3 animate-spin mr-1.5' />
              )}
              Delegasikan ke Operator
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
