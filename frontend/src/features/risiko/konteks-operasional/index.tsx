import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CalendarRange,
  CheckCircle2,
  Database,
  FileText,
  FolderTree,
  Loader2,
  Lock,
  Save,
  Target,
  UserCheck,
} from 'lucide-react'
import { usePermissions } from '@/hooks/use-permissions'
import { risikoService } from '@/services/risiko-service'
import type {
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/searchable-select'
import { Skeleton } from '@/components/ui/skeleton'
import { RisikoWizardHeader } from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { OperasionalTreeTable } from './components/operasional-tree-table'
import { OperasionalItemDialog } from './components/operasional-item-dialog'

export function KonteksOperasionalPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const hasRedirectedRef = useRef(false)





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
    isStep2BCompleted,
    isLoading: isLoadingWizard,
    readiness,
    hasAuditor,
    isLocked,
    refetchWizardProgress,
  } = useRisikoWizardProgress()

  const is2CApproved = Boolean(readiness?.is_2c_approved)

  // Item Drawer State (Program / Kegiatan / Sub Kegiatan)
  const canEdit =
    (hasPermission('konteks_operasional.create') || hasPermission('konteks_operasional.edit')) &&
    hasAuditor &&
    !isLocked &&
    !is2CApproved

  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] =
    useState<KonteksOperasionalItemNode | null>(null)
  const [parentItem, setParentItem] =
    useState<KonteksOperasionalItemNode | null>(null)
  const [targetJenis, setTargetJenis] =
    useState<KonteksOperasionalItemJenis>('program')

  const [informasiLain, setInformasiLain] = useState<string>('-')
  const [isSavingStep, setIsSavingStep] = useState(false)
  const [saveIntent, setSaveIntent] = useState<'save' | 'save_and_next'>('save')

  // Sequential Lock Guard: Redirect to Step 1 (2B) if 2B is not completed yet
  useEffect(() => {
    if (
      !isLoadingWizard &&
      activePeriode &&
      effectiveOpdId &&
      !isStep2BCompleted
    ) {
      if (!hasRedirectedRef.current) {
        hasRedirectedRef.current = true
        toast.warning(
          'Langkah 2 (Form 2C) belum dapat diakses. Silakan lengkapi dan simpan Langkah 1 (Konteks Strategis 2B) terlebih dahulu.'
        )
      }
      navigate({ to: '/risiko/konteks-strategis', replace: true })
    } else {
      hasRedirectedRef.current = false
    }
  }, [
    isLoadingWizard,
    activePeriode,
    effectiveOpdId,
    isStep2BCompleted,
    navigate,
  ])

  // Fetch Form 2C data (auto-provisioned & synced from 2B by backend)
  const {
    data: currentKonteks,
    isLoading: isLoadingOperasional,
    refetch: refetchOperasional,
  } = useQuery({
    queryKey: ['risiko-operasional-current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      isStep2BCompleted,
  })

  // Sync informasi_lain from loaded currentKonteks (resets properly on OPD switch)
  useEffect(() => {
    setInformasiLain(currentKonteks?.informasi_lain || '-')
  }, [currentKonteks?.id, currentKonteks?.informasi_lain])

  async function handleTreeMutated() {
    await Promise.all([
      refetchOperasional(),
      queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
    ])
  }

  function handleOpenAddProgram() {
    setEditingItem(null)
    setParentItem(null)
    setTargetJenis('program')
    setItemDialogOpen(true)
  }

  function handleOpenAddChild(
    parent: KonteksOperasionalItemNode,
    jenis: KonteksOperasionalItemJenis
  ) {
    setEditingItem(null)
    setParentItem(parent)
    setTargetJenis(jenis)
    setItemDialogOpen(true)
  }

  function handleOpenEditItem(item: KonteksOperasionalItemNode) {
    setEditingItem(item)
    setParentItem(null)
    setTargetJenis(item.jenis)
    setItemDialogOpen(true)
  }

  async function handleSaveStep(intent: 'save' | 'save_and_next') {
    if (!effectiveOpdId || !activePeriode?.id || !currentKonteks) return

    const programsCount = currentKonteks.programs?.length || 0
    if (programsCount === 0) {
      toast.error(
        'Silakan tambahkan minimal 1 Program (NO: A) beserta indikator dan targetnya sebelum menyimpan Form 2C.'
      )
      return
    }

    setSaveIntent(intent)
    setIsSavingStep(true)
    try {
      await risikoService.updateKonteksOperasional(currentKonteks.id, {
        periode_penilaian_id: activePeriode.id,
        opd_id: effectiveOpdId,
        sumber_data_id: konteks2B?.sumber_data_id || undefined,
        informasi_lain: informasiLain.trim() || '-',
        status: 'final',
      })

      await Promise.all([
        refetchOperasional(),
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
      ])

      if (intent === 'save_and_next') {
        toast.success(
          'Langkah 2 (Form 2C) berhasil disimpan! Progres Penetapan Konteks Risiko (2B & 2C) telah mencapai 100%.'
        )
      } else {
        toast.success(
          'Penetapan Konteks Risiko Operasional OPD (Form 2C) berhasil disimpan.'
        )
      }
    } catch {
      toast.error('Gagal menyimpan status penyelesaian Form 2C.')
    } finally {
      setIsSavingStep(false)
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
    opdMeta?.kepala_opd?.nama ||
    konteks2B?.nama_kepala ||
    currentKonteks?.nama_kepala ||
    '-'
  const resolvedKepalaNip =
    opdMeta?.kepala_opd?.nip ||
    konteks2B?.nip_kepala ||
    currentKonteks?.nip_kepala ||
    '-'

  const isLoading = isLoadingWizard || isLoadingOperasional

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
                Penetapan Konteks Risiko Operasional OPD
              </h2>
              <Badge
                variant='outline'
                className='font-mono text-xs border-primary/30 text-primary bg-primary/5'
              >
                Form 2C • Langkah 2
              </Badge>
            </div>
            <p className='text-xs text-muted-foreground'>
              Susun hierarki Program (A), Kegiatan (A.1), dan Sub Kegiatan (A.1.1) beserta Indikator dan Targetnya.
            </p>
          </div>
        </PageHeader>

        {/* Wizard Stepper Header */}
        <RisikoWizardHeader
          currentStepId='2c'
          steps={steps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          readiness={readiness}
          effectiveOpdId={effectiveOpdId}
          onSubmissionSuccess={refetchWizardProgress}
        />

        {!isLoading && !activePeriode ? (
          <div className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive'>
            <AlertTriangle className='h-5 w-5 shrink-0 mt-0.5' />
            <div className='text-xs space-y-1'>
              <p className='font-bold text-sm'>
                Form Tidak Dapat Diisi: Belum Ada Periode Penilaian Aktif
              </p>
              <p className='text-destructive/90 leading-relaxed'>
                Silakan aktifkan periode penilaian terlebih dahulu pada menu{' '}
                <strong>Perencanaan Kinerja &rarr; Periode Penilaian</strong>.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-48 w-full rounded-xl' />
            <Skeleton className='h-96 w-full rounded-xl' />
          </div>
        ) : (
          <div className='space-y-6'>
            {/* CARD 1: INHERITED CONTEXT FROM FORM 2B */}
            <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
              <div className='border-b bg-muted/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <Building2 className='h-4 w-4 text-primary' />
                  <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                    Konteks Penilaian & Acuan Strategis (Otomatis dari Form 2B)
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

              <div className='p-5 space-y-4'>
                {/* Row 1: Nama Pemda, Tahun, Periode, OPD */}
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Nama Pemda
                    </label>
                    <Input
                      value={
                        konteks2B?.nama_pemda ||
                        currentKonteks?.nama_pemda ||
                        'Pemerintah Kabupaten Cianjur'
                      }
                      disabled
                      className='h-9 text-xs bg-muted/60 font-medium'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                      <CalendarRange className='h-3.5 w-3.5 text-primary' />
                      <span>Tahun Penilaian</span>
                    </label>
                    <Input
                      value={String(activePeriode?.tahun_penilaian || '-')}
                      disabled
                      className='h-9 text-xs bg-muted/60 font-mono font-bold'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      Periode yang Dinilai
                    </label>
                    <Input
                      value={activePeriode?.rentang_tahun || '-'}
                      disabled
                      className='h-9 text-xs bg-muted/60 font-mono font-medium'
                    />
                  </div>

                  <div className='space-y-1.5'>
                    <label className='text-xs font-semibold text-muted-foreground'>
                      OPD yang Dinilai
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

                {/* Row 2: Inherited Sumber Data & Tujuan Strategis from Form 2B */}
                <div className='grid grid-cols-1 lg:grid-cols-12 gap-4 pt-3 border-t'>
                  <div className='lg:col-span-4 space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                        <Database className='h-3.5 w-3.5 text-primary' />
                        <span>Sumber Data</span>
                      </label>
                      <Badge
                        variant='secondary'
                        className='text-[9px] px-1.5 py-0 h-4 font-normal'
                      >
                        Ditentukan di Form 2B
                      </Badge>
                    </div>
                    <Input
                      value={
                        konteks2B?.sumber_data?.nama ||
                        currentKonteks?.sumber_data?.nama ||
                        'Renstra SKPD'
                      }
                      disabled
                      className='h-9 text-xs bg-muted/60 font-semibold'
                    />
                  </div>

                  <div className='lg:col-span-8 space-y-1.5'>
                    <div className='flex items-center justify-between gap-2'>
                      <label className='text-xs font-semibold text-muted-foreground flex items-center gap-1.5'>
                        <Target className='h-3.5 w-3.5 text-primary' />
                        <span>Tujuan Strategis</span>
                      </label>
                      <button
                        type='button'
                        onClick={() => navigate({ to: '/risiko/konteks-strategis' })}
                        className='text-[11px] font-medium text-primary hover:underline'
                      >
                        Ubah di Langkah 1 (Form 2B) &rarr;
                      </button>
                    </div>
                    <div className='rounded-lg border bg-primary/[0.03] px-3.5 py-2 text-xs font-semibold text-foreground leading-relaxed'>
                      {konteks2B?.tujuan?.kode_tujuan && (
                        <span className='font-mono text-primary mr-1.5'>
                          [{konteks2B.tujuan.kode_tujuan}]
                        </span>
                      )}
                      {konteks2B?.tujuan?.tujuan ||
                        currentKonteks?.tujuan_strategis?.tujuan ||
                        '-'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: PROGRAM / KEGIATAN / SUB KEGIATAN BUILDER TABLE */}
            <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
              <div className='border-b bg-muted/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <FolderTree className='h-4 w-4 text-primary' />
                  <div>
                    <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Program / Kegiatan / Sub Kegiatan
                    </h3>
                    <p className='text-[11px] text-muted-foreground'>
                      Kode NO (A = Program, A.1 = Kegiatan, A.1.1 = Sub Kegiatan) diurutkan otomatis oleh sistem.
                    </p>
                  </div>
                </div>
              </div>

              <div className='p-5'>
                {currentKonteks && (
                  <OperasionalTreeTable
                    konteksId={currentKonteks.id}
                    programs={currentKonteks.programs || []}
                    canEdit={canEdit}
                    onAddProgram={handleOpenAddProgram}
                    onAddChild={handleOpenAddChild}
                    onEditItem={handleOpenEditItem}
                    onRefetch={handleTreeMutated}
                  />
                )}
              </div>
            </div>

            {/* CARD 3: INFORMASI LAIN & AKSI PENYELESAIAN */}
            <div className='rounded-xl border bg-card shadow-2xs overflow-hidden'>
              <div className='border-b bg-muted/40 px-5 py-3.5 flex items-center justify-between gap-2 flex-wrap'>
                <div className='flex items-center gap-2'>
                  <FileText className='h-4 w-4 text-primary' />
                  <div>
                    <h3 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Informasi Lain
                    </h3>
                    <p className='text-[11px] text-muted-foreground'>
                      Tuliskan informasi lain atau catatan operasional terkait Form 2C.
                    </p>
                  </div>
                </div>
                <Badge variant='outline' className='text-[10px] font-normal'>
                  Form 2C
                </Badge>
              </div>

              <div className='p-5'>
                <Textarea
                  value={informasiLain}
                  onChange={(e) => setInformasiLain(e.target.value)}
                  disabled={!canEdit}
                  placeholder='Tuliskan informasi lain atau catatan operasional terkait Form 2C (isi "-" bila tidak ada)...'
                  className='text-xs min-h-[90px] bg-background'
                />
              </div>

              {/* WIZARD FOOTER NAVIGATION BAR */}
              <div className='border-t bg-muted/40 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => navigate({ to: '/risiko/konteks-strategis' })}
                  className='gap-1.5'
                >
                  <ArrowLeft className='h-4 w-4' />
                  <span>Kembali ke Langkah 1 (2B)</span>
                </Button>

                <div className='flex items-center justify-end gap-2.5 flex-wrap'>
                  {canEdit ? (
                    <>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        disabled={isSavingStep}
                        onClick={() => handleSaveStep('save')}
                        className='gap-1.5'
                      >
                        {isSavingStep && saveIntent === 'save' ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Save className='h-4 w-4' />
                        )}
                        <span>Simpan</span>
                      </Button>

                      <Button
                        type='button'
                        size='sm'
                        disabled={isSavingStep}
                        onClick={() => handleSaveStep('save_and_next')}
                        className='gap-1.5 shadow-2xs'
                      >
                        {isSavingStep && saveIntent === 'save_and_next' ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <>
                            <CheckCircle2 className='h-4 w-4' />
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
                          : is2CApproved
                            ? 'Formulir 2C telah disetujui Auditor Pengawas (read-only).'
                            : 'Formulir sedang dalam pemeriksaan auditor (read-only).'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </Main>

      {/* Slide-over Sheet for adding/editing Program (A), Kegiatan (A.1), Sub Kegiatan (A.1.1) */}
      {currentKonteks && (
        <OperasionalItemDialog
          open={itemDialogOpen}
          onOpenChange={setItemDialogOpen}
          konteksId={currentKonteks.id}
          editingItem={editingItem}
          parentItem={parentItem}
          targetJenis={targetJenis}
          programsList={currentKonteks.programs || []}
          onSuccess={handleTreeMutated}
        />
      )}
    </>
  )
}

export { KonteksOperasionalPage as KonteksOperasionalFeature }
