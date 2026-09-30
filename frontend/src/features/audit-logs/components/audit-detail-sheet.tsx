import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  ArrowRight,
  Check,
  Code,
  Copy,
  Eye,
  FileText,
  Monitor,
  PlusCircle,
  RefreshCw,
  Trash2,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import type { AuditLog, AuditDiffItem } from '@/types/audit'

interface AuditDetailSheetProps {
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
    return JSON.stringify(value, null, 2)
  }
  return String(value)
}

function formatFieldName(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

export function AuditDetailSheet({ open, onOpenChange, log }: AuditDetailSheetProps) {
  const [viewMode, setViewMode] = useState<'visual' | 'raw'>('visual')
  const [copied, setCopied] = useState(false)

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

  const handleCopyJson = () => {
    if (!log.context) return
    navigator.clipboard.writeText(JSON.stringify(log.context, null, 2))
    setCopied(true)
    toast.success('Payload JSON berhasil disalin ke clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side='right'
        className='sm:max-w-2xl lg:max-w-3xl w-full flex flex-col p-0 gap-0 shadow-2xl border-l bg-background h-full'
      >
        {/* Header Panel */}
        <SheetHeader className='p-5 border-b bg-muted/20 flex-shrink-0'>
          <div className='flex items-center justify-between gap-3 pr-8'>
            <div className='flex items-center gap-2 flex-wrap'>
              <Badge variant='outline' className='text-xs font-medium'>
                {log.module}
              </Badge>
              <Badge variant={getActionBadgeVariant()} className='font-mono text-xs'>
                {log.action}
              </Badge>
              {log.auditable_type && (
                <span className='text-[11px] font-mono text-muted-foreground bg-muted/60 px-2 py-0.5 rounded'>
                  {log.auditable_type.split('\\').pop()} #{log.auditable_id}
                </span>
              )}
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
                JSON
              </Button>
            </div>
          </div>

          <SheetTitle className='text-lg font-bold text-foreground mt-2'>
            Detail Rekam Jejak Audit #{log.id}
          </SheetTitle>
          <SheetDescription className='text-xs text-muted-foreground'>
            Tercatat pada {new Date(log.created_at).toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'medium' })}
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content Body */}
        <ScrollArea className='flex-1 min-h-0 p-6'>
          <div className='space-y-5 text-xs max-w-full'>
            {/* Metadata Pelaksana & Perangkat */}
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-lg border bg-card p-3.5 shadow-2xs'>
              <div className='space-y-1'>
                <div className='flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]'>
                  <User className='h-3.5 w-3.5 text-primary' />
                  <span>Pelaksana / Pegawai</span>
                </div>
                <p className='font-semibold text-sm text-foreground'>{log.user_name}</p>
                {log.user_nip && (
                  <p className='text-muted-foreground text-xs font-mono'>NIP: {log.user_nip}</p>
                )}
                {log.user_email && (
                  <p className='text-muted-foreground text-xs'>{log.user_email}</p>
                )}
              </div>

              <div className='space-y-1 sm:border-l sm:pl-3'>
                <div className='flex items-center gap-1.5 text-muted-foreground font-semibold text-[11px]'>
                  <Monitor className='h-3.5 w-3.5 text-primary' />
                  <span>Jaringan & Perangkat</span>
                </div>
                <p className='font-mono font-semibold text-xs text-foreground'>
                  IP: {log.ip_address || '127.0.0.1'}
                </p>
                <p className='text-muted-foreground text-[11px] break-words line-clamp-2' title={log.user_agent || ''}>
                  {log.user_agent || 'Sistem / Artisan CLI'}
                </p>
              </div>
            </div>

            {/* Deskripsi Aktivitas */}
            <div>
              <span className='text-muted-foreground block text-[11px] mb-1 font-semibold uppercase tracking-wider'>
                Deskripsi Aktivitas
              </span>
              <div className='p-3 rounded-md border bg-muted/20 text-foreground font-normal leading-relaxed text-xs'>
                {log.description}
              </div>
            </div>

            {viewMode === 'visual' ? (
              <div className='space-y-5'>
                {/* 1. Diff View (UPDATE / CHANGES) */}
                {hasChanges && (
                  <div className='rounded-lg border overflow-hidden shadow-2xs'>
                    <div className='bg-blue-50/70 dark:bg-blue-950/30 px-4 py-2.5 border-b flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <RefreshCw className='h-4 w-4 text-blue-600 dark:text-blue-400' />
                        <span className='font-semibold text-xs text-foreground'>
                          Perubahan Nilai (Before vs After)
                        </span>
                      </div>
                      <Badge variant='outline' className='text-[11px] bg-background'>
                        {Object.keys(log.context!.changes!).length} atribut diperbarui
                      </Badge>
                    </div>

                    <Table>
                      <TableHeader className='bg-muted/40'>
                        <TableRow>
                          <TableHead className='w-1/3 text-xs font-semibold'>Nama Atribut</TableHead>
                          <TableHead className='w-1/3 text-xs font-semibold text-red-600 dark:text-red-400'>
                            Nilai Sebelum (Lama)
                          </TableHead>
                          <TableHead className='w-1/3 text-xs font-semibold text-emerald-600 dark:text-emerald-400'>
                            Nilai Sesudah (Baru)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(log.context!.changes!).map(([field, diff]) => {
                          const diffItem = diff as AuditDiffItem
                          return (
                            <TableRow key={field} className='hover:bg-muted/20'>
                              <TableCell className='align-top font-medium text-xs'>
                                <span className='text-foreground'>{formatFieldName(field)}</span>
                                <span className='block text-[10px] text-muted-foreground font-mono mt-0.5'>
                                  {field}
                                </span>
                              </TableCell>
                              <TableCell className='align-top font-mono text-xs'>
                                <div className='p-2 rounded border border-red-200 dark:border-red-900 bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 break-words'>
                                  {formatValue(diffItem?.old)}
                                </div>
                              </TableCell>
                              <TableCell className='align-top font-mono text-xs'>
                                <div className='p-2 rounded border border-emerald-200 dark:border-emerald-900 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 break-words flex items-start gap-1.5'>
                                  <ArrowRight className='h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-emerald-600 dark:text-emerald-400' />
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
                  <div className='rounded-lg border overflow-hidden shadow-2xs'>
                    <div className='bg-red-50 dark:bg-red-950/30 px-4 py-2.5 border-b border-red-200 dark:border-red-900 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <Trash2 className='h-4 w-4 text-red-600' />
                        <span className='font-semibold text-xs text-red-950 dark:text-red-200'>
                          Snapshot Data Terhapus
                        </span>
                      </div>
                      <Badge variant='destructive' className='text-[10px]'>
                        Terhapus Permanen
                      </Badge>
                    </div>

                    <div className='divide-y divide-border'>
                      {Object.entries(log.context!.snapshot!).map(([field, value]) => (
                        <div key={field} className='grid grid-cols-3 px-4 py-2 hover:bg-muted/20 items-start'>
                          <span className='text-xs font-medium text-muted-foreground'>
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
                  <div className='rounded-lg border overflow-hidden shadow-2xs'>
                    <div className='bg-emerald-50 dark:bg-emerald-950/30 px-4 py-2.5 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between'>
                      <div className='flex items-center gap-2'>
                        <PlusCircle className='h-4 w-4 text-emerald-600' />
                        <span className='font-semibold text-xs text-emerald-950 dark:text-emerald-200'>
                          Data Awal yang Ditambahkan
                        </span>
                      </div>
                      <Badge className='bg-emerald-600 text-white text-[10px]'>
                        Data Baru
                      </Badge>
                    </div>

                    <div className='divide-y divide-border'>
                      {Object.entries(log.context!.attributes!).map(([field, value]) => (
                        <div key={field} className='grid grid-cols-3 px-4 py-2 hover:bg-muted/20 items-start'>
                          <span className='text-xs font-medium text-muted-foreground'>
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

                {/* Fallback info jika bukan create/update/delete */}
                {!hasChanges && !hasSnapshot && !hasAttributes && log.context && (
                  <div className='rounded-lg border p-4 bg-muted/10'>
                    <div className='flex items-center gap-2 mb-3'>
                      <FileText className='h-4 w-4 text-muted-foreground' />
                      <span className='font-semibold text-xs text-foreground'>Informasi Parameter Tambahan:</span>
                    </div>
                    <div className='space-y-1.5 font-mono text-xs'>
                      {Object.entries(log.context).map(([k, v]) => (
                        <div key={k} className='grid grid-cols-3 py-1 border-b border-muted/50 last:border-0'>
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
              <div className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <span className='text-muted-foreground text-[11px] font-semibold uppercase tracking-wider'>
                    Payload JSON Konteks
                  </span>
                  <Button
                    variant='outline'
                    size='sm'
                    className='h-7 text-xs gap-1.5'
                    onClick={handleCopyJson}
                  >
                    {copied ? (
                      <>
                        <Check className='h-3.5 w-3.5 text-emerald-600' />
                        Tersalin
                      </>
                    ) : (
                      <>
                        <Copy className='h-3.5 w-3.5' />
                        Salin JSON
                      </>
                    )}
                  </Button>
                </div>
                <div className='rounded-lg border bg-muted/30 p-4 font-mono text-xs overflow-x-auto'>
                  <pre className='whitespace-pre-wrap break-all'>{JSON.stringify(log.context, null, 2)}</pre>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
