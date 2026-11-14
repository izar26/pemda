import { useState, type FormEvent } from 'react'
import { Loader2, Save, ShieldEllipsis } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { RiskContextCard } from '../shared/modal/risk-context-card'
import type { TindakInput, TindakRow } from './api'

interface Props {
  row: TindakRow
  canEdit: boolean
  saving: boolean
  onClose: () => void
  onSave: (data: TindakInput) => void
}

export function TindakDialog({
  row,
  canEdit,
  saving,
  onClose,
  onSave,
}: Props) {
  const [data, setData] = useState<TindakInput>({
    celah_pengendalian: row.celah_pengendalian,
    rencana_tindak: row.rencana_tindak,
    penanggung_jawab: row.penanggung_jawab,
    target_waktu: row.target_waktu,
    treated_kemungkinan: row.treated_kemungkinan,
    treated_dampak: row.treated_dampak,
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
            <ShieldEllipsis className='h-4 w-4 text-primary' />
            Rencana Tindak Pengendalian (Form 6)
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Isi celah pengendalian, rencana tindak perbaikan, penanggung jawab,
            target waktu, dan estimasi penurunan risiko (treated risk).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className='space-y-4'>
          {!canEdit && (
            <p className='rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground'>
              Rencana tindak pengendalian ini hanya dapat dilihat.
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
                label: 'Pengendalian yang Ada',
                value: row.pengendalian_uraian || 'Belum ada pengendalian',
              },
            ]}
          />

          <fieldset disabled={disabled} className='space-y-3.5'>
            <div className='space-y-1.5'>
              <Label htmlFor='celah_pengendalian' className='text-xs font-semibold'>
                Celah Pengendalian
              </Label>
              <Textarea
                id='celah_pengendalian'
                aria-label='Celah pengendalian'
                placeholder='Uraikan kelemahan atau celah pada pengendalian eksisting yang perlu diperbaiki...'
                value={data.celah_pengendalian || ''}
                maxLength={5000}
                className='text-xs min-h-[60px]'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    celah_pengendalian: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='rencana_tindak' className='text-xs font-semibold'>
                Rencana Tindak Pengendalian
              </Label>
              <Textarea
                id='rencana_tindak'
                aria-label='Rencana tindak pengendalian'
                placeholder='Uraikan langkah konkret atau kegiatan inovasi/perbaikan yang akan dilakukan...'
                value={data.rencana_tindak || ''}
                maxLength={5000}
                className='text-xs min-h-[70px]'
                onChange={(e) =>
                  setData((prev) => ({
                    ...prev,
                    rencana_tindak: e.target.value || null,
                  }))
                }
              />
            </div>

            <div className='grid gap-3 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='penanggung_jawab' className='text-xs font-semibold'>
                  Pemilik / Penanggung Jawab
                </Label>
                <Input
                  id='penanggung_jawab'
                  aria-label='Pemilik / penanggung jawab'
                  placeholder='Contoh: Kepala Bidang Bina Marga'
                  value={data.penanggung_jawab || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      penanggung_jawab: e.target.value || null,
                    }))
                  }
                />
              </div>

              <div className='space-y-1.5'>
                <Label htmlFor='target_waktu' className='text-xs font-semibold'>
                  Target Waktu Penyelesaian
                </Label>
                <Input
                  id='target_waktu'
                  aria-label='Target waktu penyelesaian'
                  placeholder='Contoh: Triwulan III 2026'
                  value={data.target_waktu || ''}
                  className='text-xs'
                  onChange={(e) =>
                    setData((prev) => ({
                      ...prev,
                      target_waktu: e.target.value || null,
                    }))
                  }
                />
              </div>
            </div>

            <div className='rounded-lg border bg-muted/20 p-3 space-y-3'>
              <div>
                <h4 className='text-xs font-semibold text-foreground'>
                  Estimasi Nilai Risiko Setelah Tindakan (Treated Risk)
                </h4>
                <p className='text-[11px] text-muted-foreground'>
                  Proyeksikan penurunan tingkat kemungkinan dan dampak setelah rencana tindak terlaksana.
                </p>
              </div>

              <div className='grid gap-3 sm:grid-cols-2'>
                <div className='space-y-1.5'>
                  <Label htmlFor='treated_kemungkinan' className='text-xs font-semibold'>
                    Kemungkinan Treated Risk
                  </Label>
                  <Select
                    value={data.treated_kemungkinan ? String(data.treated_kemungkinan) : '__clear'}
                    onValueChange={(val) =>
                      setData((prev) => ({
                        ...prev,
                        treated_kemungkinan: val === '__clear' ? null : Number(val),
                      }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger
                      id='treated_kemungkinan'
                      aria-label='Kemungkinan treated risk'
                      className='w-full text-xs'
                    >
                      <SelectValue placeholder='Pilih kemungkinan' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__clear' className='text-xs'>
                        Belum dipilih
                      </SelectItem>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <SelectItem key={v} value={String(v)} className='text-xs'>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className='space-y-1.5'>
                  <Label htmlFor='treated_dampak' className='text-xs font-semibold'>
                    Dampak Treated Risk
                  </Label>
                  <Select
                    value={data.treated_dampak ? String(data.treated_dampak) : '__clear'}
                    onValueChange={(val) =>
                      setData((prev) => ({
                        ...prev,
                        treated_dampak: val === '__clear' ? null : Number(val),
                      }))
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger
                      id='treated_dampak'
                      aria-label='Dampak treated risk'
                      className='w-full text-xs'
                    >
                      <SelectValue placeholder='Pilih dampak' />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='__clear' className='text-xs'>
                        Belum dipilih
                      </SelectItem>
                      {[1, 2, 3, 4, 5].map((v) => (
                        <SelectItem key={v} value={String(v)} className='text-xs'>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </fieldset>

          <p className='text-xs text-muted-foreground'>
            Draf dapat disimpan sebelum lengkap. Skala treated risk dihitung secara otomatis setelah penyimpanan.
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
                {saving ? 'Menyimpan...' : 'Simpan Rencana'}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
