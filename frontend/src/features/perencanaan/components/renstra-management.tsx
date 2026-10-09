import { useState, useEffect, useCallback, useMemo, Fragment } from 'react'
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  FileSpreadsheet,
  Download,
  Upload,
  Building2,
  Calendar,
  Search,
  ChevronRight,
  ChevronDown,
  RefreshCw,
  Sparkles,
  X,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/layout/page-header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { perencanaanService } from '@/services/perencanaan-service'
import { opdService } from '@/services/opd-service'
import { RenstraSequentialWizard } from './renstra-sequential-wizard'
import { RenstraImportDialog } from './renstra-import-dialog'
import type {
  RenstraProgram,
  PeriodePenilaian,
} from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'

export function RenstraManagement() {
  const [renstraTree, setRenstraTree] = useState<RenstraProgram[]>([])
  const [opds, setOpds] = useState<Opd[]>([])
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number | undefined>(undefined)
  const [selectedOpdId, setSelectedOpdId] = useState<number | undefined>(undefined)
  const [search, setSearch] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(true)
  const [exporting, setExporting] = useState<boolean>(false)

  // Expandable rows state
  const [expandedPrograms, setExpandedPrograms] = useState<Record<number, boolean>>({})
  const [expandedKegiatans, setExpandedKegiatans] = useState<Record<number, boolean>>({})

  // Dialog & Modal States
  const [wizardOpen, setWizardOpen] = useState<boolean>(false)
  const [importDialogOpen, setImportDialogOpen] = useState<boolean>(false)

  // Quick Inline Add Modal States
  const [addModal, setAddModal] = useState<{
    type: 'kegiatan' | 'sub_kegiatan' | 'program' | null
    parentId?: number
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
    id?: number
  }>({ type: null })

  const [submitting, setSubmitting] = useState<boolean>(false)

  const fetchRenstraTree = useCallback(async (periodeId?: number, opdId?: number, querySearch?: string) => {
    setLoading(true)
    try {
      const data = await perencanaanService.getRenstraTree({
        periode_id: periodeId,
        opd_id: opdId,
        search: querySearch,
      })
      setRenstraTree(data)
      const initialExp: Record<number, boolean> = {}
      data.forEach((p) => (initialExp[p.id] = true))
      setExpandedPrograms(initialExp)
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

      const active = periodeList.find((p) => p.status === 'Aktif') || periodeList[0]
      const defaultPeriodeId = active?.id
      const defaultOpdId = opdList.length > 0 ? Number(opdList[0].id) : undefined

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

  const handleFilterChange = (periodeId?: number, opdId?: number, qSearch?: string) => {
    setSelectedPeriodeId(periodeId)
    setSelectedOpdId(opdId)
    setSearch(qSearch ?? search)
    fetchRenstraTree(periodeId, opdId, qSearch ?? search)
  }

  const toggleExpandProgram = (id: number) => {
    setExpandedPrograms((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const toggleExpandKegiatan = (id: number) => {
    setExpandedKegiatans((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await perencanaanService.exportRenstra({
        periode_id: selectedPeriodeId,
        opd_id: selectedOpdId,
        search,
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Export_Renstra_SKPD_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
      toast.success('File Excel Renstra berhasil diunduh.')
    } catch {
      toast.error('Terjadi kesalahan saat mengunduh Excel.')
    } finally {
      setExporting(false)
    }
  }

  // Handle Quick Add Item
  const handleOpenAddModal = (
    type: 'program' | 'kegiatan' | 'sub_kegiatan',
    parentId?: number,
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
    setAddModal({ type, parentId, parentKode })
  }

  const handleSaveAddModal = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (addModal.type === 'program') {
        if (!selectedOpdId || !selectedPeriodeId) return
        await perencanaanService.createProgram({
          opd_id: selectedOpdId,
          periode_id: selectedPeriodeId,
          ...formInput,
        })
        toast.success('Program Renstra berhasil dibuat.')
      } else if (addModal.type === 'kegiatan' && addModal.parentId) {
        await perencanaanService.createKegiatan({
          program_id: addModal.parentId,
          ...formInput,
        })
        toast.success('Kegiatan Renstra berhasil dibuat.')
      } else if (addModal.type === 'sub_kegiatan' && addModal.parentId) {
        await perencanaanService.createSubKegiatan({
          kegiatan_id: addModal.parentId,
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
    id: number,
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
    item: { id: number; kode: string; nama: string; indikator?: string | null; target?: string | null; satuan?: string | null }
  ) => {
    setFormInput({
      kode: item.kode,
      nama: item.nama,
      indikator: item.indikator || '',
      target: item.target || '',
      satuan: item.satuan || '',
      pagu_indikatif: 0,
    })
    setEditModal({ type, id: item.id })
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
    if (!val && val !== 0) return '-'
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val)
  }

  const handleExpandAll = () => {
    const progExp: Record<number, boolean> = {}
    const kegExp: Record<number, boolean> = {}
    renstraTree.forEach((p) => {
      progExp[p.id] = true
      ;(p.kegiatans || []).forEach((k) => {
        kegExp[k.id] = true
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
      const kegs = p.kegiatans || []
      totalKegiatans += kegs.length
      kegs.forEach((k) => {
        const subs = k.sub_kegiatans || []
        totalSubKegiatans += subs.length
        subs.forEach((s) => {
          totalPagu += Number(s.pagu_indikatif || 0)
        })
      })
    })

    return { totalPrograms, totalKegiatans, totalSubKegiatans, totalPagu }
  }, [renstraTree])

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
                  Sheet 2B & 2C
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight">Pohon Renstra SKPD (Program & Kegiatan)</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Memetakan hierarki operasional: Program (A) &rarr; Kegiatan (A.1) &rarr; Sub Kegiatan (A.1.1)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setWizardOpen(true)}
                className="gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-sm transition-transform active:scale-95"
              >
                <Sparkles className="h-4 w-4" /> Sequential Wizard Form
              </Button>
              <Button
                onClick={() => setImportDialogOpen(true)}
                variant="outline"
                className="gap-1.5 border-emerald-500 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
              >
                <Upload className="h-4 w-4" /> Impor Excel
              </Button>
              <Button
                onClick={handleExport}
                disabled={exporting}
                variant="outline"
                className="gap-1.5 border-slate-300"
              >
                <Download className="h-4 w-4" />
                {exporting ? 'Mengunduh...' : 'Ekspor Excel'}
              </Button>
            </div>
          </PageHeader>

          {/* Context Parameters Filter Card (Sheet 2B) */}
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" /> Parameter Konteks Sumber Data (Renstra SKPD)
                </CardTitle>
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="hidden sm:inline">Total Item:</span>
                  <Badge variant="secondary" className="font-mono text-[11px]">
                    {stats.totalPrograms} Program | {stats.totalKegiatans} Kegiatan | {stats.totalSubKegiatans} Sub
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-4 items-center">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Nama Pemda*</Label>
                  <Input value="Pemerintah Daerah" disabled className="bg-slate-100 dark:bg-slate-800 text-xs font-semibold" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Periode & Tahun Penilaian*
                  </Label>
                  <Select
                    value={selectedPeriodeId ? String(selectedPeriodeId) : ''}
                    onValueChange={(val) => handleFilterChange(Number(val), selectedOpdId, search)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.tahun_penilaian} ({p.periode_penilaian}) {p.status === 'Aktif' ? '• [AKTIF]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" /> OPD yang Dinilai*
                  </Label>
                  <Select
                    value={selectedOpdId ? String(selectedOpdId) : ''}
                    onValueChange={(val) => handleFilterChange(selectedPeriodeId, Number(val), search)}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Pilih OPD" />
                    </SelectTrigger>
                    <SelectContent>
                      {opds.map((opd) => (
                        <SelectItem key={opd.id} value={String(opd.id)}>
                          {getOpdName(opd)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-500" /> Filter Pencarian
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Cari Kode / Nama Program..."
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

          {/* KPI Summary Stat Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Program (Level 1)</p>
                  <p className="text-2xl font-bold tracking-tight text-blue-600 mt-1">{stats.totalPrograms}</p>
                </div>
                <div className="p-2.5 bg-blue-100 dark:bg-blue-950/60 text-blue-600 rounded-lg">
                  <Layers className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-indigo-500 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Kegiatan (Level 2)</p>
                  <p className="text-2xl font-bold tracking-tight text-indigo-600 mt-1">{stats.totalKegiatans}</p>
                </div>
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 rounded-lg">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Sub-Kegiatan (Level 3)</p>
                  <p className="text-2xl font-bold tracking-tight text-purple-600 mt-1">{stats.totalSubKegiatans}</p>
                </div>
                <div className="p-2.5 bg-purple-100 dark:bg-purple-950/60 text-purple-600 rounded-lg">
                  <Sparkles className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-2xs hover:shadow-xs transition-shadow">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Pagu Indikatif</p>
                  <p className="text-sm font-bold tracking-tight text-emerald-600 mt-1 font-mono">{formatRupiah(stats.totalPagu)}</p>
                </div>
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 rounded-lg">
                  <Building2 className="h-5 w-5" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tree Grid Table View */}
          <Card className="shadow-sm border">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between py-4 border-b bg-slate-50/50 dark:bg-slate-900/50 gap-2">
              <div>
                <CardTitle className="text-base font-semibold">Tabel Hierarki Operasional Renstra SKPD</CardTitle>
                <CardDescription className="text-xs">
                  Struktur Penomoran Standard: <strong className="text-blue-600">Level 1 = Program</strong> | <strong className="text-indigo-600">Level 2 = Kegiatan</strong> | <strong className="text-purple-600">Level 3 = Sub Kegiatan</strong>
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleExpandAll} className="h-8 text-xs gap-1 bg-background">
                  <ChevronDown className="h-3.5 w-3.5" /> Buka Semua
                </Button>
                <Button variant="outline" size="sm" onClick={handleCollapseAll} className="h-8 text-xs gap-1 bg-background">
                  <ChevronRight className="h-3.5 w-3.5" /> Tutup Semua
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleOpenAddModal('program')}
                  className="gap-1 text-xs h-8 shrink-0 shadow-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Program Baru
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">Memuat data Renstra SKPD...</span>
                </div>
              ) : renstraTree.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-3">
                  <FileSpreadsheet className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="font-semibold text-sm">Belum Ada Data Program atau Kegiatan</p>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Gunakan <strong>Sequential Wizard Form</strong> atau tombol <strong>Impor Excel</strong> di atas untuk memasukkan data Renstra SKPD.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/80 dark:bg-slate-800/80">
                      <TableRow>
                        <TableHead className="w-[150px] text-xs font-semibold">KODE</TableHead>
                        <TableHead className="text-xs font-semibold">NAMA HIERARKI RENSTRA</TableHead>
                        <TableHead className="w-[240px] text-xs font-semibold">INDIKATOR KINERJA</TableHead>
                        <TableHead className="w-[100px] text-xs font-semibold">TARGET</TableHead>
                        <TableHead className="w-[90px] text-xs font-semibold">SATUAN</TableHead>
                        <TableHead className="w-[150px] text-right text-xs font-semibold">PAGU INDIKATIF</TableHead>
                        <TableHead className="w-[110px] text-right text-xs font-semibold">AKSI</TableHead>
                      </TableRow>
                    </TableHeader>

                    <TableBody>
                      {renstraTree.map((program) => {
                        const isProgExpanded = expandedPrograms[program.id] ?? true
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
                                const isKegExpanded = expandedKegiatans[kegiatan.id] ?? true
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
                                          className="hover:bg-slate-50 dark:hover:bg-slate-800/40 text-xs border-b border-slate-100 dark:border-slate-800/50 transition-colors"
                                        >
                                          <TableCell className="font-mono text-xs pl-14 py-2">
                                            <Badge
                                              variant="secondary"
                                              className="bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-mono text-[10px] px-1 py-0"
                                            >
                                              {sub.kode}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="pl-10 text-slate-800 dark:text-slate-300 py-2">
                                            {sub.nama}
                                          </TableCell>
                                          <TableCell className="text-muted-foreground py-2">
                                            {sub.indikator || '-'}
                                          </TableCell>
                                          <TableCell className="py-2">{sub.target || '-'}</TableCell>
                                          <TableCell className="py-2">{sub.satuan || '-'}</TableCell>
                                          <TableCell className="text-right text-xs font-mono font-medium text-emerald-600 dark:text-emerald-400 py-2">
                                            {formatRupiah(sub.pagu_indikatif ?? 0)}
                                          </TableCell>
                                          <TableCell className="text-right py-2">
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
              )}
            </CardContent>
          </Card>
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
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveAddModal}>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-primary" />
                Tambah {addModal.type === 'program' ? 'Program (Level A)' : addModal.type === 'kegiatan' ? 'Kegiatan (Level A.1)' : 'Sub Kegiatan (Level A.1.1)'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {addModal.parentKode ? `Menambahkan anak di bawah Induk Kode: [${addModal.parentKode}]` : 'Buat item hierarki baru.'}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Kode*</Label>
                  <Input
                    value={formInput.kode}
                    onChange={(e) => setFormInput({ ...formInput, kode: e.target.value })}
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs font-semibold">Nama*</Label>
                  <Input
                    value={formInput.nama}
                    onChange={(e) => setFormInput({ ...formInput, nama: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Indikator</Label>
                  <Input
                    value={formInput.indikator}
                    onChange={(e) => setFormInput({ ...formInput, indikator: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Target & Satuan</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="100"
                      value={formInput.target}
                      onChange={(e) => setFormInput({ ...formInput, target: e.target.value })}
                      className="text-xs"
                    />
                    <Input
                      placeholder="%"
                      value={formInput.satuan}
                      onChange={(e) => setFormInput({ ...formInput, satuan: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddModal({ type: null })} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs">
                {submitting ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT ITEM DIALOG */}
      <Dialog open={editModal.type !== null} onOpenChange={(o) => !o && setEditModal({ type: null })}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveEditModal}>
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Pencil className="h-4 w-4 text-blue-600" />
                Edit {editModal.type?.toUpperCase()} Renstra
              </DialogTitle>
              <DialogDescription className="text-xs">Perbarui rumusan data hierarki operasional Renstra.</DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs font-semibold">Kode*</Label>
                  <Input
                    value={formInput.kode}
                    onChange={(e) => setFormInput({ ...formInput, kode: e.target.value })}
                    className="text-xs font-mono"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs font-semibold">Nama*</Label>
                  <Input
                    value={formInput.nama}
                    onChange={(e) => setFormInput({ ...formInput, nama: e.target.value })}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs font-semibold">Indikator</Label>
                  <Input
                    value={formInput.indikator}
                    onChange={(e) => setFormInput({ ...formInput, indikator: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Target & Satuan</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="100"
                      value={formInput.target}
                      onChange={(e) => setFormInput({ ...formInput, target: e.target.value })}
                      className="text-xs"
                    />
                    <Input
                      placeholder="%"
                      value={formInput.satuan}
                      onChange={(e) => setFormInput({ ...formInput, satuan: e.target.value })}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditModal({ type: null })} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs">
                {submitting ? 'Menyimpan...' : 'Simpan Perubahan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
