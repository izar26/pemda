import { useState, useEffect, useMemo } from 'react'
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Sparkles,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { SearchableSelect, type SearchableSelectOption } from '@/components/searchable-select'
import { perencanaanService } from '@/services/perencanaan-service'
import type { RenstraProgram, PeriodePenilaian } from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'

interface SequentialWizardProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  opds: Opd[]
  periodes: PeriodePenilaian[]
  existingPrograms: RenstraProgram[]
  onSuccess: () => void
}

export function RenstraSequentialWizard({
  open,
  onOpenChange,
  opds,
  periodes,
  existingPrograms,
  onSuccess,
}: SequentialWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState<boolean>(false)

  // Context Filter (Sheet 2B)
  const [selectedOpdId, setSelectedOpdId] = useState<string>('')
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<string>('')

  // Step 1: Program Data
  const [isNewProgram, setIsNewProgram] = useState<boolean>(true)
  const [selectedProgramId, setSelectedProgramId] = useState<string | null>(null)
  const [programForm, setProgramForm] = useState({
    kode: 'A',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  // Step 2: Kegiatan Data
  const [createdProgramId, setCreatedProgramId] = useState<string | null>(null)
  const [kegiatanForm, setKegiatanForm] = useState({
    kode: 'A.1',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  // Step 3: Sub Kegiatan Data
  const [createdKegiatanId, setCreatedKegiatanId] = useState<string | null>(null)
  const [subKegiatanForm, setSubKegiatanForm] = useState({
    kode: 'A.1.1',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  useEffect(() => {
    if (open) {
      setStep(1)
      const activePeriode = periodes.find((p) => p.status === 'Aktif' || p.status === 'active') || periodes[0]
      if (activePeriode) setSelectedPeriodeId(String(activePeriode.id))
      if (opds.length > 0) setSelectedOpdId(String(opds[0].id))
    }
  }, [open, opds, periodes])

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

  const programOptions: SearchableSelectOption[] = useMemo(() => {
    return existingPrograms.map((p) => ({
      value: String(p.id),
      label: `[${p.kode}] ${p.nama}`,
      badge: p.kode,
      keywords: [p.kode, p.nama],
    }))
  }, [existingPrograms])

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOpdId || !selectedPeriodeId) {
      toast.error('Pilih OPD dan Periode Penilaian terlebih dahulu.')
      return
    }

    setSubmitting(true)
    try {
      if (isNewProgram) {
        const res = await perencanaanService.createProgram({
          opd_id: selectedOpdId,
          periode_id: selectedPeriodeId,
          ...programForm,
        })
        setCreatedProgramId(res.data.id)
        setKegiatanForm((prev) => ({ ...prev, kode: `${res.data.kode}.1` }))
        toast.success('Program berhasil dibuat. Lanjut isi Kegiatan.')
      } else {
        if (!selectedProgramId) {
          toast.error('Silakan pilih program induk.')
          setSubmitting(false)
          return
        }
        const prog = existingPrograms.find((p) => p.id === selectedProgramId)
        setCreatedProgramId(selectedProgramId)
        if (prog) {
          setKegiatanForm((prev) => ({ ...prev, kode: `${prog.kode}.1` }))
        }
      }
      setStep(2)
    } catch {
      toast.error('Gagal membuat program.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdProgramId) return

    setSubmitting(true)
    try {
      const res = await perencanaanService.createKegiatan({
        program_id: createdProgramId,
        ...kegiatanForm,
      })
      setCreatedKegiatanId(res.data.id)
      setSubKegiatanForm((prev) => ({ ...prev, kode: `${res.data.kode}.1` }))
      toast.success('Kegiatan berhasil dibuat. Lanjut isi Sub Kegiatan.')
      setStep(3)
    } catch {
      toast.error('Gagal membuat kegiatan.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createdKegiatanId) return

    setSubmitting(true)
    try {
      await perencanaanService.createSubKegiatan({
        kegiatan_id: createdKegiatanId,
        ...subKegiatanForm,
      })
      toast.success('Hierarki Program -> Kegiatan -> Sub Kegiatan berhasil disimpan.')
      onSuccess()
      onOpenChange(false)
    } catch {
      toast.error('Gagal membuat sub-kegiatan.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base font-bold text-foreground">
                Form Sequential Wizard (Fitur 2C)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Pengisian bertahap berjenjang: Program (A) &rarr; Kegiatan (A.1) &rarr; Sub Kegiatan (A.1.1)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Wizard Step Tracker Header */}
        <div className="flex items-center justify-between border-b px-6 py-2.5 bg-muted/5 shrink-0 text-xs">
          <div className={`flex items-center gap-1.5 font-medium ${step === 1 ? 'text-primary' : step > 1 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 1 ? 'bg-primary text-white' : step > 1 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
              {step > 1 ? <Check className="h-3 w-3" /> : '1'}
            </span>
            Program (A)
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 font-medium ${step === 2 ? 'text-primary' : step > 2 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 2 ? 'bg-primary text-white' : step > 2 ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
              {step > 2 ? <Check className="h-3 w-3" /> : '2'}
            </span>
            Kegiatan (A.1)
          </div>
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
          <div className={`flex items-center gap-1.5 font-medium ${step === 3 ? 'text-primary' : 'text-muted-foreground'}`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${step === 3 ? 'bg-primary text-white' : 'bg-slate-200'}`}>
              3
            </span>
            Sub Kegiatan (A.1.1)
          </div>
        </div>

        {/* STEP 1 FORM: PROGRAM */}
        {step === 1 && (
          <form onSubmit={handleStep1Submit} className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 min-w-0">
              <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 rounded-md text-xs space-y-2">
                <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Konteks Sumber Data (Renstra SKPD - Sheet 2B)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="min-w-0">
                    <Label className="text-[11px]">OPD yang Dinilai*</Label>
                    <SearchableSelect
                      value={selectedOpdId ? String(selectedOpdId) : ''}
                      onValueChange={(v) => setSelectedOpdId(v)}
                      options={opdOptions}
                      placeholder="Pilih OPD..."
                      searchPlaceholder="Cari nama atau singkatan OPD..."
                      emptyMessage="Tidak ada OPD yang cocok."
                      allowClear={false}
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-[11px]">Tahun &amp; Periode*</Label>
                    <Select value={selectedPeriodeId} onValueChange={(v) => setSelectedPeriodeId(v)}>
                      <SelectTrigger className="w-full min-w-0 h-8 text-xs bg-white dark:bg-slate-900">
                        <SelectValue placeholder="Pilih Periode" />
                      </SelectTrigger>
                      <SelectContent>
                        {periodes.map((p) => (
                          <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                            <span className="truncate block max-w-[380px]">
                              {p.tahun_penilaian} ({p.periode_penilaian})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-sm">Mode Program</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={isNewProgram ? 'default' : 'outline'}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => setIsNewProgram(true)}
                    >
                      + Buat Program Baru
                    </Button>
                    {existingPrograms.length > 0 && (
                      <Button
                        type="button"
                        variant={!isNewProgram ? 'default' : 'outline'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setIsNewProgram(false)}
                      >
                        Pilih Program Ada
                      </Button>
                    )}
                  </div>
                </div>

                {isNewProgram ? (
                  <div className="grid gap-3">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <div className="min-w-0">
                        <Label className="text-xs">Kode Program*</Label>
                        <Input
                          value={programForm.kode}
                          onChange={(e) => setProgramForm({ ...programForm, kode: e.target.value })}
                          placeholder="A / 1.01.01"
                          className="h-9 text-xs"
                          required
                        />
                      </div>
                      <div className="sm:col-span-3 min-w-0">
                        <Label className="text-xs">Nama Program*</Label>
                        <Input
                          value={programForm.nama}
                          onChange={(e) => setProgramForm({ ...programForm, nama: e.target.value })}
                          placeholder="contoh: Program Penyelenggaraan Pemerintahan..."
                          className="h-9 text-xs"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2 min-w-0">
                        <Label className="text-xs">Indikator Program</Label>
                        <Input
                          value={programForm.indikator}
                          onChange={(e) => setProgramForm({ ...programForm, indikator: e.target.value })}
                          placeholder="contoh: Persentase Capaian..."
                          className="h-9 text-xs"
                        />
                      </div>
                      <div className="min-w-0">
                        <Label className="text-xs">Target &amp; Satuan</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="100"
                            value={programForm.target}
                            onChange={(e) => setProgramForm({ ...programForm, target: e.target.value })}
                            className="h-9 text-xs min-w-0"
                          />
                          <Input
                            placeholder="%"
                            value={programForm.satuan}
                            onChange={(e) => setProgramForm({ ...programForm, satuan: e.target.value })}
                            className="h-9 text-xs min-w-0 w-20"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 min-w-0">
                    <Label className="text-xs">Pilih Program Induk</Label>
                    <SearchableSelect
                      value={selectedProgramId ? String(selectedProgramId) : ''}
                      onValueChange={(v) => setSelectedProgramId(v)}
                      options={programOptions}
                      placeholder="Pilih Program Renstra..."
                      searchPlaceholder="Cari kode atau nama program..."
                      emptyMessage="Tidak ada program yang cocok."
                      className="h-9 text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} className="text-xs h-9">
                Batal
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="text-xs h-9 gap-1">
                Lanjut ke Kegiatan <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2 FORM: KEGIATAN */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 min-w-0">
              <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 rounded-md text-xs space-y-1">
                <span className="text-muted-foreground">Induk Program (Level A):</span>
                <div className="font-bold text-emerald-950 dark:text-emerald-300">
                  [{programForm.kode}] {programForm.nama || 'Program Terpilih'}
                </div>
              </div>

              <div className="grid gap-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="min-w-0">
                    <Label className="text-xs">Kode Kegiatan*</Label>
                    <Input
                      value={kegiatanForm.kode}
                      onChange={(e) => setKegiatanForm({ ...kegiatanForm, kode: e.target.value })}
                      placeholder="A.1"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 min-w-0">
                    <Label className="text-xs">Nama Kegiatan Operational*</Label>
                    <Input
                      value={kegiatanForm.nama}
                      onChange={(e) => setKegiatanForm({ ...kegiatanForm, nama: e.target.value })}
                      placeholder="contoh: Kegiatan Pengelolaan Sistem Informasi..."
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 min-w-0">
                    <Label className="text-xs">Indikator Kegiatan</Label>
                    <Input
                      value={kegiatanForm.indikator}
                      onChange={(e) => setKegiatanForm({ ...kegiatanForm, indikator: e.target.value })}
                      placeholder="contoh: Jumlah Sistem yang Terintegrasi"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs">Target &amp; Satuan</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="12"
                        value={kegiatanForm.target}
                        onChange={(e) => setKegiatanForm({ ...kegiatanForm, target: e.target.value })}
                        className="h-9 text-xs min-w-0"
                      />
                      <Input
                        placeholder="Laporan"
                        value={kegiatanForm.satuan}
                        onChange={(e) => setKegiatanForm({ ...kegiatanForm, satuan: e.target.value })}
                        className="h-9 text-xs min-w-0 w-20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)} className="text-xs h-9">
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="text-xs h-9 gap-1">
                Lanjut ke Sub-Kegiatan <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3 FORM: SUB KEGIATAN */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="flex-1 flex flex-col min-h-0 min-w-0">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 min-h-0 min-w-0">
              <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 rounded-md text-xs space-y-1">
                <span className="text-muted-foreground">Induk Kegiatan (Level A.1):</span>
                <div className="font-bold text-purple-950 dark:text-purple-300">
                  [{kegiatanForm.kode}] {kegiatanForm.nama}
                </div>
              </div>

              <div className="grid gap-3 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                  <div className="min-w-0">
                    <Label className="text-xs">Kode Sub Kegiatan*</Label>
                    <Input
                      value={subKegiatanForm.kode}
                      onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, kode: e.target.value })}
                      placeholder="A.1.1"
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                  <div className="sm:col-span-3 min-w-0">
                    <Label className="text-xs">Nama Sub Kegiatan Detail*</Label>
                    <Input
                      value={subKegiatanForm.nama}
                      onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, nama: e.target.value })}
                      placeholder="contoh: Pemeliharaan Server dan Jaringan SIMDA..."
                      className="h-9 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2 min-w-0">
                    <Label className="text-xs">Indikator Sub Kegiatan</Label>
                    <Input
                      value={subKegiatanForm.indikator}
                      onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, indikator: e.target.value })}
                      placeholder="contoh: Uptime Server 99.9%"
                      className="h-9 text-xs"
                    />
                  </div>
                  <div className="min-w-0">
                    <Label className="text-xs">Target &amp; Satuan</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="100"
                        value={subKegiatanForm.target}
                        onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, target: e.target.value })}
                        className="h-9 text-xs min-w-0"
                      />
                      <Input
                        placeholder="%"
                        value={subKegiatanForm.satuan}
                        onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, satuan: e.target.value })}
                        className="h-9 text-xs min-w-0 w-20"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(2)} className="text-xs h-9">
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <Button type="submit" size="sm" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 text-xs h-9 gap-1">
                <Check className="h-4 w-4" /> Simpan Semua Hierarki
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
