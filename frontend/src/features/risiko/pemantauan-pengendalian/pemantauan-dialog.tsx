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

  function textField(
    key:
      | 'bentuk_pemantauan'
      | 'penanggung_jawab_pemantauan'
      | 'rencana_waktu_pemantauan'
      | 'realisasi_waktu_pemantauan'
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
          <DialogTitle>Rancangan Pemantauan atas Pengendalian Intern</DialogTitle>
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
              'bentuk_pemantauan',
              'Bentuk / Metode Pemantauan',
              'Contoh: Reviu Dokumen, Observasi Fisik Lapangan, Permintaan Keterangan, Pengujian Kepatuhan'
            )}
            {textField(
              'penanggung_jawab_pemantauan',
              'Penanggung Jawab Pemantauan',
              'Contoh: Irban Khusus, Tim Inspektorat Wilayah'
            )}
            {textField(
              'rencana_waktu_pemantauan',
              'Rencana Waktu Pemantauan',
              'Contoh: Triwulan I, Triwulan II, Triwulan III, Triwulan IV'
            )}
            {textField(
              'realisasi_waktu_pemantauan',
              'Realisasi Waktu Pemantauan (Opsional)',
              'Contoh: 20 Agustus 2026'
            )}
            {textField('keterangan', 'Keterangan (Opsional)')}
          </fieldset>

          <p className='text-xs text-muted-foreground'>
            Rancangan pemantauan ini akan ditinjau dan dievaluasi oleh Tim
            Auditor APIP / Inspektorat.
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
