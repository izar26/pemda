import { Fragment, useEffect, useMemo, useState } from 'react'
import {
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
import { useQuery } from '@tanstack/react-query'
import {
  Award,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { cn } from '@/lib/utils'
import { type NavigateFn, useTableUrlState } from '@/hooks/use-table-url-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DataTablePagination, DataTableToolbar } from '@/components/data-table'
import { type User } from '@/features/users/data/schema'
import { pegawaiColumns as columns } from './pegawai-columns'

type DataTableProps = {
  data: User[]
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function PegawaiTable({ data, search, navigate }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const { data: opds = [] } = useQuery({
    queryKey: ['opds', 'list'],
    queryFn: () => opdService.getOpds(),
    staleTime: 5 * 60 * 1000,
  })

  // 1. Sort data hierarchically: by OPD name, then Kepala OPD first, then by name
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aOpdName = a.opd?.nama || 'Belum Ditugaskan'
      const bOpdName = b.opd?.nama || 'Belum Ditugaskan'
      const opdCompare = aOpdName.localeCompare(bOpdName)
      if (opdCompare !== 0) return opdCompare

      const aIsKepala = a.jabatan === 'Kepala OPD' ? 0 : 1
      const bIsKepala = b.jabatan === 'Kepala OPD' ? 0 : 1
      if (aIsKepala !== bIsKepala) return aIsKepala - bIsKepala

      return a.name.localeCompare(b.name)
    })
  }, [data])

  // 2. Pre-calculate group statistics across the dataset
  const groupMetaMap = useMemo(() => {
    const map: Record<
      string,
      {
        groupId: string
        groupName: string
        groupCategory: string
        opdKepala: string | null
        totalCount: number
      }
    > = {}

    for (const item of data) {
      const groupId = item.opd ? String(item.opd.id) : 'unassigned'
      const groupName = item.opd?.nama || 'Belum Ditugaskan'
      const groupCategory = item.opd?.kategori || 'Perangkat Daerah'
      const opdKepala = item.opd?.kepala || null

      if (!map[groupId]) {
        map[groupId] = {
          groupId,
          groupName,
          groupCategory,
          opdKepala,
          totalCount: 0,
        }
      }
      map[groupId].totalCount += 1
    }

    return map
  }, [data])

  const allGroupIds = useMemo(() => Object.keys(groupMetaMap), [groupMetaMap])

  const isAllCollapsed =
    allGroupIds.length > 0 &&
    allGroupIds.every((id) => Boolean(collapsedGroups[id]))

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }))
  }

  const toggleAllGroups = () => {
    if (isAllCollapsed) {
      setCollapsedGroups({})
    } else {
      const next: Record<string, boolean> = {}
      allGroupIds.forEach((id) => {
        next[id] = true
      })
      setCollapsedGroups(next)
    }
  }

  const {
    columnFilters,
    onColumnFiltersChange,
    pagination,
    onPaginationChange,
    ensurePageInRange,
  } = useTableUrlState({
    search,
    navigate,
    pagination: { defaultPage: 1, defaultPageSize: 10 },
    globalFilter: { enabled: false },
    columnFilters: [
      { columnId: 'name', searchKey: 'name', type: 'string' },
      { columnId: 'jabatan', searchKey: 'jabatan', type: 'array' },
      { columnId: 'opd', searchKey: 'opd', type: 'array' },
    ],
  })

  const table = useReactTable({
    data: sortedData,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
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

  // Adaptive auto-expand when search / columnFilter is active
  useEffect(() => {
    const hasActiveFilter =
      columnFilters.length > 0 || Boolean(table.getState().globalFilter)
    if (hasActiveFilter) {
      setCollapsedGroups({})
    }
  }, [columnFilters, table])

  useEffect(() => {
    ensurePageInRange(table.getPageCount())
  }, [table, ensurePageInRange])

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari nama atau NIP pegawai...'
        searchKey='name'
        filters={[
          {
            columnId: 'jabatan',
            title: 'Jabatan',
            options: [
              { label: 'Kepala OPD', value: 'Kepala OPD' },
              { label: 'Pegawai', value: 'Pegawai' },
            ],
          },
          {
            columnId: 'opd',
            title: 'Instansi / OPD',
            options: (Array.isArray(opds) ? opds : []).map((o) => ({
              label: o.nama,
              value: o.nama,
            })),
          },
        ]}
      >
        <Button
          variant='outline'
          size='sm'
          onClick={toggleAllGroups}
          className='h-8 text-xs gap-1.5'
          title={isAllCollapsed ? 'Buka semua grup OPD' : 'Tutup semua grup OPD'}
        >
          {isAllCollapsed ? (
            <>
              <ChevronsUpDown className='h-3.5 w-3.5' />
              <span className='hidden sm:inline'>Buka Semua</span>
            </>
          ) : (
            <>
              <ChevronsDownUp className='h-3.5 w-3.5' />
              <span className='hidden sm:inline'>Tutup Semua</span>
            </>
          )}
        </Button>
      </DataTableToolbar>

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
              (() => {
                let lastGroupId: string | null = null
                return table.getRowModel().rows.map((row) => {
                  const pegawai = row.original
                  const groupId = pegawai.opd
                    ? String(pegawai.opd.id)
                    : 'unassigned'
                  const groupMeta = groupMetaMap[groupId] || {
                    groupName: pegawai.opd?.nama || 'Belum Ditugaskan',
                    groupCategory: pegawai.opd?.kategori || 'Perangkat Daerah',
                    opdKepala: pegawai.opd?.kepala || null,
                    totalCount: 1,
                  }

                  const isNewGroup = groupId !== lastGroupId
                  lastGroupId = groupId
                  const isCollapsed = Boolean(collapsedGroups[groupId])

                  return (
                    <Fragment key={row.id}>
                      {isNewGroup && (
                        <TableRow
                          className='bg-muted/60 dark:bg-muted/40 hover:bg-muted/80 cursor-pointer select-none border-y font-medium transition-colors'
                          onClick={() => toggleGroup(groupId)}
                        >
                          <TableCell
                            colSpan={columns.length}
                            className='py-2.5 px-3 sm:px-4'
                          >
                            <div className='flex items-center justify-between gap-3 flex-wrap'>
                              <div className='flex items-center gap-2 min-w-0'>
                                <span className='p-1 rounded-sm hover:bg-background/80 transition-transform'>
                                  {isCollapsed ? (
                                    <ChevronRight className='h-4 w-4 text-muted-foreground' />
                                  ) : (
                                    <ChevronDown className='h-4 w-4 text-primary' />
                                  )}
                                </span>
                                <Building2 className='h-4 w-4 text-muted-foreground shrink-0' />
                                <span className='font-bold text-sm text-foreground tracking-tight'>
                                  {groupMeta.groupName}
                                </span>
                                <Badge
                                  variant='outline'
                                  className='text-[10px] uppercase font-semibold px-1.5 py-0 border-border bg-background'
                                >
                                  {groupMeta.groupCategory}
                                </Badge>
                              </div>

                              <div className='flex items-center gap-2.5 text-xs text-muted-foreground ml-auto'>
                                {groupMeta.opdKepala ? (
                                  <span className='hidden md:inline-flex items-center gap-1 text-[11px] bg-background/80 px-2 py-0.5 rounded border'>
                                    <Award className='h-3 w-3 text-amber-500' />
                                    <span>Kepala:</span>
                                    <strong className='text-foreground'>
                                      {groupMeta.opdKepala}
                                    </strong>
                                  </span>
                                ) : (
                                  <span className='hidden md:inline-flex items-center gap-1 text-[11px] text-muted-foreground/80 italic'>
                                    Belum ada Kepala OPD
                                  </span>
                                )}
                                <Badge
                                  variant='secondary'
                                  className='font-mono text-xs px-2 py-0.5 font-semibold'
                                >
                                  {groupMeta.totalCount} Pegawai
                                </Badge>
                              </div>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {!isCollapsed && (
                        <TableRow
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
                      )}
                    </Fragment>
                  )
                })
              })()
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  Tidak ada data pegawai yang sesuai dengan kriteria pencarian.
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
