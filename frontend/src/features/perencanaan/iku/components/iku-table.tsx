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
import type { IndikatorPenilaianItem } from '@/types/perencanaan'
import type { Opd } from '@/features/users/data/schema'
import { cn } from '@/lib/utils'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { ikuColumns as columns } from './iku-columns'
import { useIku } from './iku-provider'

interface IkuTableProps {
  data: IndikatorPenilaianItem[]
  opds?: Opd[]
}

export function IkuTable({ data, opds = [] }: IkuTableProps) {
  const { setTableFilters, activeJenisTab, setActiveJenisTab } = useIku()
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'urutan', desc: false },
  ])

  // Sync tab selection with table's jenis column filter
  useEffect(() => {
    setColumnFilters((prev) => {
      const filtered = prev.filter((f) => f.id !== 'jenis')
      if (activeJenisTab !== 'all') {
        return [...filtered, { id: 'jenis', value: activeJenisTab }]
      }
      return filtered
    })
  }, [activeJenisTab])

  // Sync active filters to IkuProvider for Excel export
  useEffect(() => {
    const filters: Record<string, unknown> = {}
    const searchFilter = columnFilters.find((f) => f.id === 'indikator')
    if (
      searchFilter?.value &&
      typeof searchFilter.value === 'string' &&
      searchFilter.value.trim()
    ) {
      filters.search = searchFilter.value.trim()
    }
    const opdFilter = columnFilters.find((f) => f.id === 'opd')
    if (
      opdFilter?.value &&
      Array.isArray(opdFilter.value) &&
      opdFilter.value.length > 0
    ) {
      const selectedName = opdFilter.value[0]
      const foundOpd = opds.find((o) => o.nama === selectedName || String(o.id) === selectedName)
      if (foundOpd) {
        filters.opd_id = String(foundOpd.id)
      }
    }
    if (activeJenisTab !== 'all') {
      filters.jenis = activeJenisTab
    }
    setTableFilters(filters)
  }, [columnFilters, opds, activeJenisTab, setTableFilters])

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

  const opdFilterOptions = useMemo(() => {
    return (opds || []).map((o) => ({
      label: o.nama,
      value: o.nama,
    }))
  }, [opds])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3'>
        <Tabs
          value={activeJenisTab}
          onValueChange={(val) => setActiveJenisTab(val as 'all' | 'IKU' | 'Biasa')}
          className='w-full sm:w-auto'
        >
          <TabsList className='grid grid-cols-3 w-full sm:w-auto h-9'>
            <TabsTrigger value='all' className='text-xs px-3'>
              Semua Indikator
            </TabsTrigger>
            <TabsTrigger value='IKU' className='text-xs px-3 font-semibold'>
              Hanya IKU
            </TabsTrigger>
            <TabsTrigger value='Biasa' className='text-xs px-3'>
              Indikator Renstra
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari rumusan indikator, IKU, target, sasaran, atau kode...'
        searchKey='indikator'
        filters={
          opdFilterOptions.length > 0
            ? [
                {
                  columnId: 'opd',
                  title: 'Perangkat Daerah',
                  options: opdFilterOptions,
                },
              ]
            : []
        }
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
                  className='group/row hover:bg-muted/40 transition-colors'
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(
                        'bg-transparent',
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
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  Tidak ada data indikator / IKU yang sesuai dengan kriteria pencarian.
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
