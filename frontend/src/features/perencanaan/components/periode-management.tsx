import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Archive,
  RefreshCw,
  Search as SearchIcon,
  Loader2,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { KpiStatsCards, type KpiStatItem } from '@/components/kpi-stat-cards'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { perencanaanService } from '@/services/perencanaan-service'
import type { PeriodePenilaian, PeriodeStatus, PeriodePayload } from '@/types/perencanaan'

export function PeriodeManagement() {
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('all')

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

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
  const [deleteId, setDeleteId] = useState<string | null>(null)
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

  const handleToggleStatus = async (id: string, newStatus: PeriodeStatus) => {
    try {
      await perencanaanService.togglePeriodeStatus(id, newStatus)
      toast.success(`Status periode berhasil diubah menjadi ${newStatus}.`)
      fetchPeriodes()
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal mengubah status.'
      toast.error(errorMsg)
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
    } catch (err: unknown) {
      const errorMsg = (err as { response?: { data?: { message?: string } } }).response?.data?.message || 'Gagal menghapus periode.'
      toast.error(errorMsg)
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPeriodes = useMemo(() => {
    return periodes.filter((p) => {
      const s = search.toLowerCase()
      const matchesSearch =
        p.periode_penilaian.toLowerCase().includes(s) ||
        String(p.tahun_penilaian).includes(s) ||
        (p.keterangan && p.keterangan.toLowerCase().includes(s))
      const matchesStatus =
        statusFilter === 'all' ||
        p.status === statusFilter ||
        (statusFilter === 'Aktif' && p.status === 'active') ||
        (statusFilter === 'Tidak Aktif' && p.status === 'inactive') ||
        (statusFilter === 'Arsip' && p.status === 'archived')
      return matchesSearch && matchesStatus
    })
  }, [periodes, search, statusFilter])

  const activePeriode = useMemo(
    () => periodes.find((p) => p.status === 'Aktif' || p.status === 'active'),
    [periodes]
  )

  const inactiveCount = useMemo(
    () => periodes.filter((p) => p.status === 'Tidak Aktif' || p.status === 'inactive').length,
    [periodes]
  )

  const archivedCount = useMemo(
    () => periodes.filter((p) => p.status === 'Arsip' || p.status === 'archived').length,
    [periodes]
  )

  const getStatusBadge = (status: PeriodeStatus) => {
    switch (status) {
      case 'Aktif':
      case 'active':
        return (
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/25 border-emerald-300 dark:border-emerald-800 font-medium gap-1 px-2.5 py-0.5">
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" /> Aktif Global
          </Badge>
        )
      case 'Tidak Aktif':
      case 'inactive':
        return (
          <Badge variant="outline" className="text-amber-700 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 gap-1 px-2.5 py-0.5">
            <Clock className="h-3 w-3 text-amber-600" /> Tidak Aktif
          </Badge>
        )
      case 'Arsip':
      case 'archived':
        return (
          <Badge variant="secondary" className="text-muted-foreground gap-1 px-2.5 py-0.5">
            <Archive className="h-3 w-3" /> Tersimpan (Arsip)
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  // KPI STATS CARDS: Konsisten dengan Manajemen Pegawai
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Periode Aktif Global',
      value: activePeriode ? activePeriode.periode_penilaian : 'Belum Ada',
      icon: CheckCircle2,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: activePeriode ? `Tahun ${activePeriode.tahun_penilaian}` : 'Aktifkan 1 periode',
    },
    {
      title: 'Total Siklus Terdaftar',
      value: periodes.length,
      icon: Calendar,
      color: 'bg-primary/10 text-primary',
      subtitle: 'Siklus RPJMD / Renstra',
    },
    {
      title: 'Siklus Nonaktif',
      value: inactiveCount,
      icon: Clock,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
      subtitle: 'Menunggu Pengaktifan',
    },
    {
      title: 'Arsip Historis',
      value: archivedCount,
      icon: Archive,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'Tersimpan Permanen',
    },
  ]

  // Pagination Helper
  const paginatedItems = filteredPeriodes.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  )

  const totalPages = Math.ceil(filteredPeriodes.length / pageSize) || 1

  return (
    <>
      <Header fixed>
        <Search className="me-auto" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-5 sm:gap-6">
        <PerencanaanSubnav />

        {/* Page Header (Sticky, Konsisten dengan Users) */}
        <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                Fitur 13
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                Form Penentuan Periode Penilaian
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Master data siklus 5 tahunan &amp; jadwal aktif penilaian risiko lingkungan Pemda (Wewenang Bapperida).
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={fetchPeriodes}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>
            <Button size="sm" className="h-9 text-xs gap-1.5" onClick={handleOpenCreate}>
              <Plus className="h-4 w-4" />
              Periode Penilaian Baru
            </Button>
          </div>
        </PageHeader>

        {/* Compact KPI Stats Cards: Konsisten dengan Manajemen Pegawai */}
        <KpiStatsCards items={kpiItems} isLoading={loading} />

        {/* Toolbar Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-2 flex-wrap">
            <div className="relative w-full sm:w-72">
              <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Cari rentang periode atau tahun..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setCurrentPage(1)
                }}
                className="h-8 text-xs pl-8"
              />
            </div>

            <Select
              value={statusFilter}
              onValueChange={(val) => {
                setStatusFilter(val)
                setCurrentPage(1)
              }}
            >
              <SelectTrigger className="h-8 text-xs w-full sm:w-[160px]">
                <SelectValue placeholder="Semua Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Semua Status</SelectItem>
                <SelectItem value="Aktif" className="text-xs">Aktif Global</SelectItem>
                <SelectItem value="Tidak Aktif" className="text-xs">Tidak Aktif</SelectItem>
                <SelectItem value="Arsip" className="text-xs">Arsip</SelectItem>
              </SelectContent>
            </Select>

            {(search || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setStatusFilter('all')
                }}
                className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Loading State: Konsisten dengan Users Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Memuat data periode penilaian...</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
            <Table>
              <TableHeader>
                <TableRow className="group/row bg-muted/30">
                  <TableHead className="w-16 font-bold text-xs">ID</TableHead>
                  <TableHead className="font-bold text-xs">Periode Penilaian (5 Thn)</TableHead>
                  <TableHead className="w-32 font-bold text-xs text-center">Tahun Penilaian</TableHead>
                  <TableHead className="w-48 font-bold text-xs">Rentang Jadwal</TableHead>
                  <TableHead className="w-36 font-bold text-xs text-center">Status</TableHead>
                  <TableHead className="font-bold text-xs">Keterangan</TableHead>
                  <TableHead className="w-16 font-bold text-xs text-end">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPeriodes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                      Tidak ada periode penilaian yang sesuai dengan kriteria pencarian.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedItems.map((p) => (
                    <TableRow key={p.id} className="group/row hover:bg-muted/40 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold text-muted-foreground">
                        #{p.id}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="flex items-center gap-2.5 py-1">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                            <Calendar className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-xs text-foreground leading-tight truncate">
                              Periode {p.periode_penilaian}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                              Siklus Penilaian Pemda
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-center font-mono font-semibold">
                        <Badge variant="outline" className="font-mono text-xs">
                          {p.tahun_penilaian}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">
                        {p.tanggal_mulai} <span className="text-foreground">s.d.</span> {p.tanggal_berakhir}
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(p.status)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                        {p.keterangan || '-'}
                      </TableCell>
                      <TableCell className="text-end">
                        <DropdownMenu modal={false}>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44 text-xs">
                            {p.status !== 'Aktif' && p.status !== 'active' && (
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(p.id, 'Aktif')}
                                className="text-emerald-600 focus:text-emerald-700"
                              >
                                <ShieldCheck className="h-3.5 w-3.5 mr-2" />
                                Set Aktif Global
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleOpenEdit(p)}>
                              <Pencil className="h-3.5 w-3.5 mr-2 text-amber-600" />
                              Edit Periode
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteId(p.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Hapus Periode
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {filteredPeriodes.length > pageSize && (
              <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs">
                <span className="text-muted-foreground">
                  Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredPeriodes.length)} dari {filteredPeriodes.length} data
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Sebelumnya
                  </Button>
                  <span className="px-2 font-mono text-muted-foreground">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  >
                    Berikutnya <ChevronRight className="h-3.5 w-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Main>

      {/* Form Dialog */}
      {/* Dialog Form Tambah / Edit Periode */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Calendar className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingItem ? 'Edit Periode Penilaian' : 'Tambah Periode Penilaian Baru'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Tentukan rentang siklus 5 tahunan dan tahun spesifik penilaian risiko Pemda.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-periode" onSubmit={handleSubmit} className="space-y-4 w-full min-w-0">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
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
                    className="text-xs h-9 font-medium"
                    required
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
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
                    className="text-xs h-9 font-medium"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5 min-w-0">
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
                    className="text-xs h-9"
                    required
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
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
                    className="text-xs h-9"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="status" className="text-xs font-semibold">
                  Status Periode Penilaian*
                </Label>
                <Select
                  value={formData.status}
                  onValueChange={(val: PeriodeStatus) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger id="status" className="w-full min-w-0 text-xs h-9">
                    <SelectValue placeholder="Pilih Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aktif" className="text-xs">Aktif (Global Penilaian Pemda)</SelectItem>
                    <SelectItem value="Tidak Aktif" className="text-xs">Tidak Aktif</SelectItem>
                    <SelectItem value="Arsip" className="text-xs">Arsip (Arsip Historis)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground italic">
                  Catatan: Mengaktifkan periode ini akan menonaktifkan periode aktif lain secara otomatis.
                </p>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label htmlFor="keterangan" className="text-xs font-semibold">
                  Keterangan Tambahan
                </Label>
                <Input
                  id="keterangan"
                  placeholder="Catatan mengenai penetapan siklus..."
                  value={formData.keterangan || ''}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  className="text-xs h-9"
                />
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              type="button"
              size="sm"
              onClick={() => setIsDialogOpen(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-periode"
              disabled={submitting}
              className="text-xs h-9 min-w-[120px] gap-1"
            >
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
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent className="sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-rose-600">
                  Konfirmasi Hapus Periode
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Tindakan ini permanen dan tidak dapat dibatalkan.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="px-6 py-4 text-xs text-muted-foreground leading-relaxed">
            Apakah Anda yakin ingin menghapus data Periode Penilaian ini? Semua data sasaran dan program yang terhubung pada periode ini akan terdampak.
          </div>
          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
              disabled={isDeleting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-xs h-9 min-w-[120px]"
            >
              {isDeleting ? 'Menghapus...' : 'Hapus Periode'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
