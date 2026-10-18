import { useEffect, useMemo, useState } from 'react'
import {
  type ColumnDef,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ArrowDown,
  ArrowUp,
  Edit,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { masterDataService } from '@/services/master-data-service'
import { usePermissions } from '@/hooks/use-permissions'
import type {
  MasterDataBaseItem,
  MasterEntityMeta,
} from '@/types/master-data'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
} from '@/components/data-table'
import { useMasterData } from './master-data-provider'

interface MasterGenericTableProps {
  entity: MasterEntityMeta
}

export function MasterGenericTable({ entity }: MasterGenericTableProps) {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canEdit = hasPermission('master.edit')
  const canDelete = hasPermission('master.delete')

  const { setOpen, setCurrentItem, setDeleteTarget, setSelectedEntity } =
    useMasterData()

  const [rowSelection, setRowSelection] = useState({})
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [sorting, setSorting] = useState<SortingState>([])

  // Query data
  const {
    data: response,
    isLoading,
  } = useQuery({
    queryKey: ['master', entity.key],
    queryFn: () => masterDataService.getItems(entity.key),
  })

  const [localItems, setLocalItems] = useState<MasterDataBaseItem[]>([])
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  useEffect(() => {
    if (response?.data) {
      setLocalItems(response.data)
    }
  }, [response?.data])

  const canReorder =
    canEdit &&
    columnFilters.length === 0 &&
    (sorting.length === 0 || (sorting[0].id === 'urutan' && !sorting[0].desc))

  async function handleReorder(sourceId: string, targetId: string) {
    if (sourceId === targetId) return
    const fromIndex = localItems.findIndex((it) => it.id === sourceId)
    const toIndex = localItems.findIndex((it) => it.id === targetId)
    if (fromIndex === -1 || toIndex === -1) return

    const reordered = [...localItems]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(toIndex, 0, moved)

    const updated = reordered.map((item, idx) => ({
      ...item,
      urutan: idx + 1,
    }))
    setLocalItems(updated)

    try {
      await masterDataService.reorderItems(
        entity.key,
        updated.map((it) => it.id)
      )
      toast.success(`Urutan ${entity.label} berhasil diperbarui.`)
      queryClient.invalidateQueries({ queryKey: ['master', entity.key] })
    } catch {
      toast.error(`Gagal memperbarui urutan ${entity.label}.`)
      queryClient.invalidateQueries({ queryKey: ['master', entity.key] })
    }
  }

  function handleMoveUp(id: string) {
    const index = localItems.findIndex((it) => it.id === id)
    if (index > 0) {
      handleReorder(id, localItems[index - 1].id)
    }
  }

  function handleMoveDown(id: string) {
    const index = localItems.findIndex((it) => it.id === id)
    if (index < localItems.length - 1 && index !== -1) {
      handleReorder(id, localItems[index + 1].id)
    }
  }

  // Toggle active mutation
  const { mutate: toggleActive, isPending: isToggling } = useMutation({
    mutationFn: (id: string) => masterDataService.toggleActive(entity.key, id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['master', entity.key] })
      toast.success(res.message)
    },
    onError: (err) => {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal mengubah status aktif.'
      toast.error(msg)
    },
  })

  const columns = useMemo<ColumnDef<MasterDataBaseItem>[]>(() => {
    const cols: ColumnDef<MasterDataBaseItem>[] = [
      {
        id: 'urutan',
        accessorKey: 'urutan',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Urutan' className='w-24 text-center' />
        ),
        meta: {
          className: 'w-24 text-center',
          thClassName: 'text-center',
          tdClassName: 'text-center',
        },
        cell: ({ row }) => {
          const item = row.original
          const index = row.index
          const isFirst = index === 0
          const isLast = index === localItems.length - 1

          return (
            <div className='flex items-center justify-center gap-1.5'>
              {canEdit && canReorder && (
                <div
                  className='cursor-grab active:cursor-grabbing text-muted-foreground/60 hover:text-foreground p-0.5'
                  title='Tarik untuk ubah urutan'
                >
                  <GripVertical className='h-3.5 w-3.5' />
                </div>
              )}
              <span className='font-mono text-xs font-semibold px-1.5 py-0.5 rounded bg-muted/60 text-foreground min-w-[24px] text-center'>
                {item.urutan ?? index + 1}
              </span>
              {canEdit && canReorder && (
                <div className='flex flex-col -space-y-1'>
                  <button
                    type='button'
                    disabled={isFirst}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveUp(item.id)
                    }}
                    className='p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none'
                    title='Pindah ke atas'
                  >
                    <ArrowUp className='h-3 w-3' />
                  </button>
                  <button
                    type='button'
                    disabled={isLast}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleMoveDown(item.id)
                    }}
                    className='p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none'
                    title='Pindah ke bawah'
                  >
                    <ArrowDown className='h-3 w-3' />
                  </button>
                </div>
              )}
            </div>
          )
        },
        enableSorting: false,
      },
    ]

    if (entity.hasCode) {
      cols.push({
        accessorKey: 'kode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Kode' className='w-24 justify-center' />
        ),
        meta: {
          className: 'w-28 min-w-[90px] text-center',
          thClassName: 'text-center',
          tdClassName: 'text-center',
        },
        cell: ({ row }) => {
          const code = row.getValue('kode') as string | undefined
          return (
            <div className='flex justify-center'>
              <Badge
                variant='outline'
                className='font-mono text-xs font-semibold bg-muted/30 border-muted-foreground/20'
              >
                {code || '-'}
              </Badge>
            </div>
          )
        },
        enableSorting: true,
      })
    }

    cols.push({
      accessorKey: 'nama',
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={`Nama ${entity.label}`} />
      ),
      meta: {
        className: 'min-w-[220px]',
        tdClassName: 'whitespace-normal',
      },
      cell: ({ row }) => (
        <div className='flex flex-col py-1 min-w-0'>
          <span className='font-semibold text-sm text-foreground leading-snug whitespace-normal break-words'>
            {row.original.nama}
          </span>
          {row.original.nomor && (
            <span className='text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap'>
              Nomor: {row.original.nomor}
            </span>
          )}
        </div>
      ),
      enableSorting: true,
    })

    if (entity.descField) {
      const descKey = entity.descField
      cols.push({
        accessorKey: descKey,
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title={entity.descLabel || 'Definisi / Deskripsi'}
          />
        ),
        meta: {
          className: 'min-w-[260px]',
          tdClassName: 'whitespace-normal',
        },
        cell: ({ row }) => {
          const desc = row.original[descKey] as string | undefined
          return (
            <span className='text-xs text-muted-foreground line-clamp-3 whitespace-normal break-words'>
              {desc || '-'}
            </span>
          )
        },
        enableSorting: false,
      })
    }

    cols.push(
      {
        accessorKey: 'is_active',
        header: ({ column }) => (
          <DataTableColumnHeader
            column={column}
            title='Status'
            className='w-28 justify-center'
          />
        ),
        meta: {
          className: 'w-36 min-w-[130px] text-center',
          thClassName: 'text-center',
          tdClassName: 'text-center',
        },
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className='flex items-center justify-center gap-2'>
              <Switch
                checked={item.is_active}
                onCheckedChange={() => toggleActive(item.id)}
                disabled={!canEdit || isToggling}
                className='data-[state=checked]:bg-emerald-600'
              />
              <Badge
                variant='outline'
                className={`text-[11px] font-medium ${
                  item.is_active
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-muted-foreground/30 bg-muted/40 text-muted-foreground'
                }`}
              >
                {item.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </div>
          )
        },
        filterFn: (row, id, value) => {
          const isActive = row.getValue(id) as boolean
          const str = isActive ? 'true' : 'false'
          return value.includes(str)
        },
        enableSorting: true,
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Aksi</div>,
        meta: {
          className: 'w-16 min-w-[60px] text-right',
          thClassName: 'text-right',
          tdClassName: 'text-right',
        },
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className='flex items-center justify-end'>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant='ghost'
                    className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
                  >
                    <MoreHorizontal className='h-4 w-4' />
                    <span className='sr-only'>Buka menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end' className='w-40'>
                  {canEdit && (
                    <DropdownMenuItem
                      onClick={() => {
                        setSelectedEntity(entity)
                        setCurrentItem(item)
                        setOpen('edit')
                      }}
                    >
                      <Edit className='mr-2 h-4 w-4' />
                      Ubah Data
                    </DropdownMenuItem>
                  )}
                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          setSelectedEntity(entity)
                          setDeleteTarget({
                            entityKey: entity.key,
                            id: item.id,
                            name: item.nama,
                            label: entity.label,
                          })
                          setOpen('delete')
                        }}
                        className='text-destructive focus:text-destructive'
                      >
                        <Trash2 className='mr-2 h-4 w-4' />
                        Hapus Data
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )
        },
      }
    )

    return cols
  }, [
    entity,
    canEdit,
    canDelete,
    canReorder,
    localItems,
    toggleActive,
    isToggling,
    setCurrentItem,
    setDeleteTarget,
    setOpen,
    setSelectedEntity,
  ])

  const table = useReactTable({
    data: localItems,
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
        searchPlaceholder={`Cari data ${entity.label.toLowerCase()}...`}
        searchKey='nama'
        filters={[
          {
            columnId: 'is_active',
            title: 'Status',
            options: [
              { label: 'Aktif', value: 'true' },
              { label: 'Nonaktif', value: 'false' },
            ],
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  <div className='flex items-center justify-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin text-primary' />
                    <span>Memuat data {entity.label}...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  draggable={canReorder}
                  onDragStart={(e) => {
                    if (!canReorder) return
                    setDraggedId(row.original.id)
                    e.dataTransfer.effectAllowed = 'move'
                  }}
                  onDragOver={(e) => {
                    if (!canReorder || !draggedId || draggedId === row.original.id) return
                    e.preventDefault()
                    setDragOverId(row.original.id)
                  }}
                  onDragLeave={() => {
                    setDragOverId(null)
                  }}
                  onDrop={(e) => {
                    if (!canReorder || !draggedId || draggedId === row.original.id) return
                    e.preventDefault()
                    handleReorder(draggedId, row.original.id)
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  onDragEnd={() => {
                    setDraggedId(null)
                    setDragOverId(null)
                  }}
                  data-state={row.getIsSelected() && 'selected'}
                  className={cn(
                    'group/row hover:bg-muted/40 transition-colors',
                    draggedId === row.original.id && 'opacity-40 bg-muted/60',
                    dragOverId === row.original.id && 'border-t-2 border-primary bg-primary/5'
                  )}
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
                  Tidak ada data {entity.label.toLowerCase()} yang sesuai dengan kriteria.
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
