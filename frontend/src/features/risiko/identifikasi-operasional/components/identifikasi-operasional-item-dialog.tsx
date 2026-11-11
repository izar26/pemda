import { useEffect, useState, useMemo } from 'react'
import { FolderKanban, Loader2, Plus, Save } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { SearchableSelect } from '@/components/searchable-select'
import type {
  IdentifikasiRisikoOpdOperasionalItem,
  IdentifikasiRisikoOpdOperasionalMeta,
  KategoriRisikoPemda,
  SifatRisiko,
} from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOperasionalItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dokumenId: string
  meta: IdentifikasiRisikoOpdOperasionalMeta | null
  itemToEdit?: IdentifikasiRisikoOpdOperasionalItem | null
  onSuccess: () => void
}

const KATEGORI_OPTIONS: KategoriRisikoPemda[] = [
  'Risiko Operasional',
  'Risiko Fraud',
  'Risiko Belanja',
  'Risiko Pendapatan',
  'Risiko Pembiayaan',
  'Risiko Kepatuhan',
  'Risiko Strategis',
  'Risiko Reputasi',
]

const DEFAULT_PROBIS_OPTIONS = [
  'Perencanaan',
  'Penganggaran',
  'Pelaksanaan',
  'Pengadaan / Penatausahaan',
  'Pelaporan',
  'Pengawasan / Evaluasi',
]

