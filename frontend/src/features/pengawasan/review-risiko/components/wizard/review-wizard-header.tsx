import {
  type PengajuanPenilaianRisiko,
  type SubmissionItem,
} from '@/services/pengajuan-risiko-service'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  RefreshCw,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { type RisikoWizardStepConfig } from '@/features/risiko/shared/risiko-wizard-store'

export type ReviewStepVisualStatus =
  | 'approved'
  | 'in_revision'
  | 'needs_action'
  | 'submitted'
  | 'draft'

interface ReviewWizardHeaderProps {
  steps: RisikoWizardStepConfig[]
  submission?: PengajuanPenilaianRisiko
  currentStepIndex: number
  totalSteps: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  progressPercentage: number
  currentStep: RisikoWizardStepConfig
  getItemStatusForStep: (step: RisikoWizardStepConfig) => {
    status: ReviewStepVisualStatus
    revisionLocation?: string
    item?: SubmissionItem
  }
  onBack: () => void
  onSelectStep: (index: number) => void
}

export function ReviewWizardHeader({
  steps,
  submission,
  currentStepIndex,
  totalSteps,
  approvedCount,
  rejectedCount,
  pendingCount,
  progressPercentage,
  currentStep,
  getItemStatusForStep,
  onBack,
  onSelectStep,
}: ReviewWizardHeaderProps) {
  return (
    <div className='sticky top-16 z-20 space-y-2 rounded-xl border bg-card/95 px-3.5 py-2.5 shadow-xs backdrop-blur-md sm:px-4 sm:py-3'>
      {/* 1. COMPACT TOP ROW: Back Nav + OPD + Auditor + Status Badge + Micro Progress */}
      <div className='flex flex-wrap items-center justify-between gap-2.5 sm:flex-nowrap'>
        {/* Left: Back button + OPD Name + Code */}
        <div className='flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='-ml-1 h-7 shrink-0 gap-1 px-1.5 text-xs font-medium text-muted-foreground hover:text-foreground'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>Daftar</span>
          </Button>
          <span className='hidden text-xs text-muted-foreground/50 sm:inline'>
            /
          </span>
          <div className='flex min-w-0 items-center gap-1.5 truncate'>
            <h2 className='truncate text-xs font-bold text-foreground sm:text-sm'>
              {submission?.opd?.nama || 'Pemeriksaan Risiko'}
            </h2>
            {submission?.opd?.kode && (
              <Badge
                variant='outline'
                className='shrink-0 bg-muted/40 px-1.5 py-0 font-mono text-[10px] font-semibold'
              >
                {submission.opd.kode}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Auditor + Overall Status + Progress */}
        <div className='ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5'>
          {/* Auditor Name (compact) */}
          <div className='hidden items-center gap-1 text-[11px] text-muted-foreground md:flex'>
            <User className='h-3 w-3 shrink-0 text-primary' />
            <span className='max-w-[130px] truncate font-medium'>
              {submission?.auditor?.name || 'Inspektorat'}
            </span>
          </div>

          {/* Overall Status Badge */}
          {submission?.status === 'approved' ? (
            <Badge className='gap-1 border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 shadow-2xs sm:text-xs dark:text-emerald-400'>
              <CheckCircle2 className='h-3 w-3 text-emerald-600' />
              <span className='hidden sm:inline'>Selesai</span> Disetujui
            </Badge>
          ) : rejectedCount > 0 ? (
            <Badge className='gap-1 border border-amber-500/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-800 shadow-2xs sm:text-xs dark:text-amber-300'>
              <RefreshCw className='h-3 w-3 text-amber-600' />
              {rejectedCount} Sedang Direvisi
            </Badge>
          ) : (
            <Badge className='gap-1 border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold text-sky-700 shadow-2xs sm:text-xs dark:text-sky-400'>
              <Clock className='h-3 w-3 animate-pulse text-sky-600' />
              <span className='hidden sm:inline'>Menunggu</span> Review
            </Badge>
          )}

          {/* Micro Progress Bar & Percentage */}
          <div className='flex items-center gap-2 border-l border-border/60 pl-2 text-xs'>
            <div className='h-1.5 w-16 overflow-hidden rounded-full border border-border/60 bg-slate-200 sm:w-20 dark:bg-slate-700'>
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
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

          {/* Detailed counts on wide screens */}
          <div className='hidden items-center gap-1.5 pl-1 font-mono text-[10px] xl:flex'>
            <Badge
              variant='outline'
              className='border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400'
            >
              {approvedCount} Disetujui
            </Badge>
            {rejectedCount > 0 && (
              <Badge
                variant='outline'
                className='border-amber-500/40 bg-amber-500/15 px-1.5 py-0 text-[10px] font-semibold text-amber-800 dark:text-amber-300'
              >
                {rejectedCount} Revisi
              </Badge>
            )}
            {pendingCount > 0 && (
              <Badge
                variant='outline'
                className='border-slate-400/40 bg-muted/60 px-1.5 py-0 text-[10px] font-semibold text-muted-foreground'
              >
                {pendingCount} Menunggu
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* 2. COMPACT 14-STEP TIMELINE TRACK (DESKTOP & TABLET) */}
      <TooltipProvider delayDuration={150}>
        <nav
          aria-label='Progress'
          className='hidden border-t border-border/60 pt-1.5 pb-0.5 sm:block'
        >
          <ol className='flex w-full items-start justify-between'>
            {steps.map((step, index) => {
              const { status, revisionLocation } = getItemStatusForStep(step)
              const isCurrent = index === currentStepIndex
              const isApproved = status === 'approved'
              const isInRevision = status === 'in_revision'
              const isNeedsAction = status === 'needs_action'
              const isLast = index === totalSteps - 1

              return (
                <li
                  key={step.id}
                  className={cn(
                    'flex min-w-0 items-start',
                    !isLast && 'flex-1'
                  )}
                >
                  {/* Step Node Button with Circle & High-Contrast Form Code */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => onSelectStep(index)}
                        className={cn(
                          'group flex w-8 shrink-0 flex-col items-center outline-hidden transition-all select-none sm:w-8.5',
                          isCurrent
                            ? 'cursor-default'
                            : 'cursor-pointer hover:opacity-90'
                        )}
                        aria-label={`Langkah ${step.stepNumber}: ${step.shortTitle} (Form ${step.code})`}
                      >
                        {/* Compact Circle Node (30-32px) */}
                        <span
                          className={cn(
                            'flex h-7.5 w-7.5 items-center justify-center rounded-full font-mono text-xs font-bold shadow-2xs transition-all sm:h-8 sm:w-8',
                            isCurrent
                              ? isApproved
                                ? 'scale-105 bg-emerald-600 text-white shadow-sm ring-3 ring-primary/40 ring-offset-1 ring-offset-background'
                                : isInRevision
                                  ? 'scale-105 bg-amber-500 text-white shadow-sm ring-3 ring-amber-400/50 ring-offset-1 ring-offset-background'
                                  : isNeedsAction
                                    ? 'scale-105 bg-amber-600 text-white shadow-sm ring-3 ring-amber-500/50 ring-offset-1 ring-offset-background'
                                    : 'scale-105 bg-primary text-primary-foreground shadow-sm ring-3 ring-primary/40 ring-offset-1 ring-offset-background'
                              : isApproved
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-600/30 group-hover:scale-105'
                                : isInRevision
                                  ? 'bg-amber-500 text-white ring-1 ring-amber-500/40 group-hover:scale-105'
                                  : isNeedsAction
                                    ? 'bg-amber-500/90 text-white ring-1 ring-amber-600/40 group-hover:scale-105'
                                    : 'border border-border bg-background text-foreground group-hover:scale-105 group-hover:border-primary'
                          )}
                        >
                          {isApproved ? (
                            <Check className='h-3.5 w-3.5 stroke-[2.8]' />
                          ) : isInRevision ? (
                            <RefreshCw className='h-3.5 w-3.5 stroke-[2.5]' />
                          ) : isNeedsAction ? (
                            <AlertTriangle className='h-3.5 w-3.5 stroke-[2.5]' />
                          ) : (
                            <span className='font-mono text-[11px] font-bold'>
                              {step.stepNumber}
                            </span>
                          )}
                        </span>

                        {/* High-Contrast Clear Form Code underneath */}
                        <span
                          className={cn(
                            'mt-1 max-w-full truncate text-center font-mono text-[10px] leading-none transition-colors select-none sm:text-[11px]',
                            isCurrent
                              ? isInRevision || isNeedsAction
                                ? 'font-extrabold text-amber-600 dark:text-amber-400'
                                : 'font-extrabold text-primary'
                              : isApproved
                                ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                : isInRevision || isNeedsAction
                                  ? 'font-bold text-amber-600 dark:text-amber-400'
                                  : 'font-semibold text-foreground group-hover:text-primary'
                          )}
                        >
                          {step.code}
                        </span>

                        {/* Active Indicator Dot */}
                        {isCurrent && (
                          <span
                            className={cn(
                              'mt-0.5 h-1 w-1 rounded-full shadow-2xs',
                              isInRevision || isNeedsAction
                                ? 'bg-amber-500'
                                : 'bg-primary'
                            )}
                          />
                        )}
                      </button>
                    </TooltipTrigger>

                    <TooltipContent
                      side='bottom'
                      className='max-w-xs space-y-1.5 p-2.5 text-xs shadow-md'
                    >
                      <div className='flex items-center justify-between gap-2 border-b border-border/60 pb-1 font-bold'>
                        <span className='font-bold text-foreground'>
                          Langkah {step.stepNumber}: {step.shortTitle}
                        </span>
                        <Badge
                          variant='outline'
                          className='shrink-0 px-1 py-0 font-mono text-[10px]'
                        >
                          Form {step.code}
                        </Badge>
                      </div>
                      <p className='text-[11px] leading-snug text-muted-foreground'>
                        {step.subtitle}
                      </p>
                      <div className='flex items-center gap-1.5 pt-0.5 text-[10px] font-medium'>
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            isApproved
                              ? 'bg-emerald-500'
                              : isInRevision || isNeedsAction
                                ? 'bg-amber-500'
                                : isCurrent
                                  ? 'bg-primary'
                                  : 'bg-slate-400'
                          )}
                        />
                        <span
                          className={cn(
                            isApproved
                              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
                              : isInRevision || isNeedsAction
                                ? 'font-semibold text-amber-700 dark:text-amber-400'
                                : isCurrent
                                  ? 'font-bold text-primary'
                                  : 'text-muted-foreground'
                          )}
                        >
                          {isApproved
                            ? 'Disetujui'
                            : isInRevision
                              ? `Sedang Direvisi (${revisionLocation || 'Menunggu Perbaikan'})`
                              : isNeedsAction
                                ? 'Perlu Tindak Lanjut Revisi'
                                : isCurrent
                                  ? 'Sedang Ditinjau'
                                  : 'Menunggu Pemeriksaan'}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>

                  {/* Flexible Connector Line between steps */}
                  {!isLast && (
                    <div
                      aria-hidden='true'
                      className='mx-1 mt-[13px] h-[2.5px] flex-1 overflow-hidden rounded-full bg-slate-200 sm:mt-[14px] dark:bg-slate-700'
                    >
                      <div
                        className={cn(
                          'h-full transition-all duration-300',
                          isApproved
                            ? 'w-full bg-emerald-500'
                            : isInRevision || isNeedsAction
                              ? 'w-full bg-amber-400'
                              : isCurrent
                                ? 'w-1/2 bg-primary/40'
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

      {/* 3. MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
      <div className='space-y-2 border-t border-border/60 pt-1.5 sm:hidden'>
        {/* Segmented Micro Progress Bar */}
        <div className='flex h-1.5 w-full items-center gap-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700'>
          {steps.map((step, idx) => {
            const { status } = getItemStatusForStep(step)
            const isCurrent = idx === currentStepIndex
            const isApproved = status === 'approved'
            const isInRevision =
              status === 'in_revision' || status === 'needs_action'

            return (
              <button
                key={step.id}
                type='button'
                onClick={() => onSelectStep(idx)}
                title={`Langkah ${step.stepNumber}: ${step.shortTitle} (Form ${step.code})`}
                className={cn(
                  'h-full flex-1 rounded-full transition-all',
                  isCurrent
                    ? isInRevision
                      ? 'bg-amber-500 ring-2 ring-amber-400/50'
                      : 'bg-primary ring-2 ring-primary/40'
                    : isApproved
                      ? 'bg-emerald-500'
                      : isInRevision
                        ? 'bg-amber-500'
                        : 'bg-slate-300 dark:bg-slate-600'
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
            disabled={currentStepIndex === 0}
            onClick={() => onSelectStep(Math.max(currentStepIndex - 1, 0))}
            className='h-7 w-7 shrink-0'
            title='Kembali ke Langkah Sebelumnya'
          >
            <ChevronLeft className='h-3.5 w-3.5' />
          </Button>

          <div className='min-w-0 flex-1 px-1 text-center'>
            <div className='flex flex-wrap items-center justify-center gap-1.5'>
              <span className='truncate text-xs font-bold text-foreground'>
                {currentStep.shortTitle}
              </span>
              <Badge
                variant='outline'
                className='h-4 px-1 py-0 font-mono text-[10px]'
              >
                Form {currentStep.code}
              </Badge>
            </div>
            <p className='mt-0.5 text-[10px] text-muted-foreground'>
              Langkah {currentStep.stepNumber} dari {totalSteps}
            </p>
          </div>

          <Button
            type='button'
            variant='ghost'
            size='icon'
            disabled={currentStepIndex === totalSteps - 1}
            onClick={() =>
              onSelectStep(Math.min(currentStepIndex + 1, totalSteps - 1))
            }
            className='h-7 w-7 shrink-0'
            title='Lanjut ke Langkah Selanjutnya'
          >
            <ChevronRight className='h-3.5 w-3.5' />
          </Button>
        </div>
      </div>
    </div>
  )
}
