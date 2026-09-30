import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { masterDataService } from '@/services/master-data-service'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { MasterActionDialog } from './master-action-dialog'
import { useMasterData } from './master-data-provider'
import type { MasterEntityKey } from '@/types/master-data'

export function MasterDataDialogs() {
  const queryClient = useQueryClient()
  const {
    open,
    setOpen,
    selectedEntity,
    currentItem,
    setCurrentItem,
    targetUnsurId,
    setTargetUnsurId,
    deleteTarget,
    setDeleteTarget,
  } = useMasterData()

  const [isDeleting, setIsDeleting] = useState(false)

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['master', selectedEntity.key] })
    if (selectedEntity.key === 'unsur-spip') {
      queryClient.invalidateQueries({ queryKey: ['master', 'sub-unsur-spip'] })
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)

    try {
      const res = await masterDataService.deleteItem(
        deleteTarget.entityKey as MasterEntityKey,
        deleteTarget.id
      )
      toast.success(res.message || `Data "${deleteTarget.name}" berhasil dihapus.`)
      handleSuccess()
      setDeleteTarget(null)
      setOpen(null)
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
    <>
      <MasterActionDialog
        open={open === 'create' || open === 'edit'}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentItem(null)
            setTargetUnsurId(undefined)
          }
        }}
        entity={selectedEntity}
        currentItem={open === 'edit' ? currentItem : null}
        unsurSpipId={targetUnsurId}
        onSuccess={() => {
          handleSuccess()
          setOpen(null)
          setCurrentItem(null)
          setTargetUnsurId(undefined)
        }}
      />

      <ConfirmDialog
        open={open === 'delete' && Boolean(deleteTarget)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setDeleteTarget(null)
          }
        }}
        handleConfirm={handleDeleteConfirm}
        isLoading={isDeleting}
        destructive
        title={
          <div className='flex items-center gap-2 text-destructive'>
            <AlertTriangle className='h-5 w-5' />
            <span>Hapus Data Master</span>
          </div>
        }
        desc={
          deleteTarget ? (
            <div className='space-y-2 text-xs'>
              <p>
                Apakah Anda yakin ingin menghapus data{' '}
                <span className='font-semibold text-foreground'>{deleteTarget.name}</span> dari{' '}
                <span className='font-semibold text-foreground'>{deleteTarget.label}</span>?
              </p>
              <p className='text-muted-foreground'>
                Tindakan ini tidak dapat dibatalkan jika data sudah digunakan di modul Manajemen Risiko atau SPIP.
              </p>
            </div>
          ) : (
            ''
          )
        }
        confirmText={
          <>
            <Trash2 className='mr-1.5 h-3.5 w-3.5' />
            Hapus Permanen
          </>
        }
        cancelBtnText='Batal'
      />
    </>
  )
}
