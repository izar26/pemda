import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, ArrowRightCircle, Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
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

  const isPengawasTier = submission?.current_tier === 'pengawas'

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
    </div>
  )
}
