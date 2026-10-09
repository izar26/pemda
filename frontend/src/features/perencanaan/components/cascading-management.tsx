import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  GitFork,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Search as SearchIcon,
  Building2,
  Calendar,
  Layers,
  Target,
  Sparkles,
  Copy,
  Loader2,
  MoreHorizontal,
  ChevronLeft,
} from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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
import { useLocation, useNavigate } from '@tanstack/react-router'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { cn } from '@/lib/utils'
import { perencanaanService } from '@/services/perencanaan-service'
import { opdService } from '@/services/opd-service'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'
import type { Opd } from '@/features/users/data/schema'
import type { CascadingTreeItem, PeriodePenilaian } from '@/types/perencanaan'

export function CascadingManagement() {
  const [cascadingData, setCascadingData] = useState<CascadingTreeItem[]>([])
  const [opds, setOpds] = useState<Opd[]>([])
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string | undefined>(undefined)
  const [selectedOpdId, setSelectedOpdId] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState<boolean>(true)
  const [search, setSearch] = useState<string>('')

  // Pagination state (10 items per page)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  const location = useLocation()
  const navigate = useNavigate()
  const urlTab = (location.search as Record<string, any>)?.tab as 'all' | 'tujuan' | 'sasaran' | 'iku' | 'indikator' | undefined
  const [activeTab, setActiveTab] = useState<'all' | 'tujuan' | 'sasaran' | 'iku' | 'indikator'>(urlTab || 'all')

  const activePeriodeObj = useMemo(
    () => periodes.find((p) => String(p.id) === String(selectedPeriodeId)),
    [periodes, selectedPeriodeId]
  )
  const activeOpdObj = useMemo(
    () => opds.find((o) => String(o.id) === String(selectedOpdId)),
    [opds, selectedOpdId]
  )

  useEffect(() => {
    if (urlTab && urlTab !== activeTab) {
      setActiveTab(urlTab)
      setCurrentPage(1)
    }
  }, [urlTab, activeTab])

  const handleTabChange = (newTab: 'all' | 'tujuan' | 'sasaran' | 'iku' | 'indikator') => {
    setActiveTab(newTab)
    setCurrentPage(1)
    navigate({
      to: '/perencanaan/cascading',
      search: { tab: newTab } as any,
    })
  }

  // Expandable collapse state for performance on large tree
  const [expandedTujuans, setExpandedTujuans] = useState<Record<string, boolean>>({})

  // Clone States (Sheet 2)
  const [cloneDialogOpen, setCloneDialogOpen] = useState<boolean>(false)
  const [sourcePeriodeId, setSourcePeriodeId] = useState<string>('')
  const [cloning, setCloning] = useState<boolean>(false)

  // Dialog States
  const [tujuanDialogOpen, setTujuanDialogOpen] = useState<boolean>(false)
  const [editingTujuan, setEditingTujuan] = useState<{ id: string; tujuan: string; opd_id?: string } | null>(null)
  const [tujuanInput, setTujuanInput] = useState<{ opd_id: string; tujuan: string }>({
    opd_id: '',
    tujuan: '',
  })

  const [sasaranDialogOpen, setSasaranDialogOpen] = useState<boolean>(false)
  const [editingSasaran, setEditingSasaran] = useState<{ id: string; sasaran: string } | null>(null)
  const [sasaranInput, setSasaranInput] = useState<{ tujuan_id: string; sasaran: string }>({
    tujuan_id: '',
    sasaran: '',
  })

  const [indikatorDialogOpen, setIndikatorDialogOpen] = useState<boolean>(false)
  const [editingIndikator, setEditingIndikator] = useState<{
    id: string
    indikator: string
    jenis?: string | null
    target?: string | null
    satuan?: string | null
  } | null>(null)
  const [indikatorInput, setIndikatorInput] = useState<{
    sasaran_id: string
    indikator: string
    jenis: string
    target: string
    satuan: string
  }>({
    sasaran_id: '',
    indikator: '',
    jenis: 'Utama',
    target: '',
    satuan: '',
  })

  const [submitting, setSubmitting] = useState<boolean>(false)

  const fetchCascadingTree = useCallback(async (periodeId?: string, opdId?: string) => {
    setLoading(true)
    try {
      const data = await perencanaanService.getCascadingTree(periodeId, opdId)
      setCascadingData(data)
      const initialExp: Record<string, boolean> = {}
      data.forEach((t) => (initialExp[String(t.id)] = true))
      setExpandedTujuans(initialExp)
    } catch {
      toast.error('Terjadi kesalahan saat memuat data kinerja.')
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

      const active = (periodeList as PeriodePenilaian[]).find(
        (p: PeriodePenilaian) => p.status === 'Aktif' || p.status === 'active'
      ) || periodeList[0]
      const periodeId = active?.id ? String(active.id) : undefined
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

  const handleFilterChange = (periodeId?: string, opdId?: string) => {
    setSelectedPeriodeId(periodeId)
    setSelectedOpdId(opdId)
    setCurrentPage(1)
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

  const toggleExpandTujuan = (id: string | number) => {
    const key = String(id)
    setExpandedTujuans((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // --- HANDLERS TUJUAN ---
  const handleOpenAddTujuan = (opdId?: string) => {
    setEditingTujuan(null)
    setTujuanInput({ opd_id: opdId || selectedOpdId || (opds[0]?.id ? String(opds[0].id) : ''), tujuan: '' })
    setTujuanDialogOpen(true)
  }

  const handleSaveTujuan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) {
      toast.error('Silakan pilih Periode Penilaian terlebih dahulu.')
      return
    }
    if (!tujuanInput.opd_id) {
      toast.error('Silakan pilih OPD terlebih dahulu.')
      return
    }
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

  const handleDeleteTujuan = async (id: string | number) => {
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
  const handleOpenAddSasaran = (tujuanId?: string | number) => {
    setEditingSasaran(null)
    const defaultTujuanId = tujuanId ? String(tujuanId) : (cascadingData[0]?.id ? String(cascadingData[0].id) : '')
    setSasaranInput({ tujuan_id: defaultTujuanId, sasaran: '' })
    setSasaranDialogOpen(true)
  }

  const handleSaveSasaran = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) {
      toast.error('Pilih Periode Penilaian terlebih dahulu.')
      return
    }
    if (!sasaranInput.tujuan_id) {
      toast.error('Pilih Tujuan Induk terlebih dahulu.')
      return
    }
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

  const handleDeleteSasaran = async (id: string | number) => {
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
  const handleOpenAddIndikator = (sasaranId?: string | number, defaultJenis: string = 'Utama') => {
    setEditingIndikator(null)
    const firstSasaranId = cascadingData[0]?.sasarans?.[0]?.id ? String(cascadingData[0].sasarans[0].id) : ''
    setIndikatorInput({
      sasaran_id: sasaranId ? String(sasaranId) : firstSasaranId,
      indikator: '',
      jenis: defaultJenis,
      target: '',
      satuan: '',
    })
    setIndikatorDialogOpen(true)
  }

  const handleSaveIndikator = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPeriodeId) {
      toast.error('Pilih Periode Penilaian terlebih dahulu.')
      return
    }
    if (!indikatorInput.sasaran_id) {
      toast.error('Pilih Sasaran Induk terlebih dahulu.')
      return
    }
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

  const handleDeleteIndikator = async (id: string | number) => {
    if (!confirm('Apakah Anda yakin ingin menghapus Indikator Sasaran ini?')) return
    try {
      await perencanaanService.deleteIndikator(id)
      toast.success('Indikator sasaran berhasil dihapus.')
      fetchCascadingTree(selectedPeriodeId, selectedOpdId)
    } catch {
      toast.error('Gagal menghapus indikator sasaran.')
    }
  }

  // --- DERIVED FLAT DATA LISTS SESUAI DOKUMEN (FITUR 14, 15, 16, 17) ---

  // 1. Data Tujuan (Fitur 14)
  const flatTujuans = useMemo(() => {
    return cascadingData.map((t, idx) => ({
      id: t.id,
      nomor: t.nomor || `T.${idx + 1}`,
      opd_id: t.opd_id,
      opd_nama: t.opd_nama || 'OPD',
      periode_id: t.periode_id || t.periode_penilaian_id || selectedPeriodeId,
      tujuan: t.tujuan,
      total_sasaran: t.sasarans?.length || 0,
      total_indikator: t.sasarans?.reduce((acc, s) => acc + (s.indikators?.length || 0), 0) || 0,
    }))
  }, [cascadingData, selectedPeriodeId])

  const filteredTujuans = useMemo(() => {
    if (!search.trim()) return flatTujuans
    const s = search.toLowerCase()
    return flatTujuans.filter(
      (t) =>
        t.tujuan.toLowerCase().includes(s) ||
        t.opd_nama.toLowerCase().includes(s) ||
        t.nomor.toLowerCase().includes(s)
    )
  }, [flatTujuans, search])

  // 2. Data Sasaran (Fitur 15)
  const flatSasarans = useMemo(() => {
    const list: Array<{
      id: string | number
      nomor: string
      tujuan_id: string | number
      tujuan_nama: string
      opd_nama: string
      sasaran: string
      total_iku: number
      total_biasa: number
      total_indikator: number
    }> = []

    cascadingData.forEach((t) => {
      t.sasarans?.forEach((s, sIdx) => {
        const ikus = s.indikators?.filter((ind) => {
          const j = (ind.jenis || '').toLowerCase()
          return j === 'utama' || j === 'iku' || j === ''
        }) || []
        const biasa = s.indikators?.filter((ind) => {
          const j = (ind.jenis || '').toLowerCase()
          return j === 'pendukung' || j === 'biasa'
        }) || []

        list.push({
          id: s.id,
          nomor: s.nomor || `S.${sIdx + 1}`,
          tujuan_id: t.id,
          tujuan_nama: t.tujuan,
          opd_nama: t.opd_nama || 'OPD',
          sasaran: s.sasaran,
          total_iku: ikus.length,
          total_biasa: biasa.length,
          total_indikator: s.indikators?.length || 0,
        })
      })
    })

    return list
  }, [cascadingData])

  const filteredSasarans = useMemo(() => {
    if (!search.trim()) return flatSasarans
    const s = search.toLowerCase()
    return flatSasarans.filter(
      (item) =>
        item.sasaran.toLowerCase().includes(s) ||
        item.tujuan_nama.toLowerCase().includes(s) ||
        item.opd_nama.toLowerCase().includes(s) ||
        item.nomor.toLowerCase().includes(s)
    )
  }, [flatSasarans, search])

  // 3. Data IKU (Fitur 16 - Prioritas Form 2B)
  const flatIkus = useMemo(() => {
    const list: Array<{
      id: string | number
      nomor: string
      sasaran_id: string | number
      sasaran_nama: string
      tujuan_id: string | number
      tujuan_nama: string
      opd_nama: string
      indikator: string
      target?: string | null
      satuan?: string | null
      jenis: string
    }> = []

    cascadingData.forEach((t) => {
      t.sasarans?.forEach((s) => {
        s.indikators?.forEach((ind, iIdx) => {
          const j = (ind.jenis || '').toLowerCase()
          if (j === 'utama' || j === 'iku' || j === '') {
            list.push({
              id: ind.id,
              nomor: ind.nomor || `IKU.${iIdx + 1}`,
              sasaran_id: s.id,
              sasaran_nama: s.sasaran,
              tujuan_id: t.id,
              tujuan_nama: t.tujuan,
              opd_nama: t.opd_nama || 'OPD',
              indikator: ind.indikator,
              target: ind.target,
              satuan: ind.satuan,
              jenis: 'IKU',
            })
          }
        })
      })
    })

    return list
  }, [cascadingData])

  const filteredIkus = useMemo(() => {
    if (!search.trim()) return flatIkus
    const s = search.toLowerCase()
    return flatIkus.filter(
      (item) =>
        item.indikator.toLowerCase().includes(s) ||
        item.sasaran_nama.toLowerCase().includes(s) ||
        item.tujuan_nama.toLowerCase().includes(s) ||
        item.opd_nama.toLowerCase().includes(s) ||
        item.nomor.toLowerCase().includes(s)
    )
  }, [flatIkus, search])

  // 4. Data Indikator Biasa / Pendukung (Fitur 17)
  const flatIndikators = useMemo(() => {
    const list: Array<{
      id: string | number
      nomor: string
      sasaran_id: string | number
      sasaran_nama: string
      tujuan_id: string | number
      tujuan_nama: string
      opd_nama: string
      indikator: string
      target?: string | null
      satuan?: string | null
      jenis: string
    }> = []

    cascadingData.forEach((t) => {
      t.sasarans?.forEach((s) => {
        s.indikators?.forEach((ind, iIdx) => {
          const j = (ind.jenis || '').toLowerCase()
          if (j === 'pendukung' || j === 'biasa') {
            list.push({
              id: ind.id,
              nomor: ind.nomor || `IND.${iIdx + 1}`,
              sasaran_id: s.id,
              sasaran_nama: s.sasaran,
              tujuan_id: t.id,
              tujuan_nama: t.tujuan,
              opd_nama: t.opd_nama || 'OPD',
              indikator: ind.indikator,
              target: ind.target,
              satuan: ind.satuan,
              jenis: 'Biasa',
            })
          }
        })
      })
    })

    return list
  }, [cascadingData])

  const filteredIndikators = useMemo(() => {
    if (!search.trim()) return flatIndikators
    const s = search.toLowerCase()
    return flatIndikators.filter(
      (item) =>
        item.indikator.toLowerCase().includes(s) ||
        item.sasaran_nama.toLowerCase().includes(s) ||
        item.tujuan_nama.toLowerCase().includes(s) ||
        item.opd_nama.toLowerCase().includes(s) ||
        item.nomor.toLowerCase().includes(s)
    )
  }, [flatIndikators, search])

  // 5. Tree Hierarki Cascading Lengkap (Tab 'all')
  const filteredCascading = useMemo(() => {
    if (!search.trim()) return cascadingData
    const searchLower = search.toLowerCase()

    return cascadingData.filter((item) => {
      const opdMatch = item.opd_nama ? item.opd_nama.toLowerCase().includes(searchLower) : false
      const tujuanMatch = item.tujuan.toLowerCase().includes(searchLower)
      const sasaranMatch = item.sasarans?.some(
        (s) =>
          s.sasaran.toLowerCase().includes(searchLower) ||
          s.indikators?.some((ind) => ind.indikator.toLowerCase().includes(searchLower))
      )
      return opdMatch || tujuanMatch || sasaranMatch
    })
  }, [cascadingData, search])

  // KPI STATS CARDS (Konsisten 100% dengan Menu Manajemen Pegawai)
  const kpiItems: KpiStatItem[] = [
    {
      title: 'Total Tujuan (Fitur 14)',
      value: flatTujuans.length,
      icon: Target,
      color: 'bg-primary/10 text-primary',
      subtitle: `${opds.length} Perangkat Daerah`,
    },
    {
      title: 'Total Sasaran (Fitur 15)',
      value: flatSasarans.length,
      icon: GitFork,
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      valueColor: 'text-blue-600 dark:text-blue-400',
      subtitle: 'Menginduk ke Tujuan',
    },
    {
      title: 'Data IKU (Fitur 16)',
      value: flatIkus.length,
      icon: Sparkles,
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      subtitle: 'Prioritas Form 2B OPD',
    },
    {
      title: 'Data Indikator (Fitur 17)',
      value: flatIndikators.length,
      icon: Layers,
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      valueColor: 'text-amber-600 dark:text-amber-400',
      subtitle: 'Kinerja Pendukung',
    },
  ]

  // Pagination Helper
  const paginatedItems = <T,>(items: T[]): T[] => {
    const startIndex = (currentPage - 1) * pageSize
    return items.slice(startIndex, startIndex + pageSize)
  }

  const renderPaginationFooter = (totalCount: number) => {
    const totalPages = Math.ceil(totalCount / pageSize) || 1
    if (totalCount <= pageSize) return null

    return (
      <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20 text-xs">
        <span className="text-muted-foreground">
          Menampilkan {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalCount)} dari {totalCount} data
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
    )
  }

  return (
    <>
      {/* Header Top Bar: Konsisten dengan Manajemen Pegawai */}
      <Header fixed>
        <Search className="me-auto" />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className="flex flex-1 flex-col gap-5 sm:gap-6">
        {/* Sub Navigation Modul Perencanaan */}
        <PerencanaanSubnav />

        {/* Page Header (Sticky, Konsisten dengan Users) */}
        <PageHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs font-mono">
                {activeTab === 'tujuan'
                  ? 'Fitur 14'
                  : activeTab === 'sasaran'
                  ? 'Fitur 15'
                  : activeTab === 'iku'
                  ? 'Fitur 16'
                  : activeTab === 'indikator'
                  ? 'Fitur 17'
                  : 'Fitur 14–17'}
              </Badge>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {activeTab === 'tujuan'
                  ? 'Data Tujuan Strategis (Level 1)'
                  : activeTab === 'sasaran'
                  ? 'Data Sasaran Strategis (Level 2)'
                  : activeTab === 'iku'
                  ? 'Data IKU - Indikator Kinerja Utama'
                  : activeTab === 'indikator'
                  ? 'Data Indikator Kinerja Makro'
                  : 'Pohon Cascading Kinerja Daerah'}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'tujuan'
                ? 'Kelola tujuan strategis makro per Perangkat Daerah (OPD) untuk periode aktif penilaian.'
                : activeTab === 'sasaran'
                ? 'Kelola sasaran kinerja strategis terukur yang menginduk langsung ke Tujuan Level 1.'
                : activeTab === 'iku'
                ? 'Indikator prioritas daerah yang ditarik otomatis ke Form 2B Penetapan Konteks Risiko OPD.'
                : activeTab === 'indikator'
                ? 'Indikator kinerja operasional/pendukung yang menginduk ke Sasaran Makro selain IKU.'
                : 'Hierarki terpadu 3 tingkat makro Bapperida: Tujuan (14) → Sasaran (15) → IKU (16) & Indikator (17).'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => fetchCascadingTree(selectedPeriodeId, selectedOpdId)}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
              Segarkan
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="h-9 text-xs"
              onClick={() => setCloneDialogOpen(true)}
            >
              <Copy className="h-3.5 w-3.5 mr-1.5 text-primary" />
              Salin Tahun Sebelumnya
            </Button>

            {activeTab === 'tujuan' && (
              <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => handleOpenAddTujuan()}>
                <Plus className="h-4 w-4" />
                Tambah Data Tujuan
              </Button>
            )}
            {activeTab === 'sasaran' && (
              <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => handleOpenAddSasaran()}>
                <Plus className="h-4 w-4" />
                Tambah Data Sasaran
              </Button>
            )}
            {activeTab === 'iku' && (
              <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => handleOpenAddIndikator(undefined, 'Utama')}>
                <Sparkles className="h-4 w-4" />
                Tambah Data IKU
              </Button>
            )}
            {activeTab === 'indikator' && (
              <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => handleOpenAddIndikator(undefined, 'Pendukung')}>
                <Plus className="h-4 w-4" />
                Tambah Data Indikator
              </Button>
            )}
            {activeTab === 'all' && (
              <Button size="sm" className="h-9 text-xs gap-1.5" onClick={() => handleOpenAddTujuan()}>
                <Plus className="h-4 w-4" />
                Tambah Tujuan Strategis
              </Button>
            )}
          </div>
        </PageHeader>

        {/* Compact KPI Stats Cards: Konsisten dengan Manajemen Pegawai */}
        <KpiStatsCards items={kpiItems} isLoading={loading} />

        {/* Navigation Tab Selector & Toolbar Filters (Konsisten dengan DataTableToolbar) */}
        <div className="space-y-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar border-b border-border/60">
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('all')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Semua (Pohon Cascading)</span>
            </Button>
            <Button
              variant={activeTab === 'tujuan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('tujuan')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Target className="h-3.5 w-3.5" />
              <span>Data Tujuan</span>
              <Badge variant={activeTab === 'tujuan' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0 ml-0.5 font-mono">
                {flatTujuans.length}
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'sasaran' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('sasaran')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <GitFork className="h-3.5 w-3.5" />
              <span>Data Sasaran</span>
              <Badge variant={activeTab === 'sasaran' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0 ml-0.5 font-mono">
                {flatSasarans.length}
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'iku' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('iku')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Data IKU</span>
              <Badge variant={activeTab === 'iku' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0 ml-0.5 font-mono">
                {flatIkus.length}
              </Badge>
            </Button>
            <Button
              variant={activeTab === 'indikator' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => handleTabChange('indikator')}
              className="text-xs h-8 gap-1.5 font-medium"
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Data Indikator</span>
              <Badge variant={activeTab === 'indikator' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0 ml-0.5 font-mono">
                {flatIndikators.length}
              </Badge>
            </Button>
          </div>

          {/* Unified Toolbar Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-2 flex-wrap">
              <div className="relative w-full sm:w-64">
                <SearchIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Cari rumusan atau OPD..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-8 text-xs pl-8"
                />
              </div>

              {/* Periode filter */}
              <Select
                value={selectedPeriodeId ? String(selectedPeriodeId) : ''}
                onValueChange={(val) => handleFilterChange(val, selectedOpdId)}
              >
                <SelectTrigger className="h-8 text-xs w-full sm:w-[220px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    <SelectValue placeholder="Pilih Periode" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {periodes.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                      {p.tahun_penilaian} ({p.periode_penilaian}) {p.status === 'Aktif' || p.status === 'active' ? '• [AKTIF]' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* OPD Filter */}
              <div className="w-full sm:w-[260px]">
                <SearchableSelect
                  value={selectedOpdId ? String(selectedOpdId) : 'all'}
                  onValueChange={(val) =>
                    handleFilterChange(selectedPeriodeId, val === 'all' || !val ? undefined : val)
                  }
                  options={opdFilterOptions}
                  placeholder="Semua Perangkat Daerah"
                  searchPlaceholder="Cari OPD..."
                  emptyMessage="Tidak ada OPD yang cocok."
                  allowClear={false}
                  className="h-8 text-xs"
                />
              </div>

              {(search || (selectedOpdId && selectedOpdId !== 'all')) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch('')
                    handleFilterChange(selectedPeriodeId, undefined)
                  }}
                  className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset Filter
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Loading State: Konsisten dengan Users Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Memuat data perencanaan kinerja Bapperida...</p>
          </div>
        ) : (
          <>
            {/* ========================================================================= */}
            {/* TAB 1: DATA TUJUAN (FITUR NO. 14) */}
            {/* ========================================================================= */}
            {activeTab === 'tujuan' && (
              <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="group/row bg-muted/30">
                      <TableHead className="w-16 font-bold text-xs">No / Kode</TableHead>
                      <TableHead className="w-72 font-bold text-xs">Perangkat Daerah (OPD)</TableHead>
                      <TableHead className="font-bold text-xs">Rumusan Tujuan Strategis (Level 1)</TableHead>
                      <TableHead className="w-40 font-bold text-xs text-center">Sasaran Terkait</TableHead>
                      <TableHead className="w-16 font-bold text-xs text-end">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTujuans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                          Tidak ada data Tujuan Strategis yang sesuai dengan kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems(filteredTujuans).map((item, idx) => (
                        <TableRow key={item.id} className="group/row hover:bg-muted/40 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold">
                            <Badge variant="outline" className="text-[11px] font-mono bg-primary/5 text-primary border-primary/20">
                              {item.nomor || `T.${(currentPage - 1) * pageSize + idx + 1}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex items-center gap-2.5 py-1">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary">
                                <Building2 className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-semibold text-xs text-foreground leading-tight truncate">
                                  {item.opd_nama}
                                </span>
                                <span className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                  ID: {String(item.opd_id).slice(0, 8)}...
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground leading-relaxed block">
                              {item.tujuan}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="secondary" className="font-mono text-[11px] px-2 py-0.5">
                              {item.total_sasaran} Sasaran ({item.total_indikator} Indikator)
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem onClick={() => handleOpenAddSasaran(item.id)}>
                                  <Plus className="h-3.5 w-3.5 mr-2 text-blue-600" />
                                  + Tambah Sasaran
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingTujuan({ id: String(item.id), tujuan: item.tujuan, opd_id: String(item.opd_id) })
                                    setTujuanInput({ opd_id: String(item.opd_id), tujuan: item.tujuan })
                                    setTujuanDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Edit Tujuan
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTujuan(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Hapus Tujuan
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {renderPaginationFooter(filteredTujuans.length)}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 2: DATA SASARAN (FITUR NO. 15) */}
            {/* ========================================================================= */}
            {activeTab === 'sasaran' && (
              <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="group/row bg-muted/30">
                      <TableHead className="w-16 font-bold text-xs">No / Kode</TableHead>
                      <TableHead className="w-72 font-bold text-xs">Induk Tujuan (Level 1) &amp; OPD</TableHead>
                      <TableHead className="font-bold text-xs">Rumusan Sasaran Strategis (Level 2)</TableHead>
                      <TableHead className="w-40 font-bold text-xs text-center">Indikator Terkait</TableHead>
                      <TableHead className="w-16 font-bold text-xs text-end">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSasarans.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-32 text-center text-muted-foreground text-sm">
                          Tidak ada data Sasaran Strategis yang sesuai dengan kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems(filteredSasarans).map((item, idx) => (
                        <TableRow key={item.id} className="group/row hover:bg-muted/40 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold">
                            <Badge variant="outline" className="text-[11px] font-mono bg-blue-50/50 text-blue-700 border-blue-200">
                              {item.nomor || `S.${(currentPage - 1) * pageSize + idx + 1}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col py-1 gap-1">
                              <Badge variant="secondary" className="w-fit text-[10px] font-medium gap-1 px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 text-slate-500" /> {item.opd_nama}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2 italic">
                                {item.tujuan_nama}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground leading-relaxed block">
                              {item.sasaran}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center">
                            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                              {item.total_iku} IKU • {item.total_biasa} Biasa
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44 text-xs">
                                <DropdownMenuItem onClick={() => handleOpenAddIndikator(item.id, 'Utama')}>
                                  <Sparkles className="h-3.5 w-3.5 mr-2 text-emerald-600" />
                                  + Tambah IKU
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleOpenAddIndikator(item.id, 'Pendukung')}>
                                  <Layers className="h-3.5 w-3.5 mr-2 text-slate-600" />
                                  + Tambah Indikator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingSasaran({ id: String(item.id), sasaran: item.sasaran })
                                    setSasaranInput({ tujuan_id: String(item.tujuan_id), sasaran: item.sasaran })
                                    setSasaranDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Edit Sasaran
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteSasaran(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Hapus Sasaran
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {renderPaginationFooter(filteredSasarans.length)}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 3: DATA IKU (FITUR NO. 16 - PRIORITAS FORM 2B) */}
            {/* ========================================================================= */}
            {activeTab === 'iku' && (
              <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="group/row bg-muted/30">
                      <TableHead className="w-16 font-bold text-xs">No / Kode</TableHead>
                      <TableHead className="w-64 font-bold text-xs">Induk Sasaran &amp; OPD</TableHead>
                      <TableHead className="font-bold text-xs">Rumusan Indikator Kinerja Utama (IKU)</TableHead>
                      <TableHead className="w-32 font-bold text-xs text-center">Target &amp; Satuan</TableHead>
                      <TableHead className="w-24 font-bold text-xs text-center">Klasifikasi</TableHead>
                      <TableHead className="w-16 font-bold text-xs text-end">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIkus.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                          Tidak ada data IKU yang sesuai dengan kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems(filteredIkus).map((item, idx) => (
                        <TableRow key={item.id} className="group/row hover:bg-muted/40 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold">
                            <Badge variant="outline" className="text-[11px] font-mono bg-emerald-50 text-emerald-700 border-emerald-300">
                              {item.nomor || `IKU.${(currentPage - 1) * pageSize + idx + 1}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col py-1 gap-1">
                              <Badge variant="secondary" className="w-fit text-[10px] font-medium gap-1 px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 text-slate-500" /> {item.opd_nama}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2 italic">
                                {item.sasaran_nama}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-semibold text-foreground leading-relaxed block">
                              {item.indikator}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono">
                            {item.target || item.satuan ? (
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {item.target ?? '-'} {item.satuan ?? ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] px-2 py-0.5">
                              IKU
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-xs">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingIndikator({
                                      id: String(item.id),
                                      indikator: item.indikator,
                                      jenis: 'Utama',
                                      target: item.target,
                                      satuan: item.satuan,
                                    })
                                    setIndikatorInput({
                                      sasaran_id: String(item.sasaran_id),
                                      indikator: item.indikator,
                                      jenis: 'Utama',
                                      target: item.target || '',
                                      satuan: item.satuan || '',
                                    })
                                    setIndikatorDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Edit IKU
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteIndikator(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Hapus IKU
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {renderPaginationFooter(filteredIkus.length)}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 4: DATA INDIKATOR BIASA (FITUR NO. 17) */}
            {/* ========================================================================= */}
            {activeTab === 'indikator' && (
              <div className="overflow-hidden rounded-md border bg-card shadow-2xs">
                <Table>
                  <TableHeader>
                    <TableRow className="group/row bg-muted/30">
                      <TableHead className="w-16 font-bold text-xs">No / Kode</TableHead>
                      <TableHead className="w-64 font-bold text-xs">Induk Sasaran &amp; OPD</TableHead>
                      <TableHead className="font-bold text-xs">Rumusan Indikator Kinerja Makro</TableHead>
                      <TableHead className="w-32 font-bold text-xs text-center">Target &amp; Satuan</TableHead>
                      <TableHead className="w-24 font-bold text-xs text-center">Klasifikasi</TableHead>
                      <TableHead className="w-16 font-bold text-xs text-end">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIndikators.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32 text-center text-muted-foreground text-sm">
                          Tidak ada data Indikator Biasa yang sesuai dengan kriteria pencarian.
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedItems(filteredIndikators).map((item, idx) => (
                        <TableRow key={item.id} className="group/row hover:bg-muted/40 transition-colors">
                          <TableCell className="font-mono text-xs font-semibold">
                            <Badge variant="outline" className="text-[11px] font-mono">
                              {item.nomor || `IND.${(currentPage - 1) * pageSize + idx + 1}`}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col py-1 gap-1">
                              <Badge variant="secondary" className="w-fit text-[10px] font-medium gap-1 px-1.5 py-0">
                                <Building2 className="h-2.5 w-2.5 text-slate-500" /> {item.opd_nama}
                              </Badge>
                              <span className="text-[11px] text-muted-foreground leading-tight line-clamp-2 italic">
                                {item.sasaran_nama}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">
                            <span className="font-medium text-foreground leading-relaxed block">
                              {item.indikator}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-center font-mono">
                            {item.target || item.satuan ? (
                              <Badge variant="outline" className="font-mono text-[11px]">
                                {item.target ?? '-'} {item.satuan ?? ''}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-mono text-[10px] px-2 py-0.5">
                              BIASA
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="flex h-8 w-8 p-0 data-[state=open]:bg-muted">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40 text-xs">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingIndikator({
                                      id: String(item.id),
                                      indikator: item.indikator,
                                      jenis: 'Pendukung',
                                      target: item.target,
                                      satuan: item.satuan,
                                    })
                                    setIndikatorInput({
                                      sasaran_id: String(item.sasaran_id),
                                      indikator: item.indikator,
                                      jenis: 'Pendukung',
                                      target: item.target || '',
                                      satuan: item.satuan || '',
                                    })
                                    setIndikatorDialogOpen(true)
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-2 text-amber-600" />
                                  Edit Indikator
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDeleteIndikator(item.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Hapus Indikator
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
                {renderPaginationFooter(filteredIndikators.length)}
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB 5: SEMUA (POHON CASCADING 3 LEVEL HIERARKI) */}
            {/* ========================================================================= */}
            {activeTab === 'all' && (
              <div className="space-y-4">
                {filteredCascading.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 gap-2 rounded-lg border bg-card/50">
                    <GitFork className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-xs text-muted-foreground">Belum ada struktur pohon kinerja makro.</p>
                  </div>
                ) : (
                  filteredCascading.map((tujuanItem) => {
                    const isExpanded = expandedTujuans[String(tujuanItem.id)] ?? true
                    return (
                      <Card
                        key={tujuanItem.id}
                        className="border shadow-2xs hover:shadow-xs transition-shadow"
                      >
                        {/* LEVEL 1: TUJUAN HEADER */}
                        <CardHeader className="bg-muted/20 pb-3 border-b py-3 px-4">
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <div className="space-y-1 flex-1">
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
                                <Badge className="bg-primary hover:bg-primary/90 text-white font-mono text-[10px] px-2 py-0.5">
                                  {tujuanItem.nomor || 'LEVEL 1'}
                                </Badge>
                                <Badge variant="outline" className="text-xs font-normal gap-1">
                                  <Building2 className="h-3 w-3 text-slate-500" /> {tujuanItem.opd_nama || 'OPD'}
                                </Badge>
                              </div>
                              <h3 className="text-sm font-semibold tracking-tight text-foreground pl-8">
                                {tujuanItem.tujuan}
                              </h3>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 self-end md:self-auto pl-8 md:pl-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenAddSasaran(tujuanItem.id)}
                                className="h-7 text-xs gap-1"
                              >
                                <Plus className="h-3 w-3" /> Sasaran
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600 hover:bg-blue-50"
                                onClick={() => {
                                  setEditingTujuan({ id: String(tujuanItem.id), tujuan: tujuanItem.tujuan, opd_id: String(tujuanItem.opd_id) })
                                  setTujuanInput({ opd_id: String(tujuanItem.opd_id), tujuan: tujuanItem.tujuan })
                                  setTujuanDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-rose-600 hover:bg-rose-50"
                                onClick={() => handleDeleteTujuan(tujuanItem.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>

                        {/* LEVEL 2 & 3 CONTENT */}
                        {isExpanded && (
                          <CardContent className="pt-3 pb-4 px-4 space-y-3">
                            {tujuanItem.sasarans.length === 0 ? (
                              <div className="text-xs text-muted-foreground italic pl-3 py-2 border-l-2 bg-muted/20 rounded-r-md">
                                Belum ada Sasaran Strategis yang ditautkan ke Tujuan ini.
                              </div>
                            ) : (
                              tujuanItem.sasarans.map((sasaranItem) => (
                                <div
                                  key={sasaranItem.id}
                                  className="rounded-lg border bg-muted/10 p-3 space-y-2.5"
                                >
                                  {/* LEVEL 2: SASARAN HEADER */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                    <div className="flex items-start gap-2">
                                      <Badge variant="secondary" className="font-mono text-[10px] mt-0.5 shrink-0 px-1.5 py-0">
                                        {sasaranItem.nomor || 'L2'}
                                      </Badge>
                                      <h4 className="text-xs font-semibold tracking-tight text-foreground">
                                        {sasaranItem.sasaran}
                                      </h4>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-auto">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleOpenAddIndikator(sasaranItem.id, 'Utama')}
                                        className="h-6 text-[11px] gap-1 px-2"
                                      >
                                        <Plus className="h-3 w-3" /> Indikator
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-blue-600"
                                        onClick={() => {
                                          setEditingSasaran({ id: String(sasaranItem.id), sasaran: sasaranItem.sasaran })
                                          setSasaranInput({ tujuan_id: String(tujuanItem.id), sasaran: sasaranItem.sasaran })
                                          setSasaranDialogOpen(true)
                                        }}
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-rose-600"
                                        onClick={() => handleDeleteSasaran(sasaranItem.id)}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* LEVEL 3: INDIKATOR LIST */}
                                  <div className="space-y-1.5 pl-2">
                                    {sasaranItem.indikators.length === 0 ? (
                                      <div className="text-[11px] text-muted-foreground italic pl-2.5 py-1">
                                        Belum ada Indikator Kinerja.
                                      </div>
                                    ) : (
                                      sasaranItem.indikators.map((ind) => (
                                        <div
                                          key={ind.id}
                                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2 rounded-md bg-card border shadow-2xs hover:border-primary/40 transition-colors"
                                        >
                                          <div className="flex items-start gap-2">
                                            <Badge
                                              variant="outline"
                                              className="text-[10px] font-mono shrink-0 mt-0.5"
                                            >
                                              {ind.nomor || 'L3'}
                                            </Badge>
                                            <div>
                                              <p className="text-xs font-medium text-foreground">
                                                {ind.indikator}
                                              </p>
                                              <div className="flex flex-wrap items-center gap-2 mt-0.5">
                                                {ind.jenis && (
                                                  <Badge
                                                    variant={ind.jenis.toLowerCase() === 'utama' || ind.jenis.toLowerCase() === 'iku' ? 'default' : 'secondary'}
                                                    className="text-[9px] py-0 px-1.5 h-3.5"
                                                  >
                                                    {ind.jenis.toUpperCase()}
                                                  </Badge>
                                                )}
                                                {(ind.target || ind.satuan) && (
                                                  <span className="text-[10px] font-mono text-muted-foreground">
                                                    Target: <strong className="text-foreground">{ind.target ?? '-'}</strong> {ind.satuan ?? ''}
                                                  </span>
                                                )}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-1 self-end sm:self-auto shrink-0">
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-blue-600"
                                              onClick={() => {
                                                setEditingIndikator({
                                                  id: String(ind.id),
                                                  indikator: ind.indikator,
                                                  jenis: ind.jenis,
                                                  target: ind.target,
                                                  satuan: ind.satuan,
                                                })
                                                setIndikatorInput({
                                                  sasaran_id: String(sasaranItem.id),
                                                  indikator: ind.indikator,
                                                  jenis: ind.jenis || 'Utama',
                                                  target: ind.target || '',
                                                  satuan: ind.satuan || '',
                                                })
                                                setIndikatorDialogOpen(true)
                                              }}
                                            >
                                              <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              className="h-6 w-6 text-rose-600"
                                              onClick={() => handleDeleteIndikator(ind.id)}
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
                  })
                )}
              </div>
            )}
          </>
        )}
      </Main>

      {/* DIALOG 1: FORM TUJUAN (FITUR 14) */}
      <Dialog open={tujuanDialogOpen} onOpenChange={setTujuanDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Target className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingTujuan ? 'Edit Tujuan Strategis' : 'Tambah Tujuan Strategis (Level 1)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Menentukan rumusan tujuan strategis makro per OPD untuk periode aktif.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-tujuan" onSubmit={handleSaveTujuan} className="space-y-4 w-full min-w-0">
              {!editingTujuan && (
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Perangkat Daerah (OPD)*</Label>
                  <SearchableSelect
                    value={tujuanInput.opd_id ? String(tujuanInput.opd_id) : ''}
                    onValueChange={(val) => setTujuanInput({ ...tujuanInput, opd_id: val })}
                    options={opdDialogOptions}
                    placeholder="Pilih OPD"
                    searchPlaceholder="Cari nama atau singkatan OPD..."
                    emptyMessage="Tidak ada OPD yang cocok."
                    className="h-9 text-xs"
                  />
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Rumusan Tujuan Strategis*</Label>
                <Input
                  placeholder="contoh: Meningkatkan Kualitas Pelayanan Publik..."
                  value={tujuanInput.tujuan}
                  onChange={(e) => setTujuanInput({ ...tujuanInput, tujuan: e.target.value })}
                  className="text-xs h-9"
                  required
                />
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setTujuanDialogOpen(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-tujuan"
              disabled={submitting}
              className="text-xs h-9 min-w-[120px] gap-1"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Tujuan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 2: FORM SASARAN (FITUR 15) */}
      <Dialog open={sasaranDialogOpen} onOpenChange={setSasaranDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600">
                <GitFork className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingSasaran ? 'Edit Sasaran Strategis' : 'Tambah Sasaran Strategis (Level 2)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Menjabarkan tujuan strategis menjadi rumusan sasaran spesifik.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-sasaran" onSubmit={handleSaveSasaran} className="space-y-4 w-full min-w-0">
              {!editingSasaran && (
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Tujuan Induk (Level 1)*</Label>
                  <Select
                    value={sasaranInput.tujuan_id}
                    onValueChange={(val) => setSasaranInput({ ...sasaranInput, tujuan_id: val })}
                  >
                    <SelectTrigger className="w-full min-w-0 text-xs h-9">
                      <SelectValue placeholder="Pilih Tujuan Induk" />
                    </SelectTrigger>
                    <SelectContent>
                      {cascadingData.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                          <span className="truncate block max-w-[460px]">
                            {t.nomor ? `[${t.nomor}] ` : ''}{t.opd_nama ? `(${t.opd_nama}) ` : ''}{t.tujuan}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Rumusan Sasaran Strategis*</Label>
                <Input
                  placeholder="contoh: Terwujudnya Sistem Informasi Terintegrasi..."
                  value={sasaranInput.sasaran}
                  onChange={(e) => setSasaranInput({ ...sasaranInput, sasaran: e.target.value })}
                  className="text-xs h-9"
                  required
                />
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSasaranDialogOpen(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-sasaran"
              disabled={submitting}
              className="text-xs h-9 min-w-[120px] gap-1"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Sasaran'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 3: FORM INDIKATOR (FITUR 16 & 17) */}
      <Dialog open={indikatorDialogOpen} onOpenChange={setIndikatorDialogOpen}>
        <DialogContent className="sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className={cn(
                'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg',
                indikatorInput.jenis === 'Utama' || indikatorInput.jenis === 'IKU'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-primary/10 text-primary'
              )}>
                {indikatorInput.jenis === 'Utama' || indikatorInput.jenis === 'IKU' ? (
                  <Sparkles className="h-5 w-5" />
                ) : (
                  <Layers className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingIndikator
                    ? 'Edit Indikator Kinerja'
                    : indikatorInput.jenis === 'Utama' || indikatorInput.jenis === 'IKU'
                    ? 'Tambah Data IKU (Level 3)'
                    : 'Tambah Data Indikator (Level 3)'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Parameter tolok ukur kuantitatif keberhasilan pencapaian sasaran strategis.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <form id="form-indikator" onSubmit={handleSaveIndikator} className="space-y-4 w-full min-w-0">
              {!editingIndikator && (
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Sasaran Induk (Level 2)*</Label>
                  <Select
                    value={indikatorInput.sasaran_id}
                    onValueChange={(val) => setIndikatorInput({ ...indikatorInput, sasaran_id: val })}
                  >
                    <SelectTrigger className="w-full min-w-0 text-xs h-9">
                      <SelectValue placeholder="Pilih Sasaran Induk" />
                    </SelectTrigger>
                    <SelectContent>
                      {cascadingData.flatMap((t) =>
                        t.sasarans.map((s) => (
                          <SelectItem key={s.id} value={String(s.id)} className="text-xs">
                            <span className="truncate block max-w-[460px]">
                              {s.nomor ? `[${s.nomor}] ` : ''}{t.opd_nama ? `(${t.opd_nama}) ` : ''}{s.sasaran}
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Nama / Rumusan Indikator*</Label>
                <Input
                  placeholder="contoh: Persentase aksesibilitas jalan dalam kondisi mantap (%)"
                  value={indikatorInput.indikator}
                  onChange={(e) => setIndikatorInput({ ...indikatorInput, indikator: e.target.value })}
                  className="text-xs h-9"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Jenis / Kategori</Label>
                  <Select
                    value={indikatorInput.jenis}
                    onValueChange={(val) => setIndikatorInput({ ...indikatorInput, jenis: val })}
                  >
                    <SelectTrigger className="w-full min-w-0 text-xs h-9">
                      <SelectValue placeholder="Jenis" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Utama" className="text-xs">IKU (Utama)</SelectItem>
                      <SelectItem value="Pendukung" className="text-xs">Biasa (Pendukung)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Target</Label>
                  <Input
                    placeholder="88.5"
                    value={indikatorInput.target}
                    onChange={(e) => setIndikatorInput({ ...indikatorInput, target: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5 min-w-0">
                  <Label className="text-xs font-semibold">Satuan</Label>
                  <Input
                    placeholder="%"
                    value={indikatorInput.satuan}
                    onChange={(e) => setIndikatorInput({ ...indikatorInput, satuan: e.target.value })}
                    className="text-xs h-9"
                  />
                </div>
              </div>
            </form>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIndikatorDialogOpen(false)}
              disabled={submitting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              form="form-indikator"
              disabled={submitting}
              className="text-xs h-9 min-w-[130px] gap-1"
            >
              {submitting ? 'Menyimpan...' : 'Simpan Indikator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG 4: SALIN DARI TAHUN SEBELUMNYA (SHEET 2 CATATAN 5) */}
      <Dialog open={cloneDialogOpen} onOpenChange={setCloneDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Copy className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <DialogTitle className="text-base font-bold text-foreground">
                  Salin Cascading dari Periode/Tahun Sebelumnya
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Menduplikasi seluruh Tujuan, Sasaran, dan Indikator ke periode aktif saat ini.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0 min-w-0">
            <div className="space-y-4 w-full min-w-0">
              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Periode Sumber (Tahun Asal)*</Label>
                <Select value={sourcePeriodeId} onValueChange={setSourcePeriodeId}>
                  <SelectTrigger className="w-full min-w-0 text-xs h-9">
                    <SelectValue placeholder="Pilih Periode Sumber" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodes
                      .filter((p) => String(p.id) !== String(selectedPeriodeId))
                      .map((p) => (
                        <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                          <span className="truncate block max-w-[420px]">
                            Periode {p.periode_penilaian} (Tahun {p.tahun_penilaian})
                          </span>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Periode Tujuan (Target Salin)</Label>
                <Input
                  value={`Periode ${activePeriodeObj?.periode_penilaian || ''} (Tahun ${activePeriodeObj?.tahun_penilaian || ''})`}
                  disabled
                  className="text-xs h-9 bg-muted"
                />
              </div>

              <div className="space-y-1.5 min-w-0">
                <Label className="text-xs font-semibold">Cakupan Perangkat Daerah</Label>
                <Input
                  value={selectedOpdId && selectedOpdId !== 'all' ? (activeOpdObj?.nama || 'OPD Terpilih') : 'Semua Perangkat Daerah'}
                  disabled
                  className="text-xs h-9 bg-muted"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setCloneDialogOpen(false)}
              disabled={cloning}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={cloning || !sourcePeriodeId}
              onClick={async () => {
                if (!sourcePeriodeId || !selectedPeriodeId) {
                  toast.error('Pilih periode sumber terlebih dahulu.')
                  return
                }
                setCloning(true)
                try {
                  const res = await perencanaanService.cloneCascading({
                    source_periode_id: sourcePeriodeId,
                    target_periode_id: selectedPeriodeId,
                    opd_id: selectedOpdId && selectedOpdId !== 'all' ? selectedOpdId : undefined,
                  })
                  toast.success(res.message || 'Berhasil menyalin data!')
                  setCloneDialogOpen(false)
                  fetchCascadingTree(selectedPeriodeId, selectedOpdId)
                } catch (err: any) {
                  toast.error(err?.response?.data?.message || 'Gagal menyalin data cascading.')
                } finally {
                  setCloning(false)
                }
              }}
              className="text-xs h-9 min-w-[130px] gap-1.5"
            >
              <Copy className="h-3.5 w-3.5" />
              {cloning ? 'Menyalin...' : 'Mulai Salin Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
