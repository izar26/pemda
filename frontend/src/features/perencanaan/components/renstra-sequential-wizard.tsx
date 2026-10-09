import { useState, useEffect } from 'react'
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
  const [selectedOpdId, setSelectedOpdId] = useState<number>(0)
  const [selectedPeriodeId, setSelectedPeriodeId] = useState<number>(0)

  // Step 1: Program Data
  const [isNewProgram, setIsNewProgram] = useState<boolean>(true)
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(null)
  const [programForm, setProgramForm] = useState({
    kode: 'A',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  // Step 2: Kegiatan Data
  const [createdProgramId, setCreatedProgramId] = useState<number | null>(null)
  const [kegiatanForm, setKegiatanForm] = useState({
    kode: 'A.1',
    nama: '',
    indikator: '',
    target: '',
    satuan: '',
    pagu_indikatif: 0,
  })

  // Step 3: Sub Kegiatan Data
  const [createdKegiatanId, setCreatedKegiatanId] = useState<number | null>(null)
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
      const activePeriode = periodes.find((p) => p.status === 'Aktif') || periodes[0]
      if (activePeriode) setSelectedPeriodeId(activePeriode.id)
      if (opds.length > 0) setSelectedOpdId(Number(opds[0].id))
    }
  }, [open, opds, periodes])

  const getOpdName = (opd: Opd) => {
    return opd.nama || (opd as unknown as { nama_opd: string }).nama_opd || 'OPD'
  }

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
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <DialogTitle>Form Sequential Wizard (Fitur 2C)</DialogTitle>
          </div>
          <DialogDescription>
            Pengisian bertahap berjenjang: Program (A) &rarr; Kegiatan (A.1) &rarr; Sub Kegiatan (A.1.1)
          </DialogDescription>
        </DialogHeader>

        {/* Wizard Step Tracker Header */}
        <div className="flex items-center justify-between border-y py-3 my-2 bg-slate-50 dark:bg-slate-900 px-4 rounded-md text-xs">
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
          <form onSubmit={handleStep1Submit} className="space-y-4">
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/30 border border-blue-100 rounded-md text-xs space-y-2">
              <div className="font-semibold text-blue-900 dark:text-blue-300 flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" /> Konteks Sumber Data (Renstra SKPD - Sheet 2B)
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">OPD yang Dinilai*</Label>
                  <Select value={String(selectedOpdId)} onValueChange={(v) => setSelectedOpdId(Number(v))}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
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
                <div>
                  <Label className="text-[11px]">Tahun & Periode*</Label>
                  <Select value={String(selectedPeriodeId)} onValueChange={(v) => setSelectedPeriodeId(Number(v))}>
                    <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-900">
                      <SelectValue placeholder="Pilih Periode" />
                    </SelectTrigger>
                    <SelectContent>
                      {periodes.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.tahun_penilaian} ({p.periode_penilaian})
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
                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-xs">Kode Program*</Label>
                      <Input
                        value={programForm.kode}
                        onChange={(e) => setProgramForm({ ...programForm, kode: e.target.value })}
                        placeholder="A / 1.01.01"
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <Label className="text-xs">Nama Program*</Label>
                      <Input
                        value={programForm.nama}
                        onChange={(e) => setProgramForm({ ...programForm, nama: e.target.value })}
                        placeholder="contoh: Program Penyelenggaraan Pemerintahan..."
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs">Indikator Program</Label>
                      <Input
                        value={programForm.indikator}
                        onChange={(e) => setProgramForm({ ...programForm, indikator: e.target.value })}
                        placeholder="contoh: Persentase Capaian..."
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Target & Satuan</Label>
                      <div className="flex gap-1">
                        <Input
                          placeholder="100"
                          value={programForm.target}
                          onChange={(e) => setProgramForm({ ...programForm, target: e.target.value })}
                        />
                        <Input
                          placeholder="%"
                          value={programForm.satuan}
                          onChange={(e) => setProgramForm({ ...programForm, satuan: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label className="text-xs">Pilih Program Induk</Label>
                  <Select
                    value={selectedProgramId ? String(selectedProgramId) : ''}
                    onValueChange={(v) => setSelectedProgramId(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih Program Renstra..." />
                    </SelectTrigger>
                    <SelectContent>
                      {existingPrograms.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          [{p.kode}] {p.nama}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1">
                Lanjut ke Kegiatan <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 2 FORM: KEGIATAN */}
        {step === 2 && (
          <form onSubmit={handleStep2Submit} className="space-y-4">
            <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-100 rounded-md text-xs space-y-1">
              <span className="text-muted-foreground">Induk Program (Level A):</span>
              <div className="font-bold text-emerald-950 dark:text-emerald-300">
                [{programForm.kode}] {programForm.nama || 'Program Terpilih'}
              </div>
            </div>

            <div className="grid gap-3 pt-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Kode Kegiatan*</Label>
                  <Input
                    value={kegiatanForm.kode}
                    onChange={(e) => setKegiatanForm({ ...kegiatanForm, kode: e.target.value })}
                    placeholder="A.1"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Nama Kegiatan Operational*</Label>
                  <Input
                    value={kegiatanForm.nama}
                    onChange={(e) => setKegiatanForm({ ...kegiatanForm, nama: e.target.value })}
                    placeholder="contoh: Kegiatan Pengelolaan Sistem Informasi..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Indikator Kegiatan</Label>
                  <Input
                    value={kegiatanForm.indikator}
                    onChange={(e) => setKegiatanForm({ ...kegiatanForm, indikator: e.target.value })}
                    placeholder="contoh: Jumlah Sistem yang Terintegrasi"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target & Satuan</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="12"
                      value={kegiatanForm.target}
                      onChange={(e) => setKegiatanForm({ ...kegiatanForm, target: e.target.value })}
                    />
                    <Input
                      placeholder="Laporan"
                      value={kegiatanForm.satuan}
                      onChange={(e) => setKegiatanForm({ ...kegiatanForm, satuan: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <Button type="submit" disabled={submitting} className="gap-1">
                Lanjut ke Sub-Kegiatan <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* STEP 3 FORM: SUB KEGIATAN */}
        {step === 3 && (
          <form onSubmit={handleStep3Submit} className="space-y-4">
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/30 border border-purple-100 rounded-md text-xs space-y-1">
              <span className="text-muted-foreground">Induk Kegiatan (Level A.1):</span>
              <div className="font-bold text-purple-950 dark:text-purple-300">
                [{kegiatanForm.kode}] {kegiatanForm.nama}
              </div>
            </div>

            <div className="grid gap-3 pt-2">
              <div className="grid grid-cols-4 gap-2">
                <div>
                  <Label className="text-xs">Kode Sub Kegiatan*</Label>
                  <Input
                    value={subKegiatanForm.kode}
                    onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, kode: e.target.value })}
                    placeholder="A.1.1"
                    required
                  />
                </div>
                <div className="col-span-3">
                  <Label className="text-xs">Nama Sub Kegiatan Detail*</Label>
                  <Input
                    value={subKegiatanForm.nama}
                    onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, nama: e.target.value })}
                    placeholder="contoh: Pemeliharaan Server dan Jaringan SIMDA..."
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <Label className="text-xs">Indikator Sub Kegiatan</Label>
                  <Input
                    value={subKegiatanForm.indikator}
                    onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, indikator: e.target.value })}
                    placeholder="contoh: Uptime Server 99.9%"
                  />
                </div>
                <div>
                  <Label className="text-xs">Target & Satuan</Label>
                  <div className="flex gap-1">
                    <Input
                      placeholder="100"
                      value={subKegiatanForm.target}
                      onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, target: e.target.value })}
                    />
                    <Input
                      placeholder="%"
                      value={subKegiatanForm.satuan}
                      onChange={(e) => setSubKegiatanForm({ ...subKegiatanForm, satuan: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(2)}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Kembali
              </Button>
              <Button type="submit" disabled={submitting} className="bg-emerald-600 hover:bg-emerald-700 gap-1">
                <Check className="h-4 w-4" /> Simpan Semua Hierarki
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
