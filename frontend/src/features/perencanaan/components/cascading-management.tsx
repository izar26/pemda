import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  GitFork,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Calendar,
  Target,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Layers,
  Filter,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import type { CascadingTreeItem, PeriodePenilaian } from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'

export function CascadingManagement() {
  const [cascadingData, setCascadingData] = useState<CascadingTreeItem[]>([])
  const [opds, setOpds] = useState<Opd[]>([])
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number | undefined>(undefined)
  const [selectedOpdId, setSelectedOpdId] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')

  // Expandable collapse state for performance on large tree
  const [expandedTujuans, setExpandedTujuans] = useState<Record<number, boolean>>({})

  // Dialog States
  const [tujuanDialogOpen, setTujuanDialogOpen] = useState<boolean>(false)
  const [editingTujuan, setEditingTujuan] = useState<{ id: number; tujuan: string } | null>(null)
  const [tujuanInput, setTujuanInput] = useState<{ opd_id: number; tujuan: string }>({
    opd_id: 0,
    tujuan: '',
  })

  const [sasaranDialogOpen, setSasaranDialogOpen] = useState<boolean>(false)
  const [editingSasaran, setEditingSasaran] = useState<{ id: number; sasaran: string } | null>(null)
  const [sasaranInput, setSasaranInput] = useState<{ tujuan_id: number; sasaran: string }>({
    tujuan_id: 0,
    sasaran: '',
  })

  const [indikatorDialogOpen, setIndikatorDialogOpen] = useState<boolean>(false)
  const [editingIndikator, setEditingIndikator] = useState<{
    id: number
    indikator: string
    jenis?: string | null
    target?: string | null
    satuan?: string | null
  } | null>(null)
  const [indikatorInput, setIndikatorInput] = useState<{
    sasaran_id: number
    indikator: string
    jenis: string
    target: string
    satuan: string
  }>({
    sasaran_id: 0,
    indikator: '',
    jenis: 'Utama',
    target: '',
    satuan: '',
  })

  const [submitting, setSubmitting] = useState<boolean>(false)

  const fetchCascadingTree = useCallback(async (periodeId?: number, opdId?: number) => {
    setLoading(true)
    try {
      const data = await perencanaanService.getCascadingTree(periodeId, opdId)
      setCascadingData(data)
      // Auto expand all tujuans by default
      const initialExp: Record<number, boolean> = {}
      data.forEach((t) => (initialExp[t.id] = true))
      setExpandedTujuans(initialExp)
    } catch {
      toast.error('Terjadi kesalahan saat memuat pohon cascading makro.')
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
      const periodeId = active?.id
      if (periodeId) {
        setSelectedPeriodeId(periodeId)
      }
      fetchCascadingTree(periodeId, undefined)
    } catch {
      toast.error('Tidak dapat mengambil daftar Periode atau OPD.')
      setLoading(false)
    }
  }, [fetchCascadingTree])

  useEffect(() => {
    loadInitialData()
  }, [loadInitialData])

  const handleFilterChange = (periodeId?: number, opdId?: number) => {
    setSelectedPeriodeId(periodeId)
    setSelectedOpdId(opdId)
    fetchCascadingTree(periodeId, opdId)
  }

  const getOpdName = (opd: Opd) => {
    return opd.nama || (opd as unknown as { nama_opd: string }).nama_opd || 'OPD'
  }

  const opdFilterOptions: SearchableSelectOption[] = useMemo(() => {
    const list: SearchableSelectOption[] = [
      {
        value: 'all',
        label: 'Semua Perangkat Daerah (Keseluruhan)',
      },
    ]
    opds.forEach((opd) => {
      list.push({
        value: String(opd.id),
        label: getOpdName(opd),
        group: opd.kategori || 'Perangkat Daerah',
        badge: opd.kategori,
        keywords: [opd.kode, opd.kategori].filter(Boolean) as string[],
      })
    })
    return list
  }, [opds])

  const opdDialogOptions: SearchableSelectOption[] = useMemo(() => {
    return opds.map((opd) => ({
      value: String(opd.id),
      label: getOpdName(opd),
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori].filter(Boolean) as string[],
    }))
  }, [opds])

  const toggleExpandTujuan = (id: number) => {
    setExpandedTujuans((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // --- HANDLERS TUJUAN ---
  const handleOpenAddTujuan = (opdId?: number) => {
    setEditingTujuan(null)
    setTujuanInput({ opd_id: opdId || (opds[0]?.id ? Number(opds[0].id) : 0), tujuan: '' })
    setTujuanDialogOpen(true)
  }

  const handleSaveTujuan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) return
    setSubmitting(true)
    try {
      if (editingTujuan) {
        await perencanaanService.updateTujuan(editingTujuan.id, { tujuan: tujuanInput.tujuan })
        toast.success('Tujuan strategis berhasil diperbarui.')
      } else {
        await perencanaanService.createTujuan({
          opd_id: tujuanInput.opd_id,
          periode_id: selectedPeriodeId,
          tujuan: tujuanInput.tujuan,
        })
        toast.success('Tujuan strategis baru berhasil ditambahkan.')
      }
      setTujuanDialogOpen(false)
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menyimpan tujuan strategis.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTujuan = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Tujuan beserta Sasaran & Indikatornya?')) return
    try {
      await perencanaanService.deleteTujuan(id)
      toast.success('Tujuan strategis berhasil dihapus.')
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menghapus tujuan strategis.')
    }
  }

  // --- HANDLERS SASARAN ---
  const handleOpenAddSasaran = (tujuanId: number) => {
    setEditingSasaran(null)
    setSasaranInput({ tujuan_id: tujuanId, sasaran: '' })
    setSasaranDialogOpen(true)
  }

  const handleSaveSasaran = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) return
    setSubmitting(true)
    try {
      if (editingSasaran) {
        await perencanaanService.updateSasaran(editingSasaran.id, { sasaran: sasaranInput.sasaran })
        toast.success('Sasaran strategis berhasil diperbarui.')
      } else {
        await perencanaanService.createSasaran({
          tujuan_id: sasaranInput.tujuan_id,
          periode_id: selectedPeriodeId,
          sasaran: sasaranInput.sasaran,
        })
        toast.success('Sasaran strategis baru berhasil ditambahkan.')
      }
      setSasaranDialogOpen(false)
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menyimpan sasaran strategis.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteSasaran = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Sasaran beserta Indikatornya?')) return
    try {
      await perencanaanService.deleteSasaran(id)
      toast.success('Sasaran strategis berhasil dihapus.')
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menghapus sasaran strategis.')
    }
  }

  // --- HANDLERS INDIKATOR ---
  const handleOpenAddIndikator = (sasaranId: number) => {
    setEditingIndikator(null)
    setIndikatorInput({ sasaran_id: sasaranId, indikator: '', jenis: 'Utama', target: '', satuan: '' })
    setIndikatorDialogOpen(true)
  }

  const handleSaveIndikator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) return
    setSubmitting(true)
    try {
      if (editingIndikator) {
        await perencanaanService.updateIndikator(editingIndikator.id, {
          indikator: indikatorInput.indikator,
          jenis: indikatorInput.jenis,
          target: indikatorInput.target,
          satuan: indikatorInput.satuan,
        })
        toast.success('Indikator sasaran berhasil diperbarui.')
      } else {
        await perencanaanService.createIndikator({
          sasaran_id: indikatorInput.sasaran_id,
          periode_id: selectedPeriodeId,
          indikator: indikatorInput.indikator,
          jenis: indikatorInput.jenis,
          target: indikatorInput.target,
          satuan: indikatorInput.satuan,
        })
        toast.success('Indikator sasaran baru berhasil ditambahkan.')
      }
      setIndikatorDialogOpen(false)
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menyimpan indikator sasaran.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteIndikator = async (id: number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Indikator Sasaran ini?')) return
    try {
      await perencanaanService.deleteIndikator(id)
      toast.success('Indikator sasaran berhasil dihapus.')
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menghapus indikator sasaran.')
    }
  }

  // Optimize search filtering with useMemo
  const filteredCascading = useMemo(() => {
    if (!search.trim()) return cascadingData
    const searchLower = search.toLowerCase()
    return cascadingData.filter((item) => {
      return (
        item.opd_nama.toLowerCase().includes(searchLower) ||
        item.tujuan.toLowerCase().includes(searchLower) ||
        item.sasarans.some(
          (s) =>
            s.sasaran.toLowerCase().includes(searchLower) ||
            s.indikators.some((ind) => ind.indikator.toLowerCase().includes(searchLower))
        )
      )
    })
  }, [cascadingData, search])

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <GitFork className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Perencanaan & Cascading</h1>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-muted-foreground">Cascading Makro</span>
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
          <PageHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                  Fitur No. 14–17
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight">Hierarki Pohon Kinerja Daerah (Bapperida)</h2>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Relasi berjenjang 3 Tingkat: Tujuan Strategis &rarr; Sasaran Strategis &rarr; Indikator Kinerja Makro
              </p>
            </div>
            <Button onClick={() => handleOpenAddTujuan()} className="gap-2 shadow-sm transition-transform active:scale-95">
              <Plus className="h-4 w-4" /> Tambah Tujuan Strategis
            </Button>
          </PageHeader>

          {/* Context Parameters Filter Card */}
          <Card className="shadow-sm border border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3.5 bg-slate-50/70 dark:bg-slate-900/60 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Parameter Konteks Pohon Kinerja Makro
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => fetchCascadingTree(selectedPeriodeId, selectedOpdId)}
                  className="h-7 text-xs gap-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Sync Data
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid gap-4 md:grid-cols-3 items-center">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-blue-600" /> Periode Penilaian Aktif*
                  </Label>
                  <Select
                    value={selectedPeriodeId ? String(selectedPeriodeId) : ''}
                    onValueChange={(val) => handleFilterChange(Number(val), selectedOpdId)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.tahun_penilaian} ({p.periode_penilaian}) {p.status === 'Aktif' ? '• [AKTIF GLOBAL]' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600" /> Filter Perangkat Daerah (OPD)*
                  </Label>
                  <SearchableSelect
                    value={selectedOpdId ? String(selectedOpdId) : 'all'}
                    onValueChange={(val) =>
                      handleFilterChange(selectedPeriodeId, val === 'all' || !val ? undefined : Number(val))
                    }
                    options={opdFilterOptions}
                    placeholder="Semua OPD"
                    searchPlaceholder="Cari nama atau singkatan OPD..."
                    emptyMessage="Tidak ada OPD yang cocok."
                    allowClear={false}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold flex items-center gap-1.5">
                    <Search className="h-3.5 w-3.5 text-slate-500" /> Pencarian Kata Kunci
                  </Label>
                  <div className="relative">
                    <Input
                      placeholder="Cari Tujuan / Sasaran / Indikator..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-9 text-xs pl-8"
                    />
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tree View Display */}
          {loading ? (
            <Card className="py-16 text-center text-muted-foreground shadow-sm">
              <RefreshCw className="mx-auto h-7 w-7 animate-spin text-primary mb-2" />
              <span className="text-xs font-medium">Memuat struktur pohon cascading makro Bapperida...</span>
            </Card>
          ) : filteredCascading.length === 0 ? (
            <Card className="py-16 text-center text-muted-foreground shadow-sm border-dashed">
              <GitFork className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
              <p className="font-semibold text-sm">Belum Ada Pohon Kinerja Makro</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                Klik tombol &quot;Tambah Tujuan Strategis&quot; di atas untuk memulai penetapan sasaran makro daerah.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredCascading.map((tujuanItem) => {
                const isExpanded = expandedTujuans[tujuanItem.id] ?? true
                return (
                  <Card
                    key={tujuanItem.id}
                    className="border-l-4 border-l-primary shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* LEVEL 1: TUJUAN HEADER */}
                    <CardHeader className="bg-slate-50/80 dark:bg-slate-900/60 pb-3 border-b">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1.5 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 p-0"
                              onClick={() => toggleExpandTujuan(tujuanItem.id)}
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </Button>
                            <Badge className="bg-primary hover:bg-primary/90 text-white font-mono text-[11px] px-2 py-0.5">
                              LEVEL 1: TUJUAN STRATEGIS
                            </Badge>
                            <Badge variant="outline" className="bg-background text-xs font-medium gap-1">
                              <Building2 className="h-3 w-3 text-slate-500" /> {tujuanItem.opd_nama}
                            </Badge>
                          </div>
                          <h3 className="text-base font-bold tracking-tight text-slate-900 dark:text-slate-100 pl-8">
                            {tujuanItem.tujuan}
                          </h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto pl-8 md:pl-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenAddSasaran(tujuanItem.id)}
                            className="gap-1 text-xs h-8 bg-background border-blue-200 text-blue-700 hover:bg-blue-50 dark:text-blue-300"
                          >
                            <Plus className="h-3.5 w-3.5" /> Sasaran Baru
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                            onClick={() => {
                              setEditingTujuan({ id: tujuanItem.id, tujuan: tujuanItem.tujuan })
                              setTujuanInput({ opd_id: tujuanItem.opd_id, tujuan: tujuanItem.tujuan })
                              setTujuanDialogOpen(true)
                            }}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                            onClick={() => handleDeleteTujuan(tujuanItem.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    {/* LEVEL 2 & 3 CONTENT */}
                    {isExpanded && (
                      <CardContent className="pt-4 space-y-4">
                        {tujuanItem.sasarans.length === 0 ? (
                          <div className="text-xs text-muted-foreground italic pl-4 py-3 border-l-2 border-slate-200 bg-slate-50/40 rounded-r-md">
                            Belum ada Sasaran Strategis yang ditautkan ke Tujuan ini. Klik &quot;+ Sasaran Baru&quot; untuk menambahkan.
                          </div>
                        ) : (
                          tujuanItem.sasarans.map((sasaranItem) => (
                            <div
                              key={sasaranItem.id}
                              className="ml-2 md:ml-4 pl-4 border-l-2 border-blue-400 dark:border-blue-700 space-y-3"
                            >
                              {/* LEVEL 2: SASARAN BAR */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-blue-50/60 dark:bg-blue-950/30 p-3 rounded-md border border-blue-200/60 dark:border-blue-900/60 hover:border-blue-300 transition-colors">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-mono text-[10px] px-1.5 py-0">
                                      LEVEL 2: SASARAN STRATEGIS
                                    </Badge>
                                  </div>
                                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                    {sasaranItem.sasaran}
                                  </p>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenAddIndikator(sasaranItem.id)}
                                    className="gap-1 text-xs h-7 bg-background border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300"
                                  >
                                    <Plus className="h-3 w-3" /> Indikator
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-blue-600 hover:bg-blue-100/60"
                                    onClick={() => {
                                      setEditingSasaran({ id: sasaranItem.id, sasaran: sasaranItem.sasaran })
                                      setSasaranInput({ tujuan_id: tujuanItem.id, sasaran: sasaranItem.sasaran })
                                      setSasaranDialogOpen(true)
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-rose-600 hover:bg-rose-100/60"
                                    onClick={() => handleDeleteSasaran(sasaranItem.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </div>

                              {/* LEVEL 3: INDIKATOR SASARAN LIST */}
                              <div className="ml-2 sm:ml-4 space-y-2">
                                {sasaranItem.indikators.length === 0 ? (
                                  <p className="text-xs text-muted-foreground italic py-1 pl-2">
                                    Belum ada Indikator Kinerja Makro.
                                  </p>
                                ) : (
                                  sasaranItem.indikators.map((indItem) => (
                                    <div
                                      key={indItem.id}
                                      className="flex items-center justify-between p-2.5 rounded-md bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-xs hover:bg-slate-100/60 transition-colors"
                                    >
                                      <div className="flex items-start gap-2.5">
                                        <div className="p-1 bg-emerald-100 dark:bg-emerald-950/60 rounded text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                                          <Target className="h-3.5 w-3.5" />
                                        </div>
                                        <div>
                                          <span className="font-medium text-slate-800 dark:text-slate-200">
                                            {indItem.indikator}
                                          </span>
                                          {(indItem.target || indItem.satuan || indItem.jenis) && (
                                            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                                              {indItem.jenis && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-background">
                                                  {indItem.jenis}
                                                </Badge>
                                              )}
                                              {indItem.target && (
                                                <span>
                                                  Target: <strong className="text-foreground">{indItem.target}</strong>{' '}
                                                  {indItem.satuan}
                                                </span>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-1 shrink-0 ml-2">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-blue-600 hover:bg-blue-50"
                                          onClick={() => {
                                            setEditingIndikator(indItem)
                                            setIndikatorInput({
                                              sasaran_id: sasaranItem.id,
                                              indikator: indItem.indikator,
                                              jenis: indItem.jenis || 'Utama',
                                              target: indItem.target || '',
                                              satuan: indItem.satuan || '',
                                            })
                                            setIndikatorDialogOpen(true)
                                          }}
                                        >
                                          <Pencil className="h-3 w-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6 text-rose-600 hover:bg-rose-50"
                                          onClick={() => handleDeleteIndikator(indItem.id)}
                                        >
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </Main>

      {/* DIALOG 1: FORM TUJUAN */}
      <Dialog open={tujuanDialogOpen} onOpenChange={setTujuanDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveTujuan}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-primary" />
                {editingTujuan ? 'Edit Tujuan Strategis' : 'Tambah Tujuan Strategis (Level 1)'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Menentukan rumusan tujuan strategis makro per OPD untuk periode aktif.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {!editingTujuan && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Perangkat Daerah (OPD)*</Label>
                  <SearchableSelect
                    value={tujuanInput.opd_id ? String(tujuanInput.opd_id) : ''}
                    onValueChange={(val) => setTujuanInput({ ...tujuanInput, opd_id: Number(val) })}
                    options={opdDialogOptions}
                    placeholder="Pilih OPD"
                    searchPlaceholder="Cari nama atau singkatan OPD..."
                    emptyMessage="Tidak ada OPD yang cocok."
                    className="h-9 text-xs"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rumusan Tujuan Strategis*</Label>
                <Input
                  placeholder="contoh: Meningkatkan Kualitas Pelayanan Publik..."
                  value={tujuanInput.tujuan}
                  onChange={(e) => setTujuanInput({ ...tujuanInput, tujuan: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setTujuanDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs gap-1">
                {submitting ? 'Menyimpan...' : 'Simpan Tujuan'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: FORM SASARAN */}
      <Dialog open={sasaranDialogOpen} onOpenChange={setSasaranDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveSasaran}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Layers className="h-4 w-4 text-blue-600" />
                {editingSasaran ? 'Edit Sasaran Strategis' : 'Tambah Sasaran Strategis (Level 2)'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Menjabarkan tujuan strategis menjadi rumusan sasaran spesifik.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Rumusan Sasaran Strategis*</Label>
                <Input
                  placeholder="contoh: Terwujudnya Sistem Informasi Terintegrasi..."
                  value={sasaranInput.sasaran}
                  onChange={(e) => setSasaranInput({ ...sasaranInput, sasaran: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSasaranDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs gap-1">
                {submitting ? 'Menyimpan...' : 'Simpan Sasaran'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: FORM INDIKATOR */}
      <Dialog open={indikatorDialogOpen} onOpenChange={setIndikatorDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSaveIndikator}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Target className="h-4 w-4 text-emerald-600" />
                {editingIndikator ? 'Edit Indikator Sasaran' : 'Tambah Indikator Sasaran (Level 3)'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Parameter tolok ukur kuantitatif keberhasilan pencapaian sasaran strategis.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nama / Rumusan Indikator*</Label>
                <Input
                  placeholder="contoh: Indeks Kepuasan Masyarakat (IKM)"
                  value={indikatorInput.indikator}
                  onChange={(e) => setIndikatorInput({ ...indikatorInput, indikator: e.target.value })}
                  className="text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Jenis</Label>
                  <Select
                    value={indikatorInput.jenis}
                    onValueChange={(val) => setIndikatorInput({ ...indikatorInput, jenis: val })}
                  >
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utama">Utama</SelectItem>
                      <SelectItem value="Pendukung">Pendukung</SelectItem>
                      <SelectItem value="Dampak">Dampak</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Target</Label>
                  <Input
                    placeholder="88.5"
                    value={indikatorInput.target}
                    onChange={(e) => setIndikatorInput({ ...indikatorInput, target: e.target.value })}
                    className="text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Satuan</Label>
                  <Input
                    placeholder="Nilai / %"
                    value={indikatorInput.satuan}
                    onChange={(e) => setIndikatorInput({ ...indikatorInput, satuan: e.target.value })}
                    className="text-xs"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIndikatorDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs gap-1">
                {submitting ? 'Menyimpan...' : 'Simpan Indikator'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
