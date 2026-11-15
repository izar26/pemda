import { AlertCircle, Loader2, Send } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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

interface ReviewRejectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  targetFormCode: string
  note: string
  onNoteChange: (note: string) => void
  onConfirm: () => void
  isPending: boolean
}

export function ReviewRejectionDialog({
  open,
  onOpenChange,
  targetFormCode,
  note,
  onNoteChange,
  onConfirm,
  isPending,
}: ReviewRejectionDialogProps) {
  const isValid = note.trim().length >= 5

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg max-h-[90dvh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        <DialogHeader className='px-4 sm:px-6 py-4 border-b shrink-0'>
          <div className='mb-1 flex items-center gap-2'>
            <Badge
              variant='outline'
              className='border-destructive/40 bg-destructive/10 font-mono text-xs text-destructive'
            >
              FORM {targetFormCode.toUpperCase()}
            </Badge>
            <DialogTitle className='flex items-center gap-2 text-base text-destructive'>
              <AlertCircle className='h-5 w-5' />
              Tolak & Minta Perbaikan Formulir
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            Tuliskan instruksi catatan perbaikan secara spesifik agar perangkat
            daerah (OPD) dapat memperbaiki formulir ini. Catatan akan tampil
            langsung di lembar kerja OPD.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-4 sm:px-6 py-4 min-h-0 space-y-3.5'>
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='catatan-revisi' className='text-xs font-semibold'>
                Catatan Revisi Evaluator{' '}
                <span className='text-destructive'>*</span>
              </Label>
              <span className='font-mono text-[10px] text-muted-foreground'>
                {note.length} karakter (min. 5)
              </span>
            </div>
            <Textarea
              id='catatan-revisi'
              placeholder='Tuliskan instruksi perbaikan yang spesifik di sini...'
              rows={4}
              className='resize-none text-xs leading-relaxed'
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className='px-4 sm:px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            className='text-xs'
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button
            type='button'
            variant='destructive'
            size='sm'
            className='gap-1.5 text-xs font-semibold'
            disabled={isPending || !isValid}
            onClick={onConfirm}
          >
            {isPending ? (
              <Loader2 className='h-3.5 w-3.5 animate-spin' />
            ) : (
              <Send className='h-3.5 w-3.5' />
            )}
            <span>Kirim Catatan Revisi</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
