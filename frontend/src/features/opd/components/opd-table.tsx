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
import { Building2 } from 'lucide-react'
import type { OpdItem } from '@/types/opd'
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
import { opdColumns as columns } from './opd-columns'
import { opdCategoryFilterOptions, opdStatusFilterOptions } from '../data/data'
import { useOpd } from './opd-provider'

interface OpdTableProps {
  data: OpdItem[]
}

export function OpdTable({ data }: OpdTableProps) {
  const { setTableFilters } = useOpd()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'urutan', desc: false },
  ])

  // Sync active filters to OpdProvider for export
  useEffect(() => {
    const filters: Record<string, unknown> = {}
    const namaFilter = columnFilters.find((f) => f.id === 'nama')
    if (namaFilter?.value && typeof namaFilter.value === 'string' && namaFilter.value.trim()) {
      filters.search = namaFilter.value.trim()
    }
    const kategoriFilter = columnFilters.find((f) => f.id === 'kategori')
    if (kategoriFilter?.value && Array.isArray(kategoriFilter.value) && kategoriFilter.value.length > 0) {
      filters.kategori = kategoriFilter.value[0]
    }
    const statusFilter = columnFilters.find((f) => f.id === 'is_active')
    if (statusFilter?.value && Array.isArray(statusFilter.value) && statusFilter.value.length > 0) {
      filters.status = statusFilter.value[0] ? 'active' : 'inactive'
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
        searchPlaceholder='Cari nama, kode, atau kepala instansi...'
        searchKey='nama'
        filters={[
          {
            columnId: 'kategori',
            title: 'Kategori',
            options: opdCategoryFilterOptions,
          },
          {
            columnId: 'is_active',
            title: 'Status',
            options: opdStatusFilterOptions,
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
                  className='hover:bg-muted/40 transition-colors'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'py-2.5',
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
                    <Building2 className='h-8 w-8 text-muted-foreground/40' />
                    <span>Tidak ada data perangkat daerah yang cocok.</span>
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
