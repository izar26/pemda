import { useEffect, useState } from 'react'
import { BrainCircuit, CheckCircle2, Loader2, Save, Trash2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import type { JenisPenyebabRca, RootCauseAnalysis } from '@/types/risiko'
import { risikoService } from '@/services/risiko-service'

interface RcaDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rca: RootCauseAnalysis | null
  onSuccess: () => void
  canEdit: boolean
}

export function RcaDialog({ open, onOpenChange, rca, onSuccess, canEdit }: RcaDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [why1, setWhy1] = useState('')
  const [why2, setWhy2] = useState('')
  const [why3, setWhy3] = useState('')
  const [why4, setWhy4] = useState('')
  const [why5, setWhy5] = useState('')
  const [jenisPenyebab, setJenisPenyebab] = useState<JenisPenyebabRca | ''>('')
  const [kegiatanPengendalian, setKegiatanPengendalian] = useState('')

  useEffect(() => {
    if (rca) {
      setWhy1(rca.why_1 || '')
      setWhy2(rca.why_2 || '')
      setWhy3(rca.why_3 || '')
      setWhy4(rca.why_4 || '')
      setWhy5(rca.why_5 || '')
      setJenisPenyebab(rca.jenis_penyebab || (canEdit ? 'Method' : ''))
      setKegiatanPengendalian(rca.kegiatan_pengendalian || '')
    }
  }, [rca, open, canEdit])

  // Real-time calculation of Root Cause (Deepest non-empty Why) matching Excel formula
  const computedAkarPenyebab = (() => {
    if (why5.trim()) return { text: why5.trim(), level: 5 }
    if (why4.trim()) return { text: why4.trim(), level: 4 }
    if (why3.trim()) return { text: why3.trim(), level: 3 }
    if (why2.trim()) return { text: why2.trim(), level: 2 }
    if (why1.trim()) return { text: why1.trim(), level: 1 }
    return null
  })()

  // Progressive disclosure logic for 5-Whys
  const showWhy2 = canEdit
    ? Boolean(why1.trim() || why2.trim())
    : Boolean(why2.trim())

  const showWhy3 = canEdit
    ? Boolean((why1.trim() && why2.trim()) || why3.trim())
    : Boolean(why3.trim())

  const showWhy4 = canEdit
    ? Boolean((why1.trim() && why2.trim() && why3.trim()) || why4.trim())
    : Boolean(why4.trim())

  const showWhy5 = canEdit
    ? Boolean((why1.trim() && why2.trim() && why3.trim() && why4.trim()) || why5.trim())
    : Boolean(why5.trim())

  function handleClearStep(step: 2 | 3 | 4 | 5) {
    if (step === 2) {
      setWhy2('')
      setWhy3('')
      setWhy4('')
      setWhy5('')
    } else if (step === 3) {
      setWhy3('')
      setWhy4('')
      setWhy5('')
    } else if (step === 4) {
      setWhy4('')
      setWhy5('')
    } else if (step === 5) {
      setWhy5('')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!rca || !canEdit || !jenisPenyebab) return

    if (!why1.trim()) {
      toast.warning('Why 1 (Penyebab Langsung) wajib diisi.')
      return
    }

    try {
      setIsSubmitting(true)
      await risikoService.updateRca(rca.id, {
        why_1: why1.trim() || null,
        why_2: why2.trim() || null,
        why_3: why3.trim() || null,
        why_4: why4.trim() || null,
        why_5: why5.trim() || null,
        jenis_penyebab: jenisPenyebab,
        kegiatan_pengendalian: kegiatanPengendalian.trim() || null,
      })

      const formCode = rca.source_type === '3c' ? '3C' : rca.source_type === '3b' ? '3B' : '3A'
      toast.success(
        `Analisis 5-Whys berhasil disimpan. Sebab & Sumber di Form ${formCode} otomatis diperbarui.`
      )
      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan analisis RCA.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const jenisPenyebabOptions: JenisPenyebabRca[] = [
    'Man',
    'Money',
    'Method',
    'Machine',
    'Material',
    'Eksternal',
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-4 sm:px-6 pt-4 sm:pt-5 pb-3 sm:pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <DialogTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
            <BrainCircuit className='h-4 w-4 text-primary' />
            Analisis Akar Masalah (5-Whys RCA)
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Mulai dari penyebab langsung, lalu tanyakan mengapa penyebab itu terjadi secara berjenjang. Jawaban terakhir yang terisi menjadi akar penyebab untuk Form {rca?.source_type === '3c' ? '3C' : rca?.source_type === '3b' ? '3B' : '3A'}.
          </DialogDescription>
        </DialogHeader>

        <form id='rca-dialog-form' onSubmit={handleSubmit} className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-4 text-xs'>

          {!canEdit && <p className='rounded-md border bg-muted/40 p-2 text-xs text-muted-foreground'>Analisis ini hanya dapat dilihat.</p>}
          <fieldset disabled={!canEdit} className='min-w-0 space-y-4'>
          {/* Risk Target Banner */}
          <div className='p-3 rounded-lg border bg-muted/40 space-y-1 text-xs'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge
                variant='secondary'
                className='text-[10px] font-semibold bg-primary/10 text-primary border-primary/20'
              >
                {rca?.source_type === '3c'
                  ? 'Form 3C (Risiko Operasional)'
                  : rca?.source_type === '3b'
                    ? 'Form 3B (Risiko OPD)'
                    : 'Form 3A (Risiko Pemda)'}
              </Badge>
              <Badge className='font-mono text-[10px] bg-amber-400 text-slate-900 font-bold'>
                {rca?.item?.kode_risiko || 'RISIKO'}
              </Badge>
              <Badge variant='outline' className='text-[10px]'>
                {rca?.item?.kategori_risiko}
              </Badge>
              {rca?.item?.probis && (
                <Badge variant='outline' className='text-[10px] font-mono bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border-sky-300'>
                  PROBIS: {rca.item.probis}
                </Badge>
              )}
            </div>
            {rca?.item?.sub_kegiatan && (
              <div className='text-[11px] text-muted-foreground'>
                <strong>Sub-Kegiatan:</strong> {rca.item.sub_kegiatan}
              </div>
            )}
            <p className='font-semibold text-foreground text-xs leading-snug'>
              &ldquo;{rca?.item?.pernyataan_risiko}&rdquo;
            </p>
          </div>

          <div className='space-y-3 text-xs'>
            {/* Why 1 */}
            <div className='space-y-1 transition-all duration-200'>
              <Label htmlFor='why-1' className='text-xs font-semibold flex items-center gap-1.5'>
                <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                  1
                </span>
                Mengapa 1: Apa penyebab langsung risiko ini? <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                id='why-1'
                rows={2}
                value={why1}
                onChange={(e) => setWhy1(e.target.value)}
                placeholder='Mengapa risiko ini bisa terjadi? (Contoh: Kerusakan jalan terjadi lebih cepat dari dugaan)...'
                className='text-xs resize-none'
              />
            </div>

            {/* Why 2 */}
            {showWhy2 && (
              <div className='space-y-1 transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='why-2' className='text-xs font-semibold flex items-center gap-1.5'>
                    <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                      2
                    </span>
                    Mengapa 2: Mengapa penyebab pertama terjadi? (opsional)
                  </Label>
                  {canEdit && (why2.trim() || why3.trim() || why4.trim() || why5.trim()) && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleClearStep(2)}
                      className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive gap-1'
                      title='Hapus Mengapa 2 dan level setelahnya'
                    >
                      <Trash2 className='h-3 w-3' />
                      <span>Hapus langkah</span>
                    </Button>
                  )}
                </div>
                <Textarea
                  id='why-2'
                  rows={2}
                  value={why2}
                  onChange={(e) => setWhy2(e.target.value)}
                  placeholder='Mengapa penyebab pada Mengapa 1 bisa terjadi?...'
                  className='text-xs resize-none'
                />
              </div>
            )}

            {/* Why 3 */}
            {showWhy3 && (
              <div className='space-y-1 transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='why-3' className='text-xs font-semibold flex items-center gap-1.5'>
                    <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                      3
                    </span>
                    Mengapa 3: Mengapa penyebab kedua terjadi? (opsional)
                  </Label>
                  {canEdit && (why3.trim() || why4.trim() || why5.trim()) && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleClearStep(3)}
                      className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive gap-1'
                      title='Hapus Mengapa 3 dan level setelahnya'
                    >
                      <Trash2 className='h-3 w-3' />
                      <span>Hapus langkah</span>
                    </Button>
                  )}
                </div>
                <Textarea
                  id='why-3'
                  rows={2}
                  value={why3}
                  onChange={(e) => setWhy3(e.target.value)}
                  placeholder='Mengapa penyebab pada Mengapa 2 bisa terjadi?...'
                  className='text-xs resize-none'
                />
              </div>
            )}

            {/* Why 4 */}
            {showWhy4 && (
              <div className='space-y-1 transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='why-4' className='text-xs font-semibold flex items-center gap-1.5'>
                    <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                      4
                    </span>
                    Mengapa 4: Mengapa penyebab ketiga terjadi? (opsional)
                  </Label>
                  {canEdit && (why4.trim() || why5.trim()) && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleClearStep(4)}
                      className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive gap-1'
                      title='Hapus Mengapa 4 dan level setelahnya'
                    >
                      <Trash2 className='h-3 w-3' />
                      <span>Hapus langkah</span>
                    </Button>
                  )}
                </div>
                <Textarea
                  id='why-4'
                  rows={2}
                  value={why4}
                  onChange={(e) => setWhy4(e.target.value)}
                  placeholder='Jika akar masalah belum tercapai, lanjutkan analisis...'
                  className='text-xs resize-none'
                />
              </div>
            )}

            {/* Why 5 */}
            {showWhy5 && (
              <div className='space-y-1 transition-all duration-200 animate-in fade-in-50 slide-in-from-top-1'>
                <div className='flex items-center justify-between'>
                  <Label htmlFor='why-5' className='text-xs font-semibold flex items-center gap-1.5'>
                    <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                      5
                    </span>
                    Mengapa 5: Mengapa penyebab keempat terjadi? (opsional)
                  </Label>
                  {canEdit && why5.trim() && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => handleClearStep(5)}
                      className='h-5 px-1.5 text-[10px] text-muted-foreground hover:text-destructive gap-1'
                      title='Hapus Mengapa 5'
                    >
                      <Trash2 className='h-3 w-3' />
                      <span>Hapus langkah</span>
                    </Button>
                  )}
                </div>
                <Textarea
                  id='why-5'
                  rows={2}
                  value={why5}
                  onChange={(e) => setWhy5(e.target.value)}
                  placeholder='Akar masalah final...'
                  className='text-xs resize-none'
                />
              </div>
            )}

            {/* LIVE AKAR PENYEBAB BOX */}
            <div className='p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 space-y-1.5'>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1'>
                  <CheckCircle2 className='h-3.5 w-3.5' /> Akar penyebab sementara
                </span>
                {computedAkarPenyebab && (
                  <Badge
                    variant='secondary'
                    className='text-[10px] bg-emerald-600/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/30 font-semibold'
                  >
                    Level {computedAkarPenyebab.level} (Mengapa {computedAkarPenyebab.level})
                  </Badge>
                )}
              </div>
              <p className='font-semibold text-foreground text-xs'>
                {computedAkarPenyebab?.text || (
                  <em className='text-muted-foreground'>
                    Isi penyebab langsung (Mengapa 1) untuk melihat akar penyebab.
                  </em>
                )}
              </p>
            </div>

            {/* Jenis Penyebab & Kegiatan Pengendalian */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 min-w-0'>
              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='jenis-penyebab' className='text-xs font-semibold'>
                  Jenis / Kategori Penyebab (Sumber Risiko) <span className='text-destructive'>*</span>
                </Label>
                <Select
                  value={jenisPenyebab}
                  onValueChange={(val) => setJenisPenyebab(val as JenisPenyebabRca)}
                >
                  <SelectTrigger id='jenis-penyebab' className='text-xs'>
                    <SelectValue placeholder='Pilih Jenis...' />
                  </SelectTrigger>
                  <SelectContent>
                    {jenisPenyebabOptions.map((opt) => (
                      <SelectItem key={opt} value={opt} className='text-xs'>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className='text-[10px] text-muted-foreground'>
                  Akan mengisi sumber risiko pada form asal.
                </p>
              </div>

              <div className='space-y-1.5 min-w-0'>
                <Label htmlFor='kegiatan-pengendalian' className='text-xs font-semibold'>
                  Kegiatan Pengendalian yang Dirancang
                </Label>
                <Textarea
                  id='kegiatan-pengendalian'
                  rows={2}
                  value={kegiatanPengendalian}
                  onChange={(e) => setKegiatanPengendalian(e.target.value)}
                  placeholder='Rencana tindakan pencegahan / perbaikan akar masalah...'
                  className='text-xs resize-none'
                />
              </div>
            </div>
          </div>

          </fieldset>
        </form>

        <DialogFooter className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            className='text-xs'
          >
            {canEdit ? 'Batal' : 'Tutup'}
          </Button>
          {canEdit && (
            <Button
              type='submit'
              form='rca-dialog-form'
              size='sm'
              disabled={isSubmitting || !why1.trim() || !jenisPenyebab}
              className='text-xs gap-1.5 font-semibold'
            >
              {isSubmitting ? (
                <Loader2 className='h-3 w-3 animate-spin' />
              ) : (
                <Save className='h-3.5 w-3.5' />
              )}
              Simpan Analisis RCA
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
