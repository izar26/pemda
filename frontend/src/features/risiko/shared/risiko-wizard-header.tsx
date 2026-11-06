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
import { ApprovalTierStepper } from './approval-tier-stepper'

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
  const status = readiness.status

  const getContextGuidance = () => {
    switch (status) {
      case 'draft':
        return null
      case 'submitted_to_kepala_opd':
        return {
          title: 'Menunggu Persetujuan Internal Kepala OPD (Tier 2)',
          badgeText: 'Review Internal',
          borderCls: 'border-sky-500/30 bg-sky-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-sky-600 dark:text-sky-400',
          kondisi: `Lembar kerja telah diajukan kepada Kepala OPD (${readiness.kepala_opd?.name || 'Pimpinan OPD'}) dan sedang menunggu persetujuan internal.`,
          tindakan: readiness.can_review_kepala
            ? 'Sebagai Kepala OPD, Anda dapat memeriksa sasaran, program, dan indikator, lalu menyetujui (kirim ke Auditor) atau meminta perbaikan.'
            : 'Lembar kerja berstatus read-only bagi Operator hingga Kepala OPD memberikan keputusan.',
          langkahBerikutnya:
            'Jika disetujui Kepala OPD, berkas diteruskan ke Auditor Pengawas Inspektorat. Jika ditolak, berkas dikembalikan ke Operator.',
        }
      case 'revision_by_kepala_opd':
        return {
          title: 'Permintaan Revisi Internal oleh Kepala OPD',
          badgeText: 'Revisi Internal',
          borderCls: 'border-destructive/30 bg-destructive/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-destructive',
          kondisi:
            'Kepala OPD mengembalikan lembar kerja dengan catatan perbaikan internal sebelum diteruskan ke APIP.',
          tindakan:
            'Operator OPD dapat membuka kembali formulir yang ditandai catatan revisi dan memperbaikinya.',
          langkahBerikutnya:
            'Setelah perbaikan selesai disimpan, Operator dapat mengajukan kembali berkas ke Kepala OPD.',
        }
      case 'submitted_to_auditor':
      case 'in_review_auditor':
      case 'submitted':
      case 'in_review':
        return {
          title: 'Pemeriksaan Kepatuhan Teknis oleh Auditor Pengawas (Tier 3)',
          badgeText: 'Pemeriksaan Auditor',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-amber-600 dark:text-amber-400',
          kondisi: `Lembar kerja telah disetujui Kepala OPD dan sedang dalam pemeriksaan Auditor Pengawas (${readiness.assigned_auditor?.name || 'Inspektorat'}).`,
          tindakan: readiness.can_review_auditor
            ? 'Sebagai Auditor Pengawas, periksa lembar kerja risiko, lalu setujui ke Pengawas atau minta perbaikan ke OPD.'
            : 'Lembar kerja berstatus read-only bagi OPD selama proses pemeriksaan berlangsung.',
          langkahBerikutnya:
            'Jika disetujui Auditor, berkas diajukan ke Pengawas APIP. Jika ada catatan, berkas dikembalikan ke Kepala OPD.',
        }
      case 'revision_by_auditor':
        return {
          title: 'Catatan Perbaikan dari Auditor Pengawas',
          badgeText: 'Revisi Auditor',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-amber-600',
          kondisi:
            'Auditor Pengawas menemukan hal yang perlu disempurnakan dan mengembalikan berkas ke Kepala OPD beserta catatan.',
          tindakan: readiness.can_delegate_operator
            ? 'Kepala OPD dapat mempelajari catatan auditor lalu mendelegasikan tugas perbaikan teknis kepada Operator OPD.'
            : 'Operator OPD menunggu disposisi / delegasi instruksi perbaikan dari Kepala OPD.',
          langkahBerikutnya:
            'Kepala OPD mendelegasikan revisi kepada Operator agar formulir dapat dibuka kembali untuk diedit.',
        }
      case 'revision_to_operator':
        return {
          title: 'Perbaikan Telah Didelegasikan kepada Operator OPD',
          badgeText: 'Perbaikan Didelegasikan',
          borderCls: 'border-destructive/30 bg-destructive/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-destructive',
          kondisi:
            'Kepala OPD telah menginstruksikan Operator untuk menindaklanjuti catatan perbaikan teknis dari Auditor Pengawas.',
          tindakan:
            'Operator OPD dapat mengedit formulir yang ditandai dan memperbaiki data sesuai catatan perbaikan.',
          langkahBerikutnya:
            'Setelah perbaikan disimpan, Operator mengajukan kembali ke Kepala OPD untuk diteruskan ke Auditor.',
        }
      case 'submitted_to_pengawas':
      case 'in_review_pengawas':
        return {
          title: 'Tahap Pengesahan Akhir oleh Pengawas APIP (Tier 4)',
          badgeText: 'Pengesahan APIP',
          borderCls: 'border-purple-500/30 bg-purple-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-purple-600 dark:text-purple-400',
          kondisi:
            'Seluruh lembar kerja telah disetujui oleh Auditor Pengawas dan kini berada pada meja Pengawas Inspektorat untuk pengesahan akhir.',
          tindakan: readiness.can_review_pengawas
            ? 'Sebagai Pengawas APIP, Anda dapat mengesahkan berkas secara final atau mengembalikan ke Auditor jika ada klarifikasi.'
            : 'Lembar kerja berstatus read-only bagi OPD dan Auditor.',
          langkahBerikutnya:
            'Jika disahkan oleh Pengawas, dokumen menjadi resmi dan sah. Jika dikembalikan, Auditor akan menindaklanjuti klarifikasi.',
        }
      case 'revision_by_pengawas':
        return {
          title: 'Pengawas Mengembalikan Berkas ke Auditor',
          badgeText: 'Klarifikasi APIP',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-amber-600',
          kondisi:
            'Pengawas APIP meminta klarifikasi teknis kepada Auditor Pengawas sebelum pengesahan final diterbitkan.',
          tindakan:
            readiness.can_forward_revision_auditor || readiness.can_review_auditor
              ? 'Auditor Pengawas dapat meninjau catatan pengawas, meneruskan perbaikan ke OPD, atau mengajukan kembali ke Pengawas.'
              : 'Berkas sedang dalam penanganan klarifikasi teknis antara Pengawas dan Auditor.',
          langkahBerikutnya:
            'Auditor menyelesaikan klarifikasi teknis atau meneruskan revisi ke OPD jika data awal memerlukan penyesuaian.',
        }
      case 'approved':
        return {
          title: 'Dokumen Manajemen Risiko Telah Disahkan Final',
          badgeText: 'Disahkan Final',
          borderCls: 'border-emerald-500/30 bg-emerald-500/5',
          headerIcon: CheckCircle2,
          headerIconCls: 'text-emerald-600 dark:text-emerald-400',
          kondisi:
            'Dokumen Pengelolaan Risiko periode ini telah melalui verifikasi 4 tingkat dan resmi disahkan oleh Inspektorat.',
          tindakan:
            'Dokumen resmi berstatus terkunci permanen dan dapat diunduh untuk lampiran laporan kinerja pemda.',
          langkahBerikutnya:
            'Pelaksanaan rencana tindak pengendalian (RTP) dan pemantauan risiko berkala sepanjang tahun berjalan.',
        }
      default:
        return null
    }
  }

  const guidance = getContextGuidance()

  // Collect itemized rejected notes
  const rejectedItems =
    readiness.submission?.items?.filter(
      (i) =>
        i.status === 'rejected' ||
        i.status_kepala_opd === 'rejected' ||
        i.status_auditor === 'rejected' ||
        i.status_pengawas === 'rejected'
    ) || []

  return (
    <div className='space-y-3 mb-3'>
      {/* 1. Missing Auditor Warning */}
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

      {/* 2. Visual 4-Tier Approval Stepper */}
      <ApprovalTierStepper readiness={readiness} />

      {/* 3. Smart 3-Section Contextual Guidance Box */}
      {guidance && (
        <div
          className={cn(
            'rounded-xl border p-3.5 sm:p-4 text-xs transition-colors shadow-2xs',
            guidance.borderCls
          )}
        >
          <div className='flex items-center justify-between gap-2 pb-2.5 border-b border-border/50'>
            <div className='flex items-center gap-2'>
              <guidance.headerIcon
                className={cn('h-4 w-4 shrink-0', guidance.headerIconCls)}
              />
              <span className='font-bold text-foreground text-xs sm:text-sm'>
                {guidance.title}
              </span>
            </div>
            <Badge variant='outline' className='text-[10px] font-medium'>
              {guidance.badgeText}
            </Badge>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-[11px] leading-relaxed'>
            {/* Section 1: Kondisi Berkas Terkini */}
            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  1
                </span>
                <span>Kondisi Berkas Terkini</span>
              </div>
              <p className='text-muted-foreground'>{guidance.kondisi}</p>
            </div>

            {/* Section 2: Tindakan Anda */}
            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  2
                </span>
                <span>Tindakan Anda</span>
              </div>
              <p className='text-muted-foreground'>{guidance.tindakan}</p>
            </div>

            {/* Section 3: Langkah Selanjutnya */}
            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  3
                </span>
                <span>Langkah Selanjutnya</span>
              </div>
              <p className='text-muted-foreground'>{guidance.langkahBerikutnya}</p>
            </div>
          </div>

          {/* Itemized Rejection Notes if present */}
          {rejectedItems.length > 0 && (
            <div className='mt-3 pt-2.5 border-t border-border/50 space-y-2'>
              <span className='font-bold text-destructive text-[11px] uppercase tracking-wide flex items-center gap-1.5'>
                <AlertCircle className='h-3.5 w-3.5' />
                Rincian Catatan Perbaikan Formulir:
              </span>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {rejectedItems.map((item) => {
                  const note =
                    item.catatan_kepala_opd ||
                    item.catatan_auditor ||
                    item.catatan_pengawas ||
                    item.catatan_revisi ||
                    'Perlu perbaikan data formulir.'
                  return (
                    <div
                      key={item.id}
                      className='p-2 rounded-md bg-destructive/10 border border-destructive/20 text-[11px] text-foreground space-y-0.5'
                    >
                      <span className='font-bold uppercase text-destructive mr-1.5'>
                        Form {item.form_code}:
                      </span>
                      <span className='text-muted-foreground'>{note}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
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
            className='hidden sm:flex items-center justify-between gap-1 w-full py-1'
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
                        'flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-1.5 rounded-md text-[11px] font-medium transition-all border select-none',
                        isCurrent
                          ? 'bg-primary text-primary-foreground border-primary font-bold shadow-xs ring-1 ring-primary/40'
                          : isCompleted
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                          : isLocked
                          ? 'bg-muted/30 text-muted-foreground/40 border-transparent cursor-not-allowed opacity-60'
                          : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                      )}
                    >
                      <span
                        className={cn(
                          'w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono shrink-0 font-bold',
                          isCurrent
                            ? 'bg-primary-foreground text-primary'
                            : isCompleted
                            ? 'bg-emerald-600 text-white'
                            : isLocked
                            ? 'bg-muted-foreground/20 text-muted-foreground/60'
                            : 'bg-muted text-foreground'
                        )}
                      >
                        {step.stepNumber}
                      </span>
                      <span className='font-mono text-[10px] font-semibold tracking-tight truncate'>
                        {step.code}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side='bottom' className='text-xs max-w-xs'>
                    <div className='space-y-0.5'>
                      <p className='font-bold text-foreground'>
                        Langkah {step.stepNumber}: {cleanTitle}
                      </p>
                      <p className='text-[10px] text-muted-foreground'>
                        Form {step.code} • {isCompleted ? '✓ Sudah Selesai' : isLocked ? '🔒 Masih Terkunci' : '📝 Siap Dikerjakan'}
                      </p>
                    </div>
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
