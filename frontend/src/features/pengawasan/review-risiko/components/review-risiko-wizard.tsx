import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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

  // Review mutation (Approve / Reject item)
  const reviewMutation = useMutation({
    mutationFn: ({
      formCode,
      status,
      catatan,
    }: {
      formCode: string
      status: 'approved' | 'rejected'
      catatan?: string
    }) =>
      pengajuanRisikoService.reviewItem(submissionId, {
        form_code: formCode,
        status,
        catatan_revisi: catatan,
      }),
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
    onError: (err: any) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan_revisi?.[0] ||
        'Gagal memproses review form.'
      toast.error(msg)
    },
  })

  const currentStep = RISIKO_WIZARD_STEPS[currentStepIndex] || RISIKO_WIZARD_STEPS[0]
  const currentItem = submission?.items?.find(
    (i) => i.form_code.toLowerCase() === currentStep.id.toLowerCase()
  )

  const isCurrentApproved = currentItem?.status === 'approved'
  const isCurrentRejected = currentItem?.status === 'rejected'
  const isDraftSubmission = submission?.status === 'draft'

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
        submission?.status === 'submitted' ||
        submission?.status === 'in_review' ||
        submission?.status === 'revision_requested'
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

      {/* 2. STEP REVIEW CARD & WORKSPACE */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        {/* Step Header with Auditor Decision Bar */}
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
    </div>
  )
}
