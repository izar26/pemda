import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarRange,
  CheckCircle2,
  Database,
  Info,
  ListChecks,
  Loader2,
  Lock,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Target,
  UserCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePermissions } from '@/hooks/use-permissions'
import { masterDataService } from '@/services/master-data-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import type { KonteksPenilaianFormData } from '@/types/risiko'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/searchable-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { RisikoWizardHeader } from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'

const form2BSchema = z.object({
  sumber_data_id: z.string().min(1, 'Sumber Data wajib dipilih terlebih dahulu.'),
  tujuan_penilaian_id: z
    .string()
    .min(1, 'Tujuan Strategis wajib dipilih (1 OPD hanya 1 Tujuan).'),
  sasaran_ids: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 Sasaran Strategis yang akan dinilai.'),
  indikator_ids: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 IKU / Indikator Renstra OPD yang akan dinilai.'),
  informasi_lain: z.string().optional(),
})

type Form2BValues = z.infer<typeof form2BSchema>

export function KonteksStrategisPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()





  const {
    user,
    isOpdRole,
    opds,
    effectiveOpdId,
    setSelectedOpdId,
    activePeriode,
    konteks2B,
    opdMeta,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isLoading,
    readiness,
    hasAuditor,
    isLocked,
    refetchWizardProgress,
  } = useRisikoWizardProgress()

  const is2BApproved = Boolean(readiness?.is_2b_approved)
  const rejectionNote2B = readiness?.rejection_notes?.['2b']

  const canEdit =
    (hasPermission('konteks_risiko.create') || hasPermission('konteks_risiko.edit')) &&
    hasAuditor && !isLocked && !is2BApproved

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitIntent, setSubmitIntent] = useState<'save' | 'save_and_next'>('save')

  // Crucial Change Impact Confirmation Modal State
  const [pendingCrucialPayload, setPendingCrucialPayload] = useState<{
    values: Form2BValues
    intent: 'save' | 'save_and_next'
    changedSumberData: boolean
    changedTujuan: boolean
  } | null>(null)
  const [impactMode, setImpactMode] = useState<'keep' | 'reset'>('keep')

  const form = useForm<Form2BValues>({
    resolver: zodResolver(form2BSchema),
    defaultValues: {
      sumber_data_id: '',
      tujuan_penilaian_id: '',
      sasaran_ids: [],
      indikator_ids: [],
      informasi_lain: '-',
    },
  })

  const watchedSumberDataId = form.watch('sumber_data_id')
  const watchedTujuanId = form.watch('tujuan_penilaian_id')
  const watchedSasaranIds = form.watch('sasaran_ids')
  const watchedIndikatorIds = form.watch('indikator_ids')

  // Populate form when konteks2B or effectiveOpdId changes
  useEffect(() => {
    if (konteks2B) {
      form.reset({
        sumber_data_id: konteks2B.sumber_data_id || '',
        tujuan_penilaian_id: konteks2B.tujuan_penilaian_id || '',
        sasaran_ids: konteks2B.sasarans?.map((s) => s.id) || [],
        indikator_ids: konteks2B.indikators?.map((i) => i.id) || [],
        informasi_lain: konteks2B.informasi_lain || '-',
      })
    } else {
      form.reset({
        sumber_data_id: '',
        tujuan_penilaian_id: '',
        sasaran_ids: [],
        indikator_ids: [],
        informasi_lain: '-',
      })
    }
  }, [konteks2B, effectiveOpdId, form])

  // 1. Fetch Master Sumber Data
  const { data: sumberDataResponse, isLoading: isLoadingSumberData } = useQuery({
    queryKey: ['master-sumber-data-active'],
    queryFn: () =>
      masterDataService.getItems('sumber-data', { is_active: true, per_page: 100 }),
  })
  const sumberDataList = sumberDataResponse?.data || []

  // Auto-select standard default Sumber Data (Renstra SKPD) if field is empty
  useEffect(() => {
    if (sumberDataList.length > 0 && !form.getValues('sumber_data_id') && !konteks2B?.sumber_data_id) {
      const renstra = sumberDataList.find((sd) => sd.nama.toLowerCase().includes('renstra'))
      const defaultId = renstra?.id || sumberDataList[0]?.id
      if (defaultId) {
        form.setValue('sumber_data_id', defaultId, { shouldValidate: true })
      }
    }
  }, [sumberDataList, konteks2B?.sumber_data_id, form])

  // 2. Fetch Tujuan Strategis for OPD + Active Periode (filtered by Selected Sumber Data with fallback)
  const { data: tujuanResponse, isLoading: isLoadingTujuan } = useQuery({
    queryKey: [
      'wizard-2b-tujuan',
      effectiveOpdId,
      activePeriode?.id,
      watchedSumberDataId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedTujuan({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
        sumber_data_id: watchedSumberDataId || undefined,
        all: true,
      }),
    enabled:
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id),
  })
  const tujuanList = tujuanResponse?.data || []

  // 3. Fetch Sasaran Strategis dynamically based on selected Tujuan Strategis
  const { data: sasaranResponse, isLoading: isLoadingSasaran } = useQuery({
    queryKey: [
      'wizard-2b-sasaran',
      effectiveOpdId,
      activePeriode?.id,
      watchedTujuanId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedSasaran({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
        tujuan_penilaian_id: watchedTujuanId,
        all: true,
      }),
    enabled: Boolean(effectiveOpdId) && Boolean(watchedTujuanId),
  })
  const sasaranList = sasaranResponse?.data || []

  // 4. Fetch IKU / Indikator Renstra dynamically for the OPD & Tujuan, filtered by selected Sasarans
  const { data: indikatorResponse, isLoading: isLoadingIndikator } = useQuery({
    queryKey: [
      'wizard-2b-indikator',
      effectiveOpdId,
      activePeriode?.id,
      watchedTujuanId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedIndikator({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
        tujuan_penilaian_id: watchedTujuanId,
        all: true,
      }),
    enabled: Boolean(effectiveOpdId) && Boolean(watchedTujuanId),
  })

  const availableIndikators = useMemo(() => {
    const allInds = indikatorResponse?.data || []
    if (!watchedSasaranIds || watchedSasaranIds.length === 0) return []
    return allInds.filter((ind) =>
      watchedSasaranIds.includes(ind.sasaran_penilaian_id)
    )
  }, [indikatorResponse?.data, watchedSasaranIds])

  // Keep selected indikator_ids consistent when sasaran_ids changes
  useEffect(() => {
    if (!indikatorResponse?.data) return
    const validIds = new Set(availableIndikators.map((i) => i.id))
    const currentSelected = form.getValues('indikator_ids')
    const filtered = currentSelected.filter((id) => validIds.has(id))
    if (filtered.length !== currentSelected.length) {
      form.setValue('indikator_ids', filtered, { shouldValidate: true })
    }
  }, [availableIndikators, indikatorResponse?.data, form])

  // Handlers for cascading resets
  function handleSumberDataChange(newSumberDataId: string) {
    const prevSumberDataId = form.getValues('sumber_data_id')
    form.setValue('sumber_data_id', newSumberDataId, { shouldValidate: true })
    if (prevSumberDataId && prevSumberDataId !== newSumberDataId) {
      form.setValue('tujuan_penilaian_id', '')
      form.setValue('sasaran_ids', [])
      form.setValue('indikator_ids', [])
    }
  }

  function handleTujuanChange(newTujuanId: string) {
    const prevTujuanId = form.getValues('tujuan_penilaian_id')
    form.setValue('tujuan_penilaian_id', newTujuanId, { shouldValidate: true })
    if (prevTujuanId !== newTujuanId) {
      form.setValue('sasaran_ids', [])
      form.setValue('indikator_ids', [])
    }
  }

  function toggleSasaran(sasaranId: string, checked: boolean) {
    const current = form.getValues('sasaran_ids')
    const next = checked
      ? Array.from(new Set([...current, sasaranId]))
      : current.filter((id) => id !== sasaranId)
    form.setValue('sasaran_ids', next, { shouldValidate: true })
  }

  function toggleAllSasaran() {
    if (watchedSasaranIds.length === sasaranList.length) {
      form.setValue('sasaran_ids', [], { shouldValidate: true })
    } else {
      form.setValue(
        'sasaran_ids',
        sasaranList.map((s) => s.id),
        { shouldValidate: true }
      )
    }
  }

  function toggleIndikator(indikatorId: string, checked: boolean) {
    const current = form.getValues('indikator_ids')
    const next = checked
      ? Array.from(new Set([...current, indikatorId]))
      : current.filter((id) => id !== indikatorId)
    form.setValue('indikator_ids', next, { shouldValidate: true })
  }

  function toggleAllIndikators() {
    if (watchedIndikatorIds.length === availableIndikators.length) {
      form.setValue('indikator_ids', [], { shouldValidate: true })
    } else {
      form.setValue(
        'indikator_ids',
        availableIndikators.map((i) => i.id),
        { shouldValidate: true }
      )
    }
  }

  // Handle form submission with Crucial Change Impact check
  async function handleFormSubmit(values: Form2BValues) {
    if (!effectiveOpdId || !activePeriode?.id) return

    const hasExisting2CItems =
      (opdMeta?.operasional_summary?.total_items || 0) > 0
    const changedSumberData = Boolean(
      konteks2B?.id &&
        konteks2B.sumber_data_id &&
        konteks2B.sumber_data_id !== values.sumber_data_id
    )
    const changedTujuan = Boolean(
      konteks2B?.id &&
        konteks2B.tujuan_penilaian_id &&
        konteks2B.tujuan_penilaian_id !== values.tujuan_penilaian_id
    )

    if (hasExisting2CItems && (changedSumberData || changedTujuan)) {
      setImpactMode('keep')
      setPendingCrucialPayload({
        values,
        intent: submitIntent,
        changedSumberData,
        changedTujuan,
      })
      return
    }

    await executeSave(values, submitIntent, false)
  }

  async function executeSave(
    values: Form2BValues,
    intent: 'save' | 'save_and_next',
    resetOperasionalItems: boolean
  ) {
    if (!effectiveOpdId || !activePeriode?.id) return
    setIsSubmitting(true)
    try {
      const payload: KonteksPenilaianFormData = {
        periode_penilaian_id: activePeriode.id,
        opd_id: effectiveOpdId,
        sumber_data_id: values.sumber_data_id,
        tujuan_penilaian_id: values.tujuan_penilaian_id,
        sasaran_ids: values.sasaran_ids,
        indikator_ids: values.indikator_ids,
        informasi_lain: values.informasi_lain?.trim() || '-',
        status: 'final',
        reset_operasional_items: resetOperasionalItems,
      }

      if (konteks2B?.id) {
        await risikoService.updateKonteks(konteks2B.id, payload)
      } else {
        await risikoService.saveKonteks(payload)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
      ])

      setPendingCrucialPayload(null)

      if (intent === 'save_and_next') {
        toast.success(
          'Langkah 1 (Form 2B) berhasil disimpan. Melanjutkan ke Langkah 2: Konteks Operasional (2C).'
        )
        navigate({ to: '/risiko/konteks-operasional' })
      } else {
        toast.success('Penetapan Konteks Risiko Strategis (Form 2B) berhasil disimpan.')
      }
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data Form 2B.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const resolvedOpdName = useMemo(() => {
    if (isOpdRole) {
      return user?.opd?.nama || konteks2B?.opd?.nama || 'Perangkat Daerah Anda'
    }
    const found = opds.find((o) => String(o.id) === String(effectiveOpdId))
    return found ? `${found.kode} - ${found.nama}` : 'Pilih Perangkat Daerah'
  }, [isOpdRole, user?.opd?.nama, konteks2B?.opd?.nama, opds, effectiveOpdId])

  const resolvedKepalaNama =
    opdMeta?.kepala_opd?.nama || konteks2B?.nama_kepala || 'Belum diatur di Manajemen Pegawai'
  const resolvedKepalaNip =
    opdMeta?.kepala_opd?.nip || konteks2B?.nip_kepala || '-'

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6 pb-12'>
        {/* Page Title (Sticky) */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
          <div className='space-y-1 min-w-0 flex-1'>
            <div className='flex items-center gap-2 flex-wrap'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                Penetapan Konteks Risiko Strategis OPD
              </h2>
              <Badge variant='outline' className='font-mono text-xs border-primary/30 text-primary bg-primary/5'>
                Form 2B • Langkah 1
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground'>
              Tetapkan Sumber Data, 1 Tujuan Strategis, Sasaran Strategis, serta IKU Renstra OPD yang akan dinilai.
            </p>
          </div>
        </PageHeader>

        {/* Wizard Stepper Header */}
        <RisikoWizardHeader
          currentStepId='2b'
          steps={steps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          readiness={readiness}
          effectiveOpdId={effectiveOpdId}
          onSubmissionSuccess={refetchWizardProgress}
        />

        {/* Form 2B Approved Banner */}
        {is2BApproved && (
          <div className='flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-400'>
            <CheckCircle2 className='h-5 w-5 shrink-0' />
            <div className='text-xs'>
              <p className='font-bold text-sm'>
                Form 2B Telah Disetujui Auditor Pengawas
              </p>
              <p className='text-emerald-700/80 dark:text-emerald-400/80'>
                Konteks risiko strategis ini telah diperiksa dan disetujui (read-only).
              </p>
            </div>
          </div>
        )}

        {/* Form 2B Rejection Note Banner */}
        {!is2BApproved && rejectionNote2B && (
          <div className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-destructive'>
            <AlertCircle className='h-5 w-5 shrink-0 mt-0.5' />
            <div className='text-xs space-y-1'>
              <p className='font-bold text-sm'>
                Perlu Revisi dari Auditor Pengawas (Form 2B)
              </p>
              <p className='leading-relaxed'>
                {rejectionNote2B}
              </p>
            </div>
          </div>
        )}

        {/* Active Periode Guard */}
        {!isLoading && !hasAuditor ? (
          <div className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive'>
            <ShieldAlert className='h-5 w-5 shrink-0 mt-0.5' />
            <div className='text-xs space-y-1'>
              <p className='font-bold text-sm'>
                Formulir Terkunci: Belum Ada Auditor Pengawas yang Ditugaskan
              </p>
              <p className='text-destructive/90 leading-relaxed'>
                Perangkat Daerah (OPD) ini belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat. Pengisian atau pengubahan Formulir Konteks Risiko Strategis (Form 2B) hanya dapat dilakukan setelah Inspektorat menetapkan Auditor Pengawas pada menu <strong>Pengawasan & Pembinaan &rarr; Penugasan Auditor</strong>.
              </p>
            </div>
          </div>
        ) : !isLoading && !activePeriode ? (
          <div className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive'>
            <AlertTriangle className='h-5 w-5 shrink-0 mt-0.5' />
            <div className='text-xs space-y-1'>
              <p className='font-bold text-sm'>
                Form Tidak Dapat Diisi: Belum Ada Periode Penilaian Aktif
              </p>
              <p className='text-destructive/90 leading-relaxed'>
                Formulir Penetapan Konteks Risiko Strategis (2B) hanya dapat diisi apabila terdapat Periode Penilaian yang berstatus <strong>Aktif</strong>. Silakan hubungi Administrator / Bapperida untuk mengaktifkan periode penilaian pada menu <strong>Perencanaan Kinerja &rarr; Periode Penilaian</strong>.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-44 w-full rounded-xl' />
            <Skeleton className='h-96 w-full rounded-xl' />
          </div>
        ) : (
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(handleFormSubmit)}
              className='space-y-6'
            >
              {/* CARD 1: IDENTITAS & KONTEKS INSTANSI (AUTO-RESOLVED) */}
              <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
                <div className='border-b bg-muted/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap'>
                  <div className='flex items-center gap-2'>
                    <Building2 className='h-4 w-4 text-primary' />
                    <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Identitas Penilaian & Perangkat Daerah
                    </h3>
                  </div>
                  <div className='flex items-center gap-2 text-[11px] text-muted-foreground'>
                    <UserCheck className='h-3.5 w-3.5 text-emerald-600' />
                    <span>
                      Kepala OPD:{' '}
                      <strong className='text-foreground'>{resolvedKepalaNama}</strong>
                      {resolvedKepalaNip !== '-' && ` (NIP. ${resolvedKepalaNip})`}
                    </span>
                  </div>
                </div>

                <div className='p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                  {/* Nama Pemda */}
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Nama Pemda <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      value={konteks2B?.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
                      disabled
                      className='h-9 text-xs bg-muted/60 font-medium'
                    />
                  </div>

                  {/* Tahun Penilaian */}
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                      <CalendarRange className='h-3.5 w-3.5 text-primary' />
                      <span>
                        Tahun Penilaian <span className='text-destructive'>*</span>
                      </span>
                    </label>
                    <Input
                      value={String(activePeriode?.tahun_penilaian || '-')}
                      disabled
                      className='h-9 text-xs bg-muted/60 font-mono font-bold'
                    />
                  </div>

                  {/* Periode yang Dinilai */}
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Periode yang Dinilai <span className='text-destructive'>*</span>
                    </label>
                    <Input
                      value={activePeriode?.rentang_tahun || '-'}
                      disabled
                      className='h-9 text-xs bg-muted/60 font-mono font-medium'
                    />
                  </div>

                  {/* OPD yang Dinilai */}
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      OPD yang Dinilai <span className='text-destructive'>*</span>
                    </label>
                    {isOpdRole ? (
                      <Input
                        value={resolvedOpdName}
                        disabled
                        className='h-9 text-xs bg-muted/60 font-semibold'
                      />
                    ) : (
                      <SearchableSelect
                        value={effectiveOpdId}
                        onValueChange={(val: string) => setSelectedOpdId(val)}
                        placeholder='Pilih Perangkat Daerah...'
                        searchPlaceholder='Cari kode atau nama OPD...'
                        emptyMessage='Perangkat daerah tidak ditemukan.'
                        options={opds.map((opd) => ({
                          value: String(opd.id),
                          label: `${opd.kode} - ${opd.nama}`,
                        }))}
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* CARD 2: FORM CASCADING (SUMBER DATA -> TUJUAN -> SASARAN -> IKU -> INFORMASI LAIN) */}
              <div className='rounded-xl border bg-card shadow-2xs overflow-hidden divide-y'>
                {/* STEP FIELD 1: SUMBER DATA */}
                <div className='p-5 space-y-3'>
                  <FormField
                    control={form.control}
                    name='sumber_data_id'
                    render={({ field }) => (
                      <FormItem className='max-w-xl'>
                        <div className='flex items-center gap-2'>
                          <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono'>
                            1
                          </span>
                          <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                            <Database className='h-3.5 w-3.5 text-primary' />
                            <span>
                              Sumber Data <span className='text-destructive'>*</span>
                            </span>
                          </FormLabel>
                        </div>
                        <p className='text-[11px] text-muted-foreground pl-7'>
                          Pilih sumber dokumen perencanaan terlebih dahulu untuk menampilkan daftar Tujuan Strategis yang tersedia.
                        </p>
                        <div className='pl-7 pt-1'>
                          <FormControl>
                            <SearchableSelect
                              value={field.value}
                              onValueChange={handleSumberDataChange}
                              disabled={!canEdit || isLoadingSumberData}
                              placeholder={
                                isLoadingSumberData
                                  ? 'Memuat master sumber data...'
                                  : 'Pilih Sumber Data (misal: Renstra SKPD)...'
                              }
                              searchPlaceholder='Cari sumber data...'
                              options={sumberDataList.map((sd) => ({
                                value: sd.id,
                                label: sd.nama,
                              }))}
                            />
                          </FormControl>
                          <FormMessage className='mt-1.5' />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* STEP FIELD 2: TUJUAN STRATEGIS (1 OPD = 1 TUJUAN) */}
                <div className='p-5 space-y-3'>
                  <FormField
                    control={form.control}
                    name='tujuan_penilaian_id'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex items-center justify-between gap-2 flex-wrap'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                                watchedSumberDataId
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              2
                            </span>
                            <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                              <Target className='h-3.5 w-3.5 text-primary' />
                              <span>
                                Tujuan Strategis <span className='text-destructive'>*</span>
                              </span>
                            </FormLabel>
                          </div>
                          <Badge variant='secondary' className='text-[10px] font-medium'>
                            1 OPD Hanya Boleh Memilih 1 Tujuan Strategis
                          </Badge>
                        </div>
                        <p className='text-[11px] text-muted-foreground pl-7'>
                          Diambil dari Tujuan Strategis pada Sumber Data terpilih yang diatur di Perencanaan Kinerja.
                        </p>

                        <div className='pl-7 pt-1'>
                          {!watchedSumberDataId ? (
                            <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                              <Info className='h-4 w-4 shrink-0 text-muted-foreground' />
                              <span>
                                Silakan pilih <strong>Sumber Data</strong> pada bagian (1) terlebih dahulu untuk memuat daftar Tujuan Strategis.
                              </span>
                            </div>
                          ) : isLoadingTujuan ? (
                            <div className='space-y-2'>
                              <Skeleton className='h-12 w-full rounded-lg' />
                              <Skeleton className='h-12 w-full rounded-lg' />
                            </div>
                          ) : tujuanList.length === 0 ? (
                            <div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5'>
                              <AlertTriangle className='h-4 w-4 shrink-0 mt-0.5' />
                              <div className='space-y-1'>
                                <p className='font-semibold'>
                                  Tidak Ada Tujuan Strategis pada Sumber Data Ini
                                </p>
                                <p className='text-[11px] opacity-90'>
                                  Belum ada Tujuan Strategis untuk OPD dan Sumber Data yang dipilih pada periode aktif ini. Silakan periksa menu <strong>Perencanaan Kinerja &rarr; Tujuan, Sasaran & Indikator</strong>.
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className='grid grid-cols-1 gap-2'>
                              {tujuanList.map((tujuan) => {
                                const isSelected = field.value === tujuan.id
                                return (
                                  <label
                                    key={tujuan.id}
                                    onClick={() =>
                                      canEdit && handleTujuanChange(tujuan.id)
                                    }
                                    className={cn(
                                      'flex items-start gap-3 rounded-lg border p-3.5 transition-all select-none',
                                      canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                                      isSelected
                                        ? 'border-primary bg-primary/5 ring-1 ring-primary/25 shadow-2xs'
                                        : 'border-border bg-card hover:bg-muted/40'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors',
                                        isSelected
                                          ? 'border-primary bg-primary text-primary-foreground'
                                          : 'border-muted-foreground/40 bg-background'
                                      )}
                                    >
                                      {isSelected && (
                                        <span className='h-1.5 w-1.5 rounded-full bg-primary-foreground' />
                                      )}
                                    </div>
                                    <div className='space-y-1 min-w-0 flex-1'>
                                      <div className='flex items-center gap-2 flex-wrap'>
                                        {tujuan.kode_tujuan && (
                                          <Badge
                                            variant={isSelected ? 'default' : 'outline'}
                                            className='text-[10px] font-mono px-1.5 py-0'
                                          >
                                            {tujuan.kode_tujuan}
                                          </Badge>
                                        )}
                                        {tujuan.sumber_data?.nama && (
                                          <Badge
                                            variant='secondary'
                                            className='text-[10px] px-1.5 py-0 font-normal'
                                          >
                                            {tujuan.sumber_data.nama}
                                          </Badge>
                                        )}
                                        <span className='text-xs font-semibold text-foreground leading-relaxed'>
                                          {tujuan.tujuan}
                                        </span>
                                      </div>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                          <FormMessage className='mt-1.5' />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* STEP FIELD 3: SASARAN STRATEGIS (DYNAMIC MULTI-SELECT) */}
                <div className='p-5 space-y-3'>
                  <FormField
                    control={form.control}
                    name='sasaran_ids'
                    render={() => (
                      <FormItem>
                        <div className='flex items-center justify-between gap-2 flex-wrap'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                                watchedTujuanId
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              3
                            </span>
                            <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                              <ListChecks className='h-3.5 w-3.5 text-primary' />
                              <span>
                                Sasaran Strategis <span className='text-destructive'>*</span>
                              </span>
                            </FormLabel>
                          </div>

                          {watchedTujuanId && sasaranList.length > 0 && canEdit && (
                            <div className='flex items-center gap-2'>
                              <Badge variant='outline' className='text-[10px] font-mono'>
                                {watchedSasaranIds.length} / {sasaranList.length} dipilih
                              </Badge>
                              <Button
                                type='button'
                                variant='ghost'
                                size='sm'
                                onClick={toggleAllSasaran}
                                className='h-7 text-xs px-2'
                              >
                                {watchedSasaranIds.length === sasaranList.length
                                  ? 'Batal Pilih Semua'
                                  : 'Pilih Semua Sasaran'}
                              </Button>
                            </div>
                          )}
                        </div>
                        <p className='text-[11px] text-muted-foreground pl-7'>
                          Muncul secara dinamis berdasarkan Tujuan Strategis yang dipilih. Anda dapat memilih satu atau lebih Sasaran Strategis.
                        </p>

                        <div className='pl-7 pt-1'>
                          {!watchedTujuanId ? (
                            <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                              <Info className='h-4 w-4 shrink-0' />
                              <span>
                                Pilih <strong>Tujuan Strategis</strong> pada bagian (2) terlebih dahulu untuk menampilkan Sasaran Strategis.
                              </span>
                            </div>
                          ) : isLoadingSasaran ? (
                            <div className='space-y-2'>
                              <Skeleton className='h-11 w-full rounded-lg' />
                              <Skeleton className='h-11 w-full rounded-lg' />
                            </div>
                          ) : sasaranList.length === 0 ? (
                            <div className='rounded-lg border border-dashed p-4 text-xs text-muted-foreground'>
                              Belum ada data Sasaran Strategis yang terhubung dengan Tujuan Strategis ini.
                            </div>
                          ) : (
                            <div className='grid grid-cols-1 gap-2'>
                              {sasaranList.map((sasaran, idx) => {
                                const isChecked = watchedSasaranIds.includes(sasaran.id)
                                return (
                                  <label
                                    key={sasaran.id}
                                    className={cn(
                                      'flex items-start gap-3 rounded-lg border p-3 transition-all select-none',
                                      canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                                      isChecked
                                        ? 'border-primary/60 bg-primary/5 shadow-2xs'
                                        : 'border-border bg-card hover:bg-muted/40'
                                    )}
                                  >
                                    <Checkbox
                                      checked={isChecked}
                                      disabled={!canEdit}
                                      onCheckedChange={(checked) =>
                                        toggleSasaran(sasaran.id, Boolean(checked))
                                      }
                                      className='mt-0.5'
                                    />
                                    <div className='text-xs leading-relaxed flex-1'>
                                      <span className='font-semibold text-muted-foreground mr-1.5'>
                                        {idx + 1}.
                                      </span>
                                      {sasaran.kode_sasaran && (
                                        <Badge
                                          variant='outline'
                                          className='mr-1.5 text-[10px] font-mono px-1.5 py-0'
                                        >
                                          {sasaran.kode_sasaran}
                                        </Badge>
                                      )}
                                      <span className='font-medium text-foreground'>
                                        {sasaran.sasaran}
                                      </span>
                                    </div>
                                  </label>
                                )
                              })}
                            </div>
                          )}
                          <FormMessage className='mt-1.5' />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* STEP FIELD 4: IKU RENSTRA OPD YANG AKAN DILAKUKAN PENILAIAN */}
                <div className='p-5 space-y-3'>
                  <FormField
                    control={form.control}
                    name='indikator_ids'
                    render={() => (
                      <FormItem>
                        <div className='flex items-center justify-between gap-2 flex-wrap'>
                          <div className='flex items-center gap-2'>
                            <span
                              className={cn(
                                'flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold font-mono',
                                watchedSasaranIds.length > 0
                                  ? 'bg-primary/10 text-primary'
                                  : 'bg-muted text-muted-foreground'
                              )}
                            >
                              4
                            </span>
                            <FormLabel className='text-xs font-bold uppercase tracking-wide flex items-center gap-1.5'>
                              <CheckCircle2 className='h-3.5 w-3.5 text-primary' />
                              <span>
                                IKU Renstra OPD yang Akan Dilakukan Penilaian{' '}
                                <span className='text-destructive'>*</span>
                              </span>
                            </FormLabel>
                          </div>

                          {watchedSasaranIds.length > 0 &&
                            availableIndikators.length > 0 &&
                            canEdit && (
                              <div className='flex items-center gap-2'>
                                <Badge variant='outline' className='text-[10px] font-mono'>
                                  {watchedIndikatorIds.length} / {availableIndikators.length}{' '}
                                  dipilih
                                </Badge>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  onClick={toggleAllIndikators}
                                  className='h-7 text-xs px-2'
                                >
                                  {watchedIndikatorIds.length === availableIndikators.length
                                    ? 'Batal Pilih Semua'
                                    : 'Pilih Semua Indikator'}
                                </Button>
                              </div>
                            )}
                        </div>
                        <p className='text-[11px] text-muted-foreground pl-7'>
                          Muncul secara dinamis berdasarkan Sasaran Strategis yang dipilih. Boleh memilih lebih dari satu indikator.
                        </p>

                        <div className='pl-7 pt-1'>
                          {watchedSasaranIds.length === 0 ? (
                            <div className='rounded-lg border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground flex items-center gap-2'>
                              <Info className='h-4 w-4 shrink-0' />
                              <span>
                                Centang minimal satu <strong>Sasaran Strategis</strong> pada bagian (3) untuk menampilkan daftar IKU / Indikator Renstra OPD.
                              </span>
                            </div>
                          ) : isLoadingIndikator ? (
                            <div className='space-y-2'>
                              <Skeleton className='h-11 w-full rounded-lg' />
                              <Skeleton className='h-11 w-full rounded-lg' />
                            </div>
                          ) : availableIndikators.length === 0 ? (
                            <div className='rounded-lg border border-dashed p-4 text-xs text-muted-foreground'>
                              Tidak ditemukan IKU / Indikator untuk Sasaran Strategis yang dipilih.
                            </div>
                          ) : (
                            <div className='space-y-3'>
                              {sasaranList
                                .filter((s) => watchedSasaranIds.includes(s.id))
                                .map((sasaran) => {
                                  const indsForSasaran = availableIndikators.filter(
                                    (i) => i.sasaran_penilaian_id === sasaran.id
                                  )
                                  if (indsForSasaran.length === 0) return null

                                  return (
                                    <div
                                      key={sasaran.id}
                                      className='rounded-lg border bg-muted/15 p-3 space-y-2'
                                    >
                                      <p className='text-[11px] font-semibold text-muted-foreground'>
                                        Sasaran: <span className='text-foreground'>{sasaran.sasaran}</span>
                                      </p>
                                      <div className='grid grid-cols-1 gap-1.5'>
                                        {indsForSasaran.map((ind, idx) => {
                                          const isChecked = watchedIndikatorIds.includes(
                                            ind.id
                                          )
                                          return (
                                            <label
                                              key={ind.id}
                                              className={cn(
                                                'flex items-start gap-3 rounded-md border p-2.5 transition-all select-none',
                                                canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60 pointer-events-none',
                                                isChecked
                                                  ? 'border-primary/60 bg-primary/5'
                                                  : 'border-border bg-card hover:bg-muted/40'
                                              )}
                                            >
                                              <Checkbox
                                                checked={isChecked}
                                                disabled={!canEdit}
                                                onCheckedChange={(checked) =>
                                                  toggleIndikator(ind.id, Boolean(checked))
                                                }
                                                className='mt-0.5'
                                              />
                                              <div className='text-xs leading-relaxed flex-1 flex items-center justify-between gap-2 flex-wrap'>
                                                <div>
                                                  <span className='font-semibold text-muted-foreground mr-1.5'>
                                                    {idx + 1}.
                                                  </span>
                                                  {ind.kode_indikator && (
                                                    <span className='font-mono text-[11px] text-muted-foreground mr-1.5'>
                                                      [{ind.kode_indikator}]
                                                    </span>
                                                  )}
                                                  <span className='font-medium text-foreground'>
                                                    {ind.indikator}
                                                  </span>
                                                  {ind.satuan && (
                                                    <span className='text-muted-foreground ml-1'>
                                                      ({ind.satuan})
                                                    </span>
                                                  )}
                                                </div>
                                                <Badge
                                                  variant={
                                                    ind.jenis === 'IKU'
                                                      ? 'default'
                                                      : 'secondary'
                                                  }
                                                  className='text-[9px] px-1.5 py-0 h-4 shrink-0'
                                                >
                                                  {ind.jenis}
                                                </Badge>
                                              </div>
                                            </label>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                          <FormMessage className='mt-1.5' />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* STEP FIELD 5: INFORMASI LAIN */}
                <div className='p-5 space-y-3'>
                  <FormField
                    control={form.control}
                    name='informasi_lain'
                    render={({ field }) => (
                      <FormItem>
                        <div className='flex items-center gap-2'>
                          <span className='flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px] font-bold font-mono'>
                            5
                          </span>
                          <FormLabel className='text-xs font-bold uppercase tracking-wide'>
                            Informasi Lain
                          </FormLabel>
                        </div>
                        <div className='pl-7 pt-1'>
                          <FormControl>
                            <Textarea
                              placeholder='Tuliskan informasi lain atau isu strategis terkait konteks risiko OPD (isi "-" bila tidak ada)...'
                              disabled={!canEdit}
                              className='text-xs min-h-[80px]'
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />
                </div>

                {/* WIZARD FOOTER NAVIGATION BAR */}
                <div className='bg-muted/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    disabled
                    className='gap-1.5 opacity-50'
                  >
                    <ArrowLeft className='h-4 w-4' />
                    <span>Kembali</span>
                  </Button>

                  <div className='flex items-center justify-end gap-2.5 flex-wrap'>
                    {canEdit ? (
                      <>
                        <Button
                          type='submit'
                          variant='outline'
                          size='sm'
                          disabled={isSubmitting}
                          onClick={() => setSubmitIntent('save')}
                          className='gap-1.5'
                        >
                          {isSubmitting && submitIntent === 'save' ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <Save className='h-4 w-4' />
                          )}
                          <span>Simpan</span>
                        </Button>

                        <Button
                          type='submit'
                          size='sm'
                          disabled={isSubmitting}
                          onClick={() => setSubmitIntent('save_and_next')}
                          className='gap-1.5 shadow-2xs'
                        >
                          {isSubmitting && submitIntent === 'save_and_next' ? (
                            <Loader2 className='h-4 w-4 animate-spin' />
                          ) : (
                            <>
                              <span>Simpan dan Lanjutkan</span>
                              <ArrowRight className='h-4 w-4' />
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className='flex items-center gap-2 text-xs text-muted-foreground italic py-1.5 px-3 rounded-lg bg-muted/40 border'>
                        <Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />
                        <span>
                          {!hasAuditor
                            ? 'Formulir terkunci: Perangkat Daerah belum memiliki Auditor Pengawas yang ditugaskan oleh Inspektorat.'
                            : is2BApproved
                              ? 'Formulir 2B telah disetujui Auditor Pengawas (read-only).'
                              : 'Formulir sedang dalam pemeriksaan auditor (read-only).'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </form>
          </Form>
        )}
      </Main>

      {/* CRUCIAL CHANGE IMPACT CONFIRMATION DIALOG (2B -> 2C) */}
      <Dialog
        open={Boolean(pendingCrucialPayload)}
        onOpenChange={(open) => !open && !isSubmitting && setPendingCrucialPayload(null)}
      >
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <div className='flex items-center gap-2.5'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400'>
                <ShieldAlert className='h-5 w-5' />
              </div>
              <div>
                <DialogTitle className='text-base font-bold'>
                  Konfirmasi Dampak Perubahan Krusial (2B &rarr; 2C)
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Perubahan pada Form 2B ini berdampak langsung pada Form 2C (Konteks Operasional).
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='rounded-lg border border-amber-500/30 bg-amber-500/5 p-3.5 space-y-1.5'>
              <p className='font-semibold text-foreground'>
                Perubahan Krusial yang Terdeteksi di Form 2B:
              </p>
              <ul className='list-disc pl-4 space-y-1 text-muted-foreground'>
                {pendingCrucialPayload?.changedSumberData && (
                  <li>
                    Perubahan <strong>Sumber Data</strong> acuan dokumen perencanaan.
                  </li>
                )}
                {pendingCrucialPayload?.changedTujuan && (
                  <li>
                    Pergantian <strong>Tujuan Strategis OPD</strong> yang menjadi induk konteks operasional.
                  </li>
                )}
              </ul>
              <p className='pt-1 text-muted-foreground'>
                Saat ini pada <strong>Langkah 2 (Form 2C)</strong> telah tercatat:{' '}
                <strong className='text-foreground'>
                  {opdMeta?.operasional_summary?.programs_count || 0} Program,{' '}
                  {opdMeta?.operasional_summary?.kegiatans_count || 0} Kegiatan, dan{' '}
                  {opdMeta?.operasional_summary?.sub_kegiatans_count || 0} Sub-Kegiatan
                </strong>
                .
              </p>
            </div>

            <div className='space-y-2'>
              <p className='font-semibold text-foreground'>
                Pilih tindakan terhadap data rincian di Form 2C:
              </p>

              <label
                onClick={() => setImpactMode('keep')}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                  impactMode === 'keep'
                    ? 'border-primary bg-primary/5 ring-1 ring-primary/25'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <RefreshCw className='h-4 w-4 text-primary shrink-0 mt-0.5' />
                <div className='space-y-0.5'>
                  <p className='font-semibold text-foreground'>
                    Pertahankan Rincian 2C & Perbarui Acuan (Recommended)
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    Daftar Program, Kegiatan, dan Sub-Kegiatan di 2C tetap disimpan, dan acuan Sumber Data serta Tujuan Strategis otomatis disinkronkan mengikuti perubahan 2B.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setImpactMode('reset')}
                className={cn(
                  'flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all',
                  impactMode === 'reset'
                    ? 'border-destructive bg-destructive/5 ring-1 ring-destructive/25'
                    : 'border-border hover:bg-muted/40'
                )}
              >
                <RotateCcw className='h-4 w-4 text-destructive shrink-0 mt-0.5' />
                <div className='space-y-0.5'>
                  <p className='font-semibold text-destructive'>
                    Reset / Kosongkan Rincian Form 2C dari Nol
                  </p>
                  <p className='text-[11px] text-muted-foreground'>
                    Hapus seluruh rincian Program, Kegiatan, dan Sub-Kegiatan yang ada di Form 2C agar dapat diisi ulang dari awal sesuai Tujuan Strategis baru.
                  </p>
                </div>
              </label>
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              disabled={isSubmitting}
              onClick={() => setPendingCrucialPayload(null)}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              variant={impactMode === 'reset' ? 'destructive' : 'default'}
              disabled={isSubmitting}
              onClick={() => {
                if (!pendingCrucialPayload) return
                executeSave(
                  pendingCrucialPayload.values,
                  pendingCrucialPayload.intent,
                  impactMode === 'reset'
                )
              }}
              className='gap-1.5'
            >
              {isSubmitting && <Loader2 className='h-4 w-4 animate-spin' />}
              <span>
                {impactMode === 'reset'
                  ? 'Ya, Simpan 2B & Reset Rincian 2C'
                  : 'Ya, Simpan & Sinkronkan ke 2C'}
              </span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export { KonteksStrategisPage as KonteksStrategisFeature }
