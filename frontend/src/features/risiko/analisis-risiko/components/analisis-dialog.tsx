import { useState, type FormEvent } from 'react'
import { ClipboardList, Loader2, Save } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { AnalisisData, AnalisisRow } from '../api'

const empty: AnalisisData = { kriteria_kemungkinan: null, inheren_kemungkinan: null, kriteria_dampak: null, inheren_dampak: null, pengendalian_ada: null, pengendalian_uraian: null, sub_unsur_spip_id: null, pengendalian_memadai: null, residual_kemungkinan: null, residual_dampak: null, residual_kriteria_kemungkinan: null, residual_kriteria_dampak: null, rencana_tindak: null }
const kemungkinan = ['Persentase Probabilitas (dlm 1 tahun)', 'Jumlah Frekuensi (dlm 1 tahun)']
const dampak = ['Kerugian negara', 'Penurunan reputasi', 'Penurunan kinerja', 'Gangguan terhadap layanan organisasi', 'Tuntutan hukum']

interface Props {
  row: AnalisisRow | null
  canEdit: boolean
  isSaving: boolean
  subUnsur: { id: string; nama: string }[]
  onClose: () => void
  onSave: (row: AnalisisRow, data: AnalisisData) => void
}

export function AnalisisDialog({ row, canEdit, isSaving, subUnsur, onClose, onSave }: Props) {
  const [form, setForm] = useState<AnalisisData>(() => row?.analysis ? { ...empty, ...row.analysis } : { ...empty })
  const disabled = !canEdit || isSaving
  function field<K extends keyof AnalisisData>(name: K, value: AnalisisData[K]) { setForm((prev) => ({ ...prev, [name]: value })) }
  function choose(label: string, value: string, options: { value: string; label: string }[], onChange: (value: string) => void, placeholder: string) {
    return <div className='min-w-0 space-y-1.5'><Label className='text-xs font-semibold'>{label}</Label><Select value={value} onValueChange={(next) => onChange(next === '__clear' ? '' : next)} disabled={disabled}><SelectTrigger aria-label={label} className='w-full text-xs'><SelectValue placeholder={placeholder} /></SelectTrigger><SelectContent><SelectItem value='__clear' className='text-xs'>Belum dipilih</SelectItem>{options.map((option) => <SelectItem key={option.value} value={option.value} className='text-xs'>{option.label}</SelectItem>)}</SelectContent></Select></div>
  }
  function criterion(label: string, name: 'kriteria_kemungkinan' | 'kriteria_dampak' | 'residual_kriteria_kemungkinan' | 'residual_kriteria_dampak', options: string[]) {
    return choose(label, form[name] || '', options.map((value) => ({ value, label: value })), (value) => field(name, value || null), 'Pilih kriteria')
  }
  function score(label: string, name: 'inheren_kemungkinan' | 'inheren_dampak' | 'residual_kemungkinan' | 'residual_dampak') {
    return choose(label, form[name]?.toString() || '', [1, 2, 3, 4, 5].map((value) => ({ value: String(value), label: String(value) })), (value) => field(name, value ? Number(value) : null), 'Pilih skor')
  }
  function boolField(label: string, name: 'pengendalian_ada' | 'pengendalian_memadai') {
    return choose(label, form[name] === null ? '' : form[name] ? 'yes' : 'no', [{ value: 'yes', label: name === 'pengendalian_ada' ? 'Ada' : 'Memadai' }, { value: 'no', label: name === 'pengendalian_ada' ? 'Belum ada' : 'Belum memadai' }], (value) => field(name, value ? value === 'yes' : null), 'Pilih')
  }
  function submit(event: FormEvent) { event.preventDefault(); if (row && canEdit && !isSaving) onSave(row, form) }

  return <Dialog open={Boolean(row)} onOpenChange={(open) => { if (!open && !isSaving) onClose() }}>
    <DialogContent className='max-h-[90dvh] overflow-y-auto p-4 sm:max-w-2xl sm:p-6'>
      <DialogHeader><DialogTitle className='flex items-center gap-2 text-sm font-bold sm:text-base'><ClipboardList className='h-4 w-4 text-primary' /> Analisis dan Evaluasi Risiko</DialogTitle><DialogDescription className='text-xs'>Nilai risiko sebelum dan setelah pengendalian yang sudah ada.</DialogDescription></DialogHeader>
      {row && <form onSubmit={submit} className='space-y-4'>
        {!canEdit && <p className='rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground'>Analisis ini hanya dapat dilihat.</p>}
        <div className='space-y-2 rounded-lg border bg-muted/40 p-3 text-xs'><div className='flex flex-wrap items-center gap-2'><Badge variant='secondary'>Form {row.source.toUpperCase()}</Badge><span className='break-all font-mono font-semibold'>{row.kode_risiko}</span><Badge variant='outline'>{row.kategori_risiko}</Badge></div><p className='break-words font-semibold leading-relaxed'>{row.pernyataan_risiko}</p><p className='text-muted-foreground'>Pemilik risiko: {row.pemilik_risiko || '-'}</p></div>
        <fieldset disabled={disabled} className='min-w-0 space-y-4'>
          <section className='space-y-3 rounded-lg border bg-muted/20 p-3'><div><h3 className='text-sm font-semibold'>1. Risiko inheren</h3><p className='text-xs text-muted-foreground'>Nilai risiko sebelum pengendalian.</p></div><div className='grid gap-3 sm:grid-cols-2'>{criterion('Kriteria kemungkinan inheren', 'kriteria_kemungkinan', kemungkinan)}{score('Skor kemungkinan inheren', 'inheren_kemungkinan')}{criterion('Kriteria dampak inheren', 'kriteria_dampak', dampak)}{score('Skor dampak inheren', 'inheren_dampak')}</div></section>
          <section className='space-y-3 rounded-lg border bg-muted/20 p-3'><div><h3 className='text-sm font-semibold'>2. Pengendalian yang sudah ada</h3><p className='text-xs text-muted-foreground'>Jelaskan pengendalian yang telah diterapkan.</p></div>{boolField('Ketersediaan pengendalian', 'pengendalian_ada')}{form.pengendalian_ada && <><div className='space-y-1.5'><Label htmlFor='analisis-pengendalian' className='text-xs font-semibold'>Uraian pengendalian</Label><Textarea id='analisis-pengendalian' className='text-xs' value={form.pengendalian_uraian || ''} onChange={(event) => field('pengendalian_uraian', event.target.value || null)} /></div>{choose('Sub-unsur SPIP', form.sub_unsur_spip_id || '', subUnsur.map((item) => ({ value: item.id, label: item.nama })), (value) => field('sub_unsur_spip_id', value || null), 'Pilih sub-unsur')}{boolField('Kecukupan pengendalian', 'pengendalian_memadai')}</>}</section>
          <section className='space-y-3 rounded-lg border bg-muted/20 p-3'><div><h3 className='text-sm font-semibold'>3. Risiko residual</h3><p className='text-xs text-muted-foreground'>Nilai kondisi risiko setelah pengendalian.</p></div><div className='grid gap-3 sm:grid-cols-2'>{criterion('Kriteria kemungkinan residual', 'residual_kriteria_kemungkinan', kemungkinan)}{score('Skor kemungkinan residual', 'residual_kemungkinan')}{criterion('Kriteria dampak residual', 'residual_kriteria_dampak', dampak)}{score('Skor dampak residual', 'residual_dampak')}</div><div className='space-y-1.5'><Label htmlFor='analisis-rencana' className='text-xs font-semibold'>Rencana tindak pengendalian (opsional)</Label><Textarea id='analisis-rencana' className='text-xs' value={form.rencana_tindak || ''} onChange={(event) => field('rencana_tindak', event.target.value || null)} /></div></section>
        </fieldset>
        {canEdit && <p className='text-xs text-muted-foreground'>Analisis yang belum lengkap dapat disimpan sebagai draf. Skala dan evaluasi dihitung setelah penyimpanan.</p>}
        <DialogFooter className='border-t pt-3'><Button type='button' variant='outline' size='sm' disabled={isSaving} onClick={onClose}>{canEdit ? 'Batal' : 'Tutup'}</Button>{canEdit && <Button type='submit' size='sm' disabled={isSaving} className='gap-1.5'>{isSaving ? <Loader2 className='h-4 w-4 animate-spin' /> : <Save className='h-4 w-4' />}{isSaving ? 'Menyimpan...' : 'Simpan Analisis'}</Button>}</DialogFooter>
      </form>}
    </DialogContent>
  </Dialog>
}
