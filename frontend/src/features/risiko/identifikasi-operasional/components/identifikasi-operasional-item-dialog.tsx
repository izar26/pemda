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

  const [selectedSubKegiatanId, setSelectedSubKegiatanId] = useState<string>('')

  // Probis & Risk fields
  const [probis, setProbis] = useState<string>('Pelaksanaan')
  const [isCustomProbis, setIsCustomProbis] = useState(false)
  const [customProbisText, setCustomProbisText] = useState<string>('')

  const [kategoriRisiko, setKategoriRisiko] = useState<KategoriRisikoPemda>('Risiko Operasional')
  const [pernyataanRisiko, setPernyataanRisiko] = useState<string>('')
  const [pemilikRisiko, setPemilikRisiko] = useState<string>('')
  const [sifatRisiko, setSifatRisiko] = useState<SifatRisiko>('C')
  const [uraianDampak, setUraianDampak] = useState<string>('')
  const [pihakTerkena, setPihakTerkena] = useState<string>('')

  // Reset or populate on open
  useEffect(() => {
    if (itemToEdit) {
      setSelectedSubKegiatanId(itemToEdit.operasional_sub_kegiatan_id || '')

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
      setPemilikRisiko(itemToEdit.pemilik_risiko || '')
      setSifatRisiko(itemToEdit.sifat_risiko || 'C')
      setUraianDampak(itemToEdit.uraian_dampak || '')
      setPihakTerkena(itemToEdit.pihak_terkena || '')
    } else {
      setSelectedSubKegiatanId(meta?.sub_kegiatans_from_2c?.[0]?.id || '')
      setProbis('Pelaksanaan')
      setIsCustomProbis(false)
      setCustomProbisText('')
      setKategoriRisiko('Risiko Operasional')
      setPernyataanRisiko('')
      setPemilikRisiko(meta?.pemilik_risiko_options?.[0]?.nama || '')
      setSifatRisiko('C')
      setUraianDampak('')
      setPihakTerkena('')
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
    if (!selectedSubKegiatanId) return null
    return (meta?.sub_kegiatans_from_2c || []).find((s) => s.id === selectedSubKegiatanId) || null
  }, [selectedSubKegiatanId, meta?.sub_kegiatans_from_2c])

  const probisList = meta?.probis_options || DEFAULT_PROBIS_OPTIONS

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!selectedSubKegiatanId) {
      toast.warning('Pilih sub-kegiatan dari Form 2C.')
      return
    }
    if (!pemilikRisiko) {
      toast.warning('Pilih pemilik risiko dari master data.')
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

    if (!sifatRisiko) {
      toast.warning('Pilih sifat risiko.')
      return
    }

    try {
      setIsSubmitting(true)

      const payload = {
        operasional_sub_kegiatan_id: selectedSubKegiatanId,
        sub_kegiatan_kustom: null,
        indikator_keluaran_kustom: null,
        probis: finalProbis,
        kategori_risiko: kategoriRisiko,
        pernyataan_risiko: pernyataanRisiko.trim(),
        pemilik_risiko: pemilikRisiko,
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
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6'>
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
          <div className='space-y-3 rounded-lg border bg-muted/20 p-3.5'>
            <Label className='text-xs font-bold'>1. Sub-Kegiatan Pelaksanaan <span className='text-destructive'>*</span></Label>
            {itemToEdit?.sub_kegiatan_kustom && <p className='text-xs text-muted-foreground'>Sub-kegiatan sebelumnya: {itemToEdit.sub_kegiatan_kustom}</p>}
            {itemToEdit?.indikator_keluaran_kustom && <p className='text-xs text-muted-foreground'>Indikator sebelumnya: {itemToEdit.indikator_keluaran_kustom}</p>}
            <SearchableSelect options={subKegiatanOptions} value={selectedSubKegiatanId} onValueChange={setSelectedSubKegiatanId} placeholder='Pilih Sub-Kegiatan dari Form 2C...' searchPlaceholder='Cari kode atau nama sub-kegiatan...' className='text-xs' />
            {selectedSubKegiatanDetail && (
              <div className='space-y-1 rounded-md border bg-background p-3 text-xs text-muted-foreground'>
                <p><strong className='text-foreground'>Program:</strong> {selectedSubKegiatanDetail.program_nama || '-'}</p>
                <p><strong className='text-foreground'>Kegiatan:</strong> {selectedSubKegiatanDetail.kegiatan_nama || '-'}</p>
                <p><strong className='text-foreground'>Indikator keluaran:</strong> {selectedSubKegiatanDetail.indikator_keluaran || 'Belum tersedia di Form 2C'}</p>
              </div>
            )}
            {subKegiatanOptions.length === 0 && <p className='text-xs text-amber-600'>Tambahkan sub-kegiatan di Form 2C terlebih dahulu.</p>}
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
              {itemToEdit?.pemilik_risiko && !(meta?.pemilik_risiko_options || []).some((p) => p.nama === itemToEdit.pemilik_risiko) && (
                <p className='text-xs text-muted-foreground'>Pemilik sebelumnya: {itemToEdit.pemilik_risiko}. Pilih pemilik dari master data.</p>
              )}
              <SearchableSelect
                options={(meta?.pemilik_risiko_options || []).map((p) => ({ value: p.nama, label: p.nama }))}
                value={pemilikRisiko}
                onValueChange={setPemilikRisiko}
                placeholder='Pilih pemilik risiko dari master data'
                className='text-xs'
              />
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
