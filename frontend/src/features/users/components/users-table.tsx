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
  Landmark,
  ShieldCheck,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { rbacService } from '@/services/rbac-service'
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
import { type User } from '../data/schema'
import { usersColumns as columns } from './users-columns'

type DataTableProps = {
  data: User[]
  search: Record<string, unknown>
  navigate: NavigateFn
}

export function UsersTable({ data, search, navigate }: DataTableProps) {
  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})

  const { data: roles = [] } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacService.getRoles,
    staleTime: 5 * 60 * 1000,
  })

  const { data: opds = [] } = useQuery({
    queryKey: ['opds', 'list'],
    queryFn: () => opdService.getOpds(),
    staleTime: 5 * 60 * 1000,
  })

  // 1. Sort data hierarchically: Pimpinan Daerah (Top), then OPD alphabetically, Kepala OPD first within OPD
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => {
      const aIsLeader =
        Boolean(a.is_pimpinan_daerah) ||
        (!a.opd_id &&
          (a.role === 'Executive' ||
            ['Bupati', 'Wakil Bupati', 'Sekda', 'Sekretaris Daerah', 'Pimpinan Daerah'].includes(
              a.jabatan || ''
            )))
      const bIsLeader =
        Boolean(b.is_pimpinan_daerah) ||
        (!b.opd_id &&
          (b.role === 'Executive' ||
            ['Bupati', 'Wakil Bupati', 'Sekda', 'Sekretaris Daerah', 'Pimpinan Daerah'].includes(
              b.jabatan || ''
            )))

      // Priority 1: Pimpinan Daerah always on top
      if (aIsLeader && !bIsLeader) return -1
      if (!aIsLeader && bIsLeader) return 1

      if (aIsLeader && bIsLeader) {
        // Bupati first, then Sekda
        const aIsBupati = a.jabatan === 'Bupati' || a.name.toLowerCase().includes('bupati') ? 0 : 1
        const bIsBupati = b.jabatan === 'Bupati' || b.name.toLowerCase().includes('bupati') ? 0 : 1
        if (aIsBupati !== bIsBupati) return aIsBupati - bIsBupati
        return a.name.localeCompare(b.name)
      }

      // Priority 2: OPD name alphabetically
      const aOpdName = a.opd?.nama || 'Belum Ditugaskan'
      const bOpdName = b.opd?.nama || 'Belum Ditugaskan'
      const opdCompare = aOpdName.localeCompare(bOpdName)
      if (opdCompare !== 0) return opdCompare

      // Priority 3: Inside same OPD -> Kepala OPD first
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
        isLeaderGroup: boolean
        opdKepala: string | null
        totalCount: number
        activeCount: number
      }
    > = {}

    for (const item of data) {
      const isLeader =
        Boolean(item.is_pimpinan_daerah) ||
        (!item.opd_id &&
          (item.role === 'Executive' ||
            ['Bupati', 'Wakil Bupati', 'Sekda', 'Sekretaris Daerah', 'Pimpinan Daerah'].includes(
              item.jabatan || ''
            )))
      const groupId = isLeader
        ? 'pemerintah-daerah'
        : item.opd
          ? String(item.opd.id)
          : 'unassigned'
      const groupName = isLeader
        ? 'Pemerintah Daerah'
        : item.opd?.nama || 'Belum Ditugaskan'
      const groupCategory = isLeader
        ? 'Pimpinan Daerah (Non-OPD)'
        : item.opd?.kategori || 'Perangkat Daerah'
      const opdKepala = isLeader ? null : item.opd?.kepala || null

      if (!map[groupId]) {
        map[groupId] = {
          groupId,
          groupName,
          groupCategory,
          isLeaderGroup: isLeader,
          opdKepala,
          totalCount: 0,
          activeCount: 0,
        }
      }
      map[groupId].totalCount += 1
      if (item.status === 'active') {
        map[groupId].activeCount += 1
      }
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
      { columnId: 'status', searchKey: 'status', type: 'array' },
      { columnId: 'role', searchKey: 'role', type: 'array' },
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

  const roleFilterOptions = (Array.isArray(roles) ? roles : []).map((r) => ({
    label: r.name,
    value: r.name,
  }))

  return (
    <div
      className={cn(
        'max-sm:has-[div[role="toolbar"]]:mb-16',
        'flex flex-1 flex-col gap-4'
      )}
    >
      <DataTableToolbar
        table={table}
        searchPlaceholder='Cari nama atau NIP pengguna...'
        searchKey='name'
        filters={[
          {
            columnId: 'status',
            title: 'Status Akun',
            options: [
              { label: 'Aktif', value: 'active' },
              { label: 'Nonaktif', value: 'inactive' },
            ],
          },
          {
            columnId: 'role',
            title: 'Peran',
            options: roleFilterOptions,
          },
          {
            columnId: 'opd',
            title: 'Instansi / OPD',
            options: [
              {
                label: 'Pemerintah Daerah (Pimpinan)',
                value: 'Pemerintah Daerah',
              },
              ...(Array.isArray(opds) ? opds : []).map((o) => ({
                label: o.nama,
                value: o.nama,
              })),
            ],
          },
        ]}
      >
        <Button
          variant='outline'
          size='sm'
          onClick={toggleAllGroups}
          className='h-8 text-xs gap-1.5'
          title={isAllCollapsed ? 'Buka semua grup instansi' : 'Tutup semua grup instansi'}
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
                {headerGroup.headers.map((header) => {
                  return (
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
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              (() => {
                let lastGroupId: string | null = null
                return table.getRowModel().rows.map((row) => {
                  const user = row.original
                  const isLeader =
                    Boolean(user.is_pimpinan_daerah) ||
                    (!user.opd_id &&
                      (user.role === 'Executive' ||
                        ['Bupati', 'Wakil Bupati', 'Sekda', 'Sekretaris Daerah', 'Pimpinan Daerah'].includes(
                          user.jabatan || ''
                        )))
                  const groupId = isLeader
                    ? 'pemerintah-daerah'
                    : user.opd
                      ? String(user.opd.id)
                      : 'unassigned'
                  const groupMeta = groupMetaMap[groupId] || {
                    groupName: isLeader
                      ? 'Pemerintah Daerah'
                      : user.opd?.nama || 'Belum Ditugaskan',
                    groupCategory: isLeader
                      ? 'Pimpinan Daerah (Non-OPD)'
                      : user.opd?.kategori || 'Perangkat Daerah',
                    isLeaderGroup: isLeader,
                    opdKepala: null,
                    totalCount: 1,
                    activeCount: 1,
                  }

                  const isNewGroup = groupId !== lastGroupId
                  lastGroupId = groupId
                  const isCollapsed = Boolean(collapsedGroups[groupId])

                  return (
                    <Fragment key={row.id}>
                      {isNewGroup && (
                        <TableRow
                          className={cn(
                            'hover:bg-muted/80 cursor-pointer select-none border-y font-medium transition-colors',
                            isLeader
                              ? 'bg-amber-500/10 dark:bg-amber-500/15 border-amber-500/30'
                              : 'bg-muted/60 dark:bg-muted/40'
                          )}
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
                                    <ChevronDown
                                      className={cn(
                                        'h-4 w-4',
                                        isLeader
                                          ? 'text-amber-600 dark:text-amber-400'
                                          : 'text-primary'
                                      )}
                                    />
                                  )}
                                </span>
                                {isLeader ? (
                                  <Landmark className='h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0' />
                                ) : (
                                  <Building2 className='h-4 w-4 text-muted-foreground shrink-0' />
                                )}
                                <span className='font-bold text-sm text-foreground tracking-tight'>
                                  {groupMeta.groupName}
                                </span>
                                {!isLeader && (
                                  <Badge
                                    variant='outline'
                                    className='text-[10px] uppercase font-semibold px-1.5 py-0 border-border bg-background text-muted-foreground'
                                  >
                                    {groupMeta.groupCategory}
                                  </Badge>
                                )}
                              </div>

                              <div className='flex items-center gap-2.5 text-xs text-muted-foreground ml-auto'>
                                {groupMeta.opdKepala && (
                                  <span className='hidden md:inline-flex items-center gap-1 text-[11px] bg-background/80 px-2 py-0.5 rounded border'>
                                    <Award className='h-3 w-3 text-amber-500' />
                                    <span>Kepala:</span>
                                    <strong className='text-foreground'>
                                      {groupMeta.opdKepala}
                                    </strong>
                                  </span>
                                )}
                                <div className='flex items-center gap-1.5'>
                                  <Badge
                                    variant='secondary'
                                    className='font-mono text-xs px-2 py-0.5 font-semibold'
                                  >
                                    {groupMeta.totalCount} Akun
                                  </Badge>
                                  {groupMeta.activeCount > 0 && (
                                    <Badge
                                      variant='outline'
                                      className='hidden sm:inline-flex text-[10px] font-mono border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1.5 py-0'
                                    >
                                      <ShieldCheck className='h-2.5 w-2.5 mr-0.5 inline' />
                                      {groupMeta.activeCount} Aktif
                                    </Badge>
                                  )}
                                </div>
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
                  Tidak ada akun user yang sesuai dengan kriteria pencarian.
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
