import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  Send,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  type ResolvedWizardStep,
  type RisikoWizardStepId,
} from './risiko-wizard-store'
import {
  pengajuanRisikoService,
  type ReadinessResponse,
} from '@/services/pengajuan-risiko-service'

interface RisikoWizardHeaderProps {
  pageTitle?: string
  formCode?: string
  stepNumber?: number
  currentStepId: RisikoWizardStepId | string
  steps: ResolvedWizardStep[]
  completedCount: number
  totalSteps: number
  progressPercentage: number
  actions?: React.ReactNode
  readiness?: ReadinessResponse
  effectiveOpdId?: string
  activePeriodeId?: string
  onSubmissionSuccess?: () => void
  isSubmitDialogOpen?: boolean
  setIsSubmitDialogOpen?: (open: boolean) => void
}

export function RisikoWorkflowBanners({
  readiness,
}: {
  readiness?: ReadinessResponse
}) {
  if (!readiness) return null

  const hasAuditorWarning = !readiness.has_auditor
  const isInReview = readiness.status === 'submitted' || readiness.status === 'in_review'
  const isRevision = readiness.status === 'revision_requested'
  const isApproved = readiness.status === 'approved'

  if (!hasAuditorWarning && !isInReview && !isRevision && !isApproved) {
    return null
  }

  return (
    <div className='space-y-3 mb-2'>
      {hasAuditorWarning && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-start'>
          <ShieldAlert className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Belum Ada Auditor Pengawas yang Ditugaskan
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Perangkat Daerah (OPD) Anda belum memiliki Auditor Pengawas yang ditetapkan oleh Inspektorat. Pengisian lembar kerja berstatus <strong>read-only</strong> hingga Inspektorat menetapkan penugasan auditor binaan.
            </p>
          </div>
        </div>
      )}

      {isInReview && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-start'>
          <Clock className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Formulir Sedang Dalam Pemeriksaan Auditor
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Seluruh formulir telah diajukan kepada Auditor Pengawas (<strong>{readiness.assigned_auditor?.name || 'Inspektorat'}</strong>). Formulir saat ini berstatus terkunci untuk proses pemeriksaan (read-only).
            </p>
          </div>
        </div>
      )}

      {isRevision && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-start'>
          <AlertCircle className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-1.5 text-xs flex-1'>
            <p className='font-bold text-foreground'>
              Auditor Meminta Perbaikan (Revisi) Lembar Kerja
            </p>
            <div className='space-y-1.5'>
              {readiness.submission?.items
                ?.filter((i) => i.status === 'rejected')
                .map((item) => (
                  <div
                    key={item.id}
                    className='p-2 rounded-md bg-background/80 border text-[11px] text-foreground space-y-0.5'
                  >
                    <span className='font-bold uppercase text-destructive mr-2'>
                      Form {item.form_code}:
                    </span>
                    <span className='text-muted-foreground'>{item.catatan_revisi || 'Perlu perbaikan.'}</span>
                  </div>
                ))}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Silakan perbaiki form yang ditandai di atas, kemudian klik <strong>Kirim ke Auditor</strong> setelah seluruh perbaikan selesai.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-start'>
          <CheckCircle2 className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Lembar Kerja Resmi Disetujui Auditor Pengawas
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Seluruh lembar kerja pengelolaan risiko periode ini telah disetujui secara resmi oleh Auditor Pengawas (<strong>{readiness.assigned_auditor?.name || 'Inspektorat'}</strong>). Data terkunci permanen.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function getCleanStepTitle(title: string) {
  return title.replace(/\s*\([^)]*\)$/, '').trim()
}

