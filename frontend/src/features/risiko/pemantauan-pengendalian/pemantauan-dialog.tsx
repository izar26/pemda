import { useState, type FormEvent } from 'react'
import { Eye, Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { RiskContextCard } from '../shared/modal/risk-context-card'
import type { PemantauanInput, PemantauanRow } from './api'

interface Props {
  row: PemantauanRow
  canEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: (data: PemantauanInput) => void
}

export function PemantauanDialog({
  row,
  canEdit,
  saving,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<PemantauanInput>({
    bentuk_pemantauan: row.bentuk_pemantauan,
    penanggung_jawab_pemantauan:
      row.penanggung_jawab_pemantauan || 'Irban Khusus',
    rencana_waktu_pemantauan: row.rencana_waktu_pemantauan,
    realisasi_waktu_pemantauan: row.realisasi_waktu_pemantauan,
    keterangan: row.keterangan,
  })

  function submit(e: FormEvent) {
    e.preventDefault()
    if (canEdit && !saving) onSave(data)
  }

  const disabled = !canEdit || saving

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-4 sm:px-6 py-4 border-b shrink-0'>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'>
            <Eye className='h-4 w-4 text-primary' />
            Rancangan Pemantauan atas Pengendalian Intern (Form 9)
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Dokumentasikan metode/bentuk pemantauan, penanggung jawab (Inspektorat / Pengawas),
            serta target dan realisasi waktu pelaksanaan pemantauan.
          </DialogDescription>
        </DialogHeader>

        <form id='pemantauan-dialog-form' onSubmit={submit} className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-4'>
          {!canEdit && (
            <p className='rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground'>
              Rancangan pemantauan pengendalian ini hanya dapat dilihat.
            </p>
          )}

          {/* Kartu Konteks Risiko Standar */}
          <RiskContextCard
            source={row.source}
            kodeRisiko={row.kode_risiko}
            pernyataanRisiko={row.pernyataan_risiko}
            kategoriRisiko={row.kategori_risiko}
            pemilikRisiko={row.pemilik_risiko}
            extraItems={[
              {
                label: 'Rencana Tindak (Form 6)',
                value: row.rencana_tindak || 'Belum ada rencana tindak',
              },
            ]}
          />

          <fieldset disabled={disabled} className='space-y-3.5'>
            <div className='space-y-1.5'>
              <Label htmlFor='bentuk_pemantauan' className='text-xs font-semibold'>
                Bentuk / Metode Pemantauan
              </Label>
              <Input
                id='bentuk_pemantauan'
                aria-label='Bentuk / Metode Pemantauan'
                placeholder='Contoh: Reviu Dokumen, Observasi Fisik Lapangan, Permintaan Keterangan, Pengujian Kepatuhan'
                value={data.bentuk_pemantauan || ''}
                className='text-xs'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    bentuk_pemantauan: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='penanggung_jawab_pemantauan' className='text-xs font-semibold'>
                Penanggung Jawab Pemantauan
              </Label>
              <Input
                id='penanggung_jawab_pemantauan'
                aria-label='Penanggung Jawab Pemantauan'
                placeholder='Contoh: Irban Wilayah II / Tim Audit Investigasi'
                value={data.penanggung_jawab_pemantauan || ''}
                className='text-xs'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    penanggung_jawab_pemantauan: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='rencana_waktu_pemantauan' className='text-xs font-semibold'>
                  Rencana Waktu Pemantauan
                </Label>
                <Input
                  id='rencana_waktu_pemantauan'
                  aria-label='Rencana Waktu Pemantauan'
                  placeholder='Contoh: Triwulan III 2026'
                  value={data.rencana_waktu_pemantauan || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      rencana_waktu_pemantauan: e.target.value || null,
                    }))
                  }
                />
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='realisasi_waktu_pemantauan' className='text-xs font-semibold'>
                  Realisasi Waktu Pemantauan (Opsional)
                </Label>
                <Input
                  id='realisasi_waktu_pemantauan'
                  aria-label='Realisasi Waktu Pemantauan (Opsional)'
                  placeholder='Contoh: 20 Agustus 2026'
                  value={data.realisasi_waktu_pemantauan || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      realisasi_waktu_pemantauan: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='keterangan' className='text-xs font-semibold'>
                Keterangan Tambahan / Hasil Pemantauan (Opsional)
              </Label>
              <Textarea
                id='keterangan'
                aria-label='Keterangan (Opsional)'
                placeholder='Catatan hasil observasi berkala atau tindak lanjut rekomendasi...'
                value={data.keterangan || ''}
                maxLength={5000}
                className='text-xs min-h-[60px]'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    keterangan: e.target.value || null,
                  }))
                }
              />
            </div>
          </fieldset>

          <p className='text-xs text-muted-foreground'>
            Rancangan pemantauan dapat disimpan bertahap sebelum masa evaluasi berjalan.
          </p>

        </form>

        <DialogFooter className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={onClose}
            disabled={saving}
          >
            {canEdit ? 'Batal' : 'Tutup'}
          </Button>
          {canEdit && (
            <Button
              type='submit'
              form='pemantauan-dialog-form'
              size='sm'
              disabled={saving}
              className='gap-1.5'
            >
              {saving ? (
                <Loader2 className='h-3.5 w-3.5 animate-spin' />
              ) : (
                <Save className='h-3.5 w-3.5' />
              )}
              {saving ? 'Menyimpan...' : 'Simpan'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
