import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  X,
  XCircle,
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
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'
import {
  type PengajuanPenilaianRisiko,
  type SubmissionItem,
} from '@/services/pengajuan-risiko-service'

interface ReviewWizardHeaderProps {
  submission?: PengajuanPenilaianRisiko
  currentStepIndex: number
  totalSteps: number
  approvedCount: number
  rejectedCount: number
  pendingCount: number
  progressPercentage: number
  currentStep: RisikoWizardStepConfig
  getItemStatusForStep: (step: RisikoWizardStepConfig) => {
    status: 'approved' | 'rejected' | 'submitted' | 'draft'
    item?: SubmissionItem
  }
  onBack: () => void
  onSelectStep: (index: number) => void
}

export function ReviewWizardHeader({
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
    <div className='sticky top-16 z-20 rounded-xl border bg-card/95 backdrop-blur-md px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-xs space-y-2'>
      {/* 1. COMPACT TOP ROW: Back Nav + OPD + Auditor + Status Badge + Micro Progress */}
      <div className='flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap'>
        {/* Left: Back button + OPD Name + Code */}
        <div className='flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1'>
          <Button
            variant='ghost'
            size='sm'
            onClick={onBack}
            className='h-7 px-1.5 -ml-1 text-xs font-medium text-muted-foreground hover:text-foreground gap-1 shrink-0'
          >
            <ArrowLeft className='h-3.5 w-3.5' />
            <span className='hidden sm:inline'>Daftar</span>
          </Button>
          <span className='text-muted-foreground/50 hidden sm:inline text-xs'>/</span>
          <div className='flex items-center gap-1.5 min-w-0 truncate'>
            <h2 className='text-xs sm:text-sm font-bold text-foreground truncate'>
              {submission?.opd?.nama || 'Pemeriksaan Risiko'}
            </h2>
            {submission?.opd?.kode && (
              <Badge
                variant='outline'
                className='font-mono text-[10px] px-1.5 py-0 bg-muted/40 font-semibold shrink-0'
              >
                {submission.opd.kode}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Auditor + Overall Status + Progress */}
        <div className='flex items-center gap-2 sm:gap-2.5 shrink-0 ml-auto'>
          {/* Auditor Name (compact) */}
          <div className='hidden md:flex items-center gap-1 text-[11px] text-muted-foreground'>
            <User className='h-3 w-3 text-primary shrink-0' />
            <span className='truncate max-w-[130px] font-medium'>
              {submission?.auditor?.name || 'Inspektorat'}
            </span>
          </div>

          {/* Overall Status Badge */}
          {submission?.status === 'approved' ? (
            <Badge className='text-[10px] sm:text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-0.5 px-2 gap-1 font-semibold shadow-2xs'>
              <CheckCircle2 className='h-3 w-3 text-emerald-600' />
              <span className='hidden sm:inline'>Selesai</span> Disetujui
            </Badge>
          ) : submission?.status === 'revision_requested' ? (
            <Badge className='text-[10px] sm:text-xs bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold shadow-2xs'>
              <XCircle className='h-3 w-3 text-destructive' />
              Perlu Revisi
            </Badge>
          ) : (
            <Badge className='text-[10px] sm:text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold shadow-2xs'>
              <Clock className='h-3 w-3 text-amber-600 animate-pulse' />
              <span className='hidden sm:inline'>Menunggu</span> Review
            </Badge>
          )}

          {/* Micro Progress Bar & Percentage */}
          <div className='flex items-center gap-2 pl-2 border-l border-border/60 text-xs'>
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

          {/* Detailed counts on wide screens */}
          <div className='hidden xl:flex items-center gap-1.5 text-[10px] font-mono pl-1'>
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

      {/* 2. COMPACT 13-STEP TIMELINE TRACK (DESKTOP & TABLET) */}
      <TooltipProvider delayDuration={150}>
        <nav aria-label='Progress' className='hidden sm:block pt-1.5 pb-0.5 border-t border-border/60'>
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
                  className={cn('flex items-start min-w-0', !isLast && 'flex-1')}
                >
                  {/* Step Node Button with Circle & High-Contrast Form Code */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => onSelectStep(index)}
                        className={cn(
                          'group flex flex-col items-center shrink-0 w-8 sm:w-8.5 outline-hidden transition-all select-none',
                          isCurrent ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
                        )}
                        aria-label={`Langkah ${step.stepNumber}: ${step.shortTitle} (Form ${step.code})`}
                      >
                        {/* Compact Circle Node (30-32px) */}
                        <span
                          className={cn(
                            'flex h-7.5 w-7.5 sm:h-8 sm:w-8 items-center justify-center rounded-full text-xs font-mono font-bold transition-all shadow-2xs',
                            isCurrent
                              ? isApproved
                                ? 'bg-emerald-600 text-white ring-3 ring-primary/40 ring-offset-1 ring-offset-background scale-105 shadow-sm'
                                : isRejected
                                  ? 'bg-destructive text-white ring-3 ring-primary/40 ring-offset-1 ring-offset-background scale-105 shadow-sm'
                                  : 'bg-primary text-primary-foreground ring-3 ring-primary/40 ring-offset-1 ring-offset-background scale-105 shadow-sm'
                              : isApproved
                                ? 'bg-emerald-600 text-white ring-1 ring-emerald-600/30 group-hover:scale-105'
                                : isRejected
                                  ? 'bg-destructive text-white ring-1 ring-destructive/30 group-hover:scale-105'
                                  : 'bg-background text-foreground border border-border group-hover:border-primary group-hover:scale-105'
                          )}
                        >
                          {isApproved ? (
                            <Check className='h-3.5 w-3.5 stroke-[2.8]' />
                          ) : isRejected ? (
                            <X className='h-3.5 w-3.5 stroke-[2.8]' />
                          ) : (
                            <span className='text-[11px] font-bold font-mono'>
                              {step.stepNumber}
                            </span>
                          )}
                        </span>

                        {/* High-Contrast Clear Form Code underneath */}
                        <span
                          className={cn(
                            'text-[10px] sm:text-[11px] font-mono mt-1 text-center transition-colors truncate max-w-full leading-none select-none',
                            isCurrent
                              ? 'font-extrabold text-primary'
                              : isApproved
                                ? 'font-bold text-emerald-700 dark:text-emerald-400'
                                : isRejected
                                  ? 'font-bold text-destructive'
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
                        <span>
                          Langkah {step.stepNumber}: {step.shortTitle}
                        </span>
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

                  {/* Flexible Connector Line between steps */}
                  {!isLast && (
                    <div
                      aria-hidden='true'
                      className='flex-1 h-[2.5px] mx-1 mt-[13px] sm:mt-[14px] rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'
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

      {/* 3. MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
      <div className='sm:hidden pt-1.5 space-y-2 border-t border-border/60'>
        {/* Segmented Micro Progress Bar (13 segments) */}
        <div className='flex items-center gap-1 h-1.5 w-full rounded-full overflow-hidden bg-slate-200 dark:bg-slate-700'>
          {RISIKO_WIZARD_STEPS.map((step, idx) => {
            const { status } = getItemStatusForStep(step)
            const isCurrent = idx === currentStepIndex
            const isApproved = status === 'approved'
            const isRejected = status === 'rejected'

            return (
              <button
                key={step.id}
                type='button'
                onClick={() => onSelectStep(idx)}
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
            onClick={() => onSelectStep(Math.min(currentStepIndex + 1, totalSteps - 1))}
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
