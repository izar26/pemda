import { useEffect, useMemo, useState } from 'react'
import {
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Cross2Icon,
} from '@radix-ui/react-icons'
import {
  Archive,
  Loader2,
  Lock,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { AuditLog } from '@/types/audit'
import { auditService } from '@/services/audit-service'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DataTableFacetedFilter,
  DataTablePagination,
  DataTableViewOptions,
} from '@/components/data-table'
import { auditColumns as columns } from './audit-columns'
import { moduleFilterOptions } from '../data/data'
import { useAuditLogs } from './audit-logs-provider'
import { AuditLogsBulkActions } from './audit-logs-bulk-actions'
import {
  AuditDateRangeFilter,
  type AuditDateFilterState,
} from './audit-date-range-filter'

interface AuditLogsTableProps {
  data: AuditLog[]
  isArchiveTab?: boolean
  /** Total records on the server (may exceed the loaded window) */
  totalCount?: number
}

export function AuditLogsTable({
  data,
  isArchiveTab = false,
  totalCount,
}: AuditLogsTableProps) {
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.auth.user)
  const isSuperadmin =
    (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false

  const { setSelectedLog, setSheetOpen, setTableFilters } = useAuditLogs()

  // Table states
  const [globalFilter, setGlobalFilter] = useState('')
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ])

  // Date Range Filtering state
  const [dateFilter, setDateFilter] = useState<AuditDateFilterState>({
    preset: 'all',
  })
  const [filterArchiveDialogOpen, setFilterArchiveDialogOpen] = useState(false)

  // Sync active table filters to context for export
  useEffect(() => {
    const filters: Record<string, unknown> = {}
    if (globalFilter.trim()) filters.search = globalFilter.trim()
    const moduleFilter = columnFilters.find((f) => f.id === 'module')
    if (moduleFilter?.value && Array.isArray(moduleFilter.value) && moduleFilter.value.length > 0) {
      filters.module = moduleFilter.value[0]
    }
    const actionFilter = columnFilters.find((f) => f.id === 'action')
    if (actionFilter?.value && Array.isArray(actionFilter.value) && actionFilter.value.length > 0) {
      filters.action = actionFilter.value[0]
    }
    if (dateFilter.range?.from) {
      filters.date_from = dateFilter.range.from.toISOString().slice(0, 10)
    }
    if (dateFilter.range?.to) {
      filters.date_to = dateFilter.range.to.toISOString().slice(0, 10)
    }
    setTableFilters(filters)
  }, [globalFilter, columnFilters, dateFilter, setTableFilters])

  // Filter dataset by date range first
  const filteredByDate = useMemo(() => {
    if (dateFilter.preset === 'all' || !dateFilter.range?.from) {
      return data
    }
    const fromTime = dateFilter.range.from.getTime()
    const toTime = dateFilter.range.to ? dateFilter.range.to.getTime() : fromTime

    return data.filter((log) => {
      const logTime = new Date(log.created_at).getTime()
      return logTime >= fromTime && logTime <= toTime
    })
  }, [data, dateFilter])

  const table = useReactTable({
    data: filteredByDate,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    enableRowSelection: true,
    getRowId: (row) => row.id,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = String(filterValue || '').toLowerCase().trim()
      if (!search) return true
      const log = row.original
      return (
        Boolean(log.description?.toLowerCase().includes(search)) ||
        Boolean(log.user_name?.toLowerCase().includes(search)) ||
        Boolean(log.user_nip?.toLowerCase().includes(search)) ||
        Boolean(log.user_email?.toLowerCase().includes(search)) ||
        Boolean(log.ip_address?.toLowerCase().includes(search)) ||
        Boolean(log.module?.toLowerCase().includes(search)) ||
        Boolean(log.action?.toLowerCase().includes(search))
      )
    },
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Visible filtered rows
  const allFilteredRows = table.getFilteredRowModel().rows
  const filteredLogs = allFilteredRows.map((r) => r.original)

  const isFiltered =
    globalFilter.trim().length > 0 ||
    columnFilters.length > 0 ||
    (dateFilter.preset !== 'all' && Boolean(dateFilter.range?.from))

  const handleResetFilters = () => {
    table.resetColumnFilters()
    table.resetGlobalFilter()
    setGlobalFilter('')
    setDateFilter({ preset: 'all', range: undefined })
  }

  // Mutation to archive all rows currently matching the active filter
  const archiveFilterMutation = useMutation({
    mutationFn: async () => {
      const ids = filteredLogs.map((l) => l.id)
      return auditService.triggerArchivePurge({ ids })
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] })
      queryClient.invalidateQueries({ queryKey: ['audit-archives'] })
      queryClient.invalidateQueries({ queryKey: ['audit-stats'] })
      table.resetRowSelection()
      setFilterArchiveDialogOpen(false)
      toast.success(res.message)
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal mengarsipkan log hasil filter.'
      toast.error(msg)
    },
  })

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      {/* Unified Professional Toolbar */}
      <div className='flex flex-wrap items-center justify-between gap-2.5'>
        {/* Left: Search + Module Filter + Date Range Filter + Reset */}
        <div className='flex flex-wrap items-center gap-2'>
          <Input
            placeholder='Cari nama, NIP, deskripsi, IP...'
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className='h-8 w-44 sm:w-60 text-xs'
          />

          {/* Module Faceted Filter */}
          {table.getColumn('module') && (
            <DataTableFacetedFilter
              column={table.getColumn('module')}
              title='Modul'
              options={moduleFilterOptions}
            />
          )}

          {/* Date Range Picker Popover Filter */}
          <AuditDateRangeFilter
            value={dateFilter}
            onChange={setDateFilter}
          />

          {/* Reset Filters Button */}
          {isFiltered && (
            <Button
              variant='ghost'
              size='sm'
              onClick={handleResetFilters}
              className='h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1'
            >
              Reset
              <Cross2Icon className='h-3.5 w-3.5' />
            </Button>
          )}
        </div>

        {/* Right: "Arsipkan Hasil Filter" Button (Superadmin on active tab only) + View Options */}
        <div className='flex items-center gap-2 ml-auto'>
          {isSuperadmin && !isArchiveTab && isFiltered && filteredLogs.length > 0 && (
            <Button
              variant='outline'
              size='sm'
              className='h-8 text-xs gap-1.5 border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary font-medium'
              onClick={() => setFilterArchiveDialogOpen(true)}
            >
              <Archive className='h-3.5 w-3.5' />
              Arsipkan Hasil Filter ({filteredLogs.length})
            </Button>
          )}

          <DataTableViewOptions table={table} />
        </div>
      </div>

      {totalCount !== undefined && totalCount > data.length && (
        <p className='-mt-2 text-[11px] text-muted-foreground'>
          Menampilkan {data.length.toLocaleString('id-ID')} catatan terbaru dari total{' '}
          {totalCount.toLocaleString('id-ID')}. Pencarian &amp; filter hanya berlaku pada
          catatan yang dimuat.
          {isSuperadmin && !isArchiveTab && (
            <>
              {' '}Gunakan <strong>Arsipkan &amp; Bersihkan Log</strong> untuk data yang lebih lama.
            </>
          )}
        </p>
      )}

      {/* Main Table */}
      <div className='overflow-hidden rounded-md border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className='group/row'>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={cn(
                      'bg-muted/30 group-hover/row:bg-muted/50 font-bold text-xs',
                      header.column.columnDef.meta?.className,
                      header.column.columnDef.meta?.thClassName
                    )}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className='group/row hover:bg-muted/40 transition-colors cursor-pointer'
                  onClick={() => {
                    setSelectedLog(row.original)
                    setSheetOpen(true)
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-transparent py-2.5',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
                      onClick={(e) => {
                        // Prevent opening detail sheet when clicking checkbox or action button
                        if (
                          cell.column.id === 'actions' ||
                          cell.column.id === 'select'
                        ) {
                          e.stopPropagation()
                        }
                      }}
                    >
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  Tidak ada catatan log audit yang sesuai dengan kriteria filter saat ini.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />

      {/* Floating Checkbox Bulk Action Bar */}
      <AuditLogsBulkActions table={table} isArchiveTab={isArchiveTab} />

      {/* Dialog for "Arsipkan Hasil Filter Ini" */}
      <Dialog
        open={filterArchiveDialogOpen}
        onOpenChange={setFilterArchiveDialogOpen}
      >
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <div className='flex items-center gap-2 text-primary'>
              <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10'>
                <Archive className='h-5 w-5 text-primary' />
              </div>
              <div>
                <DialogTitle className='text-base'>
                  Arsipkan Semua Hasil Filter
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Pindahkan seluruh {filteredLogs.length} catatan yang cocok dengan filter saat ini ke Kubah Arsip.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='rounded-lg border bg-muted/30 p-3 space-y-1.5'>
              <div className='flex justify-between text-muted-foreground'>
                <span>Total Data Cocok Filter:</span>
                <span className='font-bold text-foreground'>{filteredLogs.length} Catatan</span>
              </div>
              <div className='flex justify-between text-muted-foreground'>
                <span>Tujuan Pengarsipan:</span>
                <span className='font-medium text-emerald-600 dark:text-emerald-400'>
                  Kubah Arsip Permanen (WORM / Read-Only)
                </span>
              </div>
            </div>

            <div className='flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 dark:border-amber-900/60 dark:bg-amber-950/30 p-2.5'>
              <Lock className='h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
              <p className='text-[11px] text-amber-950 dark:text-amber-200 leading-relaxed'>
                <strong>Tips Pengecualian:</strong> Jika ada 1 atau 2 log yang <strong>tidak ingin Anda arsipkan</strong>, Anda bisa membatalkan dialog ini, centang baris yang ingin diarsipkan secara manual menggunakan checkbox di tabel, dan gunakan tombol baris melayang di bawah.
              </p>
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='text-xs'
              onClick={() => setFilterArchiveDialogOpen(false)}
              disabled={archiveFilterMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              variant='default'
              size='sm'
              className='text-xs gap-1.5 bg-primary'
              onClick={() => archiveFilterMutation.mutate()}
              disabled={archiveFilterMutation.isPending}
            >
              {archiveFilterMutation.isPending ? (
                <>
                  <Loader2 className='h-3.5 w-3.5 animate-spin' />
                  Memindahkan...
                </>
              ) : (
                <>
                  <Archive className='h-3.5 w-3.5' />
                  Arsipkan Semua ({filteredLogs.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
