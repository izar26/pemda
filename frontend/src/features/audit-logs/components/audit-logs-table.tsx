import { useState } from 'react'
import {
  Filter,
  Info,
  Search as SearchIcon,
} from 'lucide-react'
import type { AuditLog } from '@/types/audit'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AuditDetailDialog } from './audit-detail-dialog'

interface AuditLogsTableProps {
  logs: AuditLog[]
  searchQuery: string
  onSearchChange: (val: string) => void
  moduleFilter: string
  onModuleChange: (val: string) => void
  isLoading: boolean
}

export function AuditLogsTable({
  logs,
  searchQuery,
  onSearchChange,
  moduleFilter,
  onModuleChange,
  isLoading,
}: AuditLogsTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  function handleOpenDetail(log: AuditLog) {
    setSelectedLog(log)
    setDetailOpen(true)
  }

  function getModuleBadge(module: string) {
    switch (module) {
      case 'Autentikasi':
        return <Badge variant='outline' className='bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200'>{module}</Badge>
      case 'Pegawai':
        return <Badge variant='outline' className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200'>{module}</Badge>
      case 'Peran & Izin':
        return <Badge variant='outline' className='bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200'>{module}</Badge>
      case 'Pengaturan Sistem':
        return <Badge variant='outline' className='bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200'>{module}</Badge>
      default:
        return <Badge variant='outline'>{module}</Badge>
    }
  }

  return (
    <>
      <div className='flex flex-col gap-3'>
        {/* Toolbar Filter & Search */}
        <div className='flex flex-wrap items-center justify-between gap-2.5 rounded-lg border bg-card px-3 py-2 shadow-2xs'>
          <div className='flex flex-1 flex-wrap items-center gap-2.5'>
            <div className='relative flex-1 min-w-[220px] max-w-sm'>
              <SearchIcon className='absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground' />
              <Input
                placeholder='Cari nama, NIP, deskripsi, atau IP...'
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className='h-8 pl-8 text-xs bg-muted/30'
              />
            </div>

            <div className='flex items-center gap-1.5'>
              <Filter className='h-3 w-3 text-muted-foreground' />
              <Select value={moduleFilter} onValueChange={onModuleChange}>
                <SelectTrigger className='h-8 text-xs w-[170px] bg-muted/30'>
                  <SelectValue placeholder='Pilih Modul' />
                </SelectTrigger>
                <SelectContent className='text-xs'>
                  <SelectItem value='all'>Semua Modul</SelectItem>
                  <SelectItem value='Autentikasi'>Autentikasi</SelectItem>
                  <SelectItem value='Pegawai'>Pegawai</SelectItem>
                  <SelectItem value='Peran & Izin'>Peran & Izin</SelectItem>
                  <SelectItem value='Pengaturan Sistem'>Pengaturan Sistem</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className='text-[11px] text-muted-foreground'>
            Menampilkan <span className='font-semibold text-foreground'>{logs.length}</span> catatan log
          </div>
        </div>

        {/* Table */}
        <div className='rounded-lg border bg-card overflow-hidden shadow-2xs'>
          <Table>
            <TableHeader>
              <TableRow className='bg-muted/30 hover:bg-muted/30 text-xs font-semibold'>
                <TableHead className='w-[160px]'>Waktu & Tanggal</TableHead>
                <TableHead className='w-[180px]'>Pelaksana / Pegawai</TableHead>
                <TableHead className='w-[130px]'>Modul</TableHead>
                <TableHead className='w-[120px]'>Aksi</TableHead>
                <TableHead>Deskripsi Aktivitas</TableHead>
                <TableHead className='w-[120px]'>Alamat IP</TableHead>
                <TableHead className='w-[60px] text-center'>Detail</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <TableRow key={log.id} className='text-xs hover:bg-muted/20 transition-colors'>
                    <TableCell className='text-muted-foreground whitespace-nowrap font-mono text-[11px]'>
                      {new Date(log.created_at).toLocaleString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </TableCell>
                    <TableCell>
                      <div className='font-medium text-foreground'>{log.user_name}</div>
                      {log.user_nip ? (
                        <div className='text-[10px] text-muted-foreground'>NIP: {log.user_nip}</div>
                      ) : (
                        <div className='text-[10px] text-muted-foreground'>{log.user_email || 'Sistem Otomatis'}</div>
                      )}
                    </TableCell>
                    <TableCell>{getModuleBadge(log.module)}</TableCell>
                    <TableCell>
                      <span className='font-mono font-semibold text-[11px] text-foreground'>{log.action}</span>
                    </TableCell>
                    <TableCell className='text-muted-foreground max-w-xs truncate' title={log.description}>
                      {log.description}
                    </TableCell>
                    <TableCell className='font-mono text-[11px] text-muted-foreground'>
                      {log.ip_address || '-'}
                    </TableCell>
                    <TableCell className='text-center'>
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                        onClick={() => handleOpenDetail(log)}
                        title='Lihat detail log'
                      >
                        <Info className='h-3.5 w-3.5' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className='h-32 text-center text-muted-foreground text-xs'>
                    {isLoading
                      ? 'Memuat data catatan log audit...'
                      : 'Belum ada catatan log audit yang sesuai dengan filter.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AuditDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        log={selectedLog}
      />
    </>
  )
}
