import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { TindakInput, TindakRow } from './api'

interface Props { row: TindakRow; canEdit: boolean; saving: boolean; onClose: () => void; onSave: (data: TindakInput) => void }

export function TindakDialog({ row, canEdit, saving, onClose, onSave }: Props) {
  const [data, setData] = useState<TindakInput>({ celah_pengendalian: row.celah_pengendalian, rencana_tindak: row.rencana_tindak, penanggung_jawab: row.penanggung_jawab, target_waktu: row.target_waktu, treated_kemungkinan: row.treated_kemungkinan, treated_dampak: row.treated_dampak })
  function textField(key: 'celah_pengendalian' | 'rencana_tindak' | 'penanggung_jawab' | 'target_waktu', label: string) {
    return <div className='space-y-1'><Label htmlFor={key}>{label}</Label><Textarea id={key} value={data[key] || ''} maxLength={5000} onChange={(e) => setData((prev) => ({ ...prev, [key]: e.target.value || null }))} /></div>
  }
  function score(key: 'treated_kemungkinan' | 'treated_dampak', label: string) {
    return <div className='space-y-1'><Label htmlFor={key}>{label}</Label><select id={key} className='h-9 w-full rounded-md border bg-background px-2 text-sm' value={data[key] ?? ''} onChange={(e) => setData((prev) => ({ ...prev, [key]: e.target.value ? Number(e.target.value) : null }))}><option value=''>Belum dipilih</option>{[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}</select></div>
  }
  function submit(e: FormEvent) { e.preventDefault(); if (canEdit && !saving) onSave(data) }
  return <Dialog open onOpenChange={(open) => { if (!open && !saving) onClose() }}><DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-2xl'><DialogHeader><DialogTitle>Rencana Tindak Pengendalian</DialogTitle><DialogDescription>{row.kode_risiko} · {row.pernyataan_risiko}</DialogDescription></DialogHeader><form onSubmit={submit} className='space-y-4'>
    <p className='rounded-md bg-muted p-3 text-sm'>Pengendalian yang ada: {row.pengendalian_uraian || 'Belum ada'}</p>
    <fieldset disabled={!canEdit || saving} className='space-y-3'>{textField('celah_pengendalian', 'Celah pengendalian')}{textField('rencana_tindak', 'Rencana tindak pengendalian')}{textField('penanggung_jawab', 'Pemilik / penanggung jawab')}{textField('target_waktu', 'Target waktu penyelesaian')}<div className='grid gap-3 sm:grid-cols-2'>{score('treated_kemungkinan', 'Kemungkinan treated risk')}{score('treated_dampak', 'Dampak treated risk')}</div></fieldset>
    <p className='text-xs text-muted-foreground'>Draf dapat disimpan sebelum lengkap. Skala dihitung setelah penyimpanan.</p>
    <DialogFooter><Button type='button' variant='outline' onClick={onClose} disabled={saving}>Tutup</Button>{canEdit && <Button type='submit' disabled={saving}>{saving ? 'Menyimpan...' : 'Simpan'}</Button>}</DialogFooter>
  </form></DialogContent></Dialog>
}
