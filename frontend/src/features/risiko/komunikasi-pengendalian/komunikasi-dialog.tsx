import { useState, type FormEvent } from 'react'
import { Loader2, Radio, Save } from 'lucide-react'
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
import type { KomunikasiInput, KomunikasiRow } from './api'

interface Props {
  row: KomunikasiRow
  canEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: (data: KomunikasiInput) => void
}

export function KomunikasiDialog({
  row,
  canEdit,
  saving,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<KomunikasiInput>({
    media_komunikasi: row.media_komunikasi,
    penyedia_informasi: row.penyedia_informasi,
    penerima_informasi: row.penerima_informasi,
    rencana_waktu: row.rencana_waktu || row.target_waktu || null,
    realisasi_waktu: row.realisasi_waktu,
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
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'>
            <Radio className='h-4 w-4 text-primary' />
            Pengkomunikasian Pengendalian yang Dibangun (Form 8)
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Dokumentasikan media komunikasi, pihak penyedia dan penerima
            informasi, serta rencana dan realisasi waktu pengkomunikasian.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className='space-y-4'>
          {!canEdit && (
            <p className='rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground'>
              Data pengkomunikasian pengendalian ini hanya dapat dilihat.
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
              <Label htmlFor='media_komunikasi' className='text-xs font-semibold'>
                Media Komunikasi
              </Label>
              <Input
                id='media_komunikasi'
                aria-label='Media Komunikasi'
                placeholder='Contoh: Rapat koordinasi berkala, Nota dinas, Surat edaran, Sosialisasi'
                value={data.media_komunikasi || ''}
                className='text-xs'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    media_komunikasi: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='penyedia_informasi' className='text-xs font-semibold'>
                  Pihak Terkait: Penyedia Informasi
                </Label>
                <Input
                  id='penyedia_informasi'
                  aria-label='Pihak Terkait: Penyedia Informasi'
                  placeholder='Contoh: PPTK, Tenaga Ahli, Kasie Teknis'
                  value={data.penyedia_informasi || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      penyedia_informasi: e.target.value || null,
                    }))
                  }
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='penerima_informasi' className='text-xs font-semibold'>
                  Pihak Terkait: Penerima Informasi
                </Label>
                <Input
                  id='penerima_informasi'
                  aria-label='Pihak Terkait: Penerima Informasi'
                  placeholder='Contoh: Kepala Dinas, PPK, Tim Pelaksana'
                  value={data.penerima_informasi || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      penerima_informasi: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='rencana_waktu' className='text-xs font-semibold'>
                  Rencana Waktu Pengkomunikasian
                </Label>
                <Input
                  id='rencana_waktu'
                  aria-label='Rencana Waktu Pengkomunikasian'
                  placeholder='Contoh: Triwulan II 2026'
                  value={data.rencana_waktu || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      rencana_waktu: e.target.value || null,
                    }))
                  }
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='realisasi_waktu' className='text-xs font-semibold'>
                  Realisasi Waktu (Opsional)
                </Label>
                <Input
                  id='realisasi_waktu'
                  aria-label='Realisasi Waktu Pengkomunikasian (Opsional)'
                  placeholder='Contoh: 15 Mei 2026'
                  value={data.realisasi_waktu || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      realisasi_waktu: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='keterangan' className='text-xs font-semibold'>
                Keterangan Tambahan (Opsional)
              </Label>
              <Textarea
                id='keterangan'
                aria-label='Keterangan (Opsional)'
                placeholder='Catatan pelaksanaan atau dokumen pendukung pengkomunikasian...'
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
            Data dapat disimpan sebagai draf sebelum lengkap.
          </p>

          <DialogFooter className='border-t pt-3'>
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
              <Button type='submit' size='sm' disabled={saving} className='gap-1.5'>
                {saving ? (
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                ) : (
                  <Save className='h-3.5 w-3.5' />
                )}
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
