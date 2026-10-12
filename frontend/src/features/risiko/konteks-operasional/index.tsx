import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  AlertCircle,
  Building2,
  Calendar,
  FolderTree,
  GitBranch,
  Layers,
  Loader2,
  Plus,
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
import { Card, CardContent } from '@/components/ui/card'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import { useAuthStore } from '@/stores/auth-store'
import { usePermissions } from '@/hooks/use-permissions'
import { OperasionalDetailView } from './components/operasional-detail-view'
import { OperasionalHeaderDialog } from './components/operasional-header-dialog'

export function KonteksOperasionalFeature() {
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
  const [isHeaderDialogOpen, setIsHeaderDialogOpen] = useState(false)

  // 1. Fetch Active Period
  const { data: activePeriode, isLoading: isLoadingPeriode } = useQuery({
    queryKey: ['periode', 'active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    staleTime: 60 * 1000,
  })

  // 2. Fetch OPD list (if admin)
  const { data: opdList = [] } = useQuery({
    queryKey: ['opds', 'all-for-konteks-operasional'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(isSuperadminOrAdminOffice),
  })

  const effectiveOpdId = isSuperadminOrAdminOffice
    ? selectedOpdId || (opdList[0]?.id ? String(opdList[0].id) : '')
    : defaultOpd

  const selectedOpdObj = opdList.find((o) => String(o.id) === effectiveOpdId)

  // 3. Fetch Konteks Operasional for effective OPD
  const {
    data: currentKonteks,
    isLoading: isLoadingKonteks,
    refetch: refetchKonteks,
  } = useQuery({
    queryKey: ['konteks-operasional', 'current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id ? String(activePeriode.id) : undefined,
      }),
    enabled: Boolean(effectiveOpdId && activePeriode?.id),
    staleTime: 30 * 1000,
  })

  const opdOptions = opdList.map((opd) => ({
    value: String(opd.id),
    label: `${opd.nama} (${opd.kode})`,
  }))

  const canCreate = hasPermission('konteks_operasional.create')
  const canEdit = hasPermission('konteks_operasional.edit')

  // KPI Calculations
  const stats = useMemo(() => {
    if (!currentKonteks?.programs) {
      return { prog: 0, keg: 0, sub: 0, ind: 0 }
    }
    let totalKeg = 0
    let totalSub = 0
    let totalInd = 0
    currentKonteks.programs.forEach((p) => {
      totalInd += p.indikators?.length || 0
      p.children?.forEach((k) => {
        totalKeg++
        totalInd += k.indikators?.length || 0
        k.children?.forEach((s) => {
          totalSub++
          totalInd += s.indikators?.length || 0
        })
      })
    })
    return {
      prog: currentKonteks.programs.length,
      keg: totalKeg,
      sub: totalSub,
      ind: totalInd,
    }
  }, [currentKonteks])

  const kpiItems: KpiStatItem[] = [
    {
      title: 'Program Utama',
      value: stats.prog,
      subtitle: 'Program operasional diuji risikonya',
      icon: Layers,
    },
    {
      title: 'Kegiatan Operasional',
      value: stats.keg,
      subtitle: 'Kegiatan dari seluruh program',
      icon: GitBranch,
    },
    {
      title: 'Sub-Kegiatan Operasional',
      value: stats.sub,
      subtitle: 'Sub-kegiatan level teknis',
      icon: FolderTree,
    },
    {
      title: 'Indikator & Target Kinerja',
      value: stats.ind,
      subtitle: 'Total tolok ukur kinerja Renstra',
      icon: Target,
    },
  ]

  return (
    <>
      <Header fixed>
        <Search />
        <div className='ml-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main className='space-y-6'>
        {/* Page Header */}
        <PageHeader>
          <div className='space-y-1'>
            <div className='flex items-center gap-2 mb-0.5'>
              <Badge variant='outline' className='text-[10px] font-mono px-1.5 py-0'>
                FORM 2C
              </Badge>
              <span className='text-xs text-muted-foreground'>
                Pengelolaan Data Risiko (Fitur No. 26)
              </span>
            </div>
            <h2 className='text-2xl font-bold tracking-tight text-foreground'>
              Penetapan Konteks Risiko Operasional OPD
            </h2>
            <p className='text-xs text-muted-foreground'>
              Penetapan konteks risiko operasional tingkat Program, Kegiatan, dan Sub-Kegiatan
              beserta Indikator & Target Kinerja Renstra/Renja OPD.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
            {currentKonteks ? (
              canEdit && (
                <Button
                  onClick={() => setIsHeaderDialogOpen(true)}
                  size='sm'
                  className='gap-2 text-xs shadow-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Ubah Pengesahan (Form 2C)</span>
                </Button>
              )
            ) : (
              canCreate && (
                <Button
                  onClick={() => setIsHeaderDialogOpen(true)}
                  size='sm'
                  className='gap-2 text-xs shadow-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Tetapkan Konteks (Form 2C)</span>
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
              Form 2C hanya dapat diisi jika terdapat Periode Penilaian yang aktif. Silakan hubungi
              Bapperida atau aktifkan periode terlebih dahulu di menu Perencanaan Kinerja.
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Main Content Area */}
        {isLoadingKonteks || isLoadingPeriode ? (
          <div className='flex flex-col items-center justify-center min-h-[320px] rounded-xl border border-dashed bg-card/40 p-12 text-center'>
            <Loader2 className='h-8 w-8 animate-spin text-primary mb-3' />
            <p className='text-sm font-medium text-foreground'>
              Memuat data Penetapan Konteks Risiko Operasional...
            </p>
            <p className='text-xs text-muted-foreground mt-1'>
              Sinkronisasi pohon operasional Program, Kegiatan, dan Sub-Kegiatan Renstra OPD
            </p>
          </div>
        ) : currentKonteks ? (
          <OperasionalDetailView
            konteks={currentKonteks}
            onEditHeader={() => setIsHeaderDialogOpen(true)}
            onDeleted={() => {
              queryClient.invalidateQueries({ queryKey: ['konteks-operasional'] })
              refetchKonteks()
            }}
            onRefetch={() => {
              queryClient.invalidateQueries({ queryKey: ['konteks-operasional'] })
              refetchKonteks()
            }}
          />
        ) : (
          /* Empty State: Form 2C hasn't been established yet */
          <Card className='border-dashed'>
            <CardContent className='flex flex-col items-center justify-center py-16 px-4 text-center'>
              <div className='flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4'>
                <FolderTree className='h-8 w-8' />
              </div>
              <h3 className='text-lg font-bold text-foreground'>
                Formulir 2C Belum Ditetapkan untuk OPD Ini
              </h3>
              <p className='text-xs text-muted-foreground max-w-lg mt-1 mb-6'>
                Penetapan Konteks Risiko Operasional OPD memetakan seluruh program, kegiatan, dan
                sub-kegiatan prioritas beserta target kinerja tahun {activePeriode?.tahun_penilaian}.
                Tujuan strategis akan tersinkronisasi otomatis dari Form 2B.
              </p>
              {canCreate && (
                <Button
                  onClick={() => setIsHeaderDialogOpen(true)}
                  className='gap-2 text-xs shadow-xs'
                >
                  <Plus className='h-4 w-4' />
                  <span>Tetapkan Konteks Risiko Operasional (Form 2C)</span>
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Header / Pengesahan Dialog */}
        <OperasionalHeaderDialog
          open={isHeaderDialogOpen}
          onOpenChange={setIsHeaderDialogOpen}
          currentKonteks={currentKonteks}
          opdId={effectiveOpdId}
          opdName={selectedOpdObj?.nama || currentKonteks?.opd?.nama}
          opdKepala={selectedOpdObj?.kepala || currentKonteks?.opd?.kepala}
          periodeId={activePeriode?.id ? String(activePeriode.id) : undefined}
          tahunPenilaian={activePeriode?.tahun_penilaian}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['konteks-operasional'] })
            refetchKonteks()
          }}
        />
      </Main>
    </>
  )
}
export default KonteksOperasionalFeature
