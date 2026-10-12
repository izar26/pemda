import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  Loader2,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { PageHeader } from '@/components/layout/page-header'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { SearchableSelect } from '@/components/searchable-select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardTitle,
} from '@/components/ui/card'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { KonteksDetailView } from './components/konteks-detail-view'
import { KonteksDialog } from './components/konteks-dialog'

export function KonteksStrategisFeature() {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const { hasPermission } = usePermissions()

  const isSuperadminOrAdminOffice =
    user?.role === 'Superadmin' ||
    user?.roles?.some(
      (r: { name: string } | string) =>
        (typeof r === 'string' ? r : r.name) === 'Superadmin' ||
        (typeof r === 'string' ? r : r.name) === 'Admin Office'
    )

  // Selected OPD state (for Admin/Superadmin)
  const defaultOpd = user?.opd_id ? String(user.opd_id) : ''
  const [selectedOpdId, setSelectedOpdId] = useState<string>(defaultOpd)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  // 1. Fetch Active Period
  const { data: activePeriode, isLoading: isLoadingPeriode } = useQuery({
    queryKey: ['periode', 'active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list (if admin)
  const { data: opdList = [] } = useQuery({
    queryKey: ['opds', 'all-for-konteks-feature'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(isSuperadminOrAdminOffice),
  })

  const effectiveOpdId = isSuperadminOrAdminOffice
    ? selectedOpdId || (opdList[0]?.id ? String(opdList[0].id) : '')
    : defaultOpd

  // 3. Fetch Konteks Penilaian for effective OPD
  const {
    data: currentKonteks,
    isLoading: isLoadingKonteks,
    refetch: refetchKonteks,
  } = useQuery({
    queryKey: ['konteks-strategis', 'current', effectiveOpdId, activePeriode?.id],
    queryFn: () => risikoService.getCurrentKonteks({ opd_id: effectiveOpdId }),
    enabled: Boolean(effectiveOpdId && activePeriode?.id),
    staleTime: 30 * 1000,
  })

  const opdOptions = opdList.map((opd) => ({
    value: String(opd.id),
    label: `${opd.nama} (${opd.kode})`,
  }))

  const canCreate = hasPermission('konteks_risiko.create')
  const canEdit = hasPermission('konteks_risiko.edit')

  // KPI Summary Cards
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Tujuan Renstra Terpilih',
      value: currentKonteks?.tujuan ? '1 Tujuan' : 'Belum Dipilih',
      subtitle: currentKonteks?.tujuan?.kode_tujuan || 'Fokus Penilaian Form 2B',
      icon: Target,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Sasaran Strategis',
      value: currentKonteks?.sasarans ? `${currentKonteks.sasarans.length} Sasaran` : '0 Sasaran',
      subtitle: 'Sasaran makro yang dinilai',
      icon: Layers,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'IKU & Indikator Renstra',
      value: currentKonteks?.indikators ? `${currentKonteks.indikators.length} Indikator` : '0 Indikator',
      subtitle: 'Indikator kinerja terukur',
      icon: Sparkles,
      color: 'bg-primary/10 text-primary',
    },
    {
      title: 'Status Penetapan (Form 2B)',
      value: currentKonteks
        ? currentKonteks.status === 'final'
          ? 'Final Ditetapkan'
          : 'Konsep Draft'
        : 'Belum Ditetapkan',
      subtitle: activePeriode ? `Tahun ${activePeriode.tahun_penilaian}` : 'Tidak ada periode',
      icon: currentKonteks?.status === 'final' ? CheckCircle2 : Clock,
      color: 'bg-primary/10 text-primary',
    },
  ]

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Sticky PageHeader */}
        <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <div className='flex items-center gap-2 mb-0.5'>
              <Badge variant='outline' className='text-[10px] font-mono px-1.5 py-0'>
                FORM 2B
              </Badge>
              <span className='text-xs text-muted-foreground'>Pengelolaan Data Risiko (Fitur No. 26)</span>
            </div>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Penetapan Konteks Risiko Strategis OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Penetapan 1 tujuan fokus, sasaran strategis, serta indikator/IKU Renstra yang diuji dan dinilai risikonya pada tahun berjalan.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            {currentKonteks ? (
              canEdit && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size='sm'
                  className='gap-2 text-xs shadow-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Ubah Konteks (Form 2B)</span>
                </Button>
              )
            ) : (
              canCreate && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size='sm'
                  className='gap-2 text-xs shadow-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Tetapkan Konteks (Form 2B)</span>
                </Button>
              )
            )}
          </div>
        </PageHeader>

        {/* KPI Stats Cards */}
        <KpiStatsCards
          items={kpiItems}
          isLoading={isLoadingKonteks || isLoadingPeriode}
          count={4}
        />

        {/* Active Period & OPD Filter Bar */}
        {activePeriode ? (
          <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border bg-card shadow-2xs'>
            <div className='flex items-center gap-3'>
              <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
                <Calendar className='h-4 w-4' />
              </div>
              <div>
                <div className='flex items-center gap-2'>
                  <span className='text-[11px] font-semibold text-muted-foreground uppercase tracking-wide'>
                    Periode Penilaian Aktif:
                  </span>
                  <Badge variant='default' className='text-[10px] px-1.5 py-0'>
                    Tahun {activePeriode.tahun_penilaian}
                  </Badge>
                </div>
                <p className='text-xs font-bold text-foreground mt-0.5'>
                  {activePeriode.nama_periode} ({activePeriode.rentang_tahun})
                </p>
              </div>
            </div>

            {/* Admin OPD Selector Combobox */}
            {isSuperadminOrAdminOffice && (
              <div className='flex items-center gap-2 min-w-[280px] sm:max-w-md w-full sm:w-auto'>
                <Building2 className='h-4 w-4 text-muted-foreground shrink-0' />
                <div className='flex-1'>
                  <SearchableSelect
                    options={opdOptions}
                    value={effectiveOpdId}
                    onValueChange={(val) => setSelectedOpdId(val)}
                    placeholder='Pilih OPD / Dinas...'
                    searchPlaceholder='Cari nama/kode dinas...'
                    emptyMessage='Perangkat daerah tidak ditemukan.'
                  />
                </div>
              </div>
            )}
          </div>
        ) : !isLoadingPeriode ? (
          <Alert variant='destructive'>
            <AlertCircle className='h-4 w-4' />
            <AlertTitle>Tidak Ada Periode Penilaian Aktif</AlertTitle>
            <AlertDescription className='text-xs'>
              Form 2B hanya dapat diisi jika terdapat Periode Penilaian yang aktif. Silakan hubungi Bapperida atau aktifkan periode terlebih dahulu di menu Perencanaan Kinerja.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Main Content Area */}
        {isLoadingKonteks || isLoadingPeriode ? (
          <div className='flex flex-col items-center justify-center min-h-[320px] rounded-xl border border-dashed bg-card/40 p-12 text-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary mb-3' />
            <p className='text-sm font-medium text-foreground'>Memuat data Penetapan Konteks Risiko Strategis...</p>
            <p className='text-xs text-muted-foreground mt-1'>Sinkronisasi pohon kinerja makro Renstra OPD</p>
          </div>
        ) : currentKonteks ? (
          <KonteksDetailView
            konteks={currentKonteks}
            onEdit={() => setIsDialogOpen(true)}
            onDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ['konteks-strategis'] })
              refetchKonteks()
            }}
          />
        ) : (
          /* Empty State: Belum Ditetapkan */
          <Card className='border-dashed border-2 bg-card/50'>
            <CardContent className='flex flex-col items-center justify-center p-12 text-center max-w-xl mx-auto'>
              <div className='flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary mb-4'>
                <ShieldAlert className='h-8 w-8' />
              </div>
              <CardTitle className='text-lg font-bold text-foreground'>
                Konteks Risiko Strategis Belum Ditetapkan
              </CardTitle>
              <CardDescription className='text-xs text-muted-foreground mt-2 leading-relaxed'>
                Perangkat daerah ini belum memiliki dokumen penetapan ruang lingkup risiko strategis (Form 2B) pada tahun penilaian {activePeriode?.tahun_penilaian || 'aktif'}. Tetapkan satu tujuan strategis Renstra beserta sasaran dan IKU yang akan dinilai.
              </CardDescription>

              {canCreate && (
                <Button
                  onClick={() => setIsDialogOpen(true)}
                  size='sm'
                  className='mt-6 gap-2 shadow-xs text-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Mulai Pengisian Form 2B</span>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Form Modal Dialog */}
        <KonteksDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          currentKonteks={currentKonteks}
          defaultOpdId={effectiveOpdId}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['konteks-strategis'] })
            refetchKonteks()
          }}
        />
      </Main>
    </>
  )
}
