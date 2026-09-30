import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowRight, Code, Eye, FileText, PlusCircle, RefreshCw, Trash2 } from 'lucide-react'
import type { AuditLog, AuditDiffItem } from '@/types/audit'

interface AuditDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  log: AuditLog | null
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '—'
  }
  if (typeof value === 'boolean') {
    return value ? 'Aktif (true)' : 'Non-aktif (false)'
  }
  if (typeof value === 'object') {
    return JSON.stringify(value)
  }
  return String(value)
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function AuditDetailDialog({ open, onOpenChange, log }: AuditDetailDialogProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual')

  if (!log) return null

  const isCreate =
    log.action.includes('CREATE') ||
    log.context?.action_type === 'CREATE'
  const isDelete =
    log.action.includes('DELETE') ||
    log.context?.action_type === 'DELETE'
  const isUpdate =
    log.action.includes('UPDATE') ||
    log.action.includes('TOGGLE') ||
    log.context?.action_type === 'UPDATE' ||
    Boolean(log.context?.changes)

  const hasChanges = Boolean(log.context?.changes && Object.keys(log.context.changes).length > 0)
  const hasSnapshot = Boolean(log.context?.snapshot && Object.keys(log.context.snapshot).length > 0)
  const hasAttributes = Boolean(log.context?.attributes && Object.keys(log.context.attributes).length > 0)

  const getActionBadgeVariant = () => {
    if (isCreate) return 'default'
    if (isDelete) return 'destructive'
    if (isUpdate) return 'secondary'
    return 'outline'
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[90vh] flex flex-col p-6 overflow-hidden'>
        <DialogHeader className='flex-shrink-0'>
          <div className='flex items-center justify-between gap-2'>
            <div className='flex items-center gap-2'>
              <Badge variant='outline'>{log.module}</Badge>
              <Badge variant={getActionBadgeVariant()} className='font-mono'>
                {log.action}
              </Badge>
            </div>
            <div className='flex items-center gap-1.5'>
              <Button
                variant={viewMode === 'visual' ? 'default' : 'outline'}
                size='sm'
                className='h-7 text-xs gap-1'
                onClick={() => setViewMode('visual')}
              >
                <Eye className='h-3.5 w-3.5' />
                Visual
              </Button>
              <Button
                variant={viewMode === 'raw' ? 'default' : 'outline'}
                size='sm'
                className='h-7 text-xs gap-1'
                onClick={() => setViewMode('raw')}
              >
                <Code className='h-3.5 w-3.5' />
                Raw JSON
              </Button>
            </div>
          </div>

          <DialogTitle className='text-base font-semibold mt-1.5'>
            Detail Rekam Jejak Audit
          </DialogTitle>
          <DialogDescription className='text-xs'>
            Log #{log.id} • {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className='flex-1 pr-3 -mr-3 mt-2 overflow-y-auto'>
          <div className='space-y-4 text-xs'>
            {/* Meta Pelaksana & Info Teknis */}
            <div className='grid grid-cols-2 gap-2.5 rounded-lg border bg-muted/20 p-3'>
              <div>
                <span className='text-muted-foreground block text-[11px] font-medium'>Pelaksana / Pegawai:</span>
                <p className='font-semibold text-foreground mt-0.5'>{log.user_name}</p>
                {log.user_nip && <p className='text-muted-foreground text-[11px]'>NIP: {log.user_nip}</p>}
                {log.user_email && <p className='text-muted-foreground text-[11px]'>{log.user_email}</p>}
              </div>
              <div>
                <span className='text-muted-foreground block text-[11px] font-medium'>Alamat IP & Klien:</span>
                <p className='font-semibold text-foreground mt-0.5'>{log.ip_address || '127.0.0.1'}</p>
                <p className='text-muted-foreground text-[10px] break-words line-clamp-2 mt-0.5' title={log.user_agent || ''}>
                  {log.user_agent || '-'}
                </p>
                {log.auditable_type && (
                  <p className='text-[10px] text-muted-foreground mt-1 font-mono'>
                    Entitas: {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                  </p>
                )}
              </div>
            </div>

            {/* Deskripsi Aktivitas */}
            <div>
              <span className='text-muted-foreground block text-[11px] mb-1 font-medium'>Deskripsi Aktivitas:</span>
              <div className='p-2.5 rounded-md border bg-card text-foreground font-normal leading-relaxed text-xs'>
                {log.description}
              </div>
            </div>

            {viewMode === 'visual' ? (
              <div className='space-y-4'>
                {/* 1. Diff View (UPDATE / CHANGES) */}
                {hasChanges && (
                  <div className='rounded-md border overflow-hidden'>
                    <div className='bg-muted/40 px-3 py-2 border-b flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <RefreshCw className='h-3.5 w-3.5 text-blue-600' />
                        <span className='font-semibold text-xs text-foreground'>
                          Perubahan Nilai (Before vs After)
                        </span>
                      </div>
                      <Badge variant='outline' className='text-[10px]'>
                        {Object.keys(log.context!.changes!).length} atribut diubah
                      </Badge>
                    </div>

                    <Table>
                      <TableHeader className='bg-muted/20'>
                        <TableRow>
                          <TableHead className='w-1/3 text-[11px] font-semibold'>Nama Atribut</TableHead>
                          <TableHead className='w-1/3 text-[11px] font-semibold text-red-600'>Nilai Sebelum (Lama)</TableHead>
                          <TableHead className='w-1/3 text-[11px] font-semibold text-emerald-600'>Nilai Sesudah (Baru)</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(log.context!.changes!).map(([field, diff]) => {
                          const diffItem = diff as AuditDiffItem
                          return (
                            <TableRow key={field} className='hover:bg-muted/30'>
                              <TableCell className='font-medium text-xs align-top'>
                                {formatFieldName(field)}
                                <span className='block text-[10px] text-muted-foreground font-mono mt-0.5'>{field}</span>
                              </TableCell>
                              <TableCell className='align-top font-mono text-xs'>
                                <div className='p-1.5 rounded bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 break-words'>
                                  {formatValue(diffItem?.old)}
                                </div>
                              </TableCell>
                              <TableCell className='align-top font-mono text-xs'>
                                <div className='p-1.5 rounded bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 break-words flex items-start gap-1'>
                                  <ArrowRight className='h-3 w-3 mt-0.5 flex-shrink-0 text-emerald-600' />
                                  <span>{formatValue(diffItem?.new)}</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* 2. Snapshot View (DELETE) */}
                {hasSnapshot && (
                  <div className='rounded-md border overflow-hidden'>
                    <div className='bg-red-50 dark:bg-red-950/30 px-3 py-2 border-b border-red-200 dark:border-red-900 flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <Trash2 className='h-3.5 w-3.5 text-red-600' />
                        <span className='font-semibold text-xs text-red-900 dark:text-red-200'>
                          Snapshot Data yang Dihapus
                        </span>
                      </div>
                      <Badge variant='destructive' className='text-[10px]'>
                        Terhapus
                      </Badge>
                    </div>

                    <div className='divide-y max-h-60 overflow-y-auto'>
                      {Object.entries(log.context!.snapshot!).map(([field, value]) => (
                        <div key={field} className='grid grid-cols-3 px-3 py-1.5 hover:bg-muted/20'>
                          <span className='text-[11px] font-medium text-muted-foreground'>
                            {formatFieldName(field)}
                          </span>
                          <span className='col-span-2 font-mono text-xs text-foreground break-words'>
                            {formatValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Attributes View (CREATE) */}
                {hasAttributes && (
                  <div className='rounded-md border overflow-hidden'>
                    <div className='bg-emerald-50 dark:bg-emerald-950/30 px-3 py-2 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between'>
                      <div className='flex items-center gap-1.5'>
                        <PlusCircle className='h-3.5 w-3.5 text-emerald-600' />
                        <span className='font-semibold text-xs text-emerald-900 dark:text-emerald-200'>
                          Atribut Data Awal yang Dibuat
                        </span>
                      </div>
                      <Badge className='bg-emerald-600 text-white text-[10px]'>
                        Data Baru
                      </Badge>
                    </div>

                    <div className='divide-y max-h-60 overflow-y-auto'>
                      {Object.entries(log.context!.attributes!).map(([field, value]) => (
                        <div key={field} className='grid grid-cols-3 px-3 py-1.5 hover:bg-muted/20'>
                          <span className='text-[11px] font-medium text-muted-foreground'>
                            {formatFieldName(field)}
                          </span>
                          <span className='col-span-2 font-mono text-xs text-foreground break-words'>
                            {formatValue(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallback if no special diff or snapshot found */}
                {!hasChanges && !hasSnapshot && !hasAttributes && log.context && (
                  <div className='rounded-md border p-3 bg-muted/10'>
                    <div className='flex items-center gap-1.5 mb-2'>
                      <FileText className='h-3.5 w-3.5 text-muted-foreground' />
                      <span className='font-medium text-xs text-foreground'>Informasi Konteks:</span>
                    </div>
                    <div className='space-y-1 font-mono text-xs'>
                      {Object.entries(log.context).map(([k, v]) => (
                        <div key={k} className='grid grid-cols-3 py-0.5 border-b border-muted/50 last:border-0'>
                          <span className='text-muted-foreground'>{formatFieldName(k)}:</span>
                          <span className='col-span-2 text-foreground break-words'>{formatValue(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Raw JSON View */
              <div>
                <span className='text-muted-foreground block text-[11px] mb-1 font-medium'>
                  Payload Konteks Mentah (JSON):
                </span>
                <ScrollArea className='max-h-64 rounded-md border bg-muted/40 p-3 font-mono text-[11px]'>
                  <pre className='whitespace-pre-wrap break-all'>{JSON.stringify(log.context, null, 2)}</pre>
                </ScrollArea>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
