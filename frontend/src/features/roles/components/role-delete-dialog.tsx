import { useState } from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
import { ConfirmDialog } from '@/components/confirm-dialog'

interface RoleDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null
  onSuccess: () => void
}

export function RoleDeleteDialog({
  open,
  onOpenChange,
  role,
  onSuccess,
}: RoleDeleteDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false)

  if (!role) return null

  const isSystemRole = Boolean(role.is_system)
  const hasUsers = role.users_count > 0

  async function handleDelete() {
    if (!role) return
    setIsDeleting(true)

    try {
      await rbacService.deleteRole(role.id)
      toast.success(`Peran "${role.name}" berhasil dihapus.`)
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal menghapus peran.'
      toast.error(msg)
    } finally {
      setIsDeleting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-destructive'>
      <AlertTriangle className='h-5 w-5' />
      <span>Hapus Peran (Role)</span>
    </div>
  )

  let descContent: React.JSX.Element
  let showConfirmBtn = true

  if (isSystemRole) {
    showConfirmBtn = false
    descContent = (
      <div className='space-y-2 text-xs'>
        <div className='rounded-md border border-destructive/20 bg-destructive/10 p-3 text-destructive font-medium'>
          Peran <strong>"{role.name}"</strong> adalah peran sistem bawaan dan diproteksi dari penghapusan demi menjaga integritas portal.
        </div>
      </div>
    )
  } else if (hasUsers) {
    showConfirmBtn = false
    descContent = (
      <div className='space-y-2 text-xs'>
        <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 font-medium'>
          Peran <strong>"{role.name}"</strong> saat ini masih digunakan oleh{' '}
          <strong>{role.users_count} pegawai</strong>. Anda harus mengalihkan peran pegawai tersebut terlebih dahulu sebelum dapat menghapus peran ini.
        </div>
      </div>
    )
  } else {
    descContent = (
      <span>
        Apakah Anda yakin ingin menghapus peran{' '}
        <strong className='text-foreground font-semibold'>"{role.name}"</strong>? Tindakan ini bersifat permanen dan seluruh hak akses yang terkait dengan peran ini akan dicabut.
      </span>
    )
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desc={descContent}
      destructive
      showConfirmBtn={showConfirmBtn}
      confirmText={
        <span className='flex items-center gap-1.5'>
          <Trash2 className='h-4 w-4' />
          Hapus Peran
        </span>
      }
      cancelBtnText={showConfirmBtn ? 'Batal' : 'Tutup'}
      isLoading={isDeleting}
      handleConfirm={handleDelete}
      className='sm:max-w-md'
    />
  )
}
