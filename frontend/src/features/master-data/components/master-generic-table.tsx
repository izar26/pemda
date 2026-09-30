'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MasterActionDialog } from './master-action-dialog'

interface MasterGenericTableProps {
  entity: MasterEntityMeta
}

export function MasterGenericTable({ entity }: MasterGenericTableProps) {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('master.create')
  const canEdit = hasPermission('master.edit')
  const canDelete = hasPermission('master.delete')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'true' | 'false'>('all')

  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MasterDataBaseItem | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState<MasterDataBaseItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Query data
  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['master', entity.key, filterActive],
    queryFn: () =>
      masterDataService.getItems(entity.key, {
        is_active: filterActive === 'all' ? undefined : filterActive,
      }),
  })

  const items = response?.data || []

  // Client-side search filter for instantaneous typing response
  const filteredItems = items.filter((item) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const matchName = item.nama?.toLowerCase().includes(term)
    const matchCode = item.kode?.toLowerCase().includes(term)
    const matchDesc =
      item.definisi?.toLowerCase().includes(term) ||
      item.deskripsi?.toLowerCase().includes(term)
    return matchName || matchCode || matchDesc
  })

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: (id: number) => masterDataService.toggleActive(entity.key, id),
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

  async function handleDelete() {
    if (!itemToDelete) return
    setIsDeleting(true)
    try {
      const res = await masterDataService.deleteItem(entity.key, itemToDelete.id)
      queryClient.invalidateQueries({ queryKey: ['master', entity.key] })
      toast.success(res.message)
      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (err) {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal menghapus data master.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className='space-y-4'>
      {/* Table Toolbar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-2 flex-1 max-w-sm'>
          <div className='relative w-full'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder={`Cari ${entity.label.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className='pl-8 h-9 text-xs'
            />
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className='h-9 px-2.5'
            title='Segarkan data'
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>

        <div className='flex items-center gap-2 justify-end'>
          <div className='flex items-center gap-1.5 border rounded-lg p-1 bg-muted/20 text-xs'>
            <button
              onClick={() => setFilterActive('all')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filterActive === 'all'
                  ? 'bg-background text-foreground shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Semua ({items.length})
            </button>
            <button
              onClick={() => setFilterActive('true')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filterActive === 'true'
                  ? 'bg-background text-emerald-600 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Aktif
            </button>
            <button
              onClick={() => setFilterActive('false')}
              className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                filterActive === 'false'
                  ? 'bg-background text-amber-600 shadow-2xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Nonaktif
            </button>
          </div>

          {canCreate && (
            <Button
              size='sm'
              className='h-9 gap-1.5 font-semibold text-xs'
              onClick={() => {
                setSelectedItem(null)
                setActionDialogOpen(true)
              }}
            >
              <Plus className='h-4 w-4' />
              Tambah Data
            </Button>
          )}
        </div>
      </div>

      {/* Main Table Card */}
      <div className='overflow-hidden rounded-md border bg-card shadow-2xs'>
        <Table>
          <TableHeader>
            <TableRow className='bg-muted/30'>
              <TableHead className='w-12 text-center text-xs font-bold'>No.</TableHead>
              {entity.hasCode && (
                <TableHead className='w-24 text-xs font-bold'>Kode</TableHead>
              )}
              <TableHead className='text-xs font-bold'>Nama {entity.label}</TableHead>
              {entity.key === 'entitas-penilaian' && (
                <TableHead className='text-xs font-bold'>Relasi OPD</TableHead>
              )}
              {entity.descField && (
                <TableHead className='text-xs font-bold max-w-sm'>
                  {entity.descLabel || 'Definisi / Deskripsi'}
                </TableHead>
              )}
              <TableHead className='w-28 text-center text-xs font-bold'>Status</TableHead>
              <TableHead className='w-24 text-right text-xs font-bold pr-4'>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-32 text-center text-muted-foreground text-sm'
                >
                  <div className='flex items-center justify-center gap-2'>
                    <Loader2 className='h-4 w-4 animate-spin text-primary' />
                    <span>Memuat data master...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className='h-32 text-center text-muted-foreground text-xs'
                >
                  {searchTerm
                    ? `Tidak ada data ${entity.label.toLowerCase()} yang sesuai dengan "${searchTerm}".`
                    : `Belum ada data ${entity.label.toLowerCase()}.`}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((item, index) => {
                const descText =
                  item.definisi || item.deskripsi || '-'

                return (
                  <TableRow
                    key={item.id}
                    className='hover:bg-muted/40 transition-colors group'
                  >
                    <TableCell className='text-center text-xs font-mono text-muted-foreground'>
                      {index + 1}
                    </TableCell>

                    {entity.hasCode && (
                      <TableCell>
                        <Badge
                          variant='outline'
                          className='font-mono text-xs font-bold bg-muted/40'
                        >
                          {item.kode || '-'}
                        </Badge>
                      </TableCell>
                    )}

                    <TableCell className='font-medium text-xs text-foreground'>
                      {item.nama}
                    </TableCell>

                    {entity.key === 'entitas-penilaian' && (
                      <TableCell className='text-xs'>
                        {item.opd ? (
                          <div className='flex items-center gap-1.5 text-muted-foreground'>
                            <Building2 className='h-3.5 w-3.5 text-primary shrink-0' />
                            <span className='truncate max-w-[200px]'>
                              {item.opd.nama}
                            </span>
                          </div>
                        ) : (
                          <span className='text-muted-foreground/60 text-[11px] italic'>
                            -
                          </span>
                        )}
                      </TableCell>
                    )}

                    {entity.descField && (
                      <TableCell className='text-xs text-muted-foreground max-w-md leading-relaxed'>
                        <span className='line-clamp-2'>{descText}</span>
                      </TableCell>
                    )}

                    <TableCell className='text-center'>
                      <div className='flex items-center justify-center gap-2'>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => toggleMutation.mutate(item.id)}
                          disabled={!canEdit || toggleMutation.isPending}
                          className='data-[state=checked]:bg-emerald-600'
                        />
                        <span className='text-[11px] text-muted-foreground font-medium hidden sm:inline'>
                          {item.is_active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className='text-right pr-4'>
                      <div className='flex items-center justify-end gap-1'>
                        {canEdit && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-muted-foreground hover:text-foreground'
                            onClick={() => {
                              setSelectedItem(item)
                              setActionDialogOpen(true)
                            }}
                            title='Edit data'
                          >
                            <Edit className='h-3.5 w-3.5' />
                          </Button>
                        )}

                        {canDelete && (
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-7 w-7 text-muted-foreground hover:text-destructive'
                            onClick={() => {
                              setItemToDelete(item)
                              setDeleteDialogOpen(true)
                            }}
                            title='Hapus data'
                          >
                            <Trash2 className='h-3.5 w-3.5' />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Action Dialog */}
      <MasterActionDialog
        open={actionDialogOpen}
        onOpenChange={setActionDialogOpen}
        entity={entity}
        currentItem={selectedItem}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['master', entity.key] })
        }}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-foreground'>
              Hapus Data {entity.label}?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs text-muted-foreground leading-relaxed'>
              Apakah Anda yakin ingin menghapus entri{' '}
              <strong className='text-foreground'>{itemToDelete?.nama}</strong>?
              Tindakan ini akan dicatat di Log Audit Keamanan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className='gap-2'>
            <AlertDialogCancel disabled={isDeleting} className='text-xs'>
              Batal
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className='bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-semibold'
            >
              {isDeleting ? (
                <>
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                  Menghapus...
                </>
              ) : (
                'Ya, Hapus Data'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
