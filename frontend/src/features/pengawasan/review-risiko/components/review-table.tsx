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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import type { OpdReviewListItem } from '@/services/pengajuan-risiko-service'
import { getReviewColumns, type StatusCategory } from './review-columns'

interface ReviewTableProps {
  data: OpdReviewListItem[]
  onOpenReview: (params: {
    submissionId: string
    opdId: string
    periodeId: string
  }) => void
  activePeriodeId?: string
  statusFilter?: StatusCategory | 'semua'
  onStatusFilterChange?: (status: StatusCategory | 'semua') => void
}

export function ReviewTable({
  data,
  onOpenReview,
  activePeriodeId,
  statusFilter = 'semua',
  onStatusFilterChange,
}: ReviewTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'nama', desc: false },
  ])

  const columns = useMemo(
    () => getReviewColumns({ onOpenReview, activePeriodeId }),
    [onOpenReview, activePeriodeId]
  )

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: (updaterOrValue) => {
      setColumnFilters((old) => {
        const next =
          typeof updaterOrValue === 'function'
            ? updaterOrValue(old)
            : updaterOrValue
        const statusFilterObj = next.find((f) => f.id === 'status_review')
        const val = statusFilterObj?.value as string[] | undefined
        if (val && val.length === 1) {
          onStatusFilterChange?.(val[0] as StatusCategory)
        } else if (!val || val.length === 0) {
          onStatusFilterChange?.('semua')
        }
        return next
      })
    },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  // Sync external KPI card filter clicks into TanStack table filter state
  useEffect(() => {
    const currentFilter = columnFilters.find((f) => f.id === 'status_review')
      ?.value as string[] | undefined

    if (statusFilter === 'semua') {
      if (currentFilter && currentFilter.length > 0) {
        setColumnFilters((prev) => prev.filter((f) => f.id !== 'status_review'))
      }
    } else {
      if (!currentFilter || currentFilter.length !== 1 || currentFilter[0] !== statusFilter) {
        setColumnFilters((prev) => [
          ...prev.filter((f) => f.id !== 'status_review'),
          { id: 'status_review', value: [statusFilter] },
        ])
      }
    }
  }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className='space-y-4'>
      <DataTableToolbar
        table={table}
        searchKey='nama'
        searchPlaceholder='Cari perangkat daerah, kode, atau evaluator...'
        filters={[
          {
            columnId: 'tier',
            title: 'Tahap Approval',
            options: [
              { label: 'Tier 2: Kepala OPD', value: 'kepala' },
              { label: 'Tier 3: Evaluator', value: 'auditor' },
              { label: 'Tier 4: Pengawas', value: 'pengawas' },
              { label: 'Disahkan Final', value: 'approved' },
            ],
          },
          {
            columnId: 'status_review',
            title: 'Status Review',
            options: [
              { label: 'Menunggu Review', value: 'submitted' },
              { label: 'Perlu Revisi', value: 'revision_requested' },
              { label: 'Telah Disetujui', value: 'approved' },
            ],
          },
        ]}
      />

      <div className='overflow-hidden rounded-md border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    className={header.column.columnDef.meta?.className}
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
                  className='transition-colors hover:bg-muted/30'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cell.column.columnDef.meta?.tdClassName}
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
                  className='h-36 text-center text-xs text-muted-foreground'
                >
                  Belum ada pengajuan risiko perangkat daerah yang masuk pada tahap review Anda.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} />
    </div>
  )
}
