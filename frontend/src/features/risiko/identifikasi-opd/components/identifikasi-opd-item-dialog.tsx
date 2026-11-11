import { useEffect, useState } from 'react'
import { Loader2, Plus, Save } from 'lucide-react'
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
  IdentifikasiRisikoOpdItem,
  IdentifikasiRisikoOpdMeta,
  KategoriRisikoOpd,
  SifatRisiko,
} from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiOpdItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dokumenId: string
  meta: IdentifikasiRisikoOpdMeta | null
  itemToEdit?: IdentifikasiRisikoOpdItem | null
  onSuccess: () => void
}

const KATEGORI_OPTIONS: KategoriRisikoOpd[] = [
  'Risiko Strategis',
  'Risiko Fraud',
  'Risiko Belanja',
  'Risiko Pendapatan',
  'Risiko Pembiayaan',
  'Risiko Kepatuhan',
  'Risiko Operasional',
  'Risiko Reputasi',
]

export function IdentifikasiOpdItemDialog({
  open,
  onOpenChange,
  dokumenId,
  meta,
  itemToEdit,
  onSuccess,
}: IdentifikasiOpdItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [isCustomSasaran, setIsCustomSasaran] = useState(false)
  const [selectedSasaranId, setSelectedSasaranId] = useState<string>('')
  const [sasaranKustom, setSasaranKustom] = useState<string>('')

  const [isCustomIndikator, setIsCustomIndikator] = useState(false)
  const [selectedIndikatorId, setSelectedIndikatorId] = useState<string>('')
  const [indikatorKustom, setIndikatorKustom] = useState<string>('')

  const [kategoriRisiko, setKategoriRisiko] = useState<KategoriRisikoOpd>('Risiko Strategis')
  const [pernyataanRisiko, setPernyataanRisiko] = useState<string>('')
  const [pemilikRisiko, setPemilikRisiko] = useState<string>('Kepala OPD')
  const [sifatRisiko, setSifatRisiko] = useState<SifatRisiko>('C')
  const [uraianDampak, setUraianDampak] = useState<string>('')
  const [pihakTerkena, setPihakTerkena] = useState<string>('OPD')

  // Reset or populate on open
  useEffect(() => {
    if (itemToEdit) {
      if (itemToEdit.sasaran_kustom) {
        setIsCustomSasaran(true)
        setSasaranKustom(itemToEdit.sasaran_kustom)
        setSelectedSasaranId('')
      } else {
        setIsCustomSasaran(false)
        setSelectedSasaranId(itemToEdit.sasaran_penilaian_id || '')
        setSasaranKustom('')
      }

      if (itemToEdit.indikator_kustom) {
        setIsCustomIndikator(true)
        setIndikatorKustom(itemToEdit.indikator_kustom)
        setSelectedIndikatorId('')
      } else {
        setIsCustomIndikator(false)
        setSelectedIndikatorId(itemToEdit.indikator_penilaian_id || '')
        setIndikatorKustom('')
      }

      setKategoriRisiko(itemToEdit.kategori_risiko)
      setPernyataanRisiko(itemToEdit.pernyataan_risiko)
      setPemilikRisiko(itemToEdit.pemilik_risiko || 'Kepala OPD')
      setSifatRisiko(itemToEdit.sifat_risiko || 'C')
      setUraianDampak(itemToEdit.uraian_dampak || '')
      setPihakTerkena(itemToEdit.pihak_terkena || 'OPD')
    } else {
      setIsCustomSasaran(false)
      setSelectedSasaranId(meta?.sasarans_from_2b?.[0]?.id || '')
      setSasaranKustom('')
      setIsCustomIndikator(false)
      setSelectedIndikatorId(meta?.sasarans_from_2b?.[0]?.indikators?.[0]?.id || '')
      setIndikatorKustom('')
      setKategoriRisiko('Risiko Strategis')
      setPernyataanRisiko('')
      setPemilikRisiko('Kepala OPD')
      setSifatRisiko('C')
      setUraianDampak('')
      setPihakTerkena('OPD')
    }
  }, [itemToEdit, open, meta])

  // Sasarans options from Form 2B
  const sasaranOptions = (meta?.sasarans_from_2b || []).map((s) => ({
    value: s.id,
    label: `${s.kode_sasaran ? s.kode_sasaran + ' - ' : ''}${s.sasaran}`,
  }))

  // Available indicators for chosen sasaran
  const activeSasaranObj = (meta?.sasarans_from_2b || []).find((s) => s.id === selectedSasaranId)
  const indikatorOptions = (activeSasaranObj?.indikators || []).map((i) => ({
    value: i.id,
    label: `${i.kode_indikator ? i.kode_indikator + ' - ' : ''}${i.indikator}`,
  }))

  // When sasaran changes, select first indicator of that sasaran
  function handleSasaranChange(val: string) {
    setSelectedSasaranId(val)
    const found = (meta?.sasarans_from_2b || []).find((s) => s.id === val)
    if (found && found.indikators.length > 0) {
      setSelectedIndikatorId(found.indikators[0].id)
    } else {
      setSelectedIndikatorId('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!pernyataanRisiko.trim()) {
      toast.warning('Pernyataan risiko wajib diisi.')
      return
    }

    if (isCustomSasaran && !sasaranKustom.trim()) {
      toast.warning('Teks sasaran kustom wajib diisi.')
      return
    }

    if (!isCustomSasaran && !selectedSasaranId && (meta?.sasarans_from_2b?.length || 0) > 0) {
      toast.warning('Silakan pilih Sasaran Strategis dari Form 2B.')
      return
    }

    const payload = {
      sasaran_penilaian_id: !isCustomSasaran && selectedSasaranId ? selectedSasaranId : null,
      sasaran_kustom: isCustomSasaran ? sasaranKustom : null,
      indikator_penilaian_id: !isCustomIndikator && selectedIndikatorId ? selectedIndikatorId : null,
      indikator_kustom: isCustomIndikator ? indikatorKustom : null,
      kategori_risiko: kategoriRisiko,
      pernyataan_risiko: pernyataanRisiko.trim(),
      pemilik_risiko: pemilikRisiko.trim() || 'Kepala OPD',
      sifat_risiko: sifatRisiko,
      uraian_dampak: uraianDampak.trim() || null,
      pihak_terkena: pihakTerkena.trim() || 'OPD',
    }

    try {
      setIsSubmitting(true)
      if (itemToEdit) {
        await risikoService.updateIdentifikasiOpdItem(dokumenId, itemToEdit.id, payload)
        toast.success(`Risiko ${itemToEdit.kode_risiko} berhasil diperbarui.`)
      } else {
        await risikoService.storeIdentifikasiOpdItem(dokumenId, payload)
        toast.success('Risiko strategis OPD baru berhasil ditambahkan.')
      }
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan butir risiko.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-2xl max-h-[90vh] overflow-y-auto'>
        <DialogHeader>
          <DialogTitle className='text-base font-bold'>
            {itemToEdit ? `Edit Butir Risiko: ${itemToEdit.kode_risiko}` : 'Tambah Risiko Strategis OPD Baru'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {itemToEdit
              ? 'Perbarui formulasi pernyataan risiko, indikator, pemilik, serta uraian dampaknya.'
              : 'Tambahkan risiko baru ke lembar kerja Form 3B. Nomor urut dan Kode Risiko (RSO) akan digenerate otomatis.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4 py-2 text-xs'>
          {/* 1. Sasaran Strategis */}
          <div className='space-y-2 p-3 rounded-lg border bg-muted/20'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-bold text-foreground'>
                1. Sasaran Strategis <span className='text-destructive'>*</span>
              </Label>
              <div className='flex items-center gap-3 text-xs'>
                <label className='flex items-center gap-1.5 cursor-pointer'>
                  <input
                    type='radio'
                    name='sasaran_source'
                    checked={!isCustomSasaran}
                    onChange={() => setIsCustomSasaran(false)}
                    className='text-primary'
                  />
                  <span>Dari Form 2B</span>
                </label>
                <label className='flex items-center gap-1.5 cursor-pointer'>
                  <input
                    type='radio'
                    name='sasaran_source'
                    checked={isCustomSasaran}
                    onChange={() => setIsCustomSasaran(true)}
                    className='text-primary'
                  />
                  <span>Input Manual</span>
                </label>
              </div>
            </div>

            {!isCustomSasaran ? (
              sasaranOptions.length > 0 ? (
                <SearchableSelect
                  options={sasaranOptions}
                  value={selectedSasaranId}
                  onValueChange={handleSasaranChange}
                  placeholder='Pilih Sasaran dari Form 2B...'
                  className='text-xs h-8'
                />
              ) : (
                <div className='text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900'>
                  Belum ada sasaran di Form 2B. Silakan beralih ke pilihan <strong>Input Manual</strong>.
                </div>
              )
            ) : (
              <Textarea
                value={sasaranKustom}
                onChange={(e) => setSasaranKustom(e.target.value)}
                placeholder='Tuliskan rumusan sasaran strategis...'
                className='text-xs min-h-[60px]'
              />
            )}
          </div>

          {/* 2. Indikator Kinerja */}
          <div className='space-y-2 p-3 rounded-lg border bg-muted/20'>
            <div className='flex items-center justify-between'>
              <Label className='text-xs font-bold text-foreground'>
                2. Indikator Kinerja Sasaran <span className='text-destructive'>*</span>
              </Label>
              <div className='flex items-center gap-3 text-xs'>
                <label className='flex items-center gap-1.5 cursor-pointer'>
                  <input
                    type='radio'
                    name='indikator_source'
                    checked={!isCustomIndikator}
                    onChange={() => setIsCustomIndikator(false)}
                    className='text-primary'
                  />
                  <span>Dari Form 2B</span>
                </label>
                <label className='flex items-center gap-1.5 cursor-pointer'>
                  <input
                    type='radio'
                    name='indikator_source'
                    checked={isCustomIndikator}
                    onChange={() => setIsCustomIndikator(true)}
                    className='text-primary'
                  />
                  <span>Input Manual</span>
                </label>
              </div>
            </div>

            {!isCustomIndikator ? (
              indikatorOptions.length > 0 ? (
                <SearchableSelect
                  options={indikatorOptions}
                  value={selectedIndikatorId}
                  onValueChange={(val: string) => setSelectedIndikatorId(val)}
                  placeholder='Pilih Indikator dari Form 2B...'
                  className='text-xs h-8'
                />
              ) : (
                <div className='text-xs text-amber-600 bg-amber-50 dark:bg-amber-950/30 p-2 rounded border border-amber-200 dark:border-amber-900'>
                  Tidak ada indikator untuk sasaran ini di Form 2B. Silakan gunakan <strong>Input Manual</strong>.
                </div>
              )
            ) : (
              <Textarea
                value={indikatorKustom}
                onChange={(e) => setIndikatorKustom(e.target.value)}
                placeholder='Tuliskan rumusan indikator kinerja sasaran...'
                className='text-xs min-h-[60px]'
              />
            )}
          </div>

          {/* 3. Kategori Risiko & Sifat (C/UC) */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                3. Kategori Risiko <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={kategoriRisiko}
                onValueChange={(val) => setKategoriRisiko(val as KategoriRisikoOpd)}
              >
                <SelectTrigger className='text-xs h-8'>
                  <SelectValue placeholder='Pilih Kategori...' />
                </SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k} className='text-xs'>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                4. Sifat Risiko (C / UC) <span className='text-destructive'>*</span>
              </Label>
              <RadioGroup
                value={sifatRisiko}
                onValueChange={(val) => setSifatRisiko(val as SifatRisiko)}
                className='flex items-center gap-4 pt-1.5'
              >
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='C' id='sifat-c' />
                  <Label htmlFor='sifat-c' className='text-xs cursor-pointer font-normal'>
                    <strong>C</strong> (Controllable)
                  </Label>
                </div>
                <div className='flex items-center space-x-2'>
                  <RadioGroupItem value='UC' id='sifat-uc' />
                  <Label htmlFor='sifat-uc' className='text-xs cursor-pointer font-normal'>
                    <strong>UC</strong> (Uncontrollable)
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* 4. Pernyataan Risiko */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold'>
              5. Pernyataan Risiko <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              value={pernyataanRisiko}
              onChange={(e) => setPernyataanRisiko(e.target.value)}
              placeholder='Contoh: Kegagalan penyelesaian pekerjaan pembangunan infrastruktur tepat waktu akibat keterlambatan pasokan material'
              className='text-xs min-h-[75px]'
              required
            />
          </div>

          {/* 5. Pemilik Risiko & Pihak yang Terkena */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>6. Pemilik Risiko</Label>
              <Input
                value={pemilikRisiko}
                onChange={(e) => setPemilikRisiko(e.target.value)}
                placeholder='Kepala OPD'
                className='text-xs h-8'
              />
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>7. Pihak yang Terkena</Label>
              <Input
                value={pihakTerkena}
                onChange={(e) => setPihakTerkena(e.target.value)}
                placeholder='Contoh: OPD, Masyarakat, Pengguna Jalan'
                className='text-xs h-8'
              />
            </div>
          </div>

          {/* 6. Uraian Dampak */}
          <div className='space-y-1.5'>
            <Label className='text-xs font-semibold'>8. Uraian Dampak</Label>
            <Textarea
              value={uraianDampak}
              onChange={(e) => setUraianDampak(e.target.value)}
              placeholder='Uraikan konsekuensi atau kerugian bila risiko ini benar-benar terjadi...'
              className='text-xs min-h-[60px]'
            />
          </div>

          <DialogFooter className='pt-2'>
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
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : itemToEdit ? (
                <Save className='h-3.5 w-3.5' />
              ) : (
                <Plus className='h-3.5 w-3.5' />
              )}
              <span>{itemToEdit ? 'Simpan Perubahan' : 'Tambahkan Risiko'}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
