'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ChevronDown,
  ChevronRight,
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
  MasterSubUnsurSpipItem,
} from '@/types/master-data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

export function MasterSpipTable() {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const canCreate = hasPermission('master.create')
  const canEdit = hasPermission('master.edit')
  const canDelete = hasPermission('master.delete')

  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]))

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogEntity, setDialogEntity] = useState<MasterEntityMeta>({
    key: 'unsur-spip',
    label: 'Unsur SPIP',
    category: 'spip',
  })
  const [dialogCurrentItem, setDialogCurrentItem] = useState<
    MasterDataBaseItem | MasterSubUnsurSpipItem | null
  >(null)
  const [targetUnsurId, setTargetUnsurId] = useState<number | undefined>(undefined)

  // Delete state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{
    entityKey: 'unsur-spip' | 'sub-unsur-spip'
    label: string
    id: number
    name: string
  } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Query Unsur SPIP with subUnsurs
  const {
    data: response,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: ['master', 'unsur-spip'],
    queryFn: () => masterDataService.getItems('unsur-spip'),
  })

  const unsurs = response?.data || []

  function toggleExpand(id: number) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: ({
      entityKey,
      id,
    }: {
      entityKey: 'unsur-spip' | 'sub-unsur-spip'
      id: number
    }) => masterDataService.toggleActive(entityKey, id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['master', 'unsur-spip'] })
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
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const res = await masterDataService.deleteItem(
        deleteTarget.entityKey,
        deleteTarget.id
      )
      queryClient.invalidateQueries({ queryKey: ['master', 'unsur-spip'] })
      toast.success(res.message)
      setDeleteDialogOpen(false)
      setDeleteTarget(null)
    } catch (err) {
      const msg =
        isAxiosError(err) && err.response?.data?.message
          ? err.response.data.message
          : 'Gagal menghapus data SPIP.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  // Filter unsurs or their subUnsurs
  const filteredUnsurs = unsurs.filter((unsur) => {
    if (!searchTerm.trim()) return true
    const term = searchTerm.toLowerCase()
    const matchUnsur =
      unsur.nama.toLowerCase().includes(term) ||
      unsur.nomor?.toLowerCase().includes(term)
    const matchSub = unsur.sub_unsurs?.some((sub) =>
      sub.nama.toLowerCase().includes(term)
    )
    return matchUnsur || matchSub
  })

  return (
    <div className='space-y-4'>
      {/* Toolbar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div className='flex items-center gap-2 flex-1 max-w-sm'>
          <div className='relative w-full'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Cari unsur atau bagian sub-unsur SPIP...'
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
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isRefetching ? 'animate-spin' : ''}`}
            />
          </Button>
        </div>

        {canCreate && (
          <Button
            size='sm'
            className='h-9 gap-1.5 font-semibold text-xs'
            onClick={() => {
              setDialogEntity({
                key: 'unsur-spip',
                label: 'Unsur SPIP',
                category: 'spip',
              })
              setDialogCurrentItem(null)
              setTargetUnsurId(undefined)
              setDialogOpen(true)
            }}
          >
            <Plus className='h-4 w-4' />
            Tambah Unsur Utama SPIP
          </Button>
        )}
      </div>

      {/* Accordion List */}
      <div className='space-y-3'>
        {isLoading ? (
          <div className='rounded-xl border bg-card p-10 text-center text-muted-foreground text-xs flex items-center justify-center gap-2'>
            <Loader2 className='h-4 w-4 animate-spin text-primary' />
            <span>Memuat struktur Unsur & Sub-Unsur SPIP...</span>
          </div>
        ) : filteredUnsurs.length === 0 ? (
          <div className='rounded-xl border bg-card p-8 text-center text-muted-foreground text-xs'>
            {searchTerm
              ? `Tidak ditemukan unsur SPIP yang cocok dengan "${searchTerm}".`
              : 'Belum ada data Unsur SPIP terdaftar.'}
          </div>
        ) : (
          filteredUnsurs.map((unsur) => {
            const isExpanded = expandedIds.has(unsur.id)
            const subList = unsur.sub_unsurs || []

            return (
              <div
                key={unsur.id}
                className='rounded-xl border bg-card shadow-2xs overflow-hidden transition-all'
              >
                {/* Unsur Header Bar */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 gap-3 cursor-pointer select-none transition-colors ${
                    isExpanded ? 'bg-muted/30 border-b' : 'hover:bg-muted/10'
                  }`}
                  onClick={() => toggleExpand(unsur.id)}
                >
                  <div className='flex items-center gap-3 min-w-0'>
                    <button
                      type='button'
                      className='p-1 rounded-md text-muted-foreground hover:text-foreground'
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleExpand(unsur.id)
                      }}
                    >
                      {isExpanded ? (
                        <ChevronDown className='h-4 w-4' />
                      ) : (
                        <ChevronRight className='h-4 w-4' />
                      )}
                    </button>

                    <Badge
                      variant='outline'
                      className='h-6 px-2 text-xs font-mono font-bold border-primary/30 text-primary bg-primary/5'
                    >
                      Unsur {unsur.nomor}
                    </Badge>

                    <h4 className='font-bold text-sm text-foreground truncate'>
                      {unsur.nama}
                    </h4>

                    <Badge variant='secondary' className='text-[10px] ml-1 shrink-0'>
                      {subList.length} Bagian
                    </Badge>
                  </div>

                  <div
                    className='flex items-center gap-2 justify-end pl-7 sm:pl-0'
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className='flex items-center gap-1.5 mr-2'>
                      <Switch
                        checked={unsur.is_active}
                        onCheckedChange={() =>
                          toggleMutation.mutate({
                            entityKey: 'unsur-spip',
                            id: unsur.id,
                          })
                        }
                        disabled={!canEdit || toggleMutation.isPending}
                        className='data-[state=checked]:bg-emerald-600 scale-90'
                      />
                      <span className='text-[11px] text-muted-foreground font-medium'>
                        {unsur.is_active ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </div>

                    {canCreate && (
                      <Button
                        variant='outline'
                        size='sm'
                        className='h-7 text-[11px] gap-1 px-2 border-primary/20 text-primary hover:bg-primary/10'
                        onClick={() => {
                          setDialogEntity({
                            key: 'sub-unsur-spip',
                            label: 'Sub-Unsur SPIP',
                            category: 'spip',
                          })
                          setDialogCurrentItem(null)
                          setTargetUnsurId(unsur.id)
                          setDialogOpen(true)
                        }}
                      >
                        <Plus className='h-3 w-3' />
                        Tambah Bagian
                      </Button>
                    )}

                    {canEdit && (
                      <Button
                        variant='ghost'
                        size='icon'
                        className='h-7 w-7 text-muted-foreground hover:text-foreground'
                        onClick={() => {
                          setDialogEntity({
                            key: 'unsur-spip',
                            label: 'Unsur SPIP',
                            category: 'spip',
                          })
                          setDialogCurrentItem(unsur)
                          setTargetUnsurId(undefined)
                          setDialogOpen(true)
                        }}
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
                          setDeleteTarget({
                            entityKey: 'unsur-spip',
                            label: 'Unsur SPIP',
                            id: unsur.id,
                            name: unsur.nama,
                          })
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className='h-3.5 w-3.5' />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Sub-Unsur Expanded Body */}
                {isExpanded && (
                  <div className='p-3 sm:p-4 bg-card'>
                    {subList.length === 0 ? (
                      <div className='p-4 text-center rounded-lg border border-dashed text-xs text-muted-foreground'>
                        Belum ada bagian sub-unsur untuk unsur ini. Klik &quot;Tambah
                        Bagian&quot; untuk menambahkan.
                      </div>
                    ) : (
                      <div className='divide-y rounded-lg border'>
                        {subList.map((sub, idx) => (
                          <div
                            key={sub.id}
                            className='flex items-center justify-between p-2.5 sm:px-3 text-xs hover:bg-muted/30 transition-colors'
                          >
                            <div className='flex items-center gap-2.5 min-w-0 pr-2'>
                              <span className='font-mono text-muted-foreground text-[11px] w-5 text-right'>
                                {idx + 1}.
                              </span>
                              <span className='font-medium text-foreground truncate'>
                                {sub.nama}
                              </span>
                            </div>

                            <div className='flex items-center gap-2 shrink-0'>
                              <Switch
                                checked={sub.is_active}
                                onCheckedChange={() =>
                                  toggleMutation.mutate({
                                    entityKey: 'sub-unsur-spip',
                                    id: sub.id,
                                  })
                                }
                                disabled={!canEdit || toggleMutation.isPending}
                                className='data-[state=checked]:bg-emerald-600 scale-75'
                              />

                              {canEdit && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-muted-foreground hover:text-foreground'
                                  onClick={() => {
                                    setDialogEntity({
                                      key: 'sub-unsur-spip',
                                      label: 'Sub-Unsur SPIP',
                                      category: 'spip',
                                    })
                                    setDialogCurrentItem(sub)
                                    setTargetUnsurId(unsur.id)
                                    setDialogOpen(true)
                                  }}
                                >
                                  <Edit className='h-3 w-3' />
                                </Button>
                              )}

                              {canDelete && (
                                <Button
                                  variant='ghost'
                                  size='icon'
                                  className='h-6 w-6 text-muted-foreground hover:text-destructive'
                                  onClick={() => {
                                    setDeleteTarget({
                                      entityKey: 'sub-unsur-spip',
                                      label: 'Sub-Unsur SPIP',
                                      id: sub.id,
                                      name: sub.nama,
                                    })
                                    setDeleteDialogOpen(true)
                                  }}
                                >
                                  <Trash2 className='h-3 w-3' />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Action Dialog */}
      <MasterActionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        entity={dialogEntity}
        currentItem={dialogCurrentItem}
        unsurSpipId={targetUnsurId}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['master', 'unsur-spip'] })
        }}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className='text-base font-bold text-foreground'>
              Hapus Data {deleteTarget?.label}?
            </AlertDialogTitle>
            <AlertDialogDescription className='text-xs text-muted-foreground leading-relaxed'>
              Apakah Anda yakin ingin menghapus {deleteTarget?.label}{' '}
              <strong className='text-foreground'>{deleteTarget?.name}</strong>?
              {deleteTarget?.entityKey === 'unsur-spip' &&
                ' Menghapus unsur ini juga akan menghapus seluruh sub-unsur di dalamnya.'}
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
