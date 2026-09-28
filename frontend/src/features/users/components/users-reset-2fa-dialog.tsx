import { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useQueryClient } from '@tanstack/react-query'
import { userService } from '@/services/user-service'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { User } from '../data/schema'

interface UsersReset2faDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentRow: User
}

export function UsersReset2faDialog({
  open,
  onOpenChange,
  currentRow,
}: UsersReset2faDialogProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleReset() {
    setIsSubmitting(true)
    try {
      const response = await userService.resetTwoFactor(currentRow.id)
      toast.success(response.message || `2FA untuk ${currentRow.name} berhasil direset.`)
      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal mereset 2FA pegawai.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const title = (
    <div className='flex items-center gap-2 text-amber-600 dark:text-amber-400'>
      <KeyRound className='h-5 w-5' />
      <span>Reset Autentikasi 2FA</span>
    </div>
  )

  const descContent = (
    <div className='space-y-2 text-xs'>
      <p>
        Pegawai: <strong className='text-foreground font-semibold'>{currentRow.name}</strong> ({currentRow.email})
      </p>
      <div className='rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-300 space-y-1 text-[11px] leading-relaxed'>
        <div className='flex items-center gap-1.5 font-semibold text-xs'>
          <ShieldAlert className='h-4 w-4 shrink-0' />
          Perhatian Keamanan
        </div>
        <p>
          Tindakan ini akan menghapus kunci Google Authenticator dan kode pemulihan pegawai yang bersangkutan, serta memutus seluruh sesi login aktif. Pegawai akan diminta mengonfigurasi 2FA kembali saat login berikutnya.
        </p>
      </div>
    </div>
  )

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      desc={descContent}
      confirmText='Reset 2FA Sekarang'
      cancelBtnText='Batal'
      isLoading={isSubmitting}
      handleConfirm={handleReset}
      className='sm:max-w-md'
    />
  )
}
