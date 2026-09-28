'use client'

import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user-service'
import { useAuthStore } from '@/stores/auth-store'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { User } from '../data/schema'

interface UsersDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersDeleteDialog({
  open,
  onOpenChange,
  currentRow,
}: UsersDeleteDialogProps) {
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((s) => s.auth.user)
  const [isDeleting, setIsDeleting] = useState(false)

  const isSelf = currentUser?.id === currentRow.id

  async function handleDelete() {
    if (isSelf) return

    setIsDeleting(true)
    try {
      const response = await userService.deleteUser(currentRow.id)
      toast.success(response.message || `Akun ${currentRow.name} berhasil dihapus.`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menghapus akun pegawai.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-destructive'>
      <AlertTriangle className='h-5 w-5' />
      <span>Hapus Akun Pegawai</span>
    </div>
  )

  const descContent = isSelf ? (
    <div className='space-y-2 text-xs'>
      <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive font-medium'>
        Anda tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan saat ini.
      </div>
    </div>
  ) : (
    <div className='space-y-2 text-xs'>
      <p>
        Apakah Anda yakin ingin menghapus akun pegawai{' '}
        <strong className='text-foreground font-semibold'>{currentRow.name}</strong> ({currentRow.email}) dengan peran{' '}
        <span className='font-semibold text-foreground'>{currentRow.role}</span>?
      </p>
      <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-2.5 text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed'>
        Tindakan ini akan mencabut seluruh akses masuk dan menghapus sesi pegawai yang bersangkutan secara permanen.
      </div>
    </div>
  )

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desc={descContent}
      destructive
      showConfirmBtn={!isSelf}
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus Akun Pegawai
        </span>
      }
      cancelBtnText={isSelf ? 'Tutup' : 'Batal'}
      isLoading={isDeleting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}
