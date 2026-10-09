import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  Search,
  RefreshCw,
  AlertCircle,
  X,
  Layers,
  Filter,
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
import type { PeriodePenilaian, PeriodeStatus, PeriodePayload } from '@/types/perencanaan'

export function PeriodeManagement() {
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false)
  const [editingItem, setEditingItem] = useState<PeriodePenilaian | null>(null)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Form State
  const [formData, setFormData] = useState<PeriodePayload>({
    periode_penilaian: '2026-2030',
    tahun_penilaian: new Date().getFullYear(),
    tanggal_mulai: `${new Date().getFullYear()}-01-02`,
    tanggal_berakhir: `${new Date().getFullYear()}-12-30`,
    status: 'Aktif',
    keterangan: '',
  })

  // Delete State
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  const fetchPeriodes = useCallback(async () => {
    setLoading(true)
    try {
      const data = await perencanaanService.getPeriodeList()
      setPeriodes(data)
    } catch {
      toast.error('Gagal memuat data Periode Penilaian.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPeriodes()
  }, [fetchPeriodes])

  const handleOpenCreate = () => {
    setEditingItem(null)
    const currentYear = new Date().getFullYear()
    setFormData({
      periode_penilaian: '2026-2030',
      tahun_penilaian: currentYear,
      tanggal_mulai: `${currentYear}-01-02`,
      tanggal_berakhir: `${currentYear}-12-30`,
      status: 'Aktif',
      keterangan: '',
    })
    setIsDialogOpen(true)
  }

  const handleOpenEdit = (item: PeriodePenilaian) => {
    setEditingItem(item)
    setFormData({
      periode_penilaian: item.periode_penilaian,
      tahun_penilaian: item.tahun_penilaian,
      tanggal_mulai: item.tanggal_mulai,
      tanggal_berakhir: item.tanggal_berakhir,
      status: item.status,
      keterangan: item.keterangan || '',
    })
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      if (editingItem) {
        await perencanaanService.updatePeriode(editingItem.id, formData)
        toast.success('Periode penilaian berhasil diperbarui.')
      } else {
        await perencanaanService.createPeriode(formData)
        toast.success('Periode penilaian baru berhasil dibuat.')
      }
      setIsDialogOpen(false)
      fetchPeriodes()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Terjadi kesalahan saat menyimpan.'
      toast.error(errorMsg)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (id: number, newStatus: PeriodeStatus) => {
    try {
      await perencanaanService.togglePeriodeStatus(id, newStatus)
      toast.success(`Status periode diubah menjadi ${newStatus}.`)
      fetchPeriodes()
    } catch {
      toast.error('Gagal mengubah status periode.')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setIsDeleting(true)
    try {
      await perencanaanService.deletePeriode(deleteId)
      toast.success('Periode penilaian berhasil dihapus.')
      setDeleteId(null)
      fetchPeriodes()
    } catch {
      toast.error('Periode penilaian tidak dapat dihapus.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Optimize filter calculation with useMemo to prevent unnecessary lag
  const filteredPeriodes = useMemo(() => {
    return periodes.filter((p) => {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        p.periode_penilaian.toLowerCase().includes(searchLower) ||
        String(p.tahun_penilaian).includes(searchLower) ||
        (p.keterangan && p.keterangan.toLowerCase().includes(searchLower))
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [periodes, search, statusFilter])

  const activePeriode = useMemo(() => periodes.find((p) => p.status === 'Aktif'), [periodes])

  const getStatusBadge = (status: PeriodeStatus) => {
    switch (status) {
      case 'Aktif':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-800 font-medium gap-1 px-2.5 py-0.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Aktif Global
          </Badge>
        )
      case 'Tidak Aktif':
        return (
          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 gap-1 px-2.5 py-0.5">
            <Clock className="h-3.5 w-3.5 text-amber-600" /> Tidak Aktif
          </Badge>
        )
      case 'Arsip':
        return (
          <Badge variant="secondary" className="text-muted-foreground gap-1 px-2.5 py-0.5">
            <Archive className="h-3.5 w-3.5" /> Tersimpan (Arsip)
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold tracking-tight">Perencanaan & Cascading</h1>
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium text-muted-foreground">Periode Penilaian</span>
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
                  Fitur No. 13
                </Badge>
                <h2 className="text-2xl font-bold tracking-tight">Form Penentuan Periode Penilaian</h2>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Master data siklus 5 tahunan & jadwal aktif penilaian risiko lingkungan Pemda (Role Bapperida)
              </p>
            </div>
            <Button onClick={handleOpenCreate} className="gap-2 shadow-sm transition-transform active:scale-95">
              <Plus className="h-4 w-4" /> Periode Penilaian Baru
            </Button>
          </PageHeader>

          {/* Key Metric Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="relative overflow-hidden border-l-4 border-l-emerald-500 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Periode Penilaian Aktif
                </CardTitle>
                <div className="p-2 bg-emerald-100 dark:bg-emerald-950/50 rounded-full text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {activePeriode ? `${activePeriode.tahun_penilaian}` : 'Belum Set'}
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="font-mono text-[11px] px-1.5 py-0">
                    {activePeriode ? activePeriode.periode_penilaian : 'N/A'}
                  </Badge>
                  <span>
                    {activePeriode
                      ? `${activePeriode.tanggal_mulai} s.d. ${activePeriode.tanggal_berakhir}`
                      : 'Aktifkan 1 periode'}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-blue-500 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Total Siklus Terdaftar
                </CardTitle>
                <div className="p-2 bg-blue-100 dark:bg-blue-950/50 rounded-full text-blue-600">
                  <Layers className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                  {periodes.length} <span className="text-sm font-normal text-muted-foreground">Periode</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Siklus Perencanaan 5 Tahunan RPJMD / Renstra
                </p>
              </CardContent>
            </Card>

            <Card className="relative overflow-hidden border-l-4 border-l-amber-500 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Aturan Validasi Sistem
                </CardTitle>
                <div className="p-2 bg-amber-100 dark:bg-amber-950/50 rounded-full text-amber-600">
                  <AlertCircle className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm font-bold text-amber-800 dark:text-amber-400">
                  Strict Single Active Period
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Hanya 1 periode &amp; tahun bertanda &quot;Aktif&quot; yang dijadikan rujukan input risiko.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Filter & Table Card */}
          <Card className="shadow-sm border">
            <CardHeader className="py-4 border-b bg-slate-50/50 dark:bg-slate-900/50">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Tabel Data Periode Penilaian</CardTitle>
                  <CardDescription className="text-xs">
                    Kelola siklus 5 tahunan, rentang tanggal kalender, dan kontrol status aktif
                  </CardDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-full sm:w-[240px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Cari rentang / tahun..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-9 text-xs"
                    />
                    {search && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearch('')}
                        className="absolute right-1 top-1 h-7 w-7 text-muted-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-9 w-[140px] text-xs">
                      <Filter className="h-3.5 w-3.5 mr-1 text-muted-foreground" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Status</SelectItem>
                      <SelectItem value="Aktif">Aktif</SelectItem>
                      <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                      <SelectItem value="Arsip">Arsip</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button variant="outline" size="sm" onClick={fetchPeriodes} className="h-9 gap-1 text-xs">
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-xs font-medium">Memuat data periode penilaian...</span>
                </div>
              ) : filteredPeriodes.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground space-y-2">
                  <Calendar className="mx-auto h-10 w-10 text-muted-foreground/30" />
                  <p className="font-semibold text-sm">Tidak Ada Periode Penilaian</p>
                  <p className="text-xs text-muted-foreground">
                    Coba sesuaikan kata kunci pencarian atau buat periode baru.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-100/70 dark:bg-slate-800/60">
                      <TableRow>
                        <TableHead className="w-[70px] text-xs font-semibold">ID</TableHead>
                        <TableHead className="text-xs font-semibold">PERIODE PENILAIAN</TableHead>
                        <TableHead className="text-xs font-semibold">TAHUN PENILAIAN</TableHead>
                        <TableHead className="text-xs font-semibold">TANGGAL MULAI</TableHead>
                        <TableHead className="text-xs font-semibold">TANGGAL BERAKHIR</TableHead>
                        <TableHead className="text-xs font-semibold">STATUS</TableHead>
                        <TableHead className="text-xs font-semibold">KETERANGAN</TableHead>
                        <TableHead className="text-right text-xs font-semibold w-[140px]">AKSI</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPeriodes.map((p) => (
                        <TableRow key={p.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                          <TableCell className="font-mono text-xs font-medium text-muted-foreground">
                            #{p.id}
                          </TableCell>
                          <TableCell className="font-bold text-sm">
                            <Badge variant="outline" className="font-mono font-bold bg-slate-50 dark:bg-slate-900">
                              {p.periode_penilaian}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-sm">{p.tahun_penilaian}</TableCell>
                          <TableCell className="text-xs font-mono">{p.tanggal_mulai}</TableCell>
                          <TableCell className="text-xs font-mono">{p.tanggal_berakhir}</TableCell>
                          <TableCell>{getStatusBadge(p.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                            {p.keterangan || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end items-center gap-1">
                              {p.status !== 'Aktif' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(p.id, 'Aktif')}
                                  title="Set sebagai Periode Aktif Global"
                                  className="h-7 text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 px-2"
                                >
                                  Aktifkan
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                onClick={() => handleOpenEdit(p)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                                onClick={() => setDeleteId(p.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5 text-primary" />
                {editingItem ? 'Edit Periode Penilaian' : 'Tambah Periode Penilaian Baru'}
              </DialogTitle>
              <DialogDescription>
                Tentukan rentang siklus 5 tahunan dan tahun spesifik penilaian risiko Pemda.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="periode_penilaian" className="text-xs font-semibold">
                    Periode Penilaian (5 Thn)*
                  </Label>
                  <Input
                    id="periode_penilaian"
                    placeholder="contoh: 2026-2030"
                    value={formData.periode_penilaian}
                    onChange={(e) =>
                      setFormData({ ...formData, periode_penilaian: e.target.value })
                    }
                    className="text-xs font-medium"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tahun_penilaian" className="text-xs font-semibold">
                    Tahun Penilaian*
                  </Label>
                  <Input
                    id="tahun_penilaian"
                    type="number"
                    placeholder="2027"
                    value={formData.tahun_penilaian}
                    onChange={(e) =>
                      setFormData({ ...formData, tahun_penilaian: Number(e.target.value) })
                    }
                    className="text-xs font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tanggal_mulai" className="text-xs font-semibold">
                    Tanggal Mulai*
                  </Label>
                  <Input
                    id="tanggal_mulai"
                    type="date"
                    value={formData.tanggal_mulai}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_mulai: e.target.value })
                    }
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tanggal_berakhir" className="text-xs font-semibold">
                    Tanggal Berakhir*
                  </Label>
                  <Input
                    id="tanggal_berakhir"
                    type="date"
                    value={formData.tanggal_berakhir}
                    onChange={(e) =>
                      setFormData({ ...formData, tanggal_berakhir: e.target.value })
                    }
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Status Periode Penilaian*
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: PeriodeStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status" className="text-xs">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif">Aktif (Global Penilaian Pemda)</SelectItem>
                    <SelectItem value="Tidak Aktif">Tidak Aktif</SelectItem>
                    <SelectItem value="Arsip">Arsip (Arsip Historis)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic">
                  Catatan: Mengaktifkan periode ini akan menonaktifkan periode aktif lain secara otomatis.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="keterangan" className="text-xs font-semibold">
                  Keterangan Tambahan
                </Label>
                <Input
                  id="keterangan"
                  placeholder="Catatan mengenai penetapan siklus..."
                  value={formData.keterangan || ''}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsDialogOpen(false)} className="text-xs">
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="text-xs gap-1">
                {submitting ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Menyimpan...
                  </>
                ) : editingItem ? (
                  'Simpan Perubahan'
                ) : (
                  'Buat Periode'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-rose-600 flex items-center gap-2">
              <Trash2 className="h-5 w-5" /> Konfirmasi Hapus Periode
            </DialogTitle>
            <DialogDescription className="text-xs">
              Apakah Anda yakin ingin menghapus data Periode Penilaian ini? Semua data sasaran dan program yang terhubung pada periode ini akan terdampak.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteId(null)} className="text-xs">
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting} className="text-xs">
              {isDeleting ? 'Menghapus...' : 'Hapus Periode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
