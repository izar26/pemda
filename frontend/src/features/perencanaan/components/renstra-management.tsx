import { useState, useEffect, useMemo, useCallback, Fragment } from 'react'
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search,
  Filter,
  Building2,
  Calendar,
  Sparkles,
  Upload,
  FileSpreadsheet,
  X,
  ShieldCheck,
  Landmark,
  LayoutGrid,
  Table as TableIcon,
  DollarSign,
  Target,
} from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ExportExcelButton } from '@/components/export-excel-button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/layout/page-header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { perencanaanService } from '@/services/perencanaan-service'
import { opdService } from '@/services/opd-service'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'
import { RenstraSequentialWizard } from './renstra-sequential-wizard'
import { RenstraImportDialog } from './renstra-import-dialog'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import type {
  RenstraProgram,
  PeriodePenilaian,
} from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'

export function RenstraManagement() {
  const [renstraTree, setRenstraTree] = useState<RenstraProgram[]>([])
  const [opds, setOpds] = useState<Opd[]>([])
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string | undefined>(undefined)
  const [selectedOpdId, setSelectedOpdId] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards')
  const [konteks2B, setKonteks2B] = useState<any>(null)

  // Expandable rows state
  const [expandedPrograms, setExpandedPrograms] = useState<Record<string, boolean>>({})
  const [expandedKegiatans, setExpandedKegiatans] = useState<Record<string, boolean>>({})

  // Dialog & Modal States
  const [wizardOpen, setWizardOpen] = useState<boolean>(false)
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false)

  // Quick Inline Add Modal States
  const [addModal, setAddModal] = useState<{
    type: 'kegiatan' | 'sub_kegiatan' | 'program' | null
    parentId?: string
    parentKode?: string
  }>({ type: null })

  const [formInput, setFormInput] = useState({
    kode: '',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  // Quick Edit Modal States
  const [editModal, setEditModal] = useState<{
    type: 'program' | 'kegiatan' | 'sub_kegiatan' | null
    id?: string
  }>({ type: null })

  const [submitting, setSubmitting] = useState<boolean>(false)

  const fetchRenstraTree = useCallback(async (periodeId?: string, opdId?: string, querySearch?: string) => {
    setLoading(true)
    try {
      const [data, k2b] = await Promise.all([
        perencanaanService.getRenstraTree({
          periode_id: periodeId,
          opd_id: opdId,
          search: querySearch,
        }),
        perencanaanService.getKonteksStrategis({
          periode_id: periodeId,
          opd_id: opdId,
        }).catch(() => null),
      ])
      setRenstraTree(data)
      setKonteks2B(k2b)
      const initialExp: Record<string, boolean> = {}
      const initialKegExp: Record<string, boolean> = {}
      data.forEach((p) => {
        initialExp[String(p.id)] = true
        ;(p.kegiatans || []).forEach((k) => {
          initialKegExp[String(k.id)] = true
        })
      })
      setExpandedPrograms(initialExp)
      setExpandedKegiatans(initialKegExp)
    } catch {
      toast.error('Terjadi kesalahan saat memuat pohon Renstra SKPD.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInitialData = useCallback(async () => {
    setLoading(true)
    try {
      const [periodeList, opdList] = await Promise.all([
        perencanaanService.getPeriodeList(),
        opdService.getOpds({ all: true }),
      ])
      setPeriodes(periodeList)
      setOpds(opdList)

      const active = periodeList.find((p) => p.status === 'Aktif' || p.status === 'active') || periodeList[0]
      const defaultPeriodeId = active?.id ? String(active.id) : undefined
      const defaultOpdId = opdList.length > 0 ? String(opdList[0].id) : undefined

      if (defaultPeriodeId) setSelectedPeriodeId(defaultPeriodeId)
      if (defaultOpdId) setSelectedOpdId(defaultOpdId)

      fetchRenstraTree(defaultPeriodeId, defaultOpdId, search)
    } catch {
      toast.error('Tidak dapat mengambil daftar Periode atau OPD.')
      setLoading(false)
    }
  }, [fetchRenstraTree, search])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const getOpdName = (opd: Opd) => {
    return opd.nama || (opd as unknown as { nama_opd: string }).nama_opd || 'OPD'
  }

  const opdOptions: SearchableSelectOption[] = useMemo(() => {
    return opds.map((opd) => ({
      value: String(opd.id),
      label: getOpdName(opd),
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori].filter(Boolean) as string[],
    }))
  }, [opds])

  const handleFilterChange = (periodeId?: string, opdId?: string, qSearch?: string) => {
    setSelectedPeriodeId(periodeId)
    setSelectedOpdId(opdId)
    setSearch(qSearch ?? search)
    fetchRenstraTree(periodeId, opdId, qSearch ?? search)
  }

  const toggleExpandProgram = (id: string | number) => {
    const key = String(id)
    setExpandedPrograms((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const toggleExpandKegiatan = (id: string | number) => {
    const key = String(id)
    setExpandedKegiatans((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // Handle Quick Add Item
  const handleOpenAddModal = (
    type: 'program' | 'kegiatan' | 'sub_kegiatan',
    parentId?: string | number,
    parentKode?: string
  ) => {
    let defaultKode = 'A'
    if (type === 'kegiatan' && parentKode) defaultKode = `${parentKode}.1`
    if (type === 'sub_kegiatan' && parentKode) defaultKode = `${parentKode}.1`

    setFormInput({
      kode: defaultKode,
      nama: '',
      indikator: '',
      target: '',
      satuan: '',
      pagu_indikatif: 0,
    })
    setAddModal({ type, parentId: parentId ? String(parentId) : undefined, parentKode })
  }

  const handleSaveAddModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (addModal.type === 'program') {
        if (!selectedOpdId || !selectedPeriodeId) {
          toast.error('Pilih OPD dan Periode Penilaian terlebih dahulu.')
          setSubmitting(false)
          return
        }
        await perencanaanService.createProgram({
          opd_id: selectedOpdId,
          periode_id: selectedPeriodeId,
          ...formInput,
        })
        toast.success('Program Renstra berhasil dibuat.')
      } else if (addModal.type === 'kegiatan' && addModal.parentId) {
        await perencanaanService.createKegiatan({
          program_id: addModal.parentId,
          periode_id: selectedPeriodeId,
          opd_id: selectedOpdId,
          ...formInput,
        })
        toast.success('Kegiatan Renstra berhasil dibuat.')
      } else if (addModal.type === 'sub_kegiatan' && addModal.parentId) {
        await perencanaanService.createSubKegiatan({
          kegiatan_id: addModal.parentId,
          periode_id: selectedPeriodeId,
          opd_id: selectedOpdId,
          ...formInput,
        })
        toast.success('Sub Kegiatan Renstra berhasil dibuat.')
      }
      setAddModal({ type: null })
      fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)
    } catch {
      toast.error('Terjadi kesalahan saat membuat item.')
    } finally {
      setSubmitting(false)
    }
  }

  // Handle Quick Delete
  const handleDeleteItem = async (
    type: 'program' | 'kegiatan' | 'sub_kegiatan',
    id: string | number,
    nama: string
  ) => {
    if (!confirm(`Apakah Anda yakin ingin menghapus ${type.toUpperCase()} "${nama}" beserta anak-anaknya?`))
      return
    try {
      if (type === 'program') await perencanaanService.deleteProgram(id)
      if (type === 'kegiatan') await perencanaanService.deleteKegiatan(id)
      if (type === 'sub_kegiatan') await perencanaanService.deleteSubKegiatan(id)
      toast.success(`Data ${type} berhasil dihapus.`)
      fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)
    } catch {
      toast.error('Tidak dapat menghapus item.')
    }
  }

  // Handle Edit Item
  const handleOpenEditModal = (
    type: 'program' | 'kegiatan' | 'sub_kegiatan',
    item: {
      id: string | number
      kode: string
      nama: string
      indikator?: string | null
      target?: string | null
      satuan?: string | null
      pagu_indikatif?: number | null
    }
  ) => {
    setFormInput({
      kode: item.kode,
      nama: item.nama,
      indikator: item.indikator || '',
      target: item.target || '',
      satuan: item.satuan || '',
      pagu_indikatif: item.pagu_indikatif ? Number(item.pagu_indikatif) : 0,
    })
    setEditModal({ type, id: String(item.id) })
  }

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editModal.id || !editModal.type) return
    setSubmitting(true)
    try {
      if (editModal.type === 'program') await perencanaanService.updateProgram(editModal.id, formInput)
      if (editModal.type === 'kegiatan') await perencanaanService.updateKegiatan(editModal.id, formInput)
      if (editModal.type === 'sub_kegiatan') await perencanaanService.updateSubKegiatan(editModal.id, formInput)
      toast.success('Data berhasil diperbarui.')
      setEditModal({ type: null })
      fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)
    } catch {
      toast.error('Gagal memperbarui data.')
    } finally {
      setSubmitting(false)
    }
  }

  const formatRupiah = (val?: number) => {
    if (!val && val !== 0) return 'Rp 0'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExpandAll = () => {
    const progExp: Record<string, boolean> = {}
    const kegExp: Record<string, boolean> = {}
    renstraTree.forEach((p) => {
      progExp[String(p.id)] = true
      ;(p.kegiatans || []).forEach((k) => {
        kegExp[String(k.id)] = true
      })
    })
    setExpandedPrograms(progExp)
    setExpandedKegiatans(kegExp)
  }

  const handleCollapseAll = () => {
    setExpandedPrograms({})
    setExpandedKegiatans({})
  }

  // Calculate summary statistics using useMemo
  const stats = useMemo(() => {
    const totalPrograms = renstraTree.length
    let totalKegiatans = 0
    let totalSubKegiatans = 0
    let totalPagu = 0

    renstraTree.forEach((p) => {
      totalKegiatans += (p.kegiatans || []).length
      ;(p.kegiatans || []).forEach((k) => {
        totalSubKegiatans += (k.sub_kegiatans || []).length
        ;(k.sub_kegiatans || []).forEach((s) => {
          totalPagu += Number(s.pagu_indikatif || 0)
        })
      })
    })

    return { totalPrograms, totalKegiatans, totalSubKegiatans, totalPagu }
  }, [renstraTree])

  // Standard Compact KPI Stats consistent with other modules
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Program (Level 1)',
      value: stats.totalPrograms,
      icon: Layers,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      title: 'Total Kegiatan (Level 2)',
      value: stats.totalKegiatans,
      icon: FileSpreadsheet,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
      valueColor: 'text-indigo-600 dark:text-indigo-400',
    },
    {
      title: 'Sub Kegiatan (Objek Risiko)',
      value: stats.totalSubKegiatans,
      icon: ShieldCheck,
      color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
      valueColor: 'text-purple-600 dark:text-purple-400',
      sub: 'Basis Penilaian SPIP',
    },
    {
      title: 'Total Pagu Indikatif',
      value: formatRupiah(stats.totalPagu),
      icon: Landmark,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
    },
  ]

  // Filter client-side by keyword
  const filteredPrograms = useMemo(() => {
    if (!search.trim()) return renstraTree
    const searchLower = search.toLowerCase()

    return renstraTree.filter((p) => {
      const matchProg =
        p.kode.toLowerCase().includes(searchLower) ||
        p.nama.toLowerCase().includes(searchLower) ||
        (p.indikator && p.indikator.toLowerCase().includes(searchLower))
      const matchKeg = (p.kegiatans || []).some(
        (k) =>
          k.kode.toLowerCase().includes(searchLower) ||
          k.nama.toLowerCase().includes(searchLower) ||
          (k.sub_kegiatans || []).some(
            (s) =>
              s.kode.toLowerCase().includes(searchLower) ||
              s.nama.toLowerCase().includes(searchLower)
          )
      )
      return matchProg || matchKeg
    })
  }, [renstraTree, search])

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Perencanaan & Cascading</h1>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-muted-foreground">Renstra SKPD</span>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <PerencanaanSubnav />
        <div className="mb-6 space-y-6">
          {/* Sticky Page Header Title & Action Bar */}
          <PageHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Sheet 2B & 2C Permendagri
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight">Rencana Strategis Perangkat Daerah (Renstra SKPD)</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Pohon Kinerja Operasional: Program (A) &rarr; Kegiatan (A.1) &rarr; Sub Kegiatan (A.1.1 / Objek Risiko SPIP)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setWizardOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-transform active:scale-95"
              >
                <Sparkles className="h-4 w-4" /> Sequential Wizard
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <Upload className="h-4 w-4" /> Impor Excel
              </Button>
              <ExportExcelButton
                endpoint="/perencanaan/renstra/export"
                fixedParams={{
                  periode_penilaian_id: selectedPeriodeId,
                  opd_id: selectedOpdId,
                }}
                params={{ search }}
                filename={`Export_Renstra_SKPD_${new Date().toISOString().slice(0, 10)}.xlsx`}
                label="Ekspor Excel"
              />
              <Button
                onClick={() => handleOpenAddModal('program')}
                className="gap-1.5 shadow-sm transition-transform active:scale-95"
              >
                <Plus className="h-4 w-4" /> Tambah Program
              </Button>
            </div>
          </PageHeader>

          {/* 4 Standard Compact KPI Stats consistent with OPD & Users */}
          <KpiStatsCards items={kpiItems} isLoading={loading} />

          {/* Context Parameters Filter Card (Sheet 2B) */}
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Parameter Konteks Sumber Data (Renstra SKPD)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="flex items-center rounded-lg border bg-background p-0.5 shadow-2xs">
                    <Button
                      variant={viewMode === 'cards' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('cards')}
                      className="h-7 text-xs gap-1 px-2.5"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" /> Kartu Pohon
                    </Button>
                    <Button
                      variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('table')}
                      className="h-7 text-xs gap-1 px-2.5"
                    >
                      <TableIcon className="h-3.5 w-3.5" /> Tabel Matriks
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Sync Data
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3 items-center">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Periode & Tahun Penilaian*
                  </Label>
                  <Select
                    value={selectedPeriodeId || ''}
                    onValueChange={(val) => handleFilterChange(val, selectedOpdId, search)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.tahun_penilaian} ({p.periode_penilaian}) {p.status === 'Aktif' || p.status === 'active' ? '• [AKTIF]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" /> OPD yang Dinilai*
                  </Label>
                  <SearchableSelect
                    value={selectedOpdId ? String(selectedOpdId) : ''}
                    onValueChange={(val) => handleFilterChange(selectedPeriodeId, val, search)}
                    options={opdOptions}
                    placeholder="Pilih OPD yang dinilai..."
                    searchPlaceholder="Cari nama atau singkatan OPD..."
                    emptyMessage="Tidak ada OPD yang cocok."
                    allowClear={false}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-500" /> Filter Pencarian
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Cari Kode / Nama Program / Kegiatan..."
                      value={search}
                      onChange={(e) => handleFilterChange(selectedPeriodeId, selectedOpdId, e.target.value)}
                      className="text-xs h-9 pl-8"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    {search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleFilterChange(selectedPeriodeId, selectedOpdId, '')}
                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tujuan Strategis yang Ditentukan di Form 2B (Sheet 2C Row 10) */}
          <Card className="border border-border/70 shadow-xs bg-slate-50/70 dark:bg-slate-900/40">
            <CardContent className="p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Target className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Tujuan Strategis OPD (Ditentukan di Form 2B):
                  </span>
                  <Badge
                    variant={konteks2B?.konteks?.status === 'final' ? 'default' : 'outline'}
                    className="text-[10px] h-4"
                  >
                    {konteks2B?.konteks?.status === 'final'
                      ? 'Disahkan'
                      : konteks2B?.konteks
                      ? 'Draft'
                      : 'Belum Ditetapkan'}
                  </Badge>
                </div>
                {konteks2B?.konteks?.tujuan ? (
                  <p className="text-xs font-semibold text-foreground">
                    <span className="text-emerald-700 dark:text-emerald-400 mr-1 font-mono">
                      [{konteks2B.konteks.tujuan.nomor || 'T'}]
                    </span>
                    {konteks2B.konteks.tujuan.tujuan}
                  </p>
                ) : (
                  <p className="text-xs text-amber-600 dark:text-amber-400 italic">
                    Perangkat Daerah ini belum menetapkan Tujuan Strategis pada Formulir 2B untuk periode ini.
                  </p>
                )}
              </div>
              <Link to="/perencanaan/konteks-strategis">
                <Button variant="outline" size="sm" className="text-xs gap-1.5 shrink-0 bg-background">
                  <FileSpreadsheet className="h-3.5 w-3.5 text-primary" />
                  {konteks2B?.konteks ? 'Kelola Form 2B' : 'Buka Form 2B (Konteks Strategis)'}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Controls Bar for Tree Expand / Collapse */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Kontrol Tampilan:</span>
              <Button variant="outline" size="sm" onClick={handleExpandAll} className="h-7 text-xs gap-1 bg-background">
                <ChevronDown className="h-3.5 w-3.5 text-primary" /> Buka Semua Hierarki
              </Button>
              <Button variant="outline" size="sm" onClick={handleCollapseAll} className="h-7 text-xs gap-1 bg-background">
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" /> Tutup Semua
              </Button>
            </div>
            <div className="text-xs text-muted-foreground">
              Menampilkan <strong>{filteredPrograms.length}</strong> Program Renstra
            </div>
          </div>

          {/* MAIN VIEW: CARDS MODE (Consistent with Cascading & User Friendly) */}
          {loading ? (
            <Card className="py-16 text-center text-muted-foreground shadow-sm">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary mb-2" />
              <span className="text-xs font-medium">Memuat struktur pohon Renstra SKPD...</span>
            </Card>
          ) : filteredPrograms.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground shadow-sm border-dashed">
              <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm">Belum Ada Data Program atau Kegiatan</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Gunakan <strong>Sequential Wizard</strong>, <strong>Impor Excel</strong>, atau klik tombol <strong>Tambah Program</strong> di atas untuk memulai.
              </p>
            </Card>
          ) : viewMode === 'cards' ? (
            <div className="space-y-4">
              {filteredPrograms.map((program) => {
                const isProgExpanded = expandedPrograms[String(program.id)] ?? true
                let progTotalPagu = 0
                ;(program.kegiatans || []).forEach((k) => {
                  ;(k.sub_kegiatans || []).forEach((s) => {
                    progTotalPagu += Number(s.pagu_indikatif || 0)
                  })
                })

                return (
                  <Card
                    key={program.id}
                    className="border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* LEVEL 1: PROGRAM HEADER */}
                    <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpandProgram(program.id)}
                            >
                              {isProgExpanded ? (
                                <ChevronDown className="h-4 w-4 text-blue-600" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-blue-600" />
                              )}
                            </Button>
                            <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] px-2 py-0.5">
                              PROGRAM [{program.kode}]
                            </Badge>
                            {program.opd && (
                              <Badge variant="outline" className="bg-background text-xs font-medium gap-1">
                                <Building2 className="h-3 w-3 text-slate-500" /> {program.opd.nama || program.opd.nama_opd || 'OPD'}
                              </Badge>
                            )}
                            <Badge variant="outline" className="font-mono text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-50/50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
                              Pagu: {formatRupiah(progTotalPagu)}
                            </Badge>
                          </div>
                          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 pl-8">
                            {program.nama}
                          </h3>
                          {program.indikator && (
                            <div className="pl-8 text-xs text-muted-foreground flex flex-wrap items-center gap-3">
                              <span>Indikator: <strong className="text-foreground">{program.indikator}</strong></span>
                              {program.target && <span>Target: <strong className="text-foreground">{program.target} {program.satuan || ''}</strong></span>}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto pl-8 md:pl-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAddModal('kegiatan', program.id, program.kode)}
                            className="gap-1 text-xs h-8 bg-background border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300"
                          >
                            <Plus className="h-3.5 w-3.5" /> Kegiatan Baru
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            onClick={() => handleOpenEditModal('program', program)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleDeleteItem('program', program.id, program.nama)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* LEVEL 2 & 3 CONTENT */}
                    {isProgExpanded && (
                      <CardContent className="pt-4 space-y-4">
                        {(program.kegiatans || []).length === 0 ? (
                          <div className="text-xs text-muted-foreground italic pl-4 py-3 border-l-2 border-slate-200 bg-slate-50/40 rounded-r-md">
                            Belum ada Kegiatan di bawah Program ini. Klik &quot;+ Kegiatan Baru&quot; di atas untuk menambahkan.
                          </div>
                        ) : (
                          program.kegiatans?.map((kegiatan) => {
                            const isKegExpanded = expandedKegiatans[String(kegiatan.id)] ?? true
                            let kegTotalPagu = 0
                            ;(kegiatan.sub_kegiatans || []).forEach((s) => {
                              kegTotalPagu += Number(s.pagu_indikatif || 0)
                            })

                            return (
                              <div
                                key={kegiatan.id}
                                className="rounded-lg border border-indigo-100 bg-indigo-50/30 dark:border-indigo-950/60 dark:bg-indigo-950/20 p-3.5 space-y-3"
                              >
                                {/* LEVEL 2: KEGIATAN HEADER */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/50 dark:border-indigo-900/50 pb-2.5">
                                  <div className="flex items-start gap-2">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-5 w-5 p-0 mt-0.5 shrink-0"
                                      onClick={() => toggleExpandKegiatan(kegiatan.id)}
                                    >
                                      {isKegExpanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 text-indigo-700" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 text-indigo-700" />
                                      )}
                                    </Button>
                                    <div>
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[10px] px-2 py-0.5">
                                          KEGIATAN [{kegiatan.kode}]
                                        </Badge>
                                        <Badge variant="outline" className="font-mono text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-white/70 dark:bg-slate-900/60 border-indigo-200">
                                          Pagu: {formatRupiah(kegTotalPagu)}
                                        </Badge>
                                      </div>
                                      <h4 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-200 mt-1">
                                        {kegiatan.nama}
                                      </h4>
                                      {kegiatan.indikator && (
                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                          Indikator: <span className="font-medium text-foreground">{kegiatan.indikator}</span>
                                          {kegiatan.target && ` • Target: ${kegiatan.target} ${kegiatan.satuan || ''}`}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleOpenAddModal('sub_kegiatan', kegiatan.id, kegiatan.kode)}
                                      className="gap-1 text-[11px] h-7 bg-background border-purple-200 text-purple-700 hover:bg-purple-50 dark:text-purple-300"
                                    >
                                      <Plus className="h-3 w-3" /> Sub Kegiatan
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-blue-600 hover:bg-blue-100/50"
                                      onClick={() => handleOpenEditModal('kegiatan', kegiatan)}
                                    >
                                      <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-rose-600 hover:bg-rose-100/50"
                                      onClick={() => handleDeleteItem('kegiatan', kegiatan.id, kegiatan.nama)}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                {/* LEVEL 3: SUB KEGIATAN LIST (Objek Risiko SPIP) */}
                                {isKegExpanded && (
                                  <div className="space-y-2 pl-4">
                                    {(kegiatan.sub_kegiatans || []).length === 0 ? (
                                      <div className="text-[11px] text-muted-foreground italic pl-3 py-1.5 border-l-2 border-purple-200 bg-white/60 dark:bg-slate-900/40 rounded-r-sm">
                                        Belum ada Sub Kegiatan (Objek Risiko) yang dipetakan. Klik &quot;+ Sub Kegiatan&quot; di atas.
                                      </div>
                                    ) : (
                                      kegiatan.sub_kegiatans?.map((sub) => (
                                        <div
                                          key={sub.id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs hover:border-purple-300 transition-colors"
                                        >
                                          <div className="space-y-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <Badge
                                                variant="outline"
                                                className="bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-400 text-[10px] font-mono"
                                              >
                                                SUB KEGIATAN [{sub.kode}]
                                              </Badge>
                                              <Badge
                                                variant="secondary"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px] gap-1 px-1.5 py-0"
                                              >
                                                <ShieldCheck className="h-3 w-3" /> Objek Risiko SPIP
                                              </Badge>
                                              {sub.pagu_indikatif && (
                                                <span className="text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                                                  {formatRupiah(Number(sub.pagu_indikatif))}
                                                </span>
                                              )}
                                            </div>
                                            <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                              {sub.nama}
                                            </p>
                                            {sub.indikator && (
                                              <p className="text-[11px] text-muted-foreground">
                                                Indikator: <span className="font-medium text-foreground">{sub.indikator}</span>
                                                {sub.target && ` • Target: ${sub.target} ${sub.satuan || ''}`}
                                              </p>
                                            )}
                                          </div>

                                          <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                                              onClick={() => handleOpenEditModal('sub_kegiatan', sub)}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                                              onClick={() => handleDeleteItem('sub_kegiatan', sub.id, sub.nama)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                )}
                              </div>
                            )
                          })
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          ) : (
            /* TABULAR FORMAL MATRIX VIEW */
            <Card className="shadow-sm border">
              <CardHeader className="py-3 bg-slate-50/60 dark:bg-slate-900/60 border-b">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <TableIcon className="h-3.5 w-3.5 text-primary" /> Matriks Formal Renstra SKPD (Format Permendagri)
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80">
                      <TableRow>
                        <TableHead className="w-[140px] text-xs font-semibold">KODE</TableHead>
                        <TableHead className="text-xs font-semibold">NAMA HIERARKI RENSTRA</TableHead>
                        <TableHead className="w-[220px] text-xs font-semibold">INDIKATOR KINERJA</TableHead>
                        <TableHead className="w-[90px] text-xs font-semibold">TARGET</TableHead>
                        <TableHead className="w-[80px] text-xs font-semibold">SATUAN</TableHead>
                        <TableHead className="w-[140px] text-right text-xs font-semibold">PAGU INDIKATIF</TableHead>
                        <TableHead className="w-[100px] text-right text-xs font-semibold">AKSI</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {filteredPrograms.map((program) => {
                        const isProgExpanded = expandedPrograms[String(program.id)] ?? true
                        let progTotalPagu = 0
                        ;(program.kegiatans || []).forEach((k) => {
                          ;(k.sub_kegiatans || []).forEach((s) => {
                            progTotalPagu += Number(s.pagu_indikatif || 0)
                          })
                        })

                        return (
                          <Fragment key={program.id}>
                            {/* LEVEL 1: PROGRAM (A) */}
                            <TableRow className="bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100/60 font-semibold border-b border-blue-200/80 dark:border-blue-900/60 transition-colors">
                              <TableCell className="font-mono text-xs text-blue-900 dark:text-blue-300 py-2.5">
                                <div className="flex items-center gap-1.5">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-5 w-5 p-0 hover:bg-blue-200/50 shrink-0"
                                    onClick={() => toggleExpandProgram(program.id)}
                                  >
                                    {isProgExpanded ? (
                                      <ChevronDown className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                                    ) : (
                                      <ChevronRight className="h-3.5 w-3.5 text-blue-700 dark:text-blue-300" />
                                    )}
                                  </Button>
                                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[11px] px-1.5 py-0 shadow-2xs">
                                    {program.kode}
                                  </Badge>
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-bold text-blue-950 dark:text-blue-200 py-2.5">
                                {program.nama}
                              </TableCell>
                              <TableCell className="text-xs text-slate-700 dark:text-slate-300 py-2.5">
                                {program.indikator || '-'}
                              </TableCell>
                              <TableCell className="text-xs font-semibold py-2.5">{program.target || '-'}</TableCell>
                              <TableCell className="text-xs py-2.5">{program.satuan || '-'}</TableCell>
                              <TableCell className="text-right text-xs font-mono font-bold text-blue-700 dark:text-blue-300 py-2.5">
                                {formatRupiah(progTotalPagu)}
                              </TableCell>
                              <TableCell className="text-right py-2.5">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-emerald-600 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50"
                                    onClick={() => handleOpenAddModal('kegiatan', program.id, program.kode)}
                                    title="Tambah Kegiatan (Level 2)"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-600 hover:bg-blue-200/50 dark:hover:bg-blue-950/50"
                                    onClick={() => handleOpenEditModal('program', program)}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-100/60 dark:hover:bg-rose-950/50"
                                    onClick={() => handleDeleteItem('program', program.id, program.nama)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* LEVEL 2: KEGIATAN (A.1) */}
                            {isProgExpanded &&
                              program.kegiatans?.map((kegiatan) => {
                                const isKegExpanded = expandedKegiatans[String(kegiatan.id)] ?? true
                                let kegTotalPagu = 0
                                ;(kegiatan.sub_kegiatans || []).forEach((s) => {
                                  kegTotalPagu += Number(s.pagu_indikatif || 0)
                                })

                                return (
                                  <Fragment key={kegiatan.id}>
                                    <TableRow className="bg-slate-50/90 dark:bg-slate-900/60 hover:bg-slate-100/80 border-b border-slate-200 dark:border-slate-800 transition-colors">
                                      <TableCell className="font-mono text-xs pl-7 py-2">
                                        <div className="flex items-center gap-1.5">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-4 w-4 p-0 shrink-0"
                                            onClick={() => toggleExpandKegiatan(kegiatan.id)}
                                          >
                                            {isKegExpanded ? (
                                              <ChevronDown className="h-3 w-3 text-indigo-600" />
                                            ) : (
                                              <ChevronRight className="h-3 w-3 text-indigo-600" />
                                            )}
                                          </Button>
                                          <Badge
                                            variant="outline"
                                            className="bg-indigo-50 text-indigo-700 border-indigo-300 font-mono text-[10px] px-1 py-0"
                                          >
                                            {kegiatan.kode}
                                          </Badge>
                                        </div>
                                      </TableCell>
                                      <TableCell className="text-xs font-semibold pl-6 text-slate-900 dark:text-slate-200 py-2">
                                        {kegiatan.nama}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground py-2">
                                        {kegiatan.indikator || '-'}
                                      </TableCell>
                                      <TableCell className="text-xs py-2">{kegiatan.target || '-'}</TableCell>
                                      <TableCell className="text-xs py-2">{kegiatan.satuan || '-'}</TableCell>
                                      <TableCell className="text-right text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400 py-2">
                                        {formatRupiah(kegTotalPagu)}
                                      </TableCell>
                                      <TableCell className="text-right py-2">
                                        <div className="flex justify-end gap-1">
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                                            onClick={() =>
                                              handleOpenAddModal('sub_kegiatan', kegiatan.id, kegiatan.kode)
                                            }
                                            title="Tambah Sub Kegiatan (Level 3)"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                            onClick={() => handleOpenEditModal('kegiatan', kegiatan)}
                                          >
                                            <Pencil className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                            onClick={() =>
                                              handleDeleteItem('kegiatan', kegiatan.id, kegiatan.nama)
                                            }
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </TableCell>
                                    </TableRow>

                                    {/* LEVEL 3: SUB KEGIATAN (A.1.1) */}
                                    {isKegExpanded &&
                                      kegiatan.sub_kegiatans?.map((sub) => (
                                        <TableRow
                                          key={sub.id}
                                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60 transition-colors"
                                        >
                                          <TableCell className="font-mono text-xs pl-12 text-slate-500 py-1.5">
                                            <Badge
                                              variant="outline"
                                              className="bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 font-mono text-[9px] px-1 py-0"
                                            >
                                              {sub.kode}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-xs pl-10 text-slate-700 dark:text-slate-300 py-1.5">
                                            <div className="flex items-center gap-1.5">
                                              <span>{sub.nama}</span>
                                              <Badge
                                                variant="secondary"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[9px] px-1 py-0 h-4"
                                              >
                                                SPIP
                                              </Badge>
                                            </div>
                                          </TableCell>
                                          <TableCell className="text-xs text-muted-foreground py-1.5">
                                            {sub.indikator || '-'}
                                          </TableCell>
                                          <TableCell className="text-xs py-1.5">{sub.target || '-'}</TableCell>
                                          <TableCell className="text-xs py-1.5">{sub.satuan || '-'}</TableCell>
                                          <TableCell className="text-right text-xs font-mono text-muted-foreground py-1.5">
                                            {sub.pagu_indikatif ? formatRupiah(Number(sub.pagu_indikatif)) : '-'}
                                          </TableCell>
                                          <TableCell className="text-right py-1.5">
                                            <div className="flex justify-end gap-1">
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                                                onClick={() => handleOpenEditModal('sub_kegiatan', sub)}
                                              >
                                                <Pencil className="h-3 w-3" />
                                              </Button>
                                              <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                                                onClick={() =>
                                                  handleDeleteItem('sub_kegiatan', sub.id, sub.nama)
                                                }
                                              >
                                                <Trash2 className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                  </Fragment>
                                )
                              })}
                          </Fragment>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Main>

      {/* SEQUENTIAL WIZARD MODAL */}
      <RenstraSequentialWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        opds={opds}
        periodes={periodes}
        existingPrograms={renstraTree}
        onSuccess={() => fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)}
      />

      {/* IMPORT EXCEL DIALOG */}
      <RenstraImportDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        opds={opds}
        periodes={periodes}
        onSuccess={() => fetchRenstraTree(selectedPeriodeId, selectedOpdId, search)}
      />

      {/* INLINE ADD DIALOG */}
      <Dialog open={addModal.type !== null} onOpenChange={(o) => !o && setAddModal({ type: null })}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  Tambah {addModal.type === 'program' ? 'Program (Level 1)' : addModal.type === 'kegiatan' ? 'Kegiatan (Level 2)' : 'Sub Kegiatan (Level 3 - Objek Risiko)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {addModal.parentKode ? `Menambahkan anak di bawah induk Kode: [${addModal.parentKode}]` : 'Buat item program kerja Renstra baru.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-renstra-add" onSubmit={handleSaveAddModal} className="space-y-4 w-full min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Kode*</Label>
                  <Input
                    value={formInput.kode}
                    onChange={(e) => setFormInput({ ...formInput, kode: e.target.value })}
                    className="text-xs font-mono h-9"
                    placeholder="A / A.1 / A.1.1"
                    required
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Nama*</Label>
                  <Input
                    value={formInput.nama}
                    onChange={(e) => setFormInput({ ...formInput, nama: e.target.value })}
                    className="text-xs h-9"
                    placeholder="contoh: Nama Program / Kegiatan..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Indikator Kinerja</Label>
                  <Input
                    value={formInput.indikator}
                    onChange={(e) => setFormInput({ ...formInput, indikator: e.target.value })}
                    className="text-xs h-9"
                    placeholder="contoh: Persentase Capaian..."
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Target &amp; Satuan</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="100"
                      value={formInput.target}
                      onChange={(e) => setFormInput({ ...formInput, target: e.target.value })}
                      className="text-xs h-9 min-w-0"
                    />
                    <Input
                      placeholder="%"
                      value={formInput.satuan}
                      onChange={(e) => setFormInput({ ...formInput, satuan: e.target.value })}
                      className="text-xs h-9 min-w-0 w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Pagu Indikatif Anggaran (Rp)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={formInput.pagu_indikatif || ''}
                  onChange={(e) => setFormInput({ ...formInput, pagu_indikatif: Number(e.target.value) || 0 })}
                  className="text-xs font-mono h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Format: {formatRupiah(formInput.pagu_indikatif)}
                </p>
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setAddModal({ type: null })}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-renstra-add"
              disabled={submitting}
              className="text-xs h-9 min-w-[120px] gap-1"
            >
              {submitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM DIALOG */}
      <Dialog open={editModal.type !== null} onOpenChange={(o) => !o && setEditModal({ type: null })}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <Pencil className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  Edit {editModal.type?.toUpperCase()} Renstra
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Perbarui rumusan data hierarki operasional Renstra.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-renstra-edit" onSubmit={handleSaveEditModal} className="space-y-4 w-full min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Kode*</Label>
                  <Input
                    value={formInput.kode}
                    onChange={(e) => setFormInput({ ...formInput, kode: e.target.value })}
                    className="text-xs font-mono h-9"
                    required
                  />
                </div>
                <div className="sm:col-span-3 space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Nama*</Label>
                  <Input
                    value={formInput.nama}
                    onChange={(e) => setFormInput({ ...formInput, nama: e.target.value })}
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Indikator Kinerja</Label>
                  <Input
                    value={formInput.indikator}
                    onChange={(e) => setFormInput({ ...formInput, indikator: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Target &amp; Satuan</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="100"
                      value={formInput.target}
                      onChange={(e) => setFormInput({ ...formInput, target: e.target.value })}
                      className="text-xs h-9 min-w-0"
                    />
                    <Input
                      placeholder="%"
                      value={formInput.satuan}
                      onChange={(e) => setFormInput({ ...formInput, satuan: e.target.value })}
                      className="text-xs h-9 min-w-0 w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-600" /> Pagu Indikatif Anggaran (Rp)
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="1000"
                  placeholder="0"
                  value={formInput.pagu_indikatif || ''}
                  onChange={(e) => setFormInput({ ...formInput, pagu_indikatif: Number(e.target.value) || 0 })}
                  className="text-xs font-mono h-9"
                />
                <p className="text-[11px] text-muted-foreground">
                  Format: {formatRupiah(formInput.pagu_indikatif)}
                </p>
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEditModal({ type: null })}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-renstra-edit"
              disabled={submitting}
              className="text-xs h-9 min-w-[130px] gap-1"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
