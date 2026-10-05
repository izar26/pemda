import { useState } from 'react'
import { type Table } from '@tanstack/react-table'
import { Archive, Download, Loader2, Lock } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { AuditLog } from '@/types/audit'
import { auditService } from '@/services/audit-service'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DataTableBulkActions as BulkActionsToolbar } from '@/components/data-table'

interface AuditLogsBulkActionsProps {
  table: Table<AuditLog>
  isArchiveTab?: boolean
}

export function AuditLogsBulkActions({
  table,
  isArchiveTab = false,
}: AuditLogsBulkActionsProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const isSuperadmin =
    (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false

  const [confirmOpen, setConfirmOpen] = useState(false)

  const selectedRows = table.getFilteredSelectedRowModel().rows
  const selectedCount = selectedRows.length
  const selectedLogs = selectedRows.map((r) => r.original)

  const archiveMutation = useMutation({
    mutationFn: async () => {
      const ids = selectedLogs.map((log) => log.id)
      return auditService.triggerArchivePurge({ ids })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['audit-archives'] })
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] })
      table.resetRowSelection()
      setConfirmOpen(false)
      toast.success(res.message)
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal memindahkan log terpilih ke kubah arsip.'
      toast.error(msg)
    },
  })

  const handleExportSelected = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(selectedLogs, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `audit_logs_export_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
    toast.success(`${selectedCount} log audit berhasil diekspor ke file JSON.`)
  }

  if (selectedCount === 0) return null

  return (
    <>
      <BulkActionsToolbar table={table} entityName='log'>
        <div className='flex items-center gap-1.5'>
          {/* Export Selected Button */}
          <Button
            variant='outline'
            size='sm'
            className='h-7 text-xs px-2 gap-1.5'
            onClick={handleExportSelected}
          >
            <Download className='h-3.5 w-3.5' />
            Ekspor JSON ({selectedCount})
          </Button>

          {/* Archive Selected Button (Superadmin on Active tab only) */}
          {isSuperadmin && !isArchiveTab && (
            <Button
              variant='default'
              size='sm'
              className='h-7 text-xs px-2.5 gap-1.5 bg-primary'
              onClick={() => setConfirmOpen(true)}
            >
              <Archive className='h-3.5 w-3.5' />
              Arsipkan ke Kubah ({selectedCount})
            </Button>
          )}
        </div>
      </BulkActionsToolbar>

      {/* Confirmation Dialog for Archiving Selected IDs */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <div className='flex items-center gap-2 text-primary'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
                <Archive className='h-5 w-5 text-primary' />
              </div>
              <div>
                <DialogTitle className='text-base'>
                  Konfirmasi Pengarsipan Terpilih
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Pindahkan {selectedCount} log yang Anda centang ke Kubah Arsip Permanen.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='rounded-lg border bg-muted/30 p-3 space-y-1.5'>
              <div className='flex justify-between text-muted-foreground'>
                <span>Jumlah Catatan Terpilih:</span>
                <span className='font-bold text-foreground'>{selectedCount} Catatan</span>
              </div>
              <div className='flex justify-between text-muted-foreground'>
                <span>Status Destinasi:</span>
                <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                  Kubah Arsip (WORM / Read-Only)
                </span>
              </div>
            </div>

            <div className='flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50/70 dark:border-blue-900/60 dark:bg-blue-950/30 p-2.5'>
              <Lock className='h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5' />
              <p className='text-[11px] text-blue-950 dark:text-blue-200 leading-relaxed'>
                Catatan yang <strong>tidak Anda centang</strong> akan tetap aman berada di tabel log operasional ini. Catatan yang tercentang akan dipindahkan ke Kubah Arsip dan <strong>tidak dapat dihapus selamanya</strong>.
              </p>
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs'
              onClick={() => setConfirmOpen(false)}
              disabled={archiveMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              variant='default'
              size='sm'
              className='text-xs gap-1.5 bg-primary'
              onClick={() => archiveMutation.mutate()}
              disabled={archiveMutation.isPending}
            >
              {archiveMutation.isPending ? (
                <>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Memindahkan...
                </>
              ) : (
                <>
                  <Archive className='h-3.5 w-3.5' />
                  Konfirmasi & Pindahkan ({selectedCount})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
