import { useState, useEffect } from 'react'
import { AlertOctagon, Loader2, Save } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RiskContextCard } from '../shared/modal/risk-context-card'
import type {
  KejadianRisikoInput,
  KejadianRisikoRow,
  RiskOptionItem,
  RiskSourceType,
} from './types'

interface KejadianDialogProps {
  isOpen: boolean
  onClose: () => void
  initialData?: KejadianRisikoRow | null
  riskOptions: RiskOptionItem[]
  onSubmit: (data: KejadianRisikoInput) => void
  isLoading: boolean
  opdId: string
  periodeId: string
}

export function KejadianDialog({
  isOpen,
  onClose,
  initialData,
  riskOptions,
  onSubmit,
  isLoading,
  opdId,
  periodeId,
}: KejadianDialogProps) {
  const [selectedRiskId, setSelectedRiskId] = useState<string>('')
  const [selectedSource, setSelectedSource] = useState<RiskSourceType>('3b')
  const [tanggalKejadian, setTanggalKejadian] = useState<string>('')
  const [sebab, setSebab] = useState<string>('')
  const [dampak, setDampak] = useState<string>('')
  const [keterangan, setKeterangan] = useState<string>('')
  const [realisasiWaktuRtp, setRealisasiWaktuRtp] = useState<string>('')
  const [keteranganRtp, setKeteranganRtp] = useState<string>('')

  useEffect(() => {
    if (initialData) {
      setSelectedRiskId(initialData.risk_item_id || '')
      setSelectedSource(initialData.source_type)
      setTanggalKejadian(initialData.tanggal_kejadian || '')
      setSebab(initialData.sebab || '')
      setDampak(initialData.dampak || '')
      setKeterangan(initialData.keterangan || '')
      setRealisasiWaktuRtp(initialData.realisasi_waktu_rtp || '')
      setKeteranganRtp(initialData.keterangan_rtp || '')
    } else {
      setSelectedRiskId('')
      setSelectedSource('3b')
      setTanggalKejadian(new Date().toISOString().split('T')[0])
      setSebab('')
      setDampak('')
      setKeterangan('')
      setRealisasiWaktuRtp('')
      setKeteranganRtp('')
    }
  }, [initialData, isOpen])

  const selectedRisk = riskOptions.find(
    (item) =>
      item.id === selectedRiskId && item.source_type === selectedSource
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRiskId || !tanggalKejadian || !sebab.trim() || !dampak.trim()) {
      return
    }

    onSubmit({
      opd_id: opdId,
      periode_penilaian_id: periodeId,
      source_type: selectedSource,
      risk_item_id: selectedRiskId,
      tanggal_kejadian: tanggalKejadian,
      sebab: sebab.trim(),
      dampak: dampak.trim(),
      keterangan: keterangan.trim() || null,
      realisasi_waktu_rtp: realisasiWaktuRtp.trim() || null,
      keterangan_rtp: keteranganRtp.trim() || null,
    })
  }

  const isFormValid =
    Boolean(selectedRiskId) &&
    Boolean(tanggalKejadian) &&
    Boolean(sebab.trim()) &&
    Boolean(dampak.trim())

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-4 sm:px-6 py-4 border-b shrink-0'>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'>
            <AlertOctagon className='h-4 w-4 text-primary' />
            {initialData
              ? 'Ubah Catatan Kejadian Risiko (Form 10)'
              : 'Tambah Catatan Kejadian Risiko (Form 10)'}
          </DialogTitle>
          <DialogDescription className='text-xs'>
            {initialData
              ? 'Perbarui data peristiwa risiko nyata dan realisasi pelaksanaan RTP.'
              : 'Catat peristiwa risiko nyata tahun berjalan dan realisasi pelaksanaan RTP.'}
          </DialogDescription>
        </DialogHeader>

        <form id='kejadian-dialog-form' onSubmit={handleSubmit} className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-4'>
          {/* 1. Pilih Risiko Teridentifikasi */}
          <div className='space-y-1.5'>
            <Label htmlFor='risk-select' className='text-xs font-semibold'>
              Risiko yang Teridentifikasi (3A / 3B / 3C) <span className='text-destructive'>*</span>
            </Label>
            <Select
              value={selectedRiskId ? `${selectedSource}:${selectedRiskId}` : '__none'}
              onValueChange={(val) => {
                if (val === '__none') {
                  setSelectedRiskId('')
                  return
                }
                const [source, id] = val.split(':') as [RiskSourceType, string]
                setSelectedSource(source)
                setSelectedRiskId(id)
              }}
              disabled={Boolean(initialData) || isLoading}
            >
              <SelectTrigger
                id='risk-select'
                aria-label='Risiko yang Teridentifikasi (3A / 3B / 3C) *'
                className='w-full text-xs'
              >
                <SelectValue placeholder='-- Pilih Risiko Teridentifikasi --' />
              </SelectTrigger>
              <SelectContent className='max-h-60'>
                <SelectItem value='__none' className='text-xs'>
                  -- Pilih Risiko Teridentifikasi --
                </SelectItem>
                {riskOptions.some((r) => r.source_type === '3a') && (
                  <SelectGroup>
                    <SelectLabel className='text-[11px] font-bold text-muted-foreground'>
                      Risiko Strategis Pemda (Form 3A)
                    </SelectLabel>
                    {riskOptions
                      .filter((r) => r.source_type === '3a')
                      .map((r) => (
                        <SelectItem key={`3a:${r.id}`} value={`3a:${r.id}`} className='text-xs'>
                          [{r.kode_risiko}] {r.pernyataan_risiko}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
                {riskOptions.some((r) => r.source_type === '3b') && (
                  <SelectGroup>
                    <SelectLabel className='text-[11px] font-bold text-muted-foreground'>
                      Risiko Strategis OPD (Form 3B)
                    </SelectLabel>
                    {riskOptions
                      .filter((r) => r.source_type === '3b')
                      .map((r) => (
                        <SelectItem key={`3b:${r.id}`} value={`3b:${r.id}`} className='text-xs'>
                          [{r.kode_risiko}] {r.pernyataan_risiko}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
                {riskOptions.some((r) => r.source_type === '3c') && (
                  <SelectGroup>
                    <SelectLabel className='text-[11px] font-bold text-muted-foreground'>
                      Risiko Operasional OPD (Form 3C)
                    </SelectLabel>
                    {riskOptions
                      .filter((r) => r.source_type === '3c')
                      .map((r) => (
                        <SelectItem key={`3c:${r.id}`} value={`3c:${r.id}`} className='text-xs'>
                          [{r.kode_risiko}] {r.pernyataan_risiko}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Kartu Konteks Risiko Standar */}
          {selectedRisk && (
            <RiskContextCard
              source={selectedRisk.source_type}
              kodeRisiko={selectedRisk.kode_risiko}
              pernyataanRisiko={selectedRisk.pernyataan_risiko}
              kategoriRisiko={selectedRisk.kategori_risiko}
              pemilikRisiko={selectedRisk.pemilik_risiko}
              extraItems={[
                {
                  label: 'Rencana Tindak (RTP Form 6)',
                  value: selectedRisk.rencana_tindak || 'Belum ada RTP terdaftar',
                },
                {
                  label: 'Target Waktu RTP',
                  value: selectedRisk.target_waktu || '-',
                },
              ]}
            />
          )}

          {/* 3. Detail Peristiwa Kejadian Nyata */}
          <div className='rounded-lg border bg-muted/20 p-3 space-y-3.5'>
            <h4 className='text-xs font-semibold text-foreground'>
              Peristiwa Kejadian Nyata di Lapangan
            </h4>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='tanggal-kejadian' className='text-xs font-semibold'>
                  Tanggal Terjadi <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='tanggal-kejadian'
                  type='date'
                  aria-label='Tanggal Terjadi *'
                  value={tanggalKejadian}
                  onChange={(e) => setTanggalKejadian(e.target.value)}
                  disabled={isLoading}
                  className='text-xs'
                  required
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='sebab-kejadian' className='text-xs font-semibold'>
                  Sebab Kejadian Nyata <span className='text-destructive'>*</span>
                </Label>
                <Input
                  id='sebab-kejadian'
                  placeholder='Uraikan apa yang memicu kejadian ini...'
                  aria-label='Sebab Kejadian Nyata *'
                  value={sebab}
                  onChange={(e) => setSebab(e.target.value)}
                  disabled={isLoading}
                  className='text-xs'
                  required
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='dampak-kejadian' className='text-xs font-semibold'>
                Dampak Nyata yang Terjadi <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='dampak-kejadian'
                rows={2}
                placeholder='Uraikan konsekuensi kerugian finansial, reputasi, atau gangguan layanan...'
                aria-label='Dampak Nyata yang Terjadi *'
                value={dampak}
                onChange={(e) => setDampak(e.target.value)}
                disabled={isLoading}
                className='text-xs min-h-[60px]'
                required
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='keterangan-kejadian' className='text-xs font-semibold'>
                Keterangan Tambahan / Penanganan Awal (Opsional)
              </Label>
              <Textarea
                id='keterangan-kejadian'
                rows={2}
                placeholder='Tindakan tanggap darurat yang segera diambil...'
                value={keterangan}
                onChange={(e) => setKeterangan(e.target.value)}
                disabled={isLoading}
                className='text-xs min-h-[50px]'
              />
            </div>
          </div>

          {/* 4. Realisasi Pelaksanaan RTP (Form 6) */}
          <div className='rounded-lg border bg-muted/20 p-3 space-y-3.5'>
            <div>
              <h4 className='text-xs font-semibold text-foreground'>
                Realisasi Rencana Tindak Pengendalian (RTP)
              </h4>
              <p className='text-[11px] text-muted-foreground'>
                Pantau apakah rencana tindak yang disusun pada Form 6 telah benar-benar direalisasikan saat kejadian muncul.
              </p>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='realisasi-waktu-rtp' className='text-xs font-semibold'>
                Realisasi Waktu Pelaksanaan RTP
              </Label>
              <Input
                id='realisasi-waktu-rtp'
                placeholder='Contoh: Juni 2026, 15 Juli 2026, atau Masih Dalam Proses'
                value={realisasiWaktuRtp}
                onChange={(e) => setRealisasiWaktuRtp(e.target.value)}
                disabled={isLoading}
                className='text-xs'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='keterangan-rtp' className='text-xs font-semibold'>
                Keterangan Pelaksanaan RTP
              </Label>
              <Textarea
                id='keterangan-rtp'
                rows={2}
                placeholder='Catatan pelaksanaan tindak pengendalian nyata di lapangan...'
                value={keteranganRtp}
                onChange={(e) => setKeteranganRtp(e.target.value)}
                disabled={isLoading}
                className='text-xs min-h-[50px]'
              />
            </div>
          </div>

        </form>

        <DialogFooter className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type='submit'
            form='kejadian-dialog-form'
            size='sm'
            disabled={!isFormValid || isLoading}
            className='gap-1.5'
          >
            {isLoading ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Save className='h-3.5 w-3.5' />
            )}
            <span>{isLoading ? 'Menyimpan...' : 'Simpan Kejadian Risiko'}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
