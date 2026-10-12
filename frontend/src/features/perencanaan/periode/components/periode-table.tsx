import { useEffect, useState } from 'react'
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
import { CalendarRange } from 'lucide-react'
import type { PeriodePenilaianItem } from '@/types/perencanaan'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { periodeColumns as columns } from './periode-columns'
import { periodeStatusFilterOptions } from '../data/data'
import { usePeriode } from './periode-provider'

interface PeriodeTableProps {
  data: PeriodePenilaianItem[]
}

export function PeriodeTable({ data }: PeriodeTableProps) {
  const { setTableFilters } = usePeriode()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'tahun_penilaian', desc: true },
  ])

  // Sync active filters to PeriodeProvider for export
  useEffect(() => {
    const filters: Record<string, unknown> = {}
    const searchFilter = columnFilters.find((f) => f.id === 'nama_periode')
    if (searchFilter?.value && typeof searchFilter.value === 'string' && searchFilter.value.trim()) {
      filters.search = searchFilter.value.trim()
    }
    const statusFilter = columnFilters.find((f) => f.id === 'status')
    if (statusFilter?.value && Array.isArray(statusFilter.value) && statusFilter.value.length > 0) {
      filters.status = statusFilter.value[0]
    }
    setTableFilters(filters)
  }, [columnFilters, setTableFilters])

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getPaginationRowModel: getPaginationRowModel(),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  })

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari nama periode atau tahun...'
        searchKey='nama_periode'
        filters={[
          {
            columnId: 'status',
            title: 'Status',
            options: periodeStatusFilterOptions,
          },
        ]}
      />

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
                  className={cn(
                    'hover:bg-muted/40 transition-colors',
                    row.original.is_aktif && 'bg-emerald-500/5 hover:bg-emerald-500/10'
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'py-3',
                        cell.column.columnDef.meta?.className,
                        cell.column.columnDef.meta?.tdClassName
                      )}
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
                  <div className='flex flex-col items-center justify-center gap-2'>
                    <CalendarRange className='h-8 w-8 text-muted-foreground/40' />
                    <span>Tidak ada data periode penilaian yang cocok.</span>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <DataTablePagination table={table} className='mt-auto' />
    </div>
  )
}