export function IdentifikasiOperasionalItemDialog({
  open,
  onOpenChange,
  dokumenId,
  meta,
  itemToEdit,
  onSuccess,
}: IdentifikasiOperasionalItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sub-Kegiatan states
  const [isCustomSubKegiatan, setIsCustomSubKegiatan] = useState(false)
  const [selectedSubKegiatanId, setSelectedSubKegiatanId] = useState<string>('')
  const [subKegiatanKustom, setSubKegiatanKustom] = useState<string>('')
  const [indikatorKeluaranKustom, setIndikatorKeluaranKustom] = useState<string>('')

  // Probis & Risk fields
  const [probis, setProbis] = useState<string>('Pelaksanaan')
  const [isCustomProbis, setIsCustomProbis] = useState(false)
  const [customProbisText, setCustomProbisText] = useState<string>('')

  const [kategoriRisiko, setKategoriRisiko] = useState<KategoriRisikoPemda>('Risiko Operasional')
  const [pernyataanRisiko, setPernyataanRisiko] = useState<string>('')
  const [pemilikRisiko, setPemilikRisiko] = useState<string>('Sekretaris / Kepala Bidang')
  const [sifatRisiko, setSifatRisiko] = useState<SifatRisiko>('C')
  const [uraianDampak, setUraianDampak] = useState<string>('')
  const [pihakTerkena, setPihakTerkena] = useState<string>('OPD / Masyarakat')

  // Reset or populate on open
  useEffect(() => {
    if (itemToEdit) {
      if (itemToEdit.sub_kegiatan_kustom) {
        setIsCustomSubKegiatan(true)
        setSubKegiatanKustom(itemToEdit.sub_kegiatan_kustom)
        setSelectedSubKegiatanId('')
      } else {
        setIsCustomSubKegiatan(false)
        setSelectedSubKegiatanId(itemToEdit.operasional_sub_kegiatan_id || '')
        setSubKegiatanKustom('')
      }

      setIndikatorKeluaranKustom(itemToEdit.indikator_keluaran_kustom || '')

      const knownProbis = (meta?.probis_options || DEFAULT_PROBIS_OPTIONS).includes(itemToEdit.probis)
      if (knownProbis) {
        setProbis(itemToEdit.probis)
        setIsCustomProbis(false)
        setCustomProbisText('')
      } else {
        setProbis('Lainnya')
        setIsCustomProbis(true)
        setCustomProbisText(itemToEdit.probis || '')
      }

      setKategoriRisiko(itemToEdit.kategori_risiko || 'Risiko Operasional')
      setPernyataanRisiko(itemToEdit.pernyataan_risiko || '')
      setPemilikRisiko(itemToEdit.pemilik_risiko || 'Sekretaris / Kepala Bidang')
      setSifatRisiko(itemToEdit.sifat_risiko || 'C')
      setUraianDampak(itemToEdit.uraian_dampak || '')
      setPihakTerkena(itemToEdit.pihak_terkena || 'OPD / Masyarakat')
    } else {
      setIsCustomSubKegiatan(false)
      setSelectedSubKegiatanId('')
      setSubKegiatanKustom('')
      setIndikatorKeluaranKustom('')
      setProbis('Pelaksanaan')
      setIsCustomProbis(false)
      setCustomProbisText('')
      setKategoriRisiko('Risiko Operasional')
      setPernyataanRisiko('')
      setPemilikRisiko('Sekretaris / Kepala Bidang')
      setSifatRisiko('C')
      setUraianDampak('')
      setPihakTerkena('OPD / Masyarakat')
    }
  }, [itemToEdit, open, meta])

  // Sub-kegiatan options from Form 2C
  const subKegiatanOptions = useMemo(() => {
    return (meta?.sub_kegiatans_from_2c || []).map((sub) => ({
      value: sub.id,
      label: `${sub.kode ? `${sub.kode} ` : ''}${sub.nama}`,
    }))
  }, [meta?.sub_kegiatans_from_2c])

  const selectedSubKegiatanDetail = useMemo(() => {
    if (isCustomSubKegiatan || !selectedSubKegiatanId) return null
    return (meta?.sub_kegiatans_from_2c || []).find((s) => s.id === selectedSubKegiatanId) || null
  }, [isCustomSubKegiatan, selectedSubKegiatanId, meta?.sub_kegiatans_from_2c])

  const probisList = meta?.probis_options || DEFAULT_PROBIS_OPTIONS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validation
    if (!isCustomSubKegiatan && !selectedSubKegiatanId) {
      toast.warning('Silakan pilih Sub-Kegiatan dari Form 2C atau aktifkan opsi input manual.')
      return
    }

    if (isCustomSubKegiatan && !subKegiatanKustom.trim()) {
      toast.warning('Silakan isi uraian Sub-Kegiatan secara manual.')
      return
    }

    const finalProbis = isCustomProbis ? customProbisText.trim() : probis
    if (!finalProbis) {
      toast.warning('Silakan tentukan Proses Bisnis (PROBIS).')
      return
    }

    if (!pernyataanRisiko.trim()) {
      toast.warning('Pernyataan risiko wajib diisi.')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        operasional_sub_kegiatan_id: !isCustomSubKegiatan && selectedSubKegiatanId ? selectedSubKegiatanId : null,
        sub_kegiatan_kustom: isCustomSubKegiatan ? subKegiatanKustom.trim() : null,
        indikator_keluaran_kustom: isCustomSubKegiatan && indikatorKeluaranKustom.trim() ? indikatorKeluaranKustom.trim() : null,
        probis: finalProbis,
        kategori_risiko: kategoriRisiko,
        pernyataan_risiko: pernyataanRisiko.trim(),
        pemilik_risiko: pemilikRisiko.trim() || 'Sekretaris / Kepala Bidang',
        sifat_risiko: sifatRisiko,
        uraian_dampak: uraianDampak.trim() || null,
        pihak_terkena: pihakTerkena.trim() || null,
      }

      if (itemToEdit) {
        await risikoService.updateIdentifikasiOperasionalItem(dokumenId, itemToEdit.id, payload)
        toast.success(`Risiko ${itemToEdit.kode_risiko} berhasil diperbarui.`)
      } else {
        const res = await risikoService.storeIdentifikasiOperasionalItem(dokumenId, payload)
        toast.success(`Risiko baru berhasil ditambahkan dengan kode ${res.data.kode_risiko}.`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan data risiko.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='p-2 rounded-md bg-primary/10 text-primary'>
              <FolderKanban className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-base font-bold'>
                {itemToEdit ? `Ubah Risiko Operasional (${itemToEdit.kode_risiko})` : 'Tambah Risiko Operasional OPD (Form 3C)'}
              </DialogTitle>
              <DialogDescription className='text-xs'>
                Lengkapi identifikasi risiko operasional berdasarkan sub-kegiatan dan proses bisnis perangkat daerah.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 pt-2'>
          {/* SECTION 1: SUB-KEGIATAN & INDIKATOR KELUARAN */}
          <div className='p-3.5 rounded-lg border bg-muted/20 space-y-3'>
            <div className='flex items-center justify-between gap-2'>
              <Label className='text-xs font-bold text-foreground'>
                1. Sub-Kegiatan Pelaksanaan <span className='text-destructive'>*</span>
              </Label>
              <Button
                type='button'
                variant='ghost'
                size='sm'
                onClick={() => setIsCustomSubKegiatan(!isCustomSubKegiatan)}
                className='text-[11px] h-6 px-2 text-primary hover:text-primary font-medium'
              >
                {isCustomSubKegiatan ? 'Pilih dari Form 2C' : 'Input Manual / Kustom'}
              </Button>
            </div>

            {!isCustomSubKegiatan ? (
              <div className='space-y-2'>
                <SearchableSelect
                  options={subKegiatanOptions}
                  value={selectedSubKegiatanId}
                  onValueChange={setSelectedSubKegiatanId}
                  placeholder='Pilih Sub-Kegiatan dari Form 2C...'
                  searchPlaceholder='Cari kode atau nama sub-kegiatan...'
                  className='text-xs'
                />
                {selectedSubKegiatanDetail && (
                  <div className='p-2 rounded-md bg-background border text-[11px] space-y-1 text-muted-foreground'>
                    {selectedSubKegiatanDetail.program_nama && (
                      <div>
                        <strong className='text-foreground'>Program:</strong> {selectedSubKegiatanDetail.program_nama}
                      </div>
                    )}
                    {selectedSubKegiatanDetail.kegiatan_nama && (
                      <div>
                        <strong className='text-foreground'>Kegiatan:</strong> {selectedSubKegiatanDetail.kegiatan_nama}
                      </div>
                    )}
                    {selectedSubKegiatanDetail.indikator_keluaran && (
                      <div className='text-primary font-medium'>
                        <strong>Indikator Keluaran:</strong> {selectedSubKegiatanDetail.indikator_keluaran}
                      </div>
                    )}
                  </div>
                )}
                {subKegiatanOptions.length === 0 && (
                  <p className='text-[11px] text-amber-600 dark:text-amber-400'>
                    Belum ada sub-kegiatan di Form 2C. Anda dapat menggunakan opsi <strong>Input Manual</strong>.
                  </p>
                )}
              </div>
            ) : (
              <div className='space-y-2.5'>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-muted-foreground'>Nama Sub-Kegiatan Kustom</Label>
                  <Input
                    value={subKegiatanKustom}
                    onChange={(e) => setSubKegiatanKustom(e.target.value)}
                    placeholder='Contoh: Pemeliharaan Sarana Gedung Kantor'
                    className='text-xs h-9'
                  />
                </div>
                <div className='space-y-1'>
                  <Label className='text-[11px] text-muted-foreground'>Indikator Keluaran Kustom (Opsional)</Label>
                  <Input
                    value={indikatorKeluaranKustom}
                    onChange={(e) => setIndikatorKeluaranKustom(e.target.value)}
                    placeholder='Contoh: Jumlah gedung yang terpelihara (Target: 2 Gedung)'
                    className='text-xs h-9'
                  />
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PROBIS & KATEGORI RISIKO */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            {/* PROBIS (Proses Bisnis) */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-bold text-foreground'>
                  2. Proses Bisnis (PROBIS) <span className='text-destructive'>*</span>
                </Label>
                <button
                  type='button'
                  onClick={() => setIsCustomProbis(!isCustomProbis)}
                  className='text-[10px] text-primary hover:underline'
                >
                  {isCustomProbis ? 'Pilih Standar' : 'Lainnya / Kustom'}
                </button>
              </div>

              {!isCustomProbis ? (
                <Select value={probis} onValueChange={setProbis}>
                  <SelectTrigger className='text-xs h-9'>
                    <SelectValue placeholder='Pilih PROBIS' />
                  </SelectTrigger>
                  <SelectContent>
                    {probisList.map((item) => (
                      <SelectItem key={item} value={item} className='text-xs'>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={customProbisText}
                  onChange={(e) => setCustomProbisText(e.target.value)}
                  placeholder='Masukkan proses bisnis...'
                  className='text-xs h-9'
                />
              )}
            </div>

            {/* Kategori Risiko */}
            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-foreground'>
                3. Kategori Risiko <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={kategoriRisiko}
                onValueChange={(val) => setKategoriRisiko(val as KategoriRisikoPemda)}
              >
                <SelectTrigger className='text-xs h-9'>
                  <SelectValue placeholder='Pilih Kategori' />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((opt) => (
                    <SelectItem key={opt} value={opt} className='text-xs'>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SECTION 3: PERNYATAAN RISIKO */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-bold text-foreground'>
              4. Pernyataan Risiko <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              value={pernyataanRisiko}
              onChange={(e) => setPernyataanRisiko(e.target.value)}
              placeholder='Jelaskan potensi peristiwa/kondisi yang dapat menghambat pencapaian target sub-kegiatan...'
              rows={3}
              className='text-xs'
            />
          </div>

          {/* SECTION 4: PEMILIK RISIKO & SIFAT RISIKO */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-foreground'>
                5. Pemilik Risiko <span className='text-destructive'>*</span>
              </Label>
              <Input
                value={pemilikRisiko}
                onChange={(e) => setPemilikRisiko(e.target.value)}
                placeholder='Sekretaris / Kepala Bidang'
                className='text-xs h-9'
              />
              <p className='text-[10px] text-muted-foreground'>
                Default BPKP: Sekretaris / Kepala Bidang pengampu kegiatan.
              </p>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-foreground'>
                6. Sifat Risiko (C / UC) <span className='text-destructive'>*</span>
              </Label>
              <RadioGroup
                value={sifatRisiko}
                onValueChange={(val) => setSifatRisiko(val as SifatRisiko)}
                className='flex items-center gap-4 pt-1.5'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='C' id='sifat-c' />
                  <Label htmlFor='sifat-c' className='text-xs font-medium cursor-pointer'>
                    <strong>C</strong> (Dapat Dikendalikan)
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='UC' id='sifat-uc' />
                  <Label htmlFor='sifat-uc' className='text-xs font-medium cursor-pointer'>
                    <strong>UC</strong> (Tidak Dapat Dikendalikan)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* SECTION 5: DAMPAK & PIHAK TERKENA */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3.5'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-foreground'>
                7. Uraian Dampak
              </Label>
              <Textarea
                value={uraianDampak}
                onChange={(e) => setUraianDampak(e.target.value)}
                placeholder='Dampak finansial, operasional, hukum, atau reputasi...'
                rows={2}
                className='text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-bold text-foreground'>
                8. Pihak yang Terkena
              </Label>
              <Input
                value={pihakTerkena}
                onChange={(e) => setPihakTerkena(e.target.value)}
                placeholder='OPD / Masyarakat / Pihak Ketiga'
                className='text-xs h-9'
              />
              <p className='text-[10px] text-muted-foreground'>
                Pihak internal maupun eksternal yang terdampak langsung.
              </p>
            </div>
          </div>

          <DialogFooter className='pt-2 border-t'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className='text-xs'
            >
              Batal
            </Button>
            <Button
              type='submit'
              size='sm'
              disabled={isSubmitting}
              className='text-xs gap-1.5 font-semibold'
            >
              {isSubmitting ? (
                <>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  {itemToEdit ? <Save className='h-3.5 w-3.5' /> : <Plus className='h-3.5 w-3.5' />}
                  <span>{itemToEdit ? 'Simpan Perubahan' : 'Tambahkan Risiko'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
