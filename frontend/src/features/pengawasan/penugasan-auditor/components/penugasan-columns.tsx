import { type ColumnDef } from '@tanstack/react-table'
import {
  Building2,
  Calendar,
  FileText,
  Mail,
  User as UserIcon,
  X,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { DataTableColumnHeader } from '@/components/data-table'
import { usePermissions } from '@/hooks/use-permissions'
import type { AuditorWithAssignments } from '@/services/penugasan-auditor-service'
import { DataTableRowActions } from './data-table-row-actions'
import { usePenugasan } from './penugasan-provider'

function OpdBinaanCell({ row }: { row: { original: AuditorWithAssignments } }) {
  const { hasPermission } = usePermissions()
  const { setSelectedAssignment, setOpen } = usePenugasan()
  const canDelete = hasPermission('penugasan_auditor.delete')

  const assignments = row.original.auditor_assignments || []
  const hasAssignments = assignments.length > 0

  if (!hasAssignments) {
    return (
      <span className='text-xs text-muted-foreground italic'>
        Belum ada penugasan OPD
      </span>
    )
  }

  return (
    <div className='flex flex-col py-1 gap-1.5 min-w-0 max-w-md'>
      <div className='flex items-center gap-1.5'>
        <Badge
          variant='secondary'
          className='text-[10px] font-semibold px-2 py-0.5 bg-primary/10 text-primary border-primary/20'
        >
          {assignments.length} Perangkat Daerah
        </Badge>
      </div>

      <div className='flex flex-wrap gap-1 max-h-24 overflow-y-auto'>
        {assignments.map((assignment) => (
          <Badge
            key={assignment.id}
            variant='outline'
            className='text-[11px] font-normal py-0.5 px-2 gap-1 bg-background text-foreground border-border shadow-2xs hover:border-primary/40 transition-colors'
          >
            <Building2 className='h-3 w-3 text-primary shrink-0' />
            <span className='truncate max-w-[180px]'>
              {assignment.opd?.nama || 'OPD'}
            </span>
            {canDelete && (
              <button
                type='button'
                onClick={() => {
                  setSelectedAssignment(assignment)
                  setOpen('delete-single')
                }}
                title='Cabut penugasan OPD ini'
                className='opacity-50 hover:opacity-100 hover:text-destructive focus:outline-none ml-0.5 transition-opacity'
              >
                <X className='h-3 w-3' />
              </button>
            )}
          </Badge>
        ))}
      </div>
    </div>
  )
}

export const penugasanColumns: ColumnDef<AuditorWithAssignments>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Auditor Pengawas' />
    ),
    meta: {
      className: 'min-w-[240px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const auditor = row.original
      const initials = auditor.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()

      return (
        <div className='flex items-center gap-3 py-1 min-w-0'>
          <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary'>
            {initials || <UserIcon className='h-4 w-4' />}
          </div>
          <div className='flex flex-col min-w-0'>
            <span className='font-semibold text-sm text-foreground leading-snug whitespace-normal break-words'>
              {auditor.name}
            </span>
            <span className='text-xs text-muted-foreground font-mono mt-0.5 whitespace-nowrap'>
              {auditor.nip ? `NIP. ${auditor.nip}` : 'NIP belum diisi'}
            </span>
            <span className='inline-flex items-center gap-1 text-[11px] text-muted-foreground mt-0.5 truncate'>
              <Mail className='h-3 w-3 shrink-0' />
              {auditor.email}
            </span>
          </div>
        </div>
      )
    },
    filterFn: (row, _id, value) => {
      const searchStr = String(value || '').toLowerCase()
      const name = (row.original.name || '').toLowerCase()
      const nip = (row.original.nip || '').toLowerCase()
      const email = (row.original.email || '').toLowerCase()
      const matchOpd = row.original.auditor_assignments?.some(
        (a) =>
          a.opd?.nama?.toLowerCase().includes(searchStr) ||
          a.opd?.kode_opd?.toLowerCase().includes(searchStr)
      )
      return (
        name.includes(searchStr) ||
        nip.includes(searchStr) ||
        email.includes(searchStr) ||
        Boolean(matchOpd)
      )
    },
    enableSorting: true,
  },
  {
    id: 'jabatan',
    accessorFn: (row) => row.jabatan || 'Auditor',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Jabatan & Peran' />
    ),
    meta: {
      className: 'w-48 min-w-[160px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const auditor = row.original
      const roles = auditor.roles || []

      return (
        <div className='flex flex-col py-1 text-xs gap-1 min-w-0'>
          <div className='flex items-center gap-1 flex-wrap'>
            {roles.map((r) => (
              <Badge
                key={r.id}
                variant='outline'
                className='text-[10px] font-medium px-2 py-0.5 bg-secondary/60 text-secondary-foreground border-border'
              >
                {r.name}
              </Badge>
            ))}
          </div>
          <span className='text-xs text-muted-foreground leading-snug'>
            {auditor.jabatan || 'Auditor Pengawas SPIP'}
          </span>
        </div>
      )
    },
    enableSorting: true,
  },
  {
    id: 'opd_binaan',
    header: () => <div>OPD Binaan & Approval</div>,
    meta: {
      className: 'min-w-[280px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => <OpdBinaanCell row={row} />,
  },
  {
    id: 'surat_tugas',
    header: () => <div>Surat Tugas & Masa Berlaku</div>,
    meta: {
      className: 'min-w-[200px]',
      tdClassName: 'whitespace-normal',
    },
    cell: ({ row }) => {
      const assignments = row.original.auditor_assignments || []
      const first = assignments[0]

      if (!first?.nomor_surat_tugas && !first?.tanggal_mulai) {
        return <span className='text-xs text-muted-foreground'>-</span>
      }

      return (
        <div className='flex flex-col py-1 text-xs gap-1 min-w-0'>
          {first.nomor_surat_tugas && (
            <div className='flex items-center gap-1 font-mono text-[11px] text-foreground bg-muted/40 px-2 py-0.5 rounded border w-fit max-w-[200px] truncate'>
              <FileText className='h-3 w-3 text-primary shrink-0' />
              <span className='truncate'>{first.nomor_surat_tugas}</span>
            </div>
          )}
          {first.tanggal_mulai && (
            <div className='flex items-center gap-1 text-[11px] text-muted-foreground'>
              <Calendar className='h-3 w-3 shrink-0' />
              <span>
                {new Date(first.tanggal_mulai).toLocaleDateString('id-ID')}
                {first.tanggal_selesai
                  ? ` s/d ${new Date(first.tanggal_selesai).toLocaleDateString('id-ID')}`
                  : ''}
              </span>
            </div>
          )}
        </div>
      )
    },
  },
  {
    id: 'status',
    accessorFn: (row) =>
      (row.auditor_assignments?.length ?? 0) > 0 ? 'aktif' : 'belum',
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title='Status' />
    ),
    meta: {
      className: 'w-36 min-w-[130px]',
    },
    cell: ({ row }) => {
      const hasAssignments = (row.original.auditor_assignments?.length ?? 0) > 0

      if (hasAssignments) {
        return (
          <Badge className='bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-medium'>
            Aktif Bertugas
          </Badge>
        )
      }

      return (
        <Badge
          variant='outline'
          className='text-muted-foreground border-border bg-muted/40 text-[11px] font-normal'
        >
          Belum Ditugaskan
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
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
    cell: ({ row }) => (
      <div className='flex items-center justify-end'>
        <DataTableRowActions row={row} />
      </div>
    ),
  },
]
