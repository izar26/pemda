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
  const [selectedSasaranId, setSelectedSasaranId] = useState<string>('')
  const [selectedIndikatorId, setSelectedIndikatorId] = useState<string>('')

  const [kategoriRisiko, setKategoriRisiko] = useState<KategoriRisikoOpd>('Risiko Strategis')
  const [pernyataanRisiko, setPernyataanRisiko] = useState<string>('')
  const [pemilikRisiko, setPemilikRisiko] = useState<string>('')
  const [sifatRisiko, setSifatRisiko] = useState<SifatRisiko>('C')
  const [uraianDampak, setUraianDampak] = useState<string>('')
  const [pihakTerkena, setPihakTerkena] = useState<string>('')

  // Reset or populate on open
  useEffect(() => {
    if (itemToEdit) {
      setSelectedSasaranId(itemToEdit.sasaran_penilaian_id || '')
      setSelectedIndikatorId(itemToEdit.indikator_penilaian_id || '')
      setKategoriRisiko(itemToEdit.kategori_risiko)
      setPernyataanRisiko(itemToEdit.pernyataan_risiko)
      setPemilikRisiko(itemToEdit.pemilik_risiko || '')
      setSifatRisiko(itemToEdit.sifat_risiko || 'C')
      setUraianDampak(itemToEdit.uraian_dampak || '')
      setPihakTerkena(itemToEdit.pihak_terkena || '')
    } else {
      setSelectedSasaranId(meta?.sasarans_from_2b?.[0]?.id || '')
      setSelectedIndikatorId(meta?.sasarans_from_2b?.[0]?.indikators?.[0]?.id || '')
      setKategoriRisiko('Risiko Strategis')
      setPernyataanRisiko('')
      setPemilikRisiko(meta?.pemilik_risiko_options?.[0]?.nama || '')
      setSifatRisiko('C')
      setUraianDampak('')
      setPihakTerkena('')
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

    if (!selectedSasaranId || !selectedIndikatorId) {
      toast.warning('Pilih sasaran dan indikator dari Form 2B.')
      return
    }
    if (!pemilikRisiko || !sifatRisiko) {
      toast.warning('Pilih pemilik dan sifat risiko.')
      return
    }

    const payload = {
      sasaran_penilaian_id: selectedSasaranId,
      sasaran_kustom: null,
      indikator_penilaian_id: selectedIndikatorId,
      indikator_kustom: null,
      kategori_risiko: kategoriRisiko,
      pernyataan_risiko: pernyataanRisiko.trim(),
      pemilik_risiko: pemilikRisiko,
      sifat_risiko: sifatRisiko,
      uraian_dampak: uraianDampak.trim() || null,
      pihak_terkena: pihakTerkena.trim() || null,
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
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6'>
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
          {itemToEdit?.sasaran_kustom && <p className='text-xs text-muted-foreground'>Sasaran sebelumnya: {itemToEdit.sasaran_kustom}</p>}
          {itemToEdit?.indikator_kustom && <p className='text-xs text-muted-foreground'>Indikator sebelumnya: {itemToEdit.indikator_kustom}</p>}
          <div className='space-y-2 p-3 rounded-lg border bg-muted/20'>
            <Label className='text-xs font-bold'>1. Sasaran Strategis <span className='text-destructive'>*</span></Label>
            <SearchableSelect options={sasaranOptions} value={selectedSasaranId} onValueChange={handleSasaranChange} placeholder='Pilih Sasaran dari Form 2B...' className='text-xs h-8' />
            {sasaranOptions.length === 0 && <p className='text-xs text-amber-600'>Tambahkan sasaran di Form 2B terlebih dahulu.</p>}
          </div>
          <div className='space-y-2 p-3 rounded-lg border bg-muted/20'>
            <Label className='text-xs font-bold'>2. Indikator Kinerja Sasaran <span className='text-destructive'>*</span></Label>
            <SearchableSelect options={indikatorOptions} value={selectedIndikatorId} onValueChange={setSelectedIndikatorId} placeholder='Pilih Indikator dari Form 2B...' className='text-xs h-8' />
            {indikatorOptions.length === 0 && <p className='text-xs text-amber-600'>Tambahkan indikator untuk sasaran di Form 2B.</p>}
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
              {itemToEdit?.pemilik_risiko && !(meta?.pemilik_risiko_options || []).some((p) => p.nama === itemToEdit.pemilik_risiko) && (
                <p className='text-xs text-muted-foreground'>Pemilik sebelumnya: {itemToEdit.pemilik_risiko}. Pilih pemilik dari master data.</p>
              )}
              <SearchableSelect
                options={(meta?.pemilik_risiko_options || []).map((p) => ({ value: p.nama, label: p.nama }))}
                value={pemilikRisiko}
                onValueChange={setPemilikRisiko}
                placeholder='Pilih pemilik risiko dari master data'
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
