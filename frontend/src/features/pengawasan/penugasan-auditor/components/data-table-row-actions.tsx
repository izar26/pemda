import { type Row } from '@tanstack/react-table'
import { MoreHorizontal, Settings2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { usePermissions } from '@/hooks/use-permissions'
import type { AuditorWithAssignments } from '@/services/penugasan-auditor-service'
import { usePenugasan } from './penugasan-provider'

interface DataTableRowActionsProps {
  row: Row<AuditorWithAssignments>
}

export function DataTableRowActions({ row }: DataTableRowActionsProps) {
  const { setOpen, setCurrentRow } = usePenugasan()
  const { hasPermission } = usePermissions()
  const auditor = row.original

  const canEdit = hasPermission('penugasan_auditor.edit')
  const canDelete = hasPermission('penugasan_auditor.delete')
  const hasAssignments = (auditor.auditor_assignments?.length ?? 0) > 0

  if (!canEdit && !canDelete) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant='ghost'
          className='flex h-8 w-8 p-0 data-[state=open]:bg-muted'
        >
          <MoreHorizontal className='h-4 w-4' />
          <span className='sr-only'>Buka menu aksi</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-52'>
        {canEdit && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(auditor)
              setOpen('edit')
            }}
          >
            <Settings2 className='mr-2 h-4 w-4 text-muted-foreground' />
            Kelola OPD Binaan
          </DropdownMenuItem>
        )}

        {canEdit && canDelete && hasAssignments && <DropdownMenuSeparator />}

        {canDelete && hasAssignments && (
          <DropdownMenuItem
            onClick={() => {
              setCurrentRow(auditor)
              setOpen('delete')
            }}
            className='text-destructive focus:text-destructive'
          >
            <Trash2 className='mr-2 h-4 w-4 text-destructive' />
            Cabut Seluruh Penugasan
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
