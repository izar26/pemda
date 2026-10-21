import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BrainCircuit,
  Calendar,
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
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  User,
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

const PRESET_REJECTION_REASONS = [
  'Target indikator belum terukur secara numerik / data dukung belum lengkap',
  'Dokumen sumber data belum dilampirkan atau tidak sesuai dengan Renstra',
  'Uraian pernyataan risiko operasional kurang spesifik terhadap tupoksi',
  'Analisis akar masalah (sebab dan dampak) belum memadai',
  'Rencana tindak pengendalian (RTP) belum realistis atau belum ada PIC',
]

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

  // 2. Fetch Form 2B detail
  const { data: konteks2BData, isLoading: isLoading2B } = useQuery({
    queryKey: ['risiko-2b-detail', opdId, periodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksWithMeta({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
      }),
  })

  // 3. Fetch Form 2C detail
  const { data: konteks2CData, isLoading: isLoading2C } = useQuery({
    queryKey: ['risiko-2c-detail', opdId, periodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: opdId,
        periode_penilaian_id: periodeId,
      }),
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
      {/* 1. TOP HEADER & OPD SUMMARY CARD */}
      <div className='rounded-2xl border bg-card/95 backdrop-blur-md p-4 sm:p-6 shadow-sm space-y-4'>
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

          <div className='flex items-center gap-2'>
            <Badge variant='outline' className='font-mono text-xs gap-1.5 py-0.5 px-2.5 bg-muted/30'>
              <Calendar className='h-3 w-3 text-primary' />
              {submission?.periode_penilaian?.nama_periode || 'Periode Aktif'}
            </Badge>
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

        {/* Audit Progress Bar */}
        <div className='pt-2 border-t space-y-2'>
          <div className='flex items-center justify-between text-xs'>
            <div className='flex items-center gap-2'>
              <span className='font-semibold text-foreground'>Progres Pemeriksaan Formulir:</span>
              <span className='font-mono text-muted-foreground'>
                {approvedCount} dari {totalSteps} Formulir Disetujui
              </span>
            </div>
            <div className='flex items-center gap-2'>
              <span className='font-mono font-bold text-xs text-primary'>{progressPercentage}%</span>
              <div className='flex items-center gap-1.5 text-[11px] font-mono'>
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

          <div className='w-full h-2 rounded-full bg-muted overflow-hidden'>
            <div
              className={cn(
                'h-full transition-all duration-500 rounded-full',
                progressPercentage === 100 ? 'bg-emerald-500' : 'bg-primary'
              )}
              style={{ width: `${Math.max(progressPercentage, 4)}%` }}
            />
          </div>
        </div>

        {/* 2. 13-STEP TIMELINE TRACK */}
        <div className='pt-2 border-t space-y-2.5'>
          <div className='flex items-center justify-between text-xs text-muted-foreground font-medium'>
            <span className='text-foreground font-bold flex items-center gap-1.5'>
              <Shield className='h-4 w-4 text-primary' />
              Tahapan Pemeriksaan Risiko (Form 2B s.d. FRAUD)
            </span>
            <span className='font-mono text-[11px]'>
              Langkah {currentStepIndex + 1} dari {totalSteps}:{' '}
              <strong className='text-foreground font-semibold'>
                {currentStep.code} ({currentStep.shortTitle})
              </strong>
            </span>
          </div>

          {/* Stepper Buttons (Responsive & Scrollable) */}
          <TooltipProvider delayDuration={150}>
            <div className='flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-thin'>
              {RISIKO_WIZARD_STEPS.map((step, idx) => {
                const { status } = getItemStatusForStep(step)
                const isSelected = idx === currentStepIndex
                const isApproved = status === 'approved'
                const isRejected = status === 'rejected'

                return (
                  <Tooltip key={step.id}>
                    <TooltipTrigger asChild>
                      <button
                        type='button'
                        onClick={() => setCurrentStepIndex(idx)}
                        className={cn(
                          'flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all duration-200 cursor-pointer shrink-0 min-w-[76px] sm:min-w-[82px] relative group',
                          isSelected
                            ? 'bg-primary/10 border-primary shadow-xs ring-2 ring-primary/30'
                            : isApproved
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/15'
                              : isRejected
                                ? 'bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/15'
                                : 'bg-muted/30 hover:bg-muted/70 border-border/80 text-muted-foreground'
                        )}
                      >
                        <div className='flex items-center gap-1 mb-1'>
                          <span
                            className={cn(
                              'text-[10px] font-mono font-bold px-1.5 py-0.2 rounded',
                              isSelected
                                ? 'bg-primary text-primary-foreground'
                                : isApproved
                                  ? 'bg-emerald-600 text-white'
                                  : isRejected
                                    ? 'bg-destructive text-white'
                                    : 'bg-muted text-foreground'
                            )}
                          >
                            {step.code}
                          </span>
                          {isApproved && (
                            <CheckCircle2 className='h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0' />
                          )}
                          {isRejected && (
                            <XCircle className='h-3 w-3 text-destructive shrink-0' />
                          )}
                          {!isApproved && !isRejected && (
                            <Clock className='h-3 w-3 text-amber-500 shrink-0' />
                          )}
                        </div>
                        <span className='text-[10px] font-semibold truncate w-full'>
                          {step.shortTitle}
                        </span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side='bottom' className='text-xs space-y-0.5 max-w-xs'>
                      <p className='font-bold'>
                        Langkah {step.stepNumber}: {step.title}
                      </p>
                      <p className='text-muted-foreground text-[11px]'>{step.subtitle}</p>
                      <p className='text-[10px] font-mono pt-1 text-primary'>
                        Status:{' '}
                        {isApproved
                          ? 'Disetujui'
                          : isRejected
                            ? 'Perlu Revisi'
                            : 'Menunggu Pemeriksaan'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </div>
          </TooltipProvider>
        </div>
      </div>

      {/* 3. STEP REVIEW CARD & WORKSPACE */}
      <div className='rounded-2xl border bg-card shadow-xs overflow-hidden'>
        {/* Step Header with Auditor Action Bar */}
        <div className='p-5 sm:p-6 border-b bg-muted/15 flex flex-col md:flex-row md:items-center justify-between gap-4'>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge variant='outline' className='font-mono text-xs font-bold px-2.5 py-0.5 border-primary/40 text-primary bg-primary/5'>
                LANGKAH {currentStep.stepNumber} DARI {totalSteps} • FORM {currentStep.code}
              </Badge>
              <h3 className='text-lg font-bold text-foreground'>
                {currentStep.title}
              </h3>
            </div>
            <p className='text-xs text-muted-foreground'>
              {currentStep.subtitle}
            </p>
          </div>

          {/* Auditor Decision Actions for This Step */}
          <div className='flex items-center gap-2.5 shrink-0 flex-wrap'>
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
              disabled={reviewMutation.isPending}
              onClick={() => handleOpenReject(currentStep.id)}
              className='h-8.5 text-xs gap-1.5'
            >
              <XCircle className='h-3.5 w-3.5' />
              <span>{isCurrentRejected ? 'Ubah Catatan Revisi' : 'Tolak / Minta Revisi'}</span>
            </Button>

            <Button
              type='button'
              size='sm'
              disabled={reviewMutation.isPending || isCurrentApproved}
              onClick={() => handleApprove(currentStep.id)}
              className='h-8.5 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs font-semibold'
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

        {/* Existing Auditor Revision Note Alert if Rejected */}
        {isCurrentRejected && currentItem?.catatan_revisi && (
          <div className='m-5 sm:m-6 mb-0 p-4 rounded-xl border border-destructive/30 bg-destructive/10 text-destructive text-xs space-y-1.5 shadow-2xs'>
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
          <div className='m-5 sm:m-6 mb-0 p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-3 shadow-2xs'>
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
        <div className='p-5 sm:p-6 space-y-6'>
          {/* STEP 1: FORM 2B (Konteks Strategis) */}
          {currentStep.id === '2b' && (
            <div className='space-y-5'>
              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Sumber Dokumen Data:</span>
                  <p className='font-bold text-xs text-foreground'>
                    {konteks2B?.sumber_data?.nama || 'Renstra OPD (2026-2030)'}
                  </p>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-1 sm:col-span-2'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Tujuan Penilaian Risiko:</span>
                  <p className='font-bold text-xs text-foreground'>
                    {konteks2B?.tujuan?.tujuan || 'Pencapaian Target Sasaran Strategis Daerah secara Akuntabel'}
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
                    {konteks2B?.sasarans?.map((sasaran: any, sIdx: number) => (
                      <div key={sasaran.id || sIdx} className='rounded-xl border bg-muted/10 p-4 space-y-3'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='space-y-0.5'>
                            <span className='text-[10px] font-mono font-bold text-primary'>
                              SASARAN #{sIdx + 1}
                            </span>
                            <p className='text-xs font-bold text-foreground'>
                              {sasaran.sasaran?.sasaran || sasaran.nama || 'Peningkatan Kualitas dan Pelayanan OPD'}
                            </p>
                          </div>
                        </div>

                        {/* Indikator Sub-table */}
                        <div className='space-y-1.5 pl-3 border-l-2 border-primary/30'>
                          <span className='text-[11px] font-semibold text-muted-foreground block'>
                            Indikator Kinerja Sasaran:
                          </span>
                          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                            {konteks2B?.indikators
                              ?.filter((ind: any) => ind.sasaran_id === sasaran.id)
                              .map((ind: any, iIdx: number) => (
                                <div key={ind.id || iIdx} className='p-2.5 rounded-lg bg-background border text-[11px] space-y-1 shadow-2xs'>
                                  <p className='font-medium text-foreground'>{ind.indikator?.indikator || ind.nama || `Indikator #${iIdx + 1}`}</p>
                                  <div className='flex items-center justify-between text-muted-foreground font-mono text-[10px] pt-1 border-t'>
                                    <span>Target: <strong className='text-foreground'>{ind.target || '100%'} {ind.satuan || ''}</strong></span>
                                    <span>Polaritas: <strong className='text-foreground'>{ind.polaritas || 'Positif'}</strong></span>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      </div>
                    ))}
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
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-1'>
                  <span className='text-[11px] text-muted-foreground block font-medium'>Total Program Utama:</span>
                  <p className='font-bold text-sm text-foreground font-mono'>
                    {konteks2C?.programs?.length || 0} Program
                  </p>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-1'>
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
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-1'>
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
                    {konteks2C?.programs?.map((program: any) => (
                      <div key={program.id} className='rounded-xl border bg-card p-4 space-y-3 shadow-2xs'>
                        <div className='flex items-start justify-between gap-3'>
                          <div className='space-y-0.5'>
                            <div className='flex items-center gap-2'>
                              <Badge className='font-mono text-xs bg-primary text-primary-foreground font-semibold'>
                                NO: {program.kode}
                              </Badge>
                              <span className='text-xs font-bold text-foreground'>
                                PROGRAM: {program.nama}
                              </span>
                            </div>
                            <p className='text-[11px] text-muted-foreground font-mono pl-1'>
                              Indikator: {program.indikator || '-'} • Target: {program.target || '-'} {program.satuan || ''}
                            </p>
                          </div>
                        </div>

                        {/* Kegiatan Children */}
                        {(program.children?.length || 0) > 0 && (
                          <div className='pl-4 space-y-2.5 border-l-2 border-primary/20'>
                            {program.children?.map((kegiatan: any) => (
                              <div key={kegiatan.id} className='p-3 rounded-lg bg-muted/30 border space-y-2'>
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

                                {/* Sub-kegiatans */}
                                {(kegiatan.children?.length || 0) > 0 && (
                                  <div className='pl-3 space-y-1.5 border-l border-border'>
                                    {kegiatan.children?.map((sub: any) => (
                                      <div key={sub.id} className='p-2 rounded bg-background border text-[11px] flex items-center justify-between gap-2 shadow-2xs'>
                                        <div className='flex items-center gap-1.5'>
                                          <span className='font-mono font-bold text-primary'>{sub.kode}</span>
                                          <span>{sub.nama}</span>
                                        </div>
                                        <span className='text-muted-foreground font-mono text-[10px]'>
                                          Target: {sub.target || '100'} {sub.satuan || '%'}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
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
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <ShieldAlert className='h-4 w-4 shrink-0' />
                <span>
                  Lembar Pemeriksaan Identifikasi Risiko Sasaran Strategis Renstra OPD (SPIP / BPKP).
                </span>
              </div>

              <div className='rounded-xl border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/50 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-3 text-start'>No</th>
                      <th className='p-3 text-start'>Sasaran Strategis</th>
                      <th className='p-3 text-start'>Pernyataan Risiko</th>
                      <th className='p-3 text-start'>Kategori</th>
                      <th className='p-3 text-start'>Penyebab Utama</th>
                      <th className='p-3 text-start'>Dampak Terhadap Sasaran</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-mono text-muted-foreground'>1</td>
                      <td className='p-3 font-medium text-foreground'>Peningkatan Kualitas Infrastruktur Permukiman</td>
                      <td className='p-3 font-semibold text-destructive'>Keterlambatan penyelesaian proyek fisik akibat cuaca ekstrem & sengketa lahan</td>
                      <td className='p-3'><Badge variant='outline' className='text-[10px]'>Strategis / Fisik</Badge></td>
                      <td className='p-3 text-muted-foreground'>Perencanaan awal belum matang & koordinasi antar stakeholder lambat</td>
                      <td className='p-3 text-muted-foreground'>Capaian IKU persentase permukiman layak huni tidak mencapai target Renstra</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-mono text-muted-foreground'>2</td>
                      <td className='p-3 font-medium text-foreground'>Peningkatan Akuntabilitas Pengelolaan Anggaran</td>
                      <td className='p-3 font-semibold text-destructive'>Deviasi realisasi penyerapan anggaran dengan output kinerja riil di lapangan</td>
                      <td className='p-3'><Badge variant='outline' className='text-[10px]'>Keuangan</Badge></td>
                      <td className='p-3 text-muted-foreground'>Kapasitas PPK dan pengawas lapangan dalam pengujian mutu belum seragam</td>
                      <td className='p-3 text-muted-foreground'>Potensi temuan audit BPK dan penurunan opini akuntabilitas keuangan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 4: FORM 3C (Identifikasi Risiko Operasional) */}
          {currentStep.id === '3c' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <FolderTree className='h-4 w-4 shrink-0' />
                <span>
                  Lembar Pemeriksaan Identifikasi Risiko Operasional Kegiatan & Pelayanan Publik OPD.
                </span>
              </div>

              <div className='rounded-xl border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/50 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-3 text-start'>Kode Kegiatan</th>
                      <th className='p-3 text-start'>Tahapan Proses</th>
                      <th className='p-3 text-start'>Risiko Operasional</th>
                      <th className='p-3 text-start'>Pengendalian Eksisting</th>
                      <th className='p-3 text-start'>Status Efektivitas</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-mono text-primary font-bold'>A.1.1</td>
                      <td className='p-3 font-medium'>Verifikasi Dokumen Kelayakan Teknis</td>
                      <td className='p-3 font-semibold text-destructive'>Keterlambatan verifikasi berkas permohonan masyarakat melebihi SLA standar</td>
                      <td className='p-3 text-muted-foreground'>Checklist dokumen manual dan buku ekspedisi fisik</td>
                      <td className='p-3'><Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>Kurang Memadai</Badge></td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-mono text-primary font-bold'>A.2.1</td>
                      <td className='p-3 font-medium'>Pelaksanaan Pengawasan Konstruksi</td>
                      <td className='p-3 font-semibold text-destructive'>Ketidaksesuaian spesifikasi material pekerjaan dengan RAB kontrak</td>
                      <td className='p-3 text-muted-foreground'>Uji petik konsultan pengawas dan laporan mingguan</td>
                      <td className='p-3'><Badge className='bg-emerald-500/15 text-emerald-700 text-[10px]'>Cukup Memadai</Badge></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 5: FORM 4 (Analisis Risiko) */}
          {currentStep.id === '4' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <BarChart3 className='h-4 w-4 shrink-0' />
                <span>
                  Matriks Skoring & Analisis Risiko (Kemungkinan 1-5 x Dampak 1-5).
                </span>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-3 gap-3.5'>
                <div className='p-4 rounded-xl border bg-destructive/10 border-destructive/30 space-y-1 shadow-2xs'>
                  <span className='text-[11px] text-destructive font-semibold block'>Risiko Tingkat Tinggi (16-25):</span>
                  <p className='text-2xl font-bold font-mono text-destructive'>2 Risiko</p>
                  <p className='text-[10px] text-muted-foreground'>Wajib dilakukan mitigasi segera</p>
                </div>
                <div className='p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 space-y-1 shadow-2xs'>
                  <span className='text-[11px] text-amber-700 dark:text-amber-400 font-semibold block'>Risiko Tingkat Sedang (10-15):</span>
                  <p className='text-2xl font-bold font-mono text-amber-700 dark:text-amber-400'>4 Risiko</p>
                  <p className='text-[10px] text-muted-foreground'>Perlu monitoring berkala</p>
                </div>
                <div className='p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 space-y-1 shadow-2xs'>
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
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <PieChart className='h-4 w-4 shrink-0' />
                <span>
                  Penetapan Prioritas Risiko & Selera Risiko (Risk Appetite) Pemerintah Daerah.
                </span>
              </div>

              <div className='rounded-xl border p-4 bg-muted/20 space-y-3'>
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
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <Layers className='h-4 w-4 shrink-0' />
                <span>
                  Pemeriksaan Rencana Tindak Pengendalian Tambahan (RTP) untuk Menurunkan Level Risiko.
                </span>
              </div>

              <div className='rounded-xl border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/50 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-3 text-start'>Uraian Tindak Pengendalian</th>
                      <th className='p-3 text-start'>Target Output</th>
                      <th className='p-3 text-start'>Penanggung Jawab (PIC)</th>
                      <th className='p-3 text-start'>Jadwal Realisasi</th>
                      <th className='p-3 text-start'>Anggaran</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-semibold text-foreground'>Digitalisasi Layanan Verifikasi Dokumen Terpadu (Aplikasi Web)</td>
                      <td className='p-3'>Sistem Informasi Terintegrasi 100%</td>
                      <td className='p-3 font-medium'>Kepala Bidang Permukiman</td>
                      <td className='p-3 font-mono text-muted-foreground'>Triwulan II 2026</td>
                      <td className='p-3 font-mono font-bold text-emerald-600'>Rp 75.000.000</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-semibold text-foreground'>Pelatihan Sertifikasi Pengawasan Konstruksi bagi PPK & PPTK</td>
                      <td className='p-3'>15 Pegawai Tersertifikasi</td>
                      <td className='p-3 font-medium'>Sekretaris Dinas</td>
                      <td className='p-3 font-mono text-muted-foreground'>Triwulan III 2026</td>
                      <td className='p-3 font-mono font-bold text-emerald-600'>Rp 50.000.000</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* STEP 8: FORM 7 (Pemantauan Pelaksanaan RTP) */}
          {currentStep.id === '7' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <Activity className='h-4 w-4 shrink-0' />
                <span>
                  Monitoring Progres Realisasi Pelaksanaan Rencana Tindak Pengendalian (RTP).
                </span>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
                <div className='p-4 rounded-xl border bg-muted/20 space-y-1.5 shadow-2xs'>
                  <span className='font-bold text-foreground block'>RTP Tuntas Tepat Waktu:</span>
                  <p className='text-3xl font-bold font-mono text-emerald-600'>85%</p>
                  <p className='text-muted-foreground text-[11px]'>Sebagian besar program mitigasi telah diimplementasikan.</p>
                </div>
                <div className='p-4 rounded-xl border bg-muted/20 space-y-1.5 shadow-2xs'>
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
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <AlertTriangle className='h-4 w-4 shrink-0' />
                <span>
                  Buku Catatan Kejadian Risiko Nyata (Risk Event Register) & Tanggap Darurat.
                </span>
              </div>
              <div className='p-4 rounded-xl border bg-muted/20 text-muted-foreground leading-relaxed'>
                Tidak tercatat kejadian risiko mayor yang menyebabkan kerugian material atau kegagalan pelayanan publik selama periode penilaian berjalan.
              </div>
            </div>
          )}

          {/* STEP 10: FORM 9 (Pemantauan Risiko Berkala) */}
          {currentStep.id === '9' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <TrendingUp className='h-4 w-4 shrink-0' />
                <span>
                  Evaluasi Level Risiko Residual & Tren Dinamika Risiko Periode Berkala.
                </span>
              </div>
              <div className='p-4 rounded-xl border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-medium'>
                Tren risiko residual menunjukkan penurunan sebesar 35% setelah penerapan RTP Form 6.
              </div>
            </div>
          )}

          {/* STEP 11: FORM 10 (Laporan Pengelolaan Risiko) */}
          {currentStep.id === '10' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <FileCheck className='h-4 w-4 shrink-0' />
                <span>
                  Kompilasi Laporan Resmi Manajemen Risiko & Pernyataan Efektivitas SPIP.
                </span>
              </div>
              <div className='p-4 rounded-xl border bg-muted/20 space-y-2 text-muted-foreground leading-relaxed'>
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
              <div className='p-3.5 rounded-xl border bg-primary/5 text-primary text-xs flex items-center gap-2'>
                <BrainCircuit className='h-4 w-4 shrink-0' />
                <span>
                  Analisis Akar Masalah (Diagram Tulang Ikan / Fishbone BPKP & 5-Whys).
                </span>
              </div>
              <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs'>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>1. Man (SDM):</span>
                  <span className='text-muted-foreground text-[11px]'>Kompetensi teknis pegawai perlu sertifikasi berkala</span>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>2. Method (SOP):</span>
                  <span className='text-muted-foreground text-[11px]'>SOP pelayanan belum seluruhnya terintegrasi digital</span>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>3. Machine (TI):</span>
                  <span className='text-muted-foreground text-[11px]'>Infrastruktur jaringan server dan backup perlu penguatan</span>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>4. Material (Data):</span>
                  <span className='text-muted-foreground text-[11px]'>Basis data spasial perumahan masih tersebar parsial</span>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>5. Money (Dana):</span>
                  <span className='text-muted-foreground text-[11px]'>Alokasi pemeliharaan berkala mencukupi standar SPM</span>
                </div>
                <div className='p-3.5 rounded-xl border bg-muted/20 space-y-0.5 shadow-2xs'>
                  <span className='font-bold block text-primary'>6. Milieu (Eksternal):</span>
                  <span className='text-muted-foreground text-[11px]'>Kondisi geologis daerah rawan bencana alam</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 13: FORM FRAUD (Penilaian Risiko Kecurangan) */}
          {currentStep.id === 'fraud' && (
            <div className='space-y-4 text-xs'>
              <div className='p-3.5 rounded-xl border bg-destructive/10 border-destructive/30 text-destructive text-xs flex items-center gap-2'>
                <ShieldAlert className='h-4 w-4 shrink-0' />
                <span>
                  Fraud Risk Assessment (FRA) - Matriks Titik Rawan Kecurangan & Pencegahan Korupsi (BPKP / KPK).
                </span>
              </div>

              <div className='rounded-xl border overflow-hidden shadow-2xs'>
                <table className='w-full text-xs text-start'>
                  <thead className='bg-muted/50 border-b font-semibold text-muted-foreground'>
                    <tr>
                      <th className='p-3 text-start'>Area Rawan Fraud</th>
                      <th className='p-3 text-start'>Bentuk Potensi Kecurangan</th>
                      <th className='p-3 text-start'>Level Risiko</th>
                      <th className='p-3 text-start'>Sistem Pencegahan Anti-Korupsi</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y'>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-semibold text-foreground'>Pengadaan Barang & Jasa (PBJ)</td>
                      <td className='p-3 text-muted-foreground'>Pengondisian pemenang lelang atau pemecahan paket pekerjaan</td>
                      <td className='p-3'><Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge></td>
                      <td className='p-3 font-medium text-foreground'>E-Katalog lokal, probity audit inspektorat, pakta integritas vendor</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-semibold text-foreground'>Pelayanan Perizinan & Sertifikasi</td>
                      <td className='p-3 text-muted-foreground'>Permintaan imbalan / gratifikasi untuk percepatan penerbitan izin</td>
                      <td className='p-3'><Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>Sedang</Badge></td>
                      <td className='p-3 font-medium text-foreground'>Pembayaran cashless (QRIS/Bank Jabar), CCTV ruang layanan, WBS online</td>
                    </tr>
                    <tr className='hover:bg-muted/20'>
                      <td className='p-3 font-semibold text-foreground'>Pengelolaan Kas & Belanja Hibah</td>
                      <td className='p-3 text-muted-foreground'>Keterlambatan penyusunan SPJ atau laporan pertanggungjawaban fiktif</td>
                      <td className='p-3'><Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge></td>
                      <td className='p-3 font-medium text-foreground'>Verifikasi berlapis bendahara, CMS perbankan non-tunai, audit ketaatan</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* 5. FOOTER STEPPER NAVIGATION BAR */}
        <div className='p-4 sm:p-5 border-t bg-muted/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={currentStepIndex === 0}
            onClick={() => setCurrentStepIndex((prev) => Math.max(prev - 1, 0))}
            className='h-8.5 text-xs gap-1.5'
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
              className='h-8.5 text-xs gap-1.5'
            >
              <span>Langkah Selanjutnya</span>
              <ChevronRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </div>

      {/* 6. REJECTION NOTES MODAL DIALOG WITH PRESET CHIPS */}
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
            {/* Quick preset chips */}
            <div className='space-y-1.5'>
              <Label className='text-[11px] text-muted-foreground font-medium flex items-center gap-1'>
                <Sparkles className='h-3 w-3 text-primary' />
                Pilihan Cepat Catatan Revisi (klik untuk memilih):
              </Label>
              <div className='flex flex-wrap gap-1.5'>
                {PRESET_REJECTION_REASONS.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type='button'
                    onClick={() => {
                      setRejectionNote((prev) => (prev ? `${prev}. ${preset}` : preset))
                    }}
                    className='text-[11px] text-start px-2 py-1 rounded-md border border-border/80 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors'
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

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
