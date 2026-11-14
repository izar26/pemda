import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  function textField(
    key:
      | 'media_komunikasi'
      | 'penyedia_informasi'
      | 'penerima_informasi'
      | 'rencana_waktu'
      | 'realisasi_waktu'
      | 'keterangan',
    label: string,
    placeholder?: string
  ) {
    return (
      <div className='space-y-1'>
        <Label htmlFor={key}>{label}</Label>
        <Textarea
          id={key}
          value={data[key] || ''}
          maxLength={5000}
          placeholder={placeholder}
          onChange={(e) =>
            setData((prev) => ({ ...prev, [key]: e.target.value || null }))
          }
        />
      </div>
    )
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (canEdit && !saving) onSave(data)
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !saving) onClose()
      }}
    >
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'>
        <DialogHeader>
          <DialogTitle>Pengkomunikasian Pengendalian yang Dibangun</DialogTitle>
          <DialogDescription>
            {row.kode_risiko} · {row.pernyataan_risiko}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className='space-y-4'>
          <div className='rounded-md bg-muted p-3 text-sm space-y-1'>
            <p className='font-semibold'>Rencana Tindak (Form 6):</p>
            <p className='text-muted-foreground'>
              {row.rencana_tindak || 'Belum ada'}
            </p>
          </div>

          <fieldset disabled={!canEdit || saving} className='space-y-3'>
            {textField(
              'media_komunikasi',
              'Media Komunikasi',
              'Contoh: Rapat koordinasi berkala, Nota dinas, Surat edaran, Sosialisasi'
            )}
            {textField(
              'penyedia_informasi',
              'Pihak Terkait: Penyedia Informasi',
              'Contoh: PPTK, Tenaga Ahli, Kasie Teknis'
            )}
            {textField(
              'penerima_informasi',
              'Pihak Terkait: Penerima Informasi',
              'Contoh: Kepala Dinas, PPK, Tim Pelaksana'
            )}
            {textField(
              'rencana_waktu',
              'Rencana Waktu Pengkomunikasian',
              'Contoh: Triwulan II 2026'
            )}
            {textField(
              'realisasi_waktu',
              'Realisasi Waktu Pengkomunikasian (Opsional)',
              'Contoh: 15 Mei 2026'
            )}
            {textField('keterangan', 'Keterangan (Opsional)')}
          </fieldset>

          <p className='text-xs text-muted-foreground'>
            Data dapat disimpan sebagai draf sebelum lengkap.
          </p>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={onClose}
              disabled={saving}
            >
              Tutup
            </Button>
            {canEdit && (
              <Button type='submit' disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
