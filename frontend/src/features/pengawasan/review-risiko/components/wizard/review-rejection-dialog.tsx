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
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

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
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2 mb-1'>
            <Badge
              variant='outline'
              className='font-mono text-xs border-destructive/40 text-destructive bg-destructive/10'
            >
              FORM {targetFormCode.toUpperCase()}
            </Badge>
            <DialogTitle className='flex items-center gap-2 text-destructive text-base'>
              <AlertCircle className='h-5 w-5' />
              Tolak & Minta Perbaikan Formulir
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            Tuliskan instruksi catatan perbaikan secara spesifik agar perangkat daerah (OPD) dapat
            memperbaiki formulir ini. Catatan akan tampil langsung di lembar kerja OPD.
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3.5 py-2'>
          <div className='space-y-1.5'>
            <div className='flex items-center justify-between'>
              <Label htmlFor='catatan-revisi' className='text-xs font-semibold'>
                Catatan Revisi Auditor <span className='text-destructive'>*</span>
              </Label>
              <span className='text-[10px] font-mono text-muted-foreground'>
                {note.length} karakter (min. 5)
              </span>
            </div>
            <Textarea
              id='catatan-revisi'
              placeholder='Tuliskan instruksi perbaikan yang spesifik di sini...'
              rows={4}
              className='text-xs leading-relaxed resize-none'
              value={note}
              onChange={(e) => onNoteChange(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className='gap-2 sm:gap-0'>
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
            className='text-xs gap-1.5 font-semibold'
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
