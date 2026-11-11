import { useEffect, useState } from 'react'
import { BrainCircuit, CheckCircle2, Loader2, Save } from 'lucide-react'
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
    if (why5.trim()) return why5.trim()
    if (why4.trim()) return why4.trim()
    if (why3.trim()) return why3.trim()
    if (why2.trim()) return why2.trim()
    if (why1.trim()) return why1.trim()
    return null
  })()

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
      <DialogContent className='sm:max-w-2xl max-h-[90dvh] overflow-y-auto p-4 sm:p-6'>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <DialogHeader>
            <DialogTitle className='text-sm sm:text-base font-bold flex items-center gap-2'>
              <BrainCircuit className='h-4 w-4 text-primary' />
              Analisis Akar Masalah (5-Whys RCA)
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Mulai dari penyebab langsung, lalu tanyakan mengapa penyebab itu terjadi. Jawaban terakhir yang terisi menjadi akar penyebab untuk Form {rca?.source_type === '3c' ? '3C' : rca?.source_type === '3b' ? '3B' : '3A'}.
            </DialogDescription>
          </DialogHeader>

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
            <div className='space-y-1'>
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
            <div className='space-y-1'>
              <Label htmlFor='why-2' className='text-xs font-semibold flex items-center gap-1.5'>
                <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                  2
                </span>
                Mengapa 2: Mengapa penyebab pertama terjadi? (opsional)
              </Label>
              <Textarea
                id='why-2'
                rows={2}
                value={why2}
                onChange={(e) => setWhy2(e.target.value)}
                placeholder='Mengapa penyebab pada Why 1 bisa terjadi?...'
                className='text-xs resize-none'
              />
            </div>

            {/* Why 3 */}
            <div className='space-y-1'>
              <Label htmlFor='why-3' className='text-xs font-semibold flex items-center gap-1.5'>
                <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                  3
                </span>
                Mengapa 3: Mengapa penyebab kedua terjadi? (opsional)
              </Label>
              <Textarea
                id='why-3'
                rows={2}
                value={why3}
                onChange={(e) => setWhy3(e.target.value)}
                placeholder='Mengapa penyebab pada Why 2 bisa terjadi?...'
                className='text-xs resize-none'
              />
            </div>

            {/* Why 4 */}
            <div className='space-y-1'>
              <Label htmlFor='why-4' className='text-xs font-semibold flex items-center gap-1.5'>
                <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                  4
                </span>
                Mengapa 4: Mengapa penyebab ketiga terjadi? (opsional)
              </Label>
              <Textarea
                id='why-4'
                rows={2}
                value={why4}
                onChange={(e) => setWhy4(e.target.value)}
                placeholder='Jika akar masalah belum tercapai, lanjutkan analisis...'
                className='text-xs resize-none'
              />
            </div>

            {/* Why 5 */}
            <div className='space-y-1'>
              <Label htmlFor='why-5' className='text-xs font-semibold flex items-center gap-1.5'>
                <span className='w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center font-mono text-[10px] font-bold'>
                  5
                </span>
                Mengapa 5: Mengapa penyebab keempat terjadi? (opsional)
              </Label>
              <Textarea
                id='why-5'
                rows={2}
                value={why5}
                onChange={(e) => setWhy5(e.target.value)}
                placeholder='Akar masalah final...'
                className='text-xs resize-none'
              />
            </div>

            {/* LIVE AKAR PENYEBAB BOX */}
            <div className='p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 space-y-1'>
              <div className='flex items-center justify-between'>
                <span className='text-[11px] font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1'>
                  <CheckCircle2 className='h-3.5 w-3.5' /> Akar penyebab sementara
                </span>

              </div>
              <p className='font-semibold text-foreground text-xs'>
                {computedAkarPenyebab || <em className='text-muted-foreground'>Isi penyebab langsung untuk melihat akar penyebab.</em>}
              </p>
            </div>

            {/* Jenis Penyebab & Kegiatan Pengendalian */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
              <div className='space-y-1.5'>
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

              <div className='space-y-1.5'>
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

          <DialogFooter className='gap-2 sm:gap-0 pt-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => onOpenChange(false)}
              className='text-xs'
            >
              {canEdit ? 'Batal' : 'Tutup'}
            </Button>
            {canEdit && <Button
              type='submit'
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
            </Button>}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
