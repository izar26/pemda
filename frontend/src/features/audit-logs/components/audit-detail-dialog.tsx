import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { AuditLog } from '@/types/audit'

interface AuditDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: AuditLog | null
}

export function AuditDetailDialog({ open, onOpenChange, log }: AuditDetailDialogProps) {
  if (!log) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <Badge variant='outline'>{log.module}</Badge>
            <Badge variant='secondary'>{log.action}</Badge>
          </div>
          <DialogTitle className='text-base font-semibold mt-1.5'>
            Detail Rekam Jejak Audit
          </DialogTitle>
          <DialogDescription className='text-xs'>
            ID Log: #{log.id} • Dicatat pada {new Date(log.created_at).toLocaleString('id-ID')}
          </DialogDescription>
        </DialogHeader>

        <div className='space-y-3.5 text-xs'>
          <div className='grid grid-cols-2 gap-2 rounded-lg border bg-muted/20 p-3'>
            <div>
              <span className='text-muted-foreground block text-[11px]'>Pelaksana / Pegawai:</span>
              <p className='font-semibold text-foreground mt-0.5'>{log.user_name}</p>
              {log.user_nip && <p className='text-muted-foreground text-[11px]'>NIP: {log.user_nip}</p>}
            </div>
            <div>
              <span className='text-muted-foreground block text-[11px]'>Alamat IP & Perangkat:</span>
              <p className='font-semibold text-foreground mt-0.5'>{log.ip_address || '127.0.0.1'}</p>
              <p className='text-muted-foreground text-[10px] truncate max-w-[200px]' title={log.user_agent || ''}>
                {log.user_agent || '-'}
              </p>
            </div>
          </div>

          <div>
            <span className='text-muted-foreground block text-[11px] mb-1 font-medium'>Deskripsi Aktivitas:</span>
            <div className='p-2.5 rounded-md border bg-card text-foreground font-normal leading-relaxed'>
              {log.description}
            </div>
          </div>

          {log.context && (
            <div>
              <span className='text-muted-foreground block text-[11px] mb-1 font-medium'>Data Konteks Tambahan (JSON):</span>
              <ScrollArea className='max-h-48 rounded-md border bg-muted/40 p-2.5 font-mono text-[11px]'>
                <pre>{JSON.stringify(log.context, null, 2)}</pre>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
