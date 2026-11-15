import { useEffect, useState, useMemo } from 'react'
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
  IdentifikasiRisikoPemdaItem,
  IdentifikasiRisikoPemdaMeta,
  KategoriRisikoPemda,
  SifatRisiko,
} from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface IdentifikasiPemdaItemDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dokumenId: string
  meta: IdentifikasiRisikoPemdaMeta | null
  itemToEdit?: IdentifikasiRisikoPemdaItem | null
  onSuccess: () => void
}

export function IdentifikasiPemdaItemDialog({
  open,
  onOpenChange,
  dokumenId,
  meta,
  itemToEdit,
  onSuccess,
}: IdentifikasiPemdaItemDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form states
  const [isCustomSasaran, setIsCustomSasaran] = useState(false)
  const [selectedSasaranId, setSelectedSasaranId] = useState<string>('')
  const [sasaranKustom, setSasaranKustom] = useState<string>('')

  const [isCustomIndikator, setIsCustomIndikator] = useState(false)
  const [selectedIndikatorId, setSelectedIndikatorId] = useState<string>('')
  const [indikatorKustom, setIndikatorKustom] = useState<string>('')

  const [kategoriRisiko, setKategoriRisiko] = useState<KategoriRisikoPemda>('Risiko Strategis')
  const [pernyataanRisiko, setPernyataanRisiko] = useState<string>('')
  const [pemilikRisiko, setPemilikRisiko] = useState<string>('Kepala Daerah')
  const [isCustomPemilik, setIsCustomPemilik] = useState(false)
  const [sifatRisiko, setSifatRisiko] = useState<SifatRisiko>('C')
  const [uraianDampak, setUraianDampak] = useState<string>('')
  const [pihakTerkena, setPihakTerkena] = useState<string>('')

  // Reset or populate on open
  useEffect(() => {
    const masterPemilikList = meta?.pemilik_risiko_options || []

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

      const isKnownPemilik = masterPemilikList.some(
        (p) => p.nama.toLowerCase() === (itemToEdit.pemilik_risiko || '').toLowerCase()
      )
      if (itemToEdit.pemilik_risiko && !isKnownPemilik && masterPemilikList.length > 0) {
        setIsCustomPemilik(true)
        setPemilikRisiko(itemToEdit.pemilik_risiko)
      } else {
        setIsCustomPemilik(false)
        setPemilikRisiko(itemToEdit.pemilik_risiko || 'Kepala Daerah')
      }

      setSifatRisiko(itemToEdit.sifat_risiko || 'C')
      setUraianDampak(itemToEdit.uraian_dampak || '')
      setPihakTerkena(itemToEdit.pihak_terkena || '')
    } else {
      setIsCustomSasaran(false)
      setSelectedSasaranId(meta?.sasarans_from_2b?.[0]?.id || '')
      setSasaranKustom('')
      setIsCustomIndikator(false)
      setSelectedIndikatorId(meta?.sasarans_from_2b?.[0]?.indikators?.[0]?.id || '')
      setIndikatorKustom('')
      setKategoriRisiko('Risiko Strategis')
      setPernyataanRisiko('')

      setIsCustomPemilik(false)
      const defaultPemilik =
        masterPemilikList.find((p) => p.nama.toLowerCase() === 'kepala daerah')?.nama ||
        masterPemilikList[0]?.nama ||
        'Kepala Daerah'
      setPemilikRisiko(defaultPemilik)

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

  const pemilikOptions = useMemo(() => {
    return (meta?.pemilik_risiko_options || []).map((p) => ({
      value: p.nama,
      label: p.nama,
    }))
  }, [meta?.pemilik_risiko_options])

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

    if (!sifatRisiko) {
      toast.warning('Pilih sifat risiko.')
      return
    }

    try {
      setIsSubmitting(true)
      const payload = {
        sasaran_penilaian_id: isCustomSasaran ? null : selectedSasaranId || null,
        sasaran_kustom: isCustomSasaran ? sasaranKustom.trim() : null,
        indikator_penilaian_id: isCustomIndikator ? null : selectedIndikatorId || null,
        indikator_kustom: isCustomIndikator ? indikatorKustom.trim() : null,
        kategori_risiko: kategoriRisiko,
        pernyataan_risiko: pernyataanRisiko.trim(),
        pemilik_risiko: pemilikRisiko.trim() || 'Kepala Daerah',
        sifat_risiko: sifatRisiko,
        uraian_dampak: uraianDampak.trim() || null,
        pihak_terkena: pihakTerkena.trim() || null,
      }

      if (itemToEdit) {
        await risikoService.updateIdentifikasiPemdaItem(dokumenId, itemToEdit.id, payload)
        toast.success(`Risiko ${itemToEdit.kode_risiko} berhasil diperbarui.`)
      } else {
        await risikoService.storeIdentifikasiPemdaItem(dokumenId, payload)
        toast.success('Risiko strategis Pemda baru berhasil ditambahkan.')
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan butir risiko.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const kategoriOptions: KategoriRisikoPemda[] = [
    'Risiko Strategis',
    'Risiko Fraud',
    'Risiko Belanja',
    'Risiko Pendapatan',
    'Risiko Pembiayaan',
    'Risiko Kepatuhan',
    'Risiko Operasional',
    'Risiko Reputasi',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <DialogTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
            <Plus className='h-4 w-4 text-primary' />
            {itemToEdit ? `Ubah Risiko ${itemToEdit.kode_risiko}` : 'Tambah Risiko Strategis Pemda (Form 3A)'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {itemToEdit
              ? 'Perbarui parameter risiko strategis Pemda. Kode risiko akan disesuaikan otomatis.'
              : 'Data sasaran dan indikator dapat diambil langsung dari Form 2B yang telah Anda tetapkan.'}
          </DialogDescription>
        </DialogHeader>

        <form id='identifikasi-pemda-form' onSubmit={handleSubmit} className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-3.5 text-xs'>
            {/* 1. Sasaran Strategis */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>
                  Sasaran Strategis <span className='text-destructive'>*</span>
                </Label>
                <button
                  type='button'
                  onClick={() => setIsCustomSasaran(!isCustomSasaran)}
                  className='text-[11px] text-primary hover:underline'
                >
                  {isCustomSasaran ? 'â† Pilih dari Form 2B' : '+ Input Sasaran Kustom'}
                </button>
              </div>

              {isCustomSasaran ? (
                <Input
                  value={sasaranKustom}
                  onChange={(e) => setSasaranKustom(e.target.value)}
                  placeholder='Ketik uraian sasaran strategis kustom...'
                  className='text-xs'
                />
              ) : (
                <SearchableSelect
                  options={sasaranOptions}
                  value={selectedSasaranId}
                  onValueChange={handleSasaranChange}
                  placeholder='Pilih Sasaran dari Form 2B...'
                  className='text-xs'
                />
              )}
            </div>

            {/* 2. Indikator Kinerja */}
            <div className='space-y-1.5'>
              <div className='flex items-center justify-between'>
                <Label className='text-xs font-semibold'>
                  Indikator Kinerja <span className='text-destructive'>*</span>
                </Label>
                <button
                  type='button'
                  onClick={() => setIsCustomIndikator(!isCustomIndikator)}
                  className='text-[11px] text-primary hover:underline'
                >
                  {isCustomIndikator ? 'â† Pilih dari Form 2B' : '+ Input Indikator Kustom'}
                </button>
              </div>

              {isCustomIndikator ? (
                <Input
                  value={indikatorKustom}
                  onChange={(e) => setIndikatorKustom(e.target.value)}
                  placeholder='Ketik uraian indikator kinerja kustom...'
                  className='text-xs'
                />
              ) : (
                <SearchableSelect
                  options={indikatorOptions}
                  value={selectedIndikatorId}
                  onValueChange={(val: string) => setSelectedIndikatorId(val)}
                  placeholder={
                    indikatorOptions.length > 0
                      ? 'Pilih Indikator dari Sasaran 2B...'
                      : 'Belum ada indikator pada sasaran ini'
                  }
                  disabled={indikatorOptions.length === 0}
                  className='text-xs'
                />
              )}
            </div>

          {/* 3. Kategori Risiko & Pemilik */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0'>
            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='kategori-risiko' className='text-xs font-semibold'>
                Kategori Risiko <span className='text-destructive'>*</span>
              </Label>
              <Select
                value={kategoriRisiko}
                onValueChange={(val) => setKategoriRisiko(val as KategoriRisikoPemda)}
              >
                <SelectTrigger id='kategori-risiko' className='text-xs'>
                  <SelectValue placeholder='Pilih Kategori...' />
                </SelectTrigger>
                <SelectContent>
                  {kategoriOptions.map((opt) => (
                    <SelectItem key={opt} value={opt} className='text-xs'>
                      {opt}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-1.5 min-w-0'>
              <div className='flex items-center justify-between gap-1'>
                <Label htmlFor='pemilik-risiko' className='text-xs font-semibold truncate'>
                  Pemilik Risiko <span className='text-destructive'>*</span>
                </Label>
                {pemilikOptions.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setIsCustomPemilik(!isCustomPemilik)}
                    className='text-[10px] text-primary hover:underline shrink-0'
                  >
                    {isCustomPemilik ? 'Pilih dari Master Data' : 'Input Manual / Kustom'}
                  </button>
                )}
              </div>
              {!isCustomPemilik && pemilikOptions.length > 0 ? (
                <Select value={pemilikRisiko} onValueChange={setPemilikRisiko}>
                  <SelectTrigger id='pemilik-risiko' className='text-xs h-9'>
                    <SelectValue placeholder='Pilih Pemilik Risiko' />
                  </SelectTrigger>
                  <SelectContent>
                    {pemilikOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className='text-xs'>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id='pemilik-risiko'
                  value={pemilikRisiko}
                  onChange={(e) => setPemilikRisiko(e.target.value)}
                  placeholder='Kepala Daerah'
                  className='text-xs h-9'
                />
              )}
            </div>
          </div>

          {/* 4. Pernyataan Risiko */}
          <div className='space-y-1.5 min-w-0'>
            <Label htmlFor='pernyataan-risiko' className='text-xs font-semibold'>
              Uraian / Pernyataan Risiko <span className='text-destructive'>*</span>
            </Label>
            <Textarea
              id='pernyataan-risiko'
              rows={3}
              value={pernyataanRisiko}
              onChange={(e) => setPernyataanRisiko(e.target.value)}
              placeholder='Jelaskan peristiwa atau kejadian yang berpotensi menghambat sasaran strategis Pemda...'
              className='text-xs resize-none'
            />
          </div>

          {/* 5. Sifat Risiko (C / UC) */}
          <div className='space-y-1.5 p-2.5 rounded-lg border bg-muted/20 min-w-0'>
            <Label className='text-xs font-semibold block'>
              Sifat Risiko (Dapat Dikendalikan / Tidak) <span className='text-destructive'>*</span>
            </Label>
            <RadioGroup
              value={sifatRisiko}
              onValueChange={(val) => setSifatRisiko(val as SifatRisiko)}
              className='flex flex-wrap items-center gap-4 sm:gap-6 pt-1'
            >
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='C' id='sifat-c' />
                <Label htmlFor='sifat-c' className='text-xs cursor-pointer font-medium'>
                  <span className='font-bold text-emerald-700 dark:text-emerald-400'>C</span> - Controllable (Dapat Dikendalikan)
                </Label>
              </div>
              <div className='flex items-center space-x-2'>
                <RadioGroupItem value='UC' id='sifat-uc' />
                <Label htmlFor='sifat-uc' className='text-xs cursor-pointer font-medium'>
                  <span className='font-bold text-amber-700 dark:text-amber-400'>UC</span> - Uncontrollable (Di Luar Kendali)
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* 6. Uraian Dampak & Pihak Terkena */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0'>
            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='uraian-dampak' className='text-xs font-semibold'>
                Uraian Dampak Risiko
              </Label>
              <Textarea
                id='uraian-dampak'
                rows={2}
                value={uraianDampak}
                onChange={(e) => setUraianDampak(e.target.value)}
                placeholder='Jelaskan konsekuensi negatif jika risiko terjadi...'
                className='text-xs resize-none'
              />
            </div>

            <div className='space-y-1.5 min-w-0'>
              <Label htmlFor='pihak-terkena' className='text-xs font-semibold'>
                Pihak yang Terkena Dampak
              </Label>
              <Textarea
                id='pihak-terkena'
                rows={2}
                value={pihakTerkena}
                onChange={(e) => setPihakTerkena(e.target.value)}
                placeholder='Contoh: Pemda, Dinas PUTR, Masyarakat'
                className='text-xs resize-none'
              />
            </div>
          </div>
        </form>

        <DialogFooter className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            className='text-xs'
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='identifikasi-pemda-form'
            size='sm'
            disabled={isSubmitting || !pernyataanRisiko.trim()}
            className='text-xs gap-1.5 font-semibold'
          >
            {isSubmitting ? (
              <Loader2 className='h-3 w-3 animate-spin' />
            ) : (
              <Save className='h-3.5 w-3.5' />
            )}
            {itemToEdit ? 'Simpan Perubahan' : 'Tambah Risiko'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