export function RisikoWizardHeader({
  pageTitle,
  formCode,
  stepNumber,
  currentStepId,
  steps,
  completedCount,
  totalSteps,
  progressPercentage,
  actions,
  readiness,
  effectiveOpdId,
  activePeriodeId,
  onSubmissionSuccess,
  isSubmitDialogOpen: controlledSubmitDialogOpen,
  setIsSubmitDialogOpen: controlledSetIsSubmitDialogOpen,
}: RisikoWizardHeaderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [internalSubmitDialogOpen, setInternalSubmitDialogOpen] = useState(false)

  const isSubmitOpen =
    controlledSubmitDialogOpen !== undefined
      ? controlledSubmitDialogOpen
      : internalSubmitDialogOpen
  const setSubmitOpen =
    controlledSetIsSubmitDialogOpen || setInternalSubmitDialogOpen

  const submitMutation = useMutation({
    mutationFn: () =>
      pengajuanRisikoService.submitForReview({
        opd_id: effectiveOpdId!,
        periode_penilaian_id: activePeriodeId,
      }),
    onMutate: async () => {
      // Optimistic update: hide Kirim ke Auditor button & show top banner immediately
      queryClient.setQueriesData(
        { queryKey: ['risiko-pengajuan-readiness'] },
        (old: any) => {
          if (!old) return old
          return {
            ...old,
            is_ready_to_submit: false,
            is_locked: true,
            status: 'submitted',
          }
        }
      )
    },
    onSuccess: async (res) => {
      toast.success(res.message || 'Lembar kerja risiko berhasil dikirimkan ke auditor.')
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
        // Fallback: retain optimistic status
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['pengawasan'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
      ])
      onSubmissionSuccess?.()
    },
    onError: (err: any) => {
      queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] })
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.forms?.[0] ||
        err.response?.data?.errors?.auditor?.[0] ||
        'Gagal mengajukan lembar kerja ke auditor.'
      toast.error(msg)
    },
  })

  const currentIndex = steps.findIndex((s) => s.id === currentStepId)
  const activeStep = steps[currentIndex] || steps[0]
  const prevStep = currentIndex > 0 ? steps[currentIndex - 1] : null
  const nextStep = currentIndex < steps.length - 1 ? steps[currentIndex + 1] : null
  const cleanActiveTitle = getCleanStepTitle(activeStep.title)

  function handleStepClick(step: ResolvedWizardStep) {
    if (step.id === currentStepId) return
    if (!step.isImplemented) {
      toast.info(
        `Langkah ${step.stepNumber} (${getCleanStepTitle(step.title)}) saat ini masih dalam tahap pengembangan (Coming Soon).`
      )
      return
    }
    if (!step.isUnlocked) {
      toast.warning(
        `Langkah ${step.stepNumber} (${getCleanStepTitle(step.title)}) masih terkunci. Silakan lengkapi dan simpan langkah sebelumnya terlebih dahulu.`
      )
      return
    }
    navigate({ to: step.url })
  }

  const showSubmitButton = Boolean(
    readiness?.is_ready_to_submit &&
      !readiness?.is_locked &&
      readiness?.status !== 'submitted' &&
      readiness?.status !== 'in_review' &&
      readiness?.status !== 'approved' &&
      !submitMutation.isPending
  )

  return (
    <>
      <PageHeader className='space-y-2 pb-2.5 pt-3'>
        {/* Top summary row: Main page title, step badge, status pill, progress indicator & Actions */}
        <div className='flex items-center justify-between gap-2.5 pb-2 border-b border-border/60 flex-wrap sm:flex-nowrap'>
          <div className='flex items-center gap-2 sm:gap-2.5 min-w-0'>
            <h2 className='text-base sm:text-lg font-bold tracking-tight text-foreground truncate'>
              {pageTitle || cleanActiveTitle}
            </h2>
            <Badge
              variant='outline'
              className='font-mono text-xs border-primary/30 text-primary bg-primary/5 shrink-0'
            >
              Form {formCode || activeStep.code} • Langkah {stepNumber || activeStep.stepNumber}
            </Badge>
          </div>

          <div className='flex items-center gap-2 sm:gap-2.5 ml-auto flex-wrap sm:flex-nowrap shrink-0'>
            {/* Compact status pill if in review / approved / revision */}
            {readiness?.status === 'approved' && (
              <Badge className='text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <CheckCircle2 className='h-3 w-3 text-emerald-600' />
                Disetujui
              </Badge>
            )}
            {readiness?.status === 'revision_requested' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Perlu Revisi
              </Badge>
            )}
            {(readiness?.status === 'submitted' || readiness?.status === 'in_review') && (
              <Badge className='text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-amber-600 animate-pulse' />
                Dalam Review
              </Badge>
            )}

            {/* Micro Progress Bar & Percentage */}
            <div className='flex items-center gap-2 text-xs pl-1.5 border-l border-border/60'>
              <span className='text-xs font-medium text-muted-foreground hidden lg:inline'>
                Progres ({completedCount}/{totalSteps}):
              </span>
              <div className='w-16 sm:w-20 h-1.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-border/60'>
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
                  'font-mono text-xs font-extrabold',
                  progressPercentage === 100
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-primary'
                )}
              >
                {progressPercentage}%
              </span>
            </div>

            {/* Submit to Auditor Button */}
            {showSubmitButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold'
                onClick={() => setSubmitOpen(true)}
              >
                <Send className='h-3 w-3' />
                <span>Kirim ke Auditor</span>
              </Button>
            )}

            {actions}
          </div>
        </div>

        {/* DESKTOP & TABLET: COMPACT 13-STEP TIMELINE TRACK */}
        <TooltipProvider delayDuration={150}>
          <nav aria-label='Progress' className='hidden sm:block pt-1.5 pb-0.5 border-t border-border/60'>
            <ol className='flex items-start w-full justify-between'>
              {steps.map((step, index) => {
                const isCurrent = step.id === currentStepId
                const isCompleted = step.isCompleted
                const isLocked = !step.isUnlocked
                const isLast = index === steps.length - 1
                const cleanTitle = getCleanStepTitle(step.title)

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
                          onClick={() => handleStepClick(step)}
                          disabled={isLocked}
                          className={cn(
                            'group flex flex-col items-center shrink-0 w-8 sm:w-8.5 outline-hidden transition-all select-none',
                            isLocked
                              ? 'cursor-not-allowed'
                              : isCurrent
                              ? 'cursor-default'
                              : 'cursor-pointer hover:opacity-90'
                          )}
                          aria-label={`Langkah ${step.stepNumber}: ${cleanTitle} (Form ${step.code})`}
                        >
                          {/* Compact Circle Node (30-32px) */}
                          <span
                            className={cn(
                              'flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-2xs',
                              isCurrent
                                ? isCompleted
                                  ? 'bg-emerald-600 text-white ring-3 ring-primary/40 ring-offset-1 ring-offset-background scale-105 shadow-sm'
                                  : 'bg-primary text-primary-foreground ring-3 ring-primary/40 ring-offset-1 ring-offset-background scale-105 shadow-sm'
                                : isCompleted
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-600/30 group-hover:scale-105'
                                : isLocked
                                ? 'bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                                : 'bg-background text-foreground border border-border group-hover:border-primary group-hover:scale-105'
                            )}
                          >
                            {isCompleted ? (
                              <Check className='h-3.5 w-3.5 stroke-[2.8]' />
                            ) : isLocked ? (
                              <Lock className='h-3.5 w-3.5 stroke-[2.2] text-slate-500 dark:text-slate-400' />
                            ) : (
                              <span className='text-[11px] font-bold font-mono'>{step.stepNumber}</span>
                            )}
                          </span>

                          {/* High-Contrast Clear Form Code underneath */}
                          <span
                            className={cn(
                              'text-[10px] sm:text-[11px] font-mono mt-1 text-center transition-colors truncate max-w-full leading-none select-none',
                              isCurrent
                                ? 'font-extrabold text-primary'
                                : isCompleted
                                ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                : isLocked
                                ? 'font-bold text-slate-600 dark:text-slate-400'
                                : 'font-semibold text-foreground group-hover:text-primary'
                            )}
                          >
                            {step.code}
                          </span>

                          {/* Active Indicator Dot */}
                          {isCurrent && (
                            <span className='h-1 w-1 rounded-full bg-primary mt-0.5 shadow-2xs' />
                          )}
                        </button>
                      </TooltipTrigger>

                      <TooltipContent side='bottom' className='text-xs space-y-1 p-2 max-w-xs shadow-md'>
                        <div className='font-bold flex items-center justify-between gap-2 border-b border-border/50 pb-1'>
                          <span>Langkah {step.stepNumber}: {cleanTitle}</span>
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
                                : isCompleted
                                ? 'bg-emerald-500'
                                : isLocked
                                ? 'bg-muted-foreground'
                                : 'bg-amber-500'
                            )}
                          />
                          <span
                            className={cn(
                              isCurrent
                                ? 'text-primary font-bold'
                                : isCompleted
                                ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                                : 'text-muted-foreground'
                            )}
                          >
                            {isCurrent
                              ? 'Sedang aktif dikerjakan'
                              : isCompleted
                              ? 'Sudah selesai & tersimpan'
                              : !step.isImplemented
                              ? 'Tahap pengembangan (Coming Soon)'
                              : isLocked
                              ? 'Terkunci (Selesaikan langkah sebelumnya)'
                              : 'Siap diisi'}
                          </span>
                        </div>
                      </TooltipContent>
                    </Tooltip>

                    {/* Flexible Connector Line between steps */}
                    {!isLast && (
                      <div
                        aria-hidden='true'
                        className='flex-1 h-[2.5px] mx-1 mt-[13px] sm:mt-[14px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'
                      >
                        <div
                          className={cn(
                            'h-full transition-all duration-300',
                            isCompleted
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
        <div className='sm:hidden pt-1.5 space-y-2 border-t border-border/60'>
          {/* Segmented Micro Progress Bar (13 segments) */}
          <div className='flex items-center gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'>
            {steps.map((step) => {
              const isCurrent = step.id === currentStepId
              const isCompleted = step.isCompleted
              const isLocked = !step.isUnlocked
              const cleanTitle = getCleanStepTitle(step.title)

              return (
                <button
                  key={step.id}
                  type='button'
                  onClick={() => handleStepClick(step)}
                  disabled={isLocked}
                  title={`Langkah ${step.stepNumber}: ${cleanTitle} (Form ${step.code})`}
                  className={cn(
                    'flex-1 h-full transition-all rounded-full',
                    isCurrent
                      ? 'bg-primary ring-2 ring-primary/40'
                      : isCompleted
                      ? 'bg-emerald-500'
                      : isLocked
                      ? 'bg-slate-300 dark:bg-slate-600'
                      : 'bg-slate-400 dark:bg-slate-500'
                  )}
                />
              )
            })}
          </div>

          {/* Active Step Details & Quick Mobile Navigator */}
          <div className='flex items-center justify-between gap-2 rounded-lg border bg-muted/30 px-2.5 py-1.5'>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={!prevStep || !prevStep.isUnlocked}
              onClick={() => prevStep && handleStepClick(prevStep)}
              className='h-7 w-7 shrink-0'
              title={prevStep ? `Kembali ke Langkah ${prevStep.stepNumber}` : undefined}
            >
              <ChevronLeft className='h-3.5 w-3.5' />
            </Button>

            <div className='text-center min-w-0 flex-1 px-1'>
              <div className='flex items-center justify-center gap-1.5 flex-wrap'>
                <span className='text-xs font-bold text-foreground truncate'>
                  {cleanActiveTitle}
                </span>
                <Badge variant='outline' className='text-[10px] font-mono px-1 py-0 h-4'>
                  Form {activeStep.code}
                </Badge>
              </div>
              <p className='text-[10px] text-muted-foreground mt-0.5'>
                Langkah {activeStep.stepNumber} dari {totalSteps}
              </p>
            </div>

            <Button
              type='button'
              variant='ghost'
              size='icon'
              disabled={!nextStep || !nextStep.isUnlocked}
              onClick={() => nextStep && handleStepClick(nextStep)}
              className='h-7 w-7 shrink-0'
              title={nextStep ? `Lanjut ke Langkah ${nextStep.stepNumber}` : undefined}
            >
              <ChevronRight className='h-3.5 w-3.5' />
            </Button>
          </div>
        </div>
      </PageHeader>

      {/* Submit Confirmation Dialog */}
      <ConfirmDialog
        open={isSubmitOpen}
        onOpenChange={setSubmitOpen}
        title='Kirim Lembar Kerja Risiko ke Auditor?'
        desc={
          <span>
            Seluruh data lembar kerja risiko (Form 2B dan Form 2C) akan dikirimkan kepada Auditor Pengawas (
            <strong>{readiness?.assigned_auditor?.name || 'Inspektorat'}</strong>). Selama proses peninjauan, data akan berstatus terkunci (read-only).
          </span>
        }
        confirmText='Ya, Kirim Sekarang'
        isLoading={submitMutation.isPending}
        handleConfirm={() => submitMutation.mutate()}
      />
    </>
  )
}
