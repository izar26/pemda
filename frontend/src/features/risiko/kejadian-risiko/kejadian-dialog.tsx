import { useState, useEffect } from 'react'
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
import { Badge } from '@/components/ui/badge'
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

  const handleRiskChange = (compoundValue: string) => {
    if (!compoundValue) {
      setSelectedRiskId('')
      return
    }
    const [source, id] = compoundValue.split(':') as [RiskSourceType, string]
    setSelectedSource(source)
    setSelectedRiskId(id)
  }

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
      <DialogContent className='max-h-[90vh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? 'Ubah Catatan Kejadian Risiko'
              : 'Tambah Catatan Kejadian Risiko'}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? 'Perbarui data peristiwa risiko nyata dan realisasi pelaksanaan RTP.'
              : 'Catat peristiwa risiko nyata tahun berjalan dan realisasi pelaksanaan RTP.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className='space-y-4'>
          {/* Pilih Risiko Teridentifikasi */}
          <div className='space-y-1.5'>
            <Label htmlFor='risk-select' className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Risiko yang Teridentifikasi (3A / 3B / 3C) *
            </Label>
            <select
              id='risk-select'
              className='h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring'
              value={selectedRiskId ? `${selectedSource}:${selectedRiskId}` : ''}
              onChange={(e) => handleRiskChange(e.target.value)}
              disabled={Boolean(initialData) || isLoading}
              required
            >
              <option value=''>-- Pilih Risiko --</option>
              <optgroup label='Risiko Strategis Pemda (Form 3A)'>
                {riskOptions
                  .filter((r) => r.source_type === '3a')
                  .map((r) => (
                    <option key={`3a:${r.id}`} value={`3a:${r.id}`}>
                      [{r.kode_risiko}] {r.pernyataan_risiko}
                    </option>
                  ))}
              </optgroup>
              <optgroup label='Risiko Strategis OPD (Form 3B)'>
                {riskOptions
                  .filter((r) => r.source_type === '3b')
                  .map((r) => (
                    <option key={`3b:${r.id}`} value={`3b:${r.id}`}>
                      [{r.kode_risiko}] {r.pernyataan_risiko}
                    </option>
                  ))}
              </optgroup>
              <optgroup label='Risiko Operasional OPD (Form 3C)'>
                {riskOptions
                  .filter((r) => r.source_type === '3c')
                  .map((r) => (
                    <option key={`3c:${r.id}`} value={`3c:${r.id}`}>
                      [{r.kode_risiko}] {r.pernyataan_risiko}
                    </option>
                  ))}
              </optgroup>
            </select>
          </div>

          {/* Card Info Risiko Terpilih & RTP Form 6 */}
          {selectedRisk && (
            <div className='rounded-lg border bg-muted/40 p-3 text-xs sm:text-sm space-y-2'>
              <div className='flex items-center gap-2'>
                <Badge variant='secondary' className='text-[10px] uppercase'>
                  {selectedRisk.source_type === '3a'
                    ? '3A - Pemda'
                    : selectedRisk.source_type === '3b'
                      ? '3B - Strategis OPD'
                      : '3C - Operasional'}
                </Badge>
                <span className='font-mono font-semibold'>{selectedRisk.kode_risiko}</span>
              </div>
              <p className='font-medium text-foreground'>{selectedRisk.pernyataan_risiko}</p>

              {/* Tautan Otomatis Form 6 RTP */}
              <div className='pt-2 border-t border-border grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs'>
                <div>
                  <span className='text-muted-foreground block'>Rencana Tindak (Form 6):</span>
                  <span className='font-medium'>
                    {selectedRisk.rencana_tindak || (
                      <em className='text-muted-foreground font-normal'>Tidak ada RTP</em>
                    )}
                  </span>
                </div>
                <div>
                  <span className='text-muted-foreground block'>Target Waktu (Form 6):</span>
                  <span className='font-medium'>
                    {selectedRisk.target_waktu || (
                      <em className='text-muted-foreground font-normal'>-</em>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tanggal Terjadi */}
          <div className='space-y-1.5'>
            <Label htmlFor='tanggal-kejadian'>Tanggal Terjadi *</Label>
            <Input
              id='tanggal-kejadian'
              type='date'
              value={tanggalKejadian}
              onChange={(e) => setTanggalKejadian(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Sebab Nyata */}
          <div className='space-y-1.5'>
            <Label htmlFor='sebab-nyata'>Sebab Kejadian Nyata *</Label>
            <Textarea
              id='sebab-nyata'
              rows={3}
              placeholder='Uraikan penyebab konkret terjadinya peristiwa risiko ini...'
              value={sebab}
              onChange={(e) => setSebab(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Dampak Nyata */}
          <div className='space-y-1.5'>
            <Label htmlFor='dampak-nyata'>Dampak Nyata yang Terjadi *</Label>
            <Textarea
              id='dampak-nyata'
              rows={3}
              placeholder='Uraikan kerugian, gangguan layanan, atau dampak nyata yang timbul...'
              value={dampak}
              onChange={(e) => setDampak(e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          {/* Keterangan Kejadian */}
          <div className='space-y-1.5'>
            <Label htmlFor='keterangan-kejadian'>Keterangan Tambahan Kejadian (Opsional)</Label>
            <Textarea
              id='keterangan-kejadian'
              rows={2}
              placeholder='Catatan situasi, langkah darurat, atau informasi tambahan...'
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Kolom Realisasi Pelaksanaan RTP (Jika memiliki RTP atau risiko 3B/3C) */}
          <div className='rounded-lg border p-3 space-y-3 bg-card'>
            <h4 className='text-xs font-semibold uppercase tracking-wider text-muted-foreground'>
              Realisasi Pelaksanaan RTP (Rencana Tindak Pengendalian)
            </h4>
            <div className='space-y-1.5'>
              <Label htmlFor='realisasi-waktu-rtp'>Realisasi Waktu Pelaksanaan RTP</Label>
              <Input
                id='realisasi-waktu-rtp'
                placeholder='Contoh: Juni 2026 / Triwulan II'
                value={realisasiWaktuRtp}
                onChange={(e) => setRealisasiWaktuRtp(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='keterangan-rtp'>Keterangan Pelaksanaan RTP</Label>
              <Textarea
                id='keterangan-rtp'
                rows={2}
                placeholder='Catatan pelaksanaan tindak pengendalian nyata di lapangan...'
                value={keteranganRtp}
                onChange={(e) => setKeteranganRtp(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button type='button' variant='outline' onClick={onClose} disabled={isLoading}>
              Batal
            </Button>
            <Button type='submit' disabled={!isFormValid || isLoading}>
              {isLoading ? 'Menyimpan...' : 'Simpan Kejadian Risiko'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
