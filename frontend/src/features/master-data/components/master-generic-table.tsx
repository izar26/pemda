'use client'

import { useMemo, useState } from 'react'
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
  Edit,
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

  const items = useMemo(() => response?.data || [], [response?.data])

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
        id: 'index',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='No.' className='w-12 text-center' />
        ),
        cell: ({ row }) => (
          <span className='text-xs font-mono text-muted-foreground block text-center'>
            {row.index + 1}
          </span>
        ),
        enableSorting: false,
      },
    ]

    if (entity.hasCode) {
      cols.push({
        accessorKey: 'kode',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title='Kode' className='w-24' />
        ),
        cell: ({ row }) => {
          const code = row.getValue('kode') as string | undefined
          return (
            <Badge
              variant='outline'
              className='font-mono text-xs font-semibold bg-muted/30 border-muted-foreground/20'
            >
              {code || '-'}
            </Badge>
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
      cell: ({ row }) => (
        <div className='flex flex-col py-1 min-w-[180px]'>
          <span className='font-semibold text-sm text-foreground leading-tight'>
            {row.original.nama}
          </span>
          {row.original.nomor && (
            <span className='text-xs text-muted-foreground font-mono mt-0.5'>
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
        cell: ({ row }) => {
          const desc = row.original[descKey] as string | undefined
          return (
            <span className='text-xs text-muted-foreground line-clamp-2 max-w-sm'>
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
            className='w-28 text-center'
          />
        ),
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
        cell: ({ row }) => {
          const item = row.original
          return (
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
          )
        },
      }
    )

    return cols
  }, [entity, canEdit, canDelete, toggleActive, isToggling, setCurrentItem, setDeleteTarget, setOpen, setSelectedEntity])

  const table = useReactTable({
    data: items,
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
