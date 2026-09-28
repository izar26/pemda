import { useState } from 'react'
import { type Row } from '@tanstack/react-table'
import { KeyRound, MailPlus, MoreHorizontal, Trash2, UserPen } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { userService } from '@/services/user-service'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { type User } from '../data/schema'
import { useUsers } from './users-provider'
import { usePermissions } from '@/hooks/use-permissions'

interface DataTableRowActionsProps {
  row: Row<User>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = useUsers()
  const { hasPermission } = usePermissions()
  const [isResending, setIsResending] = useState(false)
  const user = row.original

  const canEdit = hasPermission('users.edit')
  const canDelete = hasPermission('users.delete')
  const canReset2FA = hasPermission('users.reset_2fa')
  const canInvite = hasPermission('users.create')

  const isPending = user.status === 'pending_activation' || user.is_pending_activation

  const handleResendInvitation = async () => {
    setIsResending(true)
    try {
      const res = await userService.resendInvitation(user.id)
      toast.success(res.message || `Undangan baru telah dikirim ke ${user.email}`, {
        description: 'Tautan aktivasi baru berlaku selama 48 jam ke depan.',
      })
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as { message?: string }
        toast.error('Gagal Mengirim Ulang Undangan', {
          description: errorData.message || 'Terjadi kesalahan pada server.',
        })
      } else {
        toast.error('Kesalahan Jaringan', {
          description: 'Tidak dapat terhubung ke server.',
        })
      }
    } finally {
      setIsResending(false)
    }
  }

  // If no actions available, don't render the menu at all
  if (!canEdit && !canDelete && !canReset2FA && (!isPending || !canInvite)) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
          disabled={isResending}
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Buka menu aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        {isPending && canInvite && (
          <DropdownMenuItem
            onClick={handleResendInvitation}
            disabled={isResending}
            className='text-amber-600 dark:text-amber-400 font-medium'
          >
            <MailPlus className='mr-2 h-4 w-4' />
            Kirim Ulang Undangan
          </DropdownMenuItem>
        )}

        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('edit')
            }}
          >
            <UserPen className='mr-2 h-4 w-4 text-muted-foreground' />
            Edit Data Pegawai
          </DropdownMenuItem>
        )}

        {canReset2FA && !isPending && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(user)
              setOpen('reset-2fa')
            }}
          >
            <KeyRound className='mr-2 h-4 w-4 text-amber-500' />
            Reset 2FA Pegawai
          </DropdownMenuItem>
        )}

        {canDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setCurrentRow(user)
                setOpen('delete')
              }}
              className='text-destructive focus:text-destructive'
            >
              <Trash2 className='mr-2 h-4 w-4' />
              Hapus Akun
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

