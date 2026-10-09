import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Filter,
  Layers,
  Printer,
  RefreshCw,
  Save,
  ShieldAlert,
  Sparkles,
  Target,
  ArrowRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Link } from '@tanstack/react-router'
import { Header } from '@/components/layout/header'
import { PageHeader } from '@/components/layout/page-header'
import { Main } from '@/components/layout/main'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { PerencanaanSubnav } from './perencanaan-subnav'
import { perencanaanService } from '@/services/perencanaan-service'
import { opdService } from '@/services/opd-service'
import type { PeriodePenilaian, Tujuan, IndikatorSasaran } from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'
import { useAuthStore } from '@/stores/auth-store'

export function KonteksStrategisForm() {
  const user = useAuthStore((s) => s.auth.user)
  const isSuperadmin =
    (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [periodes, setPeriodes] = useState<PeriodePenilaian[]>([])
  const [opds, setOpds] = useState<Opd[]>([])
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('')
  const [selectedOpdId, setSelectedOpdId] = useState<string>('')

  // Form 2B state
  const [sumberData, setSumberData] = useState<string>('Renstra SKPD')
  const [selectedTujuanId, setSelectedTujuanId] = useState<string>('')
  const [selectedSasaranIds, setSelectedSasaranIds] = useState<string[]>([])
  const [selectedIkuIds, setSelectedIkuIds] = useState<string[]>([])
  const [informasiLain, setInformasiLain] = useState<string>('-')
  const [kepalaNama, setKepalaNama] = useState<string>('')
  const [kepalaNip, setKepalaNip] = useState<string>('')
  const [tanggalPenetapan, setTanggalPenetapan] = useState<string>(
    new Date().toISOString().split('T')[0]
  )
  const [status, setStatus] = useState<'draft' | 'final'>('draft')

  // Loaded data from Bapperida
  const [availableTujuans, setAvailableTujuans] = useState<Tujuan[]>([])

  const loadData = useCallback(async (periodeId?: string, opdId?: string) => {
    setLoading(true)
    try {
      const [periodeList, opdList] = await Promise.all([
        perencanaanService.getPeriodeList(),
        opdService.getOpds({ all: true }),
      ])
      setPeriodes(periodeList)
      setOpds(opdList)

      const activePeriode =
        periodeList.find((p) => p.status === 'Aktif' || p.status === 'active') ||
        periodeList[0]
      const currentPeriodeId = periodeId || selectedPeriodeId || activePeriode?.id || ''
      const currentOpdId =
        opdId ||
        selectedOpdId ||
        (user?.opd_id ? String(user.opd_id) : (opdList[0]?.id ? String(opdList[0].id) : ''))

      setSelectedPeriodeId(currentPeriodeId)
      setSelectedOpdId(currentOpdId)

      if (currentPeriodeId && currentOpdId) {
        const responseData = await perencanaanService.getKonteksStrategis({
          periode_id: currentPeriodeId,
          opd_id: currentOpdId,
        })

        if (responseData) {
          setAvailableTujuans(responseData.available_tujuans || [])

          if (responseData.konteks) {
            const k = responseData.konteks
            setSumberData(k.sumber_data || 'Renstra SKPD')
            setSelectedTujuanId(k.tujuan_id || '')
            setSelectedSasaranIds(k.sasaran_ids || [])
            setSelectedIkuIds(k.iku_ids || [])
            setInformasiLain(k.informasi_lain || '-')
            setKepalaNama(k.kepala_opd_nama || responseData.pejabat_kepala?.nama || '')
            setKepalaNip(k.kepala_opd_nip || responseData.pejabat_kepala?.nip || '')
            setStatus(k.status || 'draft')
            if (k.tanggal_penetapan) {
              setTanggalPenetapan(k.tanggal_penetapan.split('T')[0])
            }
          } else {
            // Defaults for new form
            setSumberData('Renstra SKPD')
            setSelectedTujuanId(responseData.available_tujuans?.[0]?.id || '')
            setSelectedSasaranIds([])
            setSelectedIkuIds([])
            setInformasiLain('-')
            setKepalaNama(responseData.pejabat_kepala?.nama || '')
            setKepalaNip(responseData.pejabat_kepala?.nip || '')
            setStatus('draft')
          }
        }
      }
    } catch {
      toast.error('Gagal memuat formulir Penetapan Konteks Risiko Strategis.')
    } finally {
      setLoading(false)
    }
  }, [selectedPeriodeId, selectedOpdId, user?.opd_id])

  useEffect(() => {
    loadData()
  }, [])

  // Find currently selected Tujuan object
  const currentTujuan = useMemo(() => {
    return availableTujuans.find((t) => t.id === selectedTujuanId) || null
  }, [availableTujuans, selectedTujuanId])

  // Sasarans of currently selected Tujuan
  const availableSasarans = useMemo(() => {
    return currentTujuan?.sasarans || []
  }, [currentTujuan])

  // IKUs (only jenis 'utama' / 'iku') belonging to checked Sasarans
  const availableIkus = useMemo(() => {
    const ikus: (IndikatorSasaran & { sasaranNama?: string })[] = []
    availableSasarans.forEach((sasaran) => {
      if (selectedSasaranIds.includes(sasaran.id)) {
        (sasaran.indikators || []).forEach((ind) => {
          const jenisLower = (ind.jenis || '').toLowerCase()
          if (jenisLower === 'utama' || jenisLower === 'iku') {
            ikus.push({
              ...ind,
              sasaranNama: sasaran.sasaran,
            })
          }
        })
      }
    })
    return ikus
  }, [availableSasarans, selectedSasaranIds])

  // Handle Tujuan change -> reset sasaran and iku
  const handleTujuanChange = (tujuanId: string) => {
    setSelectedTujuanId(tujuanId)
    const newTujuan = availableTujuans.find((t) => t.id === tujuanId)
    // Auto-select all sasarans by default
    const sasaranIds = (newTujuan?.sasarans || []).map((s) => s.id)
    setSelectedSasaranIds(sasaranIds)

    // Auto-select all IKUs
    const ikuIds: string[] = []
    ;(newTujuan?.sasarans || []).forEach((s) => {
      (s.indikators || []).forEach((ind) => {
        const jenisLower = (ind.jenis || '').toLowerCase()
        if (jenisLower === 'utama' || jenisLower === 'iku') {
          ikuIds.push(ind.id)
        }
      })
    })
    setSelectedIkuIds(ikuIds)
  }

  const toggleSasaran = (sasaranId: string) => {
    setSelectedSasaranIds((prev) => {
      if (prev.includes(sasaranId)) {
        // Remove sasaran and remove its IKUs
        const next = prev.filter((id) => id !== sasaranId)
        const targetSasaran = availableSasarans.find((s) => s.id === sasaranId)
        const removedIkuIds = (targetSasaran?.indikators || []).map((i) => i.id)
        setSelectedIkuIds((prevIkus) => prevIkus.filter((id) => !removedIkuIds.includes(id)))
        return next
      } else {
        // Add sasaran and auto-add its IKUs
        const next = [...prev, sasaranId]
        const targetSasaran = availableSasarans.find((s) => s.id === sasaranId)
        const newIkuIds = (targetSasaran?.indikators || [])
          .filter((i) => (i.jenis || '').toLowerCase() === 'utama' || (i.jenis || '').toLowerCase() === 'iku')
          .map((i) => i.id)
        setSelectedIkuIds((prevIkus) => Array.from(new Set([...prevIkus, ...newIkuIds])))
        return next
      }
    })
  }

  const toggleIku = (ikuId: string) => {
    setSelectedIkuIds((prev) =>
      prev.includes(ikuId) ? prev.filter((id) => id !== ikuId) : [...prev, ikuId]
    )
  }

  const handleSave = async (targetStatus: 'draft' | 'final') => {
    if (!selectedPeriodeId || !selectedOpdId) {
      toast.error('Periode dan OPD wajib ditentukan.')
      return
    }
    if (!selectedTujuanId) {
      toast.error('Pilih satu Tujuan Strategis dari Bapperida.')
      return
    }
    if (selectedSasaranIds.length === 0) {
      toast.error('Pilih minimal satu Sasaran Strategis.')
      return
    }

    setSaving(true)
    try {
      await perencanaanService.saveKonteksStrategis({
        periode_id: selectedPeriodeId,
        opd_id: selectedOpdId,
        sumber_data: sumberData,
        tujuan_id: selectedTujuanId,
        sasaran_ids: selectedSasaranIds,
        iku_ids: selectedIkuIds,
        informasi_lain: informasiLain,
        kepala_opd_nama: kepalaNama,
        kepala_opd_nip: kepalaNip,
        tanggal_penetapan: tanggalPenetapan,
        status: targetStatus,
      })
      setStatus(targetStatus)
      toast.success(
        targetStatus === 'final'
          ? 'Formulir 2B telah difinalisasi dan disahkan!'
          : 'Draft Formulir 2B berhasil disimpan.'
      )
    } catch {
      toast.error('Gagal menyimpan Formulir 2B.')
    } finally {
      setSaving(false)
    }
  }

  const activePeriodeObj = periodes.find((p) => String(p.id) === String(selectedPeriodeId))
  const activeOpdObj = opds.find((o) => String(o.id) === String(selectedOpdId))

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-primary" />
          <h1 className="text-sm font-semibold tracking-tight">
            Penetapan Konteks Risiko Strategis OPD (Formulir 2B)
          </h1>
        </div>
        <div className="ms-auto flex items-center space-x-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main fixed>
        <div className="space-y-4">
          <PageHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight">Penetapan Konteks Risiko Strategis OPD</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Formulir resmi 2B sesuai Permendagri & Petunjuk Teknis Manajemen Risiko Pemda. Mengaitkan Tujuan, Sasaran, dan IKU dari Renstra SKPD.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="text-xs gap-1.5"
              >
                <Printer className="h-4 w-4" /> Cetak Form 2B
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSave('draft')}
                disabled={saving || loading}
                className="text-xs gap-1.5"
              >
                <Save className="h-4 w-4" /> Simpan Draft
              </Button>
              <Button
                size="sm"
                onClick={() => handleSave('final')}
                disabled={saving || loading}
                className="text-xs gap-1.5 shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" /> Finalisasi & Sahkan
              </Button>
            </div>
          </PageHeader>

          <PerencanaanSubnav />

          {/* Context Selector Bar */}
          <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
            <CardHeader className="py-3 px-4 bg-slate-50/70 dark:bg-slate-900/60 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Filter className="h-3.5 w-3.5 text-primary" /> Parameter Konteks Penilaian (Sheet 2B)
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={status === 'final' ? 'default' : 'secondary'} className="text-xs">
                    Status: {status === 'final' ? 'FINAL / DISAHKAN' : 'DRAFT'}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => loadData(selectedPeriodeId, selectedOpdId)}
                    className="h-7 text-xs gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-blue-600" /> Periode & Tahun Penilaian*
                </Label>
                <Select
                  value={selectedPeriodeId}
                  onValueChange={(val) => {
                    setSelectedPeriodeId(val)
                    loadData(val, selectedOpdId)
                  }}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue placeholder="Pilih Periode" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodes.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        Periode {p.periode_penilaian} (Tahun {p.tahun_penilaian}){' '}
                        {p.status === 'Aktif' || p.status === 'active' ? '• Aktif' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[11px] text-muted-foreground">
                  Diambil dari Periode Penilaian aktif Bapperida (Fitur No 13).
                </span>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-amber-600" /> Perangkat Daerah (OPD)*
                </Label>
                {isSuperadmin ? (
                  <Select
                    value={selectedOpdId}
                    onValueChange={(val) => {
                      setSelectedOpdId(val)
                      loadData(selectedPeriodeId, val)
                    }}
                  >
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue placeholder="Pilih OPD" />
                    </SelectTrigger>
                    <SelectContent>
                      {opds.map((opd) => (
                        <SelectItem key={opd.id} value={String(opd.id)}>
                          {opd.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={activeOpdObj?.nama || user?.opd?.nama || 'Dinas Pekerjaan Umum dan Penataan Ruang'}
                    disabled
                    className="text-xs h-9 bg-muted font-medium"
                  />
                )}
                <span className="text-[11px] text-muted-foreground">
                  Terkunci pada akun OPD yang login (atau combobox pemilihan dinas untuk Administrator).
                </span>
              </div>
            </CardContent>
          </Card>

          {/* FORMULIR 2B RESMI (LAYOUT SHEET 2B) */}
          <Card className="border border-border/80 shadow-sm print:border-none print:shadow-none">
            <CardHeader className="bg-primary/5 dark:bg-primary/10 border-b border-border/60 py-4 px-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">
                  Formulir 2B
                </span>
              </div>
              <CardTitle className="text-lg font-bold uppercase tracking-tight text-foreground">
                PENETAPAN KONTEKS RISIKO STRATEGIS OPD
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Pemerintah Kabupaten Cianjur • Periode{' '}
                {activePeriodeObj?.periode_penilaian || '2026 - 2030'} (Tahun Penilaian{' '}
                {activePeriodeObj?.tahun_penilaian || '2027'})
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6 space-y-6">
              {/* Row 1: Identitas Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-border/60 text-xs">
                <div>
                  <span className="text-muted-foreground block mb-0.5">Nama Pemda:</span>
                  <span className="font-semibold text-sm">Pemerintah Kabupaten Cianjur</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-0.5">OPD yang Dinilai:</span>
                  <span className="font-semibold text-sm text-primary">
                    {activeOpdObj?.nama || 'Dinas Pekerjaan Umum dan Tata Ruang'}
                  </span>
                </div>
              </div>

              {/* Row 2: Sumber Data */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-blue-600" /> Sumber Data*
                </Label>
                <Input
                  value={sumberData}
                  onChange={(e) => setSumberData(e.target.value)}
                  placeholder="Contoh: Renstra SKPD"
                  className="text-xs max-w-md h-9"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Diambil dari master data Sumber Data (No 10).
                </span>
              </div>

              {/* Row 3: Tujuan Strategis (Hanya boleh pilih 1) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                    <Target className="h-4 w-4 text-emerald-600" /> Tujuan Strategis OPD*
                    <Badge variant="outline" className="text-[10px] ml-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400">
                      Hanya Boleh Pilih 1
                    </Badge>
                  </Label>
                  <Link
                    to="/perencanaan/cascading"
                    className="text-[11px] text-primary hover:underline flex items-center gap-1"
                  >
                    Kelola Tujuan di Bapperida <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>

                {availableTujuans.length === 0 ? (
                  <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300">
                    Belum ada Tujuan Kinerja yang diatur oleh Bapperida untuk OPD ini pada periode terpilih. Silakan minta admin Bapperida untuk menginput Data Tujuan (Fitur 14).
                  </div>
                ) : (
                  <Select value={selectedTujuanId} onValueChange={handleTujuanChange}>
                    <SelectTrigger className="w-full min-w-0 text-xs h-auto py-2.5 bg-background">
                      <SelectValue placeholder="Pilih Tujuan Strategis" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTujuans.map((t) => (
                        <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                          <span className="truncate block max-w-[500px]">
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400 mr-1.5">
                              [{t.nomor || 'T'}]
                            </span>
                            {t.tujuan}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <span className="text-[11px] text-muted-foreground block">
                  Diambil dari tujuan strategis yang diatur Bapperida (Sheet 2 / Fitur 14).
                </span>
              </div>

              {/* Row 4: Sasaran Strategis (Dinamis, Boleh > 1) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Layers className="h-4 w-4 text-blue-600" /> Sasaran Strategis Terpilih*
                  <Badge variant="outline" className="text-[10px] ml-1 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400">
                    Boleh Memilih Lebih Dari Satu
                  </Badge>
                </Label>

                {availableSasarans.length === 0 ? (
                  <div className="p-3.5 rounded-lg bg-muted text-xs text-muted-foreground italic">
                    Belum ada sasaran yang terkait dengan tujuan strategis terpilih.
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border p-3.5 bg-slate-50/50 dark:bg-slate-900/40">
                    {availableSasarans.map((sasaran, sIdx) => {
                      const isChecked = selectedSasaranIds.includes(sasaran.id)
                      return (
                        <div
                          key={sasaran.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-background transition-colors cursor-pointer"
                          onClick={() => toggleSasaran(sasaran.id)}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleSasaran(sasaran.id)}
                            id={`sasaran-${sasaran.id}`}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 text-xs">
                            <label
                              htmlFor={`sasaran-${sasaran.id}`}
                              className="font-medium cursor-pointer text-foreground block leading-relaxed"
                            >
                              <span className="font-bold text-blue-600 mr-1">
                                {sIdx + 1}. [{sasaran.nomor || 'S'}]
                              </span>
                              {sasaran.sasaran}
                            </label>
                            <span className="text-[11px] text-muted-foreground block">
                              Memiliki {(sasaran.indikators || []).length} Indikator Kinerja
                            </span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground block">
                  Muncul secara dinamis berdasarkan tujuan strategis yang dipilih.
                </span>
              </div>

              {/* Row 5: IKU Renstra OPD (Dinamis, Boleh > 1) */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold flex items-center gap-1.5 text-foreground">
                  <Sparkles className="h-4 w-4 text-amber-500" /> IKU Renstra OPD yang Dinilai*
                  <Badge variant="outline" className="text-[10px] ml-1 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400">
                    Khusus Indikator Jenis IKU
                  </Badge>
                </Label>

                {availableIkus.length === 0 ? (
                  <div className="p-3.5 rounded-lg bg-muted text-xs text-muted-foreground italic">
                    Belum ada Indikator berjenis IKU pada sasaran yang dipilih.
                  </div>
                ) : (
                  <div className="space-y-2 rounded-lg border p-3.5 bg-amber-50/20 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-900/60">
                    {availableIkus.map((iku, iIdx) => {
                      const isChecked = selectedIkuIds.includes(iku.id)
                      return (
                        <div
                          key={iku.id}
                          className="flex items-start gap-3 p-2 rounded-md hover:bg-background transition-colors cursor-pointer"
                          onClick={() => toggleIku(iku.id)}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleIku(iku.id)}
                            id={`iku-${iku.id}`}
                            className="mt-0.5"
                          />
                          <div className="space-y-0.5 text-xs">
                            <label
                              htmlFor={`iku-${iku.id}`}
                              className="font-medium cursor-pointer text-foreground block leading-relaxed"
                            >
                              <span className="font-bold text-amber-600 mr-1">
                                {iIdx + 1}.
                              </span>
                              {iku.indikator}
                            </label>
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <span>Sasaran: {iku.sasaranNama}</span>
                              {iku.target && (
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                                  Target: {iku.target} {iku.satuan || ''}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground block">
                  Muncul secara dinamis berdasarkan sasaran strategis yang dipilih.
                </span>
              </div>

              {/* Row 6: Informasi Lain */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Informasi Lain</Label>
                <Textarea
                  value={informasiLain}
                  onChange={(e) => setInformasiLain(e.target.value)}
                  placeholder="Catatan atau informasi tambahan penetapan konteks..."
                  rows={3}
                  className="text-xs"
                />
                <span className="text-[11px] text-muted-foreground block">
                  Disediakan textarea untuk pengisian catatan kontekstual.
                </span>
              </div>

              {/* Row 7: Lembar Pengesahan Tanda Tangan Kepala Dinas */}
              <div className="pt-6 border-t border-border/80 flex flex-col md:flex-row justify-end">
                <div className="w-full md:w-80 text-center space-y-2 p-4 rounded-lg bg-slate-50/70 dark:bg-slate-900/60 border border-border/60">
                  <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    <span>Cianjur,</span>
                    <Input
                      type="date"
                      value={tanggalPenetapan}
                      onChange={(e) => setTanggalPenetapan(e.target.value)}
                      className="text-xs h-7 w-36 px-1.5 py-0 inline-block bg-background"
                    />
                  </div>
                  <div className="text-xs font-semibold uppercase leading-tight text-foreground">
                    Kepala {activeOpdObj?.nama || 'Dinas Pekerjaan Umum dan Tata Ruang'}<br />
                    Kabupaten Cianjur
                  </div>
                  <div className="h-16 flex items-center justify-center">
                    <span className="text-[10px] text-muted-foreground italic border-b border-dashed border-muted-foreground/40 pb-1">
                      (Tanda Tangan Elektronik / Basah)
                    </span>
                  </div>
                  <div className="space-y-1">
                    <Input
                      value={kepalaNama}
                      onChange={(e) => setKepalaNama(e.target.value)}
                      placeholder="Nama Kepala Dinas"
                      className="text-xs h-7 text-center font-bold bg-background"
                    />
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[11px] text-muted-foreground font-mono">NIP.</span>
                      <Input
                        value={kepalaNip}
                        onChange={(e) => setKepalaNip(e.target.value)}
                        placeholder="NIP Kepala Dinas"
                        className="text-xs h-7 w-52 text-center font-mono bg-background"
                      />
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground block pt-1">
                    Diambil dari pengaturan Data Pegawai (Fitur 12) jabatan Kepala OPD.
                  </span>
                </div>
              </div>

              {/* Quick Actions Footer */}
              <div className="pt-4 flex items-center justify-between border-t border-border/60">
                <div className="text-xs text-muted-foreground">
                  Langkah selanjutnya setelah Form 2B adalah mengisi{' '}
                  <span className="font-semibold text-foreground">Form 2C (Pohon Renstra SKPD)</span>.
                </div>
                <Link to="/perencanaan/renstra">
                  <Button variant="default" size="sm" className="text-xs gap-1.5 shadow-sm">
                    Lanjut ke Form 2C (Renstra SKPD) <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  )
}
