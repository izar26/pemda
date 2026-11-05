import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  ArrowRightCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Clock,
  Send,
  ShieldAlert,
  UserCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  const isSubmittedToKepala = readiness.status === 'submitted_to_kepala_opd'
  const isRevisionByKepala = readiness.status === 'revision_by_kepala_opd'
  const isInAuditorReview =
    readiness.status === 'submitted_to_auditor' ||
    readiness.status === 'in_review_auditor' ||
    readiness.status === 'submitted' ||
    readiness.status === 'in_review'
  const isRevisionByAuditor = readiness.status === 'revision_by_auditor'
  const isRevisionToOperator = readiness.status === 'revision_to_operator'
  const isInPengawasReview =
    readiness.status === 'submitted_to_pengawas' ||
    readiness.status === 'in_review_pengawas'
  const isRevisionByPengawas = readiness.status === 'revision_by_pengawas'
  const isApproved = readiness.status === 'approved'

  if (
    !hasAuditorWarning &&
    !isSubmittedToKepala &&
    !isRevisionByKepala &&
    !isInAuditorReview &&
    !isRevisionByAuditor &&
    !isRevisionToOperator &&
    !isInPengawasReview &&
    !isRevisionByPengawas &&
    !isApproved
  ) {
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

      {/* Tier 2: Menunggu Review Kepala OPD */}
      {isSubmittedToKepala && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 text-start'>
          <Clock className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Menunggu Persetujuan Internal Kepala OPD
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Seluruh lembar kerja telah diajukan kepada Kepala OPD (<strong>{readiness.kepala_opd?.name || 'Pimpinan OPD'}</strong>) untuk ditinjau secara internal sebelum diteruskan kepada Auditor Pengawas.
            </p>
          </div>
        </div>
      )}

      {/* Tier 2: Revisi dari Kepala OPD */}
      {isRevisionByKepala && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-start'>
          <AlertCircle className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-1.5 text-xs flex-1'>
            <p className='font-bold text-foreground'>
              Kepala OPD Meminta Revisi Internal
            </p>
            <div className='space-y-1.5'>
              {readiness.submission?.items
                ?.filter((i) => i.status_kepala_opd === 'rejected' || i.status === 'rejected')
                .map((item) => (
                  <div
                    key={item.id}
                    className='p-2 rounded-md bg-background/80 border text-[11px] text-foreground space-y-0.5'
                  >
                    <span className='font-bold uppercase text-destructive mr-2'>
                      Form {item.form_code}:
                    </span>
                    <span className='text-muted-foreground'>
                      {item.catatan_kepala_opd || item.catatan_revisi || 'Perlu perbaikan internal.'}
                    </span>
                  </div>
                ))}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Silakan lakukan perbaikan yang diminta, lalu ajukan kembali kepada Kepala OPD.
            </p>
          </div>
        </div>
      )}

      {/* Tier 3: Auditor In Review */}
      {isInAuditorReview && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-start'>
          <Clock className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Formulir Sedang Dalam Pemeriksaan Auditor Pengawas
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Lembar kerja telah disetujui Kepala OPD dan sedang diperiksa oleh Auditor Pengawas (<strong>{readiness.assigned_auditor?.name || 'Inspektorat'}</strong>). Formulir berstatus read-only.
            </p>
          </div>
        </div>
      )}

      {/* Tier 3: Revisi dari Auditor (Menunggu Delegasi Kepala OPD) */}
      {isRevisionByAuditor && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-300 text-start'>
          <AlertCircle className='h-4.5 w-4.5 shrink-0 mt-0.5 text-amber-600' />
          <div className='space-y-1 text-xs flex-1'>
            <p className='font-bold text-foreground'>
              Auditor Meminta Perbaikan (Menunggu Arahan Kepala OPD)
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Auditor Pengawas mengembalikan lembar kerja kepada Kepala OPD dengan catatan perbaikan. Operator OPD menunggu arahan delegasi perbaikan dari Kepala OPD.
            </p>
          </div>
        </div>
      )}

      {/* Tier 3: Revisi Didelegasikan ke Operator */}
      {isRevisionToOperator && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-start'>
          <AlertCircle className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-1.5 text-xs flex-1'>
            <p className='font-bold text-foreground'>
              Perbaikan Lembar Kerja Telah Didelegasikan kepada Operator
            </p>
            <div className='space-y-1.5'>
              {readiness.submission?.items
                ?.filter((i) => i.status_auditor === 'rejected' || i.status === 'rejected')
                .map((item) => (
                  <div
                    key={item.id}
                    className='p-2 rounded-md bg-background/80 border text-[11px] text-foreground space-y-0.5'
                  >
                    <span className='font-bold uppercase text-destructive mr-2'>
                      Form {item.form_code}:
                    </span>
                    <span className='text-muted-foreground'>
                      {item.catatan_auditor || item.catatan_revisi || 'Perlu perbaikan.'}
                    </span>
                  </div>
                ))}
            </div>
            <p className='text-[11px] text-muted-foreground'>
              Silakan lakukan perbaikan pada form yang ditandai, kemudian ajukan kembali kepada Kepala OPD.
            </p>
          </div>
        </div>
      )}

      {/* Tier 4: Pengawas In Review */}
      {isInPengawasReview && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-400 text-start'>
          <Clock className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Menunggu Pengesahan Akhir Pengawas (Inspektorat)
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Seluruh formulir telah disetujui oleh Auditor Pengawas dan kini sedang dalam tahap pengesahan akhir oleh Pengawas APIP (Inspektorat).
            </p>
          </div>
        </div>
      )}

      {/* Tier 4: Revisi Pengawas */}
      {isRevisionByPengawas && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 text-start'>
          <AlertCircle className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Pengawas Mengembalikan Berkas ke Auditor
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Pengawas APIP meminta klarifikasi atau perbaikan teknis kepada Auditor Pengawas sebelum pengesahan final.
            </p>
          </div>
        </div>
      )}

      {/* Tier 5 / Approved: Disetujui Final */}
      {isApproved && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-start'>
          <CheckCircle2 className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Lembar Kerja Resmi Disahkan oleh Pengawas Inspektorat
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Seluruh formulir pengelolaan risiko periode ini telah melalui verifikasi 4 tingkat (Operator $\rightarrow$ Kepala OPD $\rightarrow$ Auditor $\rightarrow$ Pengawas) dan disahkan secara final. Data terkunci permanen.
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

  // Operator submit button visibility
  const showOperatorSubmitButton = Boolean(
    readiness?.can_submit_to_kepala &&
      !readiness?.is_locked_for_operator &&
      !submitToKepalaMutation.isPending
  )

  // Kepala OPD review button visibility
  const showKepalaReviewButton = Boolean(
    readiness?.can_review_kepala && !reviewKepalaMutation.isPending
  )

  // Kepala OPD delegate button visibility
  const showKepalaDelegateButton = Boolean(
    readiness?.can_delegate_operator && !delegateMutation.isPending
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
            {/* Status Pills */}
            {readiness?.status === 'approved' && (
              <Badge className='text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <CheckCircle2 className='h-3 w-3 text-emerald-600' />
                Disahkan Final
              </Badge>
            )}
            {readiness?.status === 'submitted_to_kepala_opd' && (
              <Badge className='text-[10px] bg-sky-500/15 text-sky-700 dark:text-sky-400 border border-sky-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-sky-600 animate-pulse' />
                Review Kepala OPD
              </Badge>
            )}
            {readiness?.status === 'revision_by_kepala_opd' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Kepala OPD
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_auditor' ||
              readiness?.status === 'in_review_auditor' ||
              readiness?.status === 'submitted' ||
              readiness?.status === 'in_review') && (
              <Badge className='text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-amber-600 animate-pulse' />
                Review Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_by_auditor' && (
              <Badge className='text-[10px] bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-amber-600' />
                Revisi dari Auditor
              </Badge>
            )}
            {readiness?.status === 'revision_to_operator' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Operator
              </Badge>
            )}
            {(readiness?.status === 'submitted_to_pengawas' ||
              readiness?.status === 'in_review_pengawas') && (
              <Badge className='text-[10px] bg-purple-500/15 text-purple-700 dark:text-purple-400 border border-purple-500/30 py-0.5 px-2 gap-1 font-semibold'>
                <Clock className='h-3 w-3 text-purple-600 animate-pulse' />
                Pengesahan Pengawas
              </Badge>
            )}
            {readiness?.status === 'revision_by_pengawas' && (
              <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 py-0.5 px-2 gap-1 font-semibold'>
                <AlertCircle className='h-3 w-3 text-destructive' />
                Revisi Pengawas
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

            {/* 1. Operator: Submit to Kepala OPD Button */}
            {showOperatorSubmitButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-xs font-semibold'
                onClick={() => setSubmitOpen(true)}
              >
                <Send className='h-3 w-3' />
                <span>Kirim ke Kepala OPD</span>
              </Button>
            )}

            {/* 2. Kepala OPD: Review Decision Button */}
            {showKepalaReviewButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1.5 shadow-xs font-semibold'
                onClick={() => setIsKepalaReviewOpen(true)}
              >
                <ClipboardCheck className='h-3.5 w-3.5' />
                <span>Persetujuan Kepala OPD</span>
              </Button>
            )}

            {/* 3. Kepala OPD: Delegate Auditor Revision to Operator Button */}
            {showKepalaDelegateButton && (
              <Button
                type='button'
                size='sm'
                className='h-7.5 text-xs bg-amber-600 hover:bg-amber-700 text-white gap-1.5 shadow-xs font-semibold'
                onClick={() => setIsKepalaDelegateOpen(true)}
              >
                <ArrowRightCircle className='h-3.5 w-3.5' />
                <span>Delegasikan ke Operator</span>
              </Button>
            )}

            {actions}
          </div>
        </div>

        {/* DESKTOP & TABLET: COMPACT 13-STEP TIMELINE TRACK */}
        <TooltipProvider delayDuration={150}>
          <nav
            aria-label='Progress Pengisian Risiko'
            className='hidden sm:flex items-center gap-1.5 py-1.5 overflow-x-auto no-scrollbar'
          >
            {steps.map((step) => {
              const isCurrent = step.id === currentStepId
              const isCompleted = step.isCompleted
              const isLocked = !step.isUnlocked
              const cleanTitle = getCleanStepTitle(step.title)

              return (
                <Tooltip key={step.id}>
                  <TooltipTrigger asChild>
                    <button
                      type='button'
                      onClick={() => handleStepClick(step)}
                      disabled={isLocked}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 border select-none',
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs'
                          : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : isLocked
                          ? 'bg-muted/40 text-muted-foreground/50 border-transparent cursor-not-allowed'
                          : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-mono shrink-0',
                          isCurrent
                            ? 'bg-primary-foreground text-primary font-bold'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isLocked
                            ? 'bg-muted-foreground/20 text-muted-foreground/60'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        {step.stepNumber}
                      </span>
                      <span className='truncate max-w-[120px]'>{cleanTitle}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs'>
                    <p className='font-bold'>
                      Langkah {step.stepNumber}: {cleanTitle}
                    </p>
                    <p className='text-[10px] text-muted-foreground'>
                      Form {step.code} • {isCompleted ? 'Sudah Diisi' : isLocked ? 'Terkunci' : 'Siap Diisi'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
        </TooltipProvider>

        {/* MOBILE (<640px): MULTI-SEGMENT PROGRESS + TOUCH NAVIGATOR */}
        <div className='sm:hidden pt-1.5 space-y-2 border-t border-border/60'>
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

      {/* 1. OPERATOR SUBMIT CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={isSubmitOpen}
        onOpenChange={setSubmitOpen}
        title='Ajukan Lembar Kerja Risiko ke Kepala OPD?'
        desc={
          <span>
            Seluruh data lembar kerja pengelolaan risiko (Form 2B dan Form 2C) akan diajukan kepada Kepala OPD (
            <strong>{readiness?.kepala_opd?.name || 'Pimpinan OPD'}</strong>) untuk diverifikasi secara internal.
          </span>
        }
        confirmText='Ya, Ajukan ke Kepala OPD'
        isLoading={submitToKepalaMutation.isPending}
        handleConfirm={() => submitToKepalaMutation.mutate()}
      />

      {/* 2. KEPALA OPD REVIEW MODAL */}
      <Dialog open={isKepalaReviewOpen} onOpenChange={setIsKepalaReviewOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <UserCheck className='h-5 w-5 text-primary' />
              Persetujuan Internal Kepala OPD
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Sebagai Kepala OPD, Anda dapat menyetujui draf internal untuk diteruskan kepada Auditor Pengawas atau meminta revisi kepada Operator.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Keputusan Persetujuan:</Label>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant={kepalaAction === 'approved' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setKepalaAction('approved')}
                  className={cn(
                    'text-xs h-9 justify-center gap-1.5 font-bold',
                    kepalaAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  <CheckCircle2 className='h-4 w-4' />
                  Setujui & Kirim ke Auditor
                </Button>
                <Button
                  type='button'
                  variant={kepalaAction === 'rejected' ? 'destructive' : 'outline'}
                  size='sm'
                  onClick={() => setKepalaAction('rejected')}
                  className='text-xs h-9 justify-center gap-1.5 font-bold'
                >
                  <AlertCircle className='h-4 w-4' />
                  Minta Revisi ke Operator
                </Button>
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                Catatan Kepala OPD {kepalaAction === 'rejected' && <span className='text-destructive'>* (Wajib diisi min. 5 karakter)</span>}:
              </Label>
              <Textarea
                rows={3}
                value={kepalaNotes}
                onChange={(e) => setKepalaNotes(e.target.value)}
                placeholder={
                  kepalaAction === 'approved'
                    ? 'Catatan opsional untuk auditor pengawas...'
                    : 'Instruksi perbaikan untuk operator OPD...'
                }
                className='text-xs'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsKepalaReviewOpen(false)}
              disabled={reviewKepalaMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={
                reviewKepalaMutation.isPending ||
                (kepalaAction === 'rejected' && kepalaNotes.trim().length < 5)
              }
              onClick={() => reviewKepalaMutation.mutate()}
              className={cn(
                kepalaAction === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-white'
              )}
            >
              {reviewKepalaMutation.isPending ? 'Menyimpan...' : 'Simpan Keputusan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. KEPALA OPD DELEGATE AUDITOR REVISION MODAL */}
      <Dialog open={isKepalaDelegateOpen} onOpenChange={setIsKepalaDelegateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <ArrowRightCircle className='h-5 w-5 text-amber-600' />
              Delegasikan Revisi ke Operator OPD
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Auditor Pengawas telah mengembalikan lembar kerja dengan catatan perbaikan. Klik delegasikan untuk membuka akses edit bagi Operator.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
              <p className='font-semibold text-foreground text-xs'>Catatan dari Auditor Pengawas:</p>
              <div className='space-y-1.5'>
                {readiness?.submission?.items
                  ?.filter((i) => i.status_auditor === 'rejected' || i.status === 'rejected')
                  .map((item) => (
                    <div key={item.id} className='text-xs bg-background/80 p-2 rounded border'>
                      <span className='font-bold uppercase text-destructive mr-1'>Form {item.form_code}:</span>
                      <span className='text-muted-foreground'>{item.catatan_auditor || item.catatan_revisi || 'Perlu perbaikan.'}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Tambahan Instruksi Kepala OPD (Opsional):</Label>
              <Textarea
                rows={2}
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
                placeholder='Instruksi khusus kepada staf penyusun...'
                className='text-xs'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsKepalaDelegateOpen(false)}
              disabled={delegateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={delegateMutation.isPending}
              onClick={() => delegateMutation.mutate()}
              className='bg-amber-600 hover:bg-amber-700 text-white font-semibold'
            >
              {delegateMutation.isPending ? 'Mendelegasikan...' : 'Kirim Catatan & Buka Akses Edit Operator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
