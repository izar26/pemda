import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  FileCheck,
  FolderTree,
  Layers,
  Loader2,
  PieChart,
  Send,
  ShieldAlert,
  Target,
  TrendingUp,
  User,
  X,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'
import {
  pengajuanRisikoService,
  type SubmissionItem,
} from '@/services/pengajuan-risiko-service'
import { risikoService } from '@/services/risiko-service'

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
  const {
    data: submission,
    isLoading: isLoadingSubmission,
  } = useQuery({
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
        <p className='text-xs text-muted-foreground'>Memuat data pemeriksaan risiko perangkat daerah...</p>
      </div>
    )
  }

  return (
    <div className='flex flex-1 flex-col gap-5 sm:gap-6 pb-20'>
      {/* 1. TOP HEADER & OPD SUMMARY CARD (Sticky - Tidak Ke-scroll) */}
      <div className='sticky top-16 z-20 rounded-xl border bg-card/95 backdrop-blur-md p-3.5 sm:p-4 shadow-xs space-y-3'>
        {/* Breadcrumb & Back Navigation */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b pb-3.5'>
          <div className='flex items-center gap-2 text-xs text-muted-foreground'>
            <Button
              variant='ghost'
              size='sm'
              onClick={onBack}
              className='h-7 px-2 -ml-2 text-xs font-medium text-muted-foreground hover:text-foreground gap-1'
            >
              <ArrowLeft className='h-3.5 w-3.5' />
              <span>Daftar Review</span>
            </Button>
            <span>/</span>
            <span className='font-semibold text-foreground truncate max-w-xs sm:max-w-md'>
              {submission?.opd?.nama || 'Pemeriksaan Risiko'}
            </span>
          </div>
        </div>

        {/* OPD Title, Auditor Info & Overall Status */}
        <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
          <div className='space-y-1.5 min-w-0'>
            <div className='flex items-center gap-2.5 flex-wrap'>
              <h2 className='text-lg sm:text-xl font-bold tracking-tight text-foreground'>
                {submission?.opd?.nama || 'Pemeriksaan Lembar Kerja Risiko'}
              </h2>
              {submission?.opd?.kode && (
                <Badge variant='outline' className='font-mono text-xs px-2 py-0.5 bg-muted/40 font-semibold'>
                  {submission.opd.kode}
                </Badge>
              )}
              <Badge variant='secondary' className='text-xs font-normal'>
                {submission?.opd?.kategori || 'Dinas'}
              </Badge>
            </div>

            <div className='flex items-center gap-3 text-xs text-muted-foreground flex-wrap'>
              <span className='flex items-center gap-1.5'>
                <User className='h-3.5 w-3.5 text-primary' />
                Auditor Pengawas:{' '}
                <strong className='text-foreground font-semibold'>
                  {submission?.auditor?.name || 'Inspektorat'}
                </strong>
                {submission?.auditor?.nip && (
                  <span className='font-mono text-[11px] text-muted-foreground'>
                    (NIP. {submission.auditor.nip})
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Overall Status Badge & Stats */}
          <div className='flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap'>
            {submission?.status === 'approved' ? (
              <Badge className='text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-1.5 px-3 gap-1.5 font-semibold shadow-2xs'>
                <CheckCircle2 className='h-4 w-4 text-emerald-600' />
                Selesai Disetujui
              </Badge>
            ) : submission?.status === 'revision_requested' ? (
              <Badge className='text-xs bg-destructive/15 text-destructive border border-destructive/30 py-1.5 px-3 gap-1.5 font-semibold shadow-2xs'>
                <XCircle className='h-4 w-4 text-destructive' />
                Perlu Revisi OPD
              </Badge>
            ) : (
              <Badge className='text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-1.5 px-3 gap-1.5 font-semibold shadow-2xs'>
                <Clock className='h-4 w-4 text-amber-600 animate-pulse' />
                Menunggu Pemeriksaan
              </Badge>
            )}
          </div>
        </div>

        {/* Top Summary Row: Step Counter, Form Code, Clean Title & Progress Indicator */}
        <div className='flex items-center justify-between gap-3 pt-2.5 pb-2 border-t border-border/60 flex-wrap sm:flex-nowrap'>
          <div className='flex items-center gap-3'>
            <Badge
              variant='outline'
              className='text-xs font-mono font-bold px-2.5 py-1 border-primary/40 text-primary bg-primary/10 shadow-2xs'
            >
              LANGKAH {currentStep.stepNumber} DARI {totalSteps}
            </Badge>
            <div className='hidden sm:flex items-center gap-2'>
              <span className='text-sm font-bold text-foreground'>
                {currentStep.shortTitle}
              </span>
              <Badge
                variant='secondary'
                className='font-mono text-xs px-2 py-0.5 h-5 font-semibold bg-muted text-foreground border border-border/80'
              >
                Form {currentStep.code}
              </Badge>
            </div>
          </div>

          <div className='flex items-center gap-3 ml-auto flex-wrap sm:flex-nowrap'>
            <div className='flex items-center gap-2.5 text-xs'>
              <span className='text-xs font-medium text-muted-foreground hidden sm:inline'>
                Disetujui ({approvedCount}/{totalSteps}):
              </span>
              <div className='w-24 sm:w-32 h-2 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-border/60'>
                <div
                  className={cn(
                    'h-full transition-all duration-500 rounded-full',
                    progressPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
                  )}
                  style={{ width: `${Math.max(progressPercentage, 5)}%` }}
                />
              </div>
              <span
                className={cn(
                  'font-mono text-xs sm:text-sm font-extrabold',
                  progressPercentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-primary'
                )}
              >
                {progressPercentage}%
              </span>
            </div>

            <div className='hidden md:flex items-center gap-1.5 text-[11px] font-mono'>
              <Badge variant='outline' className='text-[10px] py-0 px-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 font-semibold'>
                {approvedCount} Disetujui
              </Badge>
              {rejectedCount > 0 && (
                <Badge variant='outline' className='text-[10px] py-0 px-1.5 bg-destructive/10 text-destructive border-destructive/30 font-semibold'>
                  {rejectedCount} Revisi
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant='outline' className='text-[10px] py-0 px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/30 font-semibold'>
                  {pendingCount} Menunggu
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* 2. DESKTOP & TABLET: PROMINENT 13-STEP TIMELINE TRACK (IDENTIK DENGAN PENGELOLAAN RISIKO) */}
        <TooltipProvider delayDuration={150}>
          <nav aria-label='Progress' className='hidden sm:block pt-3 pb-1'>
            <ol className='flex items-start w-full justify-between'>
              {RISIKO_WIZARD_STEPS.map((step, index) => {
                const { status } = getItemStatusForStep(step)
                const isCurrent = index === currentStepIndex
                const isApproved = status === 'approved'
                const isRejected = status === 'rejected'
                const isLast = index === totalSteps - 1

                return (
                  <li
                    key={step.id}
                    className={cn(
                      'flex items-start min-w-0',
                      !isLast && 'flex-1'
                    )}
                  >
                    {/* Step Node Button with Circle & High-Contrast Form Code */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type='button'
                          onClick={() => setCurrentStepIndex(index)}
                          className={cn(
                            'group flex flex-col items-center shrink-0 w-9 sm:w-10 outline-hidden transition-all select-none',
                            isCurrent
                              ? 'cursor-default'
                              : 'cursor-pointer hover:opacity-90'
                          )}
                          aria-label={`Langkah ${step.stepNumber}: ${step.shortTitle} (Form ${step.code})`}
                        >
                          {/* Circle Node (Larger, High Contrast) */}
                          <span
                            className={cn(
                              'flex h-9 w-9 sm:h-9.5 sm:w-9.5 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-xs',
                              isCurrent
                                ? isApproved
                                  ? 'bg-emerald-600 text-white ring-4 ring-primary/40 ring-offset-2 ring-offset-background scale-110 shadow-md'
                                  : isRejected
                                    ? 'bg-destructive text-white ring-4 ring-primary/40 ring-offset-2 ring-offset-background scale-110 shadow-md'
                                    : 'bg-primary text-primary-foreground ring-4 ring-primary/40 ring-offset-2 ring-offset-background scale-110 shadow-md'
                                : isApproved
                                  ? 'bg-emerald-600 text-white ring-2 ring-emerald-600/30 group-hover:scale-105 shadow-2xs'
                                  : isRejected
                                    ? 'bg-destructive text-white ring-2 ring-destructive/30 group-hover:scale-105 shadow-2xs'
                                    : 'bg-background text-foreground border-2 border-border group-hover:border-primary group-hover:scale-105 shadow-2xs'
                            )}
                          >
                            {isApproved ? (
                              <Check className='h-4.5 w-4.5 stroke-[2.8]' />
                            ) : isRejected ? (
                              <X className='h-4.5 w-4.5 stroke-[2.8]' />
                            ) : (
                              <span className='text-sm font-bold font-mono'>{step.stepNumber}</span>
                            )}
                          </span>

                          {/* High-Contrast Clear Form Code underneath */}
                          <span
                            className={cn(
                              'text-[11px] sm:text-xs font-mono mt-1.5 text-center transition-colors truncate max-w-full leading-tight select-none',
                              isCurrent
                                ? 'font-extrabold text-primary text-xs sm:text-[13px] tracking-tight'
                                : isApproved
                                  ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                  : isRejected
                                    ? 'font-bold text-destructive'
                                    : 'font-bold text-foreground group-hover:text-primary'
                            )}
                          >
                            {step.code}
                          </span>

                          {/* Active Indicator Dot */}
                          {isCurrent && (
                            <span className='h-1.5 w-1.5 rounded-full bg-primary mt-0.5 shadow-2xs' />
                          )}
                        </button>
                      </TooltipTrigger>

                      <TooltipContent side='bottom' className='text-xs space-y-1.5 p-2.5 max-w-xs shadow-md'>
                        <div className='font-bold flex items-center justify-between gap-2 border-b border-border/50 pb-1'>
                          <span>Langkah {step.stepNumber}: {step.shortTitle}</span>
                          <Badge variant='outline' className='text-[10px] font-mono px-1 py-0'>
                            Form {step.code}
                          </Badge>
                        </div>
                        <p className='text-[11px] text-muted-foreground leading-snug'>
                          {step.subtitle}
                        </p>
                        <div className='flex items-center gap-1.5 pt-0.5 text-[10px] font-medium'>
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              isCurrent
                                ? 'bg-primary'
                                : isApproved
                                  ? 'bg-emerald-500'
                                  : isRejected
                                    ? 'bg-destructive'
                                    : 'bg-amber-500'
                            )}
                          />
                          <span
                            className={cn(
                              isCurrent
                                ? 'text-primary font-bold'
                                : isApproved
                                  ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                  : isRejected
                                    ? 'text-destructive font-semibold'
                                    : 'text-muted-foreground'
                            )}
                          >
                            {isApproved
                              ? 'Disetujui Auditor'
                              : isRejected
                                ? 'Perlu Revisi OPD'
                                : isCurrent
                                  ? 'Sedang Ditinjau'
                                  : 'Menunggu Pemeriksaan'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Flexible Connector Line between steps (Solid 3px) */}
                    {!isLast && (
                      <div
                        aria-hidden='true'
                        className='flex-1 h-[3px] mx-1 sm:mx-1.5 mt-[17px] sm:mt-[18px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'
                      >
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            isApproved
                              ? 'bg-emerald-500 w-full'
                              : isCurrent
                                ? 'bg-primary/40 w-1/2'
                                : 'w-0'
                          )}
                        />
                      </div>
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>
        </TooltipProvider>

        {/* MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
        <div className='sm:hidden pt-2 space-y-2.5'>
          {/* Segmented Micro Progress Bar (13 segments) */}
          <div className='flex items-center gap-1 h-2 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'>
            {RISIKO_WIZARD_STEPS.map((step, idx) => {
              const { status } = getItemStatusForStep(step)
              const isCurrent = idx === currentStepIndex
              const isApproved = status === 'approved'
              const isRejected = status === 'rejected'

              return (
                <button
                  key={step.id}
                  type='button'
                  onClick={() => setCurrentStepIndex(idx)}
                  title={`Langkah ${step.stepNumber}: ${step.shortTitle} (Form ${step.code})`}
                  className={cn(
                    'flex-1 h-full transition-all rounded-full',
                    isCurrent
                      ? 'bg-primary ring-2 ring-primary/40'
                      : isApproved
                        ? 'bg-emerald-500'
                        : isRejected
                          ? 'bg-destructive'
                          : 'bg-slate-300 dark:bg-slate-600'
                  )}
                />
              )
            })}
          </div>

          {/* Active Step Details & Quick Mobile Navigator */}
          <div className='flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={currentStepIndex === 0}
              onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
              className='h-8 w-8 shrink-0'
              title='Kembali ke Langkah Sebelumnya'
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>

            <div className='text-center min-w-0 flex-1 px-1'>
              <div className='flex items-center justify-center gap-1.5 flex-wrap'>
                <span className='text-xs font-bold text-foreground truncate'>
                  {currentStep.shortTitle}
                </span>
                <Badge variant='outline' className='text-[10px] font-mono px-1 py-0 h-4'>
                  Form {currentStep.code}
                </Badge>
              </div>
              <p className='text-[10px] text-muted-foreground mt-0.5'>
                Langkah {currentStep.stepNumber} dari {totalSteps}
              </p>
            </div>

            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={currentStepIndex === totalSteps - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))}
              className='h-8 w-8 shrink-0'
              title='Lanjut ke Langkah Selanjutnya'
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* 3. STEP REVIEW CARD & WORKSPACE */}
      <div className='rounded-xl border bg-card shadow-xs overflow-hidden'>
        {/* Step Header with Auditor Action Bar */}
        <div className='p-4 sm:p-5 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-3'>
          <div className='space-y-0.5'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge variant='outline' className='font-mono text-xs font-bold px-2 py-0.5 border-primary/40 text-primary bg-primary/5'>
                LANGKAH {currentStep.stepNumber} DARI {totalSteps} • FORM {currentStep.code}
              </Badge>
              <h3 className='text-base sm:text-lg font-bold text-foreground'>
                {currentStep.title}
              </h3>
            </div>
            <p className='text-xs text-muted-foreground'>
              {currentStep.subtitle}
            </p>
          </div>

          {/* Auditor Decision Actions for This Step */}
          <div className='flex items-center gap-2 shrink-0 flex-wrap'>
            {isCurrentApproved && (
              <Badge className='bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                <CheckCircle2 className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
                Form Telah Disetujui
              </Badge>
            )}
            {isCurrentRejected && (
              <Badge className='bg-destructive/15 text-destructive border border-destructive/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                <XCircle className='h-3.5 w-3.5 text-destructive' />
                Perlu Revisi OPD
              </Badge>
            )}
            {!isCurrentApproved && !isCurrentRejected && (
              <Badge className='bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 text-xs py-1 px-2.5 gap-1.5 font-semibold'>
                <Clock className='h-3.5 w-3.5 text-amber-600 animate-pulse' />
                Menunggu Penilaian
              </Badge>
            )}

            <Button
              type='button'
              variant={isCurrentRejected ? 'secondary' : 'destructive'}
              size='sm'
              disabled={reviewMutation.isPending || isDraftSubmission}
              onClick={() => handleOpenReject(currentStep.id)}
              className='h-8 text-xs gap-1.5 font-medium'
            >
              <XCircle className='h-3.5 w-3.5' />
              <span>{isCurrentRejected ? 'Ubah Catatan Revisi' : 'Tolak / Minta Revisi'}</span>
            </Button>

            <Button
              type='button'
              size='sm'
              disabled={reviewMutation.isPending || isCurrentApproved || isDraftSubmission}
              onClick={() => handleApprove(currentStep.id)}
              className='h-8 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold'
            >
              {reviewMutation.isPending ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Check className='h-3.5 w-3.5' />
              )}
              <span>{isCurrentApproved ? 'Sudah Disetujui' : `Setujui Form ${currentStep.code}`}</span>
            </Button>
          </div>
        </div>

        {/* Draft Notice if OPD has not submitted */}
        {isDraftSubmission && (
          <div className='p-3 mx-4 sm:mx-5 mt-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-400 text-xs flex items-center gap-2.5'>
            <Clock className='h-4 w-4 shrink-0 text-amber-600' />
            <span>
              Perangkat daerah belum mengirimkan lembar kerja risiko secara resmi (Status: <strong>Draft</strong>). Anda dapat melihat pratinjau data, namun tombol persetujuan baru akan aktif setelah OPD melakukan pengajuan resmi.
            </span>
          </div>
        )}

        {/* Existing Auditor Revision Note Alert if Rejected */}
        {isCurrentRejected && currentItem?.catatan_revisi && (
          <div className='m-4 sm:m-5 mb-0 p-3.5 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1.5 shadow-2xs'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-2 font-bold'>
                <AlertCircle className='h-4 w-4 shrink-0' />
                <span>Instruksi Catatan Revisi Auditor untuk Form {currentStep.code}:</span>
              </div>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => handleOpenReject(currentStep.id)}
                className='h-6 px-2 text-[11px] text-destructive hover:bg-destructive/15'
              >
                Ubah Catatan
              </Button>
            </div>
            <p className='leading-relaxed pl-6 text-foreground font-medium'>
              "{currentItem.catatan_revisi}"
            </p>
          </div>
        )}

        {/* Approval Banner if Approved */}
        {isCurrentApproved && (
          <div className='m-4 sm:m-5 mb-0 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-2xs'>
            <div className='flex items-center gap-2 font-medium'>
              <CheckCircle2 className='h-4 w-4 text-emerald-600 shrink-0' />
              <span>
                Formulir {currentStep.code} telah diverifikasi dan disetujui resmi oleh Auditor Pengawas.
              </span>
            </div>
            <span className='text-[10px] font-mono text-muted-foreground'>
              {currentItem?.reviewed_at ? new Date(currentItem.reviewed_at).toLocaleString('id-ID') : 'Disetujui'}
            </span>
          </div>
        )}

        {/* 4. STEP SPECIFIC DATA DISPLAY (13 STEPS TO FRAUD) */}
        <div className='p-4 sm:p-5 space-y-5'>
          {/* STEP 1: FORM 2B (Konteks Strategis) */}
          {currentStep.id === '2b' && (
            <div className='space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Sumber Dokumen Data:</span>
                  <p className='font-bold text-xs text-foreground'>
                    {isLoading2B ? (
                      <span className='flex items-center gap-1.5 text-muted-foreground'>
                        <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                        Memuat...
                      </span>
                    ) : (
                      konteks2B?.sumber_data?.nama || '-'
                    )}
                  </p>
                </div>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1 sm:col-span-2'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Tujuan Penilaian Risiko:</span>
                  <p className='font-bold text-xs text-foreground'>
                    {isLoading2B ? (
                      <span className='flex items-center gap-1.5 text-muted-foreground'>
                        <Loader2 className='h-3.5 w-3.5 animate-spin text-primary' />
                        Memuat...
                      </span>
                    ) : konteks2B?.tujuan ? (
                      konteks2B.tujuan.tujuan
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              </div>

              {/* Sasaran & IKU Table */}
              <div className='space-y-2.5'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                  <Target className='h-3.5 w-3.5 text-primary' />
                  Sasaran Strategis & Indikator Kinerja Utama (IKU)
                </h4>

                {isLoading2B ? (
                  <div className='py-8 text-center text-xs text-muted-foreground'>
                    <Loader2 className='h-5 w-5 animate-spin mx-auto mb-2 text-primary' />
                    Memuat data Sasaran Form 2B...
                  </div>
                ) : (konteks2B?.sasarans?.length || 0) > 0 ? (
                  <div className='space-y-3'>
                    {konteks2B?.sasarans?.map((sasaran: any, sIdx: number) => {
                      const sasaranIndikators = (konteks2B?.indikators || []).filter(
                        (ind: any) =>
                          ind.sasaran_penilaian_id === sasaran.id ||
                          ind.sasaran_id === sasaran.id
                      )

                      return (
                        <div key={sasaran.id || sIdx} className='rounded-lg border bg-card p-3.5 space-y-3 shadow-2xs'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='space-y-0.5'>
                              <span className='text-[10px] font-mono font-bold text-primary'>
                                SASARAN #{sIdx + 1}
                              </span>
                              <p className='text-xs font-bold text-foreground'>
                                {sasaran.sasaran || sasaran.nama || '-'}
                              </p>
                            </div>
                          </div>

                          {/* Indikator Sub-table */}
                          <div className='space-y-1.5 pl-3 border-l-2 border-primary/30'>
                            <span className='text-[11px] font-semibold text-muted-foreground block'>
                              Indikator Kinerja Sasaran:
                            </span>
                            {sasaranIndikators.length > 0 ? (
                              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                                {sasaranIndikators.map((ind: any, iIdx: number) => (
                                  <div key={ind.id || iIdx} className='p-2.5 rounded-md bg-muted/20 border text-[11px] space-y-1 shadow-2xs'>
                                    <div className='flex items-center gap-1.5'>
                                      {ind.jenis === 'IKU' ? (
                                        <Badge className='text-[9px] px-1.5 py-0 bg-emerald-600 hover:bg-emerald-600 text-white font-semibold shrink-0'>
                                          IKU
                                        </Badge>
                                      ) : ind.jenis ? (
                                        <Badge variant='secondary' className='text-[9px] px-1 py-0 shrink-0'>
                                          {ind.jenis}
                                        </Badge>
                                      ) : null}
                                      <p className='font-medium text-foreground'>
                                        {ind.indikator || ind.nama || `Indikator #${iIdx + 1}`}
                                      </p>
                                    </div>
                                    <div className='flex items-center justify-between text-muted-foreground font-mono text-[10px] pt-1 border-t'>
                                      <span>Target: <strong className='text-foreground'>{ind.target || '-'} {ind.satuan || ''}</strong></span>
                                      {ind.jenis ? (
                                        <span>Jenis: <strong className='text-foreground'>{ind.jenis}</strong></span>
                                      ) : ind.polaritas ? (
                                        <span>Polaritas: <strong className='text-foreground'>{ind.polaritas}</strong></span>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className='text-[11px] text-muted-foreground italic'>
                                Belum ada indikator yang terhubung dengan sasaran ini.
                              </p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className='p-6 rounded-xl border border-dashed text-center text-xs text-muted-foreground'>
                    OPD belum mengisi sasaran dan indikator Form 2B.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 2: FORM 2C (Konteks Operasional) */}
          {currentStep.id === '2c' && (
            <div className='space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Total Program Utama:</span>
                  <p className='font-bold text-sm text-foreground font-mono'>
                    {konteks2C?.programs?.length || 0} Program
                  </p>
                </div>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Total Kegiatan & Sub:</span>
                  <p className='font-bold text-sm text-foreground font-mono'>
                    {konteks2C?.programs?.reduce(
                      (acc: number, p: any) =>
                        acc +
                        (p.children?.length || 0) +
                        (p.children?.reduce(
                          (subAcc: number, c: any) => subAcc + (c.children?.length || 0),
                          0
                        ) || 0),
                      0
                    ) || 0}{' '}
                    Unit Kinerja
                  </p>
                </div>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Status Pengisian OPD:</span>
                  <Badge variant='outline' className='font-mono text-xs uppercase'>
                    {konteks2C?.status || 'Final'}
                  </Badge>
                </div>
              </div>

              {/* Hierarchy Tree Inspection */}
              <div className='space-y-2.5'>
                <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                  <FolderTree className='h-3.5 w-3.5 text-primary' />
                  Struktur Pohon Kinerja Operasional (Program, Kegiatan, Sub-Kegiatan)
                </h4>

                {isLoading2C ? (
                  <div className='py-8 text-center text-xs text-muted-foreground'>
                    <Loader2 className='h-5 w-5 animate-spin mx-auto mb-2 text-primary' />
                    Memuat pohon kinerja Form 2C...
                  </div>
                ) : (konteks2C?.programs?.length || 0) > 0 ? (
                  <div className='space-y-3.5'>
                    {konteks2C?.programs?.map((program: any) => {
                      const pIndikators = program.indikators || []
                      return (
                        <div key={program.id} className='rounded-lg border bg-card p-3.5 space-y-3 shadow-2xs'>
                          <div className='flex items-start justify-between gap-3'>
                            <div className='space-y-1 w-full'>
                              <div className='flex items-center gap-2'>
                                <Badge className='font-mono text-xs bg-primary text-primary-foreground font-semibold'>
                                  NO: {program.kode}
                                </Badge>
                                <span className='text-xs font-bold text-foreground'>
                                  PROGRAM: {program.nama}
                                </span>
                              </div>
                              {pIndikators.length > 0 ? (
                                <div className='space-y-0.5 pl-1'>
                                  {pIndikators.map((ind: any, indIdx: number) => (
                                    <p key={ind.id || indIdx} className='text-[11px] text-muted-foreground font-mono'>
                                      Indikator: <span className='text-foreground font-medium'>{ind.indikator}</span> • Target: <span className='text-foreground font-semibold'>{ind.target} {ind.satuan || ''}</span>
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className='text-[11px] text-muted-foreground font-mono pl-1'>
                                  Indikator: {program.indikator || '-'} • Target: {program.target || '-'} {program.satuan || ''}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Kegiatan Children */}
                          {(program.children?.length || 0) > 0 && (
                            <div className='pl-4 space-y-2.5 border-l-2 border-primary/20'>
                              {program.children?.map((kegiatan: any) => {
                                const kIndikators = kegiatan.indikators || []
                                return (
                                  <div key={kegiatan.id} className='p-2.5 rounded-md bg-muted/20 border space-y-2'>
                                    <div className='flex items-center justify-between gap-2'>
                                      <div className='flex items-center gap-2'>
                                        <Badge variant='outline' className='font-mono text-[11px] bg-background font-semibold'>
                                          {kegiatan.kode}
                                        </Badge>
                                        <span className='text-xs font-semibold text-foreground'>
                                          KEGIATAN: {kegiatan.nama}
                                        </span>
                                      </div>
                                    </div>
                                    {kIndikators.length > 0 && (
                                      <div className='space-y-0.5 pl-2 border-l border-muted-foreground/30'>
                                        {kIndikators.map((ind: any, indIdx: number) => (
                                          <p key={ind.id || indIdx} className='text-[10px] text-muted-foreground font-mono'>
                                            Indikator: <span className='text-foreground font-medium'>{ind.indikator}</span> • Target: <span className='text-foreground font-semibold'>{ind.target} {ind.satuan || ''}</span>
                                          </p>
                                        ))}
                                      </div>
                                    )}

                                    {/* Sub-kegiatans */}
                                    {(kegiatan.children?.length || 0) > 0 && (
                                      <div className='pl-3 space-y-1.5 border-l border-border'>
                                        {kegiatan.children?.map((sub: any) => {
                                          const subInd = sub.indikators?.[0]
                                          return (
                                            <div key={sub.id} className='p-2 rounded-md bg-background border text-[11px] flex items-center justify-between gap-2 shadow-2xs'>
                                              <div className='flex items-center gap-1.5'>
                                                <span className='font-mono font-bold text-primary'>{sub.kode}</span>
                                                <span>{sub.nama}</span>
                                              </div>
                                              <span className='text-muted-foreground font-mono text-[10px]'>
                                                {subInd ? `Target: ${subInd.target} ${subInd.satuan || ''}` : (sub.target ? `Target: ${sub.target} ${sub.satuan || ''}` : '')}
                                              </span>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className='p-6 rounded-xl border border-dashed text-center text-xs text-muted-foreground'>
                    OPD belum menambahkan rincian pohon kinerja Form 2C.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: FORM 3B (Identifikasi Risiko Strategis) */}
          {currentStep.id === '3b' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <ShieldAlert className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Lembar Pemeriksaan Identifikasi Risiko Sasaran Strategis Renstra OPD (SPIP / BPKP).
                </span>
              </div>

              <div className='rounded-lg border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-2.5 text-start font-semibold'>No</th>
                      <th className='p-2.5 text-start font-semibold'>Sasaran Strategis</th>
                      <th className='p-2.5 text-start font-semibold'>Pernyataan Risiko</th>
                      <th className='p-2.5 text-start font-semibold'>Kategori</th>
                      <th className='p-2.5 text-start font-semibold'>Penyebab Utama</th>
                      <th className='p-2.5 text-start font-semibold'>Dampak Terhadap Sasaran</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-mono text-muted-foreground'>1</td>
                      <td className='p-2.5 font-medium text-foreground'>Peningkatan Kualitas Infrastruktur Permukiman</td>
                      <td className='p-2.5 font-semibold text-destructive'>Keterlambatan penyelesaian proyek fisik akibat cuaca ekstrem & sengketa lahan</td>
                      <td className='p-2.5'><Badge variant='outline' className='text-[10px]'>Strategis / Fisik</Badge></td>
                      <td className='p-2.5 text-muted-foreground'>Perencanaan awal belum matang & koordinasi antar stakeholder lambat</td>
                      <td className='p-2.5 text-muted-foreground'>Capaian IKU persentase permukiman layak huni tidak mencapai target Renstra</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-mono text-muted-foreground'>2</td>
                      <td className='p-2.5 font-medium text-foreground'>Peningkatan Akuntabilitas Pengelolaan Anggaran</td>
                      <td className='p-2.5 font-semibold text-destructive'>Deviasi realisasi penyerapan anggaran dengan output kinerja riil di lapangan</td>
                      <td className='p-2.5'><Badge variant='outline' className='text-[10px]'>Keuangan</Badge></td>
                      <td className='p-2.5 text-muted-foreground'>Kapasitas PPK dan pengawas lapangan dalam pengujian mutu belum seragam</td>
                      <td className='p-2.5 text-muted-foreground'>Potensi temuan audit BPK dan penurunan opini akuntabilitas keuangan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: FORM 3C (Identifikasi Risiko Operasional) */}
          {currentStep.id === '3c' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <FolderTree className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Lembar Pemeriksaan Identifikasi Risiko Operasional Kegiatan & Pelayanan Publik OPD.
                </span>
              </div>

              <div className='rounded-lg border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-2.5 text-start font-semibold'>Kode Kegiatan</th>
                      <th className='p-2.5 text-start font-semibold'>Tahapan Proses</th>
                      <th className='p-2.5 text-start font-semibold'>Risiko Operasional</th>
                      <th className='p-2.5 text-start font-semibold'>Pengendalian Eksisting</th>
                      <th className='p-2.5 text-start font-semibold'>Status Efektivitas</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-mono text-primary font-bold'>A.1.1</td>
                      <td className='p-2.5 font-medium'>Verifikasi Dokumen Kelayakan Teknis</td>
                      <td className='p-2.5 font-semibold text-destructive'>Keterlambatan verifikasi berkas permohonan masyarakat melebihi SLA standar</td>
                      <td className='p-2.5 text-muted-foreground'>Checklist dokumen manual dan buku ekspedisi fisik</td>
                      <td className='p-2.5'><Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>Kurang Memadai</Badge></td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-mono text-primary font-bold'>A.2.1</td>
                      <td className='p-2.5 font-medium'>Pelaksanaan Pengawasan Konstruksi</td>
                      <td className='p-2.5 font-semibold text-destructive'>Ketidaksesuaian spesifikasi material pekerjaan dengan RAB kontrak</td>
                      <td className='p-2.5 text-muted-foreground'>Uji petik konsultan pengawas dan laporan mingguan</td>
                      <td className='p-2.5'><Badge className='bg-emerald-500/15 text-emerald-700 text-[10px]'>Cukup Memadai</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 5: FORM 4 (Analisis Risiko) */}
          {currentStep.id === '4' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <BarChart3 className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Matriks Skoring & Analisis Risiko (Kemungkinan 1-5 x Dampak 1-5).
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                <div className='p-3.5 rounded-lg border bg-destructive/10 border-destructive/30 space-y-1 shadow-2xs'>
                  <span className='text-[11px] text-destructive font-semibold block'>Risiko Tingkat Tinggi (16-25):</span>
                  <p className='text-2xl font-bold font-mono text-destructive'>2 Risiko</p>
                  <p className='text-[10px] text-muted-foreground'>Wajib dilakukan mitigasi segera</p>
                </div>
                <div className='p-3.5 rounded-lg border bg-amber-500/10 border-amber-500/30 space-y-1 shadow-2xs'>
                  <span className='text-[11px] text-amber-700 dark:text-amber-400 font-semibold block'>Risiko Tingkat Sedang (10-15):</span>
                  <p className='text-2xl font-bold font-mono text-amber-700 dark:text-amber-400'>4 Risiko</p>
                  <p className='text-[10px] text-muted-foreground'>Perlu monitoring berkala</p>
                </div>
                <div className='p-3.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 space-y-1 shadow-2xs'>
                  <span className='text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block'>Risiko Rendah (1-9):</span>
                  <p className='text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400'>5 Risiko</p>
                  <p className='text-[10px] text-muted-foreground'>Dapat diterima dengan pengendalian eksisting</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: FORM 5 (Evaluasi Risiko) */}
          {currentStep.id === '5' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <PieChart className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Penetapan Prioritas Risiko & Selera Risiko (Risk Appetite) Pemerintah Daerah.
                </span>
              </div>

              <div className='rounded-lg border p-3.5 bg-muted/20 space-y-2'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <span className='font-bold text-foreground'>Batas Selera Risiko Pemda:</span>
                  <Badge className='bg-primary text-primary-foreground font-mono'>Nilai Maksimum: 12 (Sedang)</Badge>
                </div>
                <p className='text-muted-foreground leading-relaxed'>
                  Semua risiko dengan skor akhir &gt; 12 berada di atas selera risiko dan diwajibkan menyusun Rencana Tindak Pengendalian (RTP Form 6) dengan alokasi penanggung jawab definitif.
                </p>
              </div>
            </div>
          )}

          {/* STEP 7: FORM 6 (Rencana Tindak Pengendalian / RTP) */}
          {currentStep.id === '6' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <Layers className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Pemeriksaan Rencana Tindak Pengendalian Tambahan (RTP) untuk Menurunkan Level Risiko.
                </span>
              </div>

              <div className='rounded-lg border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-2.5 text-start font-semibold'>Uraian Tindak Pengendalian</th>
                      <th className='p-2.5 text-start font-semibold'>Target Output</th>
                      <th className='p-2.5 text-start font-semibold'>Penanggung Jawab (PIC)</th>
                      <th className='p-2.5 text-start font-semibold'>Jadwal Realisasi</th>
                      <th className='p-2.5 text-start font-semibold'>Anggaran</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-semibold text-foreground'>Digitalisasi Layanan Verifikasi Dokumen Terpadu (Aplikasi Web)</td>
                      <td className='p-2.5'>Sistem Informasi Terintegrasi 100%</td>
                      <td className='p-2.5 font-medium'>Kepala Bidang Permukiman</td>
                      <td className='p-2.5 font-mono text-muted-foreground'>Triwulan II 2026</td>
                      <td className='p-2.5 font-mono font-bold text-emerald-600'>Rp 75.000.000</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-semibold text-foreground'>Pelatihan Sertifikasi Pengawasan Konstruksi bagi PPK & PPTK</td>
                      <td className='p-2.5'>15 Pegawai Tersertifikasi</td>
                      <td className='p-2.5 font-medium'>Sekretaris Dinas</td>
                      <td className='p-2.5 font-mono text-muted-foreground'>Triwulan III 2026</td>
                      <td className='p-2.5 font-mono font-bold text-emerald-600'>Rp 50.000.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 8: FORM 7 (Pemantauan Pelaksanaan RTP) */}
          {currentStep.id === '7' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <Activity className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Monitoring Progres Realisasi Pelaksanaan Rencana Tindak Pengendalian (RTP).
                </span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1 shadow-2xs'>
                  <span className='font-bold text-foreground block'>RTP Tuntas Tepat Waktu:</span>
                  <p className='text-3xl font-bold font-mono text-emerald-600'>85%</p>
                  <p className='text-muted-foreground text-[11px]'>Sebagian besar program mitigasi telah diimplementasikan.</p>
                </div>
                <div className='p-3.5 rounded-lg border bg-muted/20 space-y-1 shadow-2xs'>
                  <span className='font-bold text-foreground block'>Kendala Lapangan:</span>
                  <p className='text-xs text-muted-foreground leading-relaxed'>
                    Perubahan regulasi pusat memerlukan penyesuaian petunjuk teknis pelaksanaan pada pertengahan triwulan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 9: FORM 8 (Kejadian Risiko) */}
          {currentStep.id === '8' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <AlertTriangle className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Buku Catatan Kejadian Risiko Nyata (Risk Event Register) & Tanggap Darurat.
                </span>
              </div>
              <div className='p-3.5 rounded-lg border bg-muted/20 text-muted-foreground leading-relaxed'>
                Tidak tercatat kejadian risiko mayor yang menyebabkan kerugian material atau kegagalan pelayanan publik selama periode penilaian berjalan.
              </div>
            </div>
          )}

          {/* STEP 10: FORM 9 (Pemantauan Risiko Berkala) */}
          {currentStep.id === '9' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <TrendingUp className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Evaluasi Level Risiko Residual & Tren Dinamika Risiko Periode Berkala.
                </span>
              </div>
              <div className='p-3.5 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-medium'>
                Tren risiko residual menunjukkan penurunan sebesar 35% setelah penerapan RTP Form 6.
              </div>
            </div>
          )}

          {/* STEP 11: FORM 10 (Laporan Pengelolaan Risiko) */}
          {currentStep.id === '10' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <FileCheck className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Kompilasi Laporan Resmi Manajemen Risiko & Pernyataan Efektivitas SPIP.
                </span>
              </div>
              <div className='p-3.5 rounded-lg border bg-muted/20 space-y-2 text-muted-foreground leading-relaxed'>
                <p className='font-bold text-foreground'>Pernyataan Efektivitas Pengendalian Intern:</p>
                <p>
                  Sistem Pengendalian Intern Pemerintah (SPIP) pada perangkat daerah telah berjalan memadai dan mendukung pencapaian sasaran strategis daerah secara tertib dan transparan.
                </p>
              </div>
            </div>
          )}

          {/* STEP 12: FORM RCA (Root Cause Analysis) */}
          {currentStep.id === 'rca' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2.5 font-medium'>
                <BrainCircuit className='h-4 w-4 text-primary shrink-0' />
                <span>
                  Analisis Akar Masalah (Diagram Tulang Ikan / Fishbone BPKP & 5-Whys).
                </span>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs'>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>1. Man (SDM):</span>
                  <span className='text-muted-foreground text-[11px]'>Kompetensi teknis pegawai perlu sertifikasi berkala</span>
                </div>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>2. Method (SOP):</span>
                  <span className='text-muted-foreground text-[11px]'>SOP pelayanan belum seluruhnya terintegrasi digital</span>
                </div>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>3. Machine (TI):</span>
                  <span className='text-muted-foreground text-[11px]'>Infrastruktur jaringan server dan backup perlu penguatan</span>
                </div>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>4. Material (Data):</span>
                  <span className='text-muted-foreground text-[11px]'>Basis data spasial perumahan masih tersebar parsial</span>
                </div>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>5. Money (Dana):</span>
                  <span className='text-muted-foreground text-[11px]'>Alokasi pemeliharaan berkala mencukupi standar SPM</span>
                </div>
                <div className='p-3 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>6. Milieu (Eksternal):</span>
                  <span className='text-muted-foreground text-[11px]'>Kondisi geologis daerah rawan bencana alam</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 13: FORM FRAUD (Penilaian Risiko Kecurangan) */}
          {currentStep.id === 'fraud' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive text-xs flex items-center gap-2.5 font-medium'>
                <ShieldAlert className='h-4 w-4 shrink-0' />
                <span>
                  Fraud Risk Assessment (FRA) - Matriks Titik Rawan Kecurangan & Pencegahan Korupsi (BPKP / KPK).
                </span>
              </div>

              <div className='rounded-lg border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-2.5 text-start font-semibold'>Area Rawan Fraud</th>
                      <th className='p-2.5 text-start font-semibold'>Bentuk Potensi Kecurangan</th>
                      <th className='p-2.5 text-start font-semibold'>Level Risiko</th>
                      <th className='p-2.5 text-start font-semibold'>Sistem Pencegahan Anti-Korupsi</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-semibold text-foreground'>Pengadaan Barang & Jasa (PBJ)</td>
                      <td className='p-2.5 text-muted-foreground'>Pengondisian pemenang lelang atau pemecahan paket pekerjaan</td>
                      <td className='p-2.5'><Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge></td>
                      <td className='p-2.5 font-medium text-foreground'>E-Katalog lokal, probity audit inspektorat, pakta integritas vendor</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-semibold text-foreground'>Pelayanan Perizinan & Sertifikasi</td>
                      <td className='p-2.5 text-muted-foreground'>Permintaan imbalan / gratifikasi untuk percepatan penerbitan izin</td>
                      <td className='p-2.5'><Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>Sedang</Badge></td>
                      <td className='p-2.5 font-medium text-foreground'>Pembayaran cashless (QRIS/Bank Jabar), CCTV ruang layanan, WBS online</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-2.5 font-semibold text-foreground'>Pengelolaan Kas & Belanja Hibah</td>
                      <td className='p-2.5 text-muted-foreground'>Keterlambatan penyusunan SPJ atau laporan pertanggungjawaban fiktif</td>
                      <td className='p-2.5'><Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge></td>
                      <td className='p-2.5 font-medium text-foreground'>Verifikasi berlapis bendahara, CMS perbankan non-tunai, audit ketaatan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 5. FOOTER STEPPER NAVIGATION BAR */}
        <div className='p-3.5 sm:p-4 border-t bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
            className='h-8 text-xs gap-1.5 font-medium'
          >
            <ChevronLeft className='h-4 w-4' />
            <span>Langkah Sebelumnya</span>
          </Button>

          <div className='flex items-center justify-center gap-2 text-xs font-medium text-muted-foreground'>
            <span>
              Langkah {currentStepIndex + 1} dari {totalSteps}:
            </span>
            <strong className='text-foreground font-semibold'>
              {currentStep.code} ({currentStep.shortTitle})
            </strong>
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={currentStepIndex === totalSteps - 1}
              onClick={() => setCurrentStepIndex((prev) => Math.min(prev + 1, totalSteps - 1))}
              className='h-8 text-xs gap-1.5 font-medium'
            >
              <span>Langkah Selanjutnya</span>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* 6. REJECTION NOTES MODAL DIALOG */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <div className='flex items-center gap-2 mb-1'>
              <Badge variant='outline' className='font-mono text-xs border-destructive/40 text-destructive bg-destructive/10'>
                FORM {targetFormCode.toUpperCase()}
              </Badge>
              <DialogTitle className='flex items-center gap-2 text-destructive text-base'>
                <AlertCircle className='h-5 w-5' />
                Tolak & Minta Perbaikan Formulir
              </DialogTitle>
            </div>
            <DialogDescription className='text-xs'>
              Tuliskan instruksi catatan perbaikan secara spesifik agar perangkat daerah (OPD) dapat memperbaiki formulir ini. Catatan akan tampil langsung di lembar kerja OPD.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3.5 py-2'>
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label htmlFor='catatan-revisi' className='text-xs font-semibold'>
                  Catatan Revisi Auditor <span className='text-destructive'>*</span>
                </Label>
                <span className='text-[10px] font-mono text-muted-foreground'>
                  {rejectionNote.length} karakter (min. 5)
                </span>
              </div>
              <Textarea
                id='catatan-revisi'
                placeholder='Tuliskan instruksi perbaikan yang spesifik di sini...'
                rows={4}
                className='text-xs leading-relaxed resize-none'
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs'
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Batal
            </Button>
            <Button
              type='button'
              variant='destructive'
              size='sm'
              className='text-xs gap-1.5 font-semibold'
              disabled={reviewMutation.isPending || rejectionNote.trim().length < 5}
              onClick={handleConfirmReject}
            >
              {reviewMutation.isPending ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Send className='h-3.5 w-3.5' />
              )}
              <span>Kirim Catatan Revisi</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
