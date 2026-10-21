import { useMemo } from 'react'
import {
  Building2,
  Calendar,
  FileText,
  Mail,
  Search,
  Settings2,
  Trash2,
  UserX,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { usePermissions } from '@/hooks/use-permissions'
import type { AuditorWithAssignments } from '@/services/penugasan-auditor-service'
import { usePenugasan } from './penugasan-provider'

interface PenugasanTableProps {
  data: AuditorWithAssignments[]
  isLoading?: boolean
}

export function PenugasanTable({ data = [], isLoading: _isLoading = false }: PenugasanTableProps) {
  const { hasPermission } = usePermissions()
  const {
    search,
    setSearch,
    filterStatus,
    setFilterStatus,
    setEditAuditor,
    setDeleteAuditor,
    setDeleteAssignment,
  } = usePenugasan()

  const canEdit = hasPermission('penugasan_auditor.edit')
  const canDelete = hasPermission('penugasan_auditor.delete')

  // Filter auditors locally for fast responsive UI
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // 1. Filter by search
      if (search.trim()) {
        const term = search.toLowerCase()
        const matchAuditor =
          item.name.toLowerCase().includes(term) ||
          (item.nip && item.nip.toLowerCase().includes(term)) ||
          item.email.toLowerCase().includes(term)
        const matchOpd = item.auditor_assignments?.some(
          (a) =>
            a.opd?.nama?.toLowerCase().includes(term) ||
            a.opd?.kode_opd?.toLowerCase().includes(term)
        )
        if (!matchAuditor && !matchOpd) return false
      }

      // 2. Filter by assignment status
      const hasAssignments = (item.auditor_assignments?.length ?? 0) > 0
      if (filterStatus === 'assigned' && !hasAssignments) return false
      if (filterStatus === 'unassigned' && hasAssignments) return false

      return true
    })
  }, [data, search, filterStatus])

  return (
    <div className='space-y-4'>
      {/* Search and Filters Bar */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div className='relative flex-1 max-w-md'>
          <Search className='absolute left-3 top-2.5 h-4 w-4 text-muted-foreground' />
          <Input
            type='text'
            placeholder='Cari auditor, NIP, atau nama OPD binaan...'
            className='pl-9 h-9 text-xs'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className='flex items-center gap-2 self-end sm:self-auto'>
          <Select
            value={filterStatus}
            onValueChange={(val: 'all' | 'assigned' | 'unassigned') =>
              setFilterStatus(val)
            }
          >
            <SelectTrigger className='h-9 text-xs w-[180px]'>
              <SelectValue placeholder='Status Penugasan' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua Auditor</SelectItem>
              <SelectItem value='assigned'>Sudah Ditugaskan</SelectItem>
              <SelectItem value='unassigned'>Belum Ditugaskan</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Grid / Table of Auditor Assignments */}
      {filteredData.length === 0 ? (
        <div className='flex flex-col items-center justify-center p-12 text-center rounded-xl border border-dashed bg-card/50'>
          <div className='h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3 text-muted-foreground'>
            <UserX className='h-6 w-6' />
          </div>
          <h3 className='text-sm font-semibold text-foreground'>
            Tidak Ada Data Penugasan Auditor
          </h3>
          <p className='text-xs text-muted-foreground max-w-sm mt-1'>
            {search
              ? 'Tidak ditemukan auditor atau OPD yang sesuai dengan kata kunci pencarian.'
              : 'Belum ada data auditor pengawas yang terdaftar di sistem.'}
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 gap-4'>
          {filteredData.map((auditor) => {
            const assignments = auditor.auditor_assignments || []
            const hasAssignments = assignments.length > 0
            const first = assignments[0]

            return (
              <div
                key={auditor.id}
                className='rounded-xl border bg-card p-4 sm:p-5 shadow-xs hover:border-primary/40 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4'
              >
                {/* Left: Auditor Identity */}
                <div className='flex items-start gap-3.5 min-w-0 md:max-w-xs shrink-0'>
                  <div className='h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0'>
                    {auditor.name.charAt(0)}
                  </div>
                  <div className='min-w-0 space-y-1'>
                    <div className='flex items-center gap-1.5 flex-wrap'>
                      <h4 className='text-sm font-bold text-foreground truncate'>
                        {auditor.name}
                      </h4>
                      {auditor.roles?.map((r) => (
                        <Badge
                          key={r.id}
                          variant='outline'
                          className='text-[10px] px-1.5 py-0 bg-secondary/50 text-secondary-foreground border-border'
                        >
                          {r.name}
                        </Badge>
                      ))}
                    </div>
                    <p className='text-xs text-muted-foreground font-mono'>
                      NIP. {auditor.nip || '-'}
                    </p>
                    <p className='text-xs text-muted-foreground truncate'>
                      {auditor.jabatan || 'Auditor Pengawas SPIP'}
                    </p>
                    <div className='flex items-center gap-1 text-[11px] text-muted-foreground'>
                      <Mail className='h-3 w-3 shrink-0' />
                      <span className='truncate'>{auditor.email}</span>
                    </div>
                  </div>
                </div>

                {/* Middle: Assigned OPD Badges & Surat Tugas Info */}
                <div className='flex-1 min-w-0 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5 space-y-2.5'>
                  <div className='flex items-center justify-between gap-2 flex-wrap'>
                    <div className='flex items-center gap-2'>
                      <span className='text-xs font-semibold text-foreground'>
                        OPD Binaan & Approval:
                      </span>
                      <Badge
                        variant={hasAssignments ? 'default' : 'secondary'}
                        className={`text-[10px] h-5 px-2 ${
                          hasAssignments
                            ? 'bg-primary text-primary-foreground font-semibold'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        {hasAssignments
                          ? `${assignments.length} Perangkat Daerah`
                          : 'Belum Ditugaskan'}
                      </Badge>
                    </div>

                    {first?.nomor_surat_tugas && (
                      <div className='flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border'>
                        <FileText className='h-3 w-3 text-primary' />
                        <span>{first.nomor_surat_tugas}</span>
                      </div>
                    )}
                  </div>

                  {/* Badges of OPDs */}
                  {hasAssignments ? (
                    <div className='flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1'>
                      {assignments.map((assignment) => (
                        <Badge
                          key={assignment.id}
                          variant='secondary'
                          className='text-[11px] font-normal py-1 px-2.5 gap-1.5 bg-background border hover:border-primary/40 text-foreground transition-all shadow-2xs group'
                        >
                          <Building2 className='h-3.5 w-3.5 text-primary shrink-0' />
                          <span className='truncate max-w-[220px]'>
                            {assignment.opd?.nama || 'OPD'}
                          </span>
                          {canDelete && (
                            <button
                              type='button'
                              onClick={() => setDeleteAssignment(assignment)}
                              title='Cabut penugasan OPD ini'
                              className='opacity-60 hover:opacity-100 hover:text-destructive focus:outline-none transition-opacity ml-0.5'
                            >
                              <X className='h-3 w-3' />
                            </button>
                          )}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className='p-3 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground'>
                      Auditor ini belum memiliki penugasan OPD. Klik tombol{' '}
                      <strong>Kelola OPD</strong> untuk menetapkan instansi yang
                      menjadi tanggung jawab approval auditor.
                    </div>
                  )}

                  {/* Tanggal Penugasan / Catatan */}
                  {(first?.tanggal_mulai || first?.catatan) && (
                    <div className='flex items-center gap-4 text-[11px] text-muted-foreground pt-1 flex-wrap'>
                      {first?.tanggal_mulai && (
                        <div className='flex items-center gap-1'>
                          <Calendar className='h-3 w-3 text-muted-foreground' />
                          <span>
                            Masa Tugas:{' '}
                            {new Date(first.tanggal_mulai).toLocaleDateString('id-ID')}
                            {first.tanggal_selesai
                              ? ` s/d ${new Date(first.tanggal_selesai).toLocaleDateString('id-ID')}`
                              : ' (Seterusnya)'}
                          </span>
                        </div>
                      )}
                      {first?.catatan && (
                        <span className='italic truncate max-w-md'>
                          "{first.catatan}"
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Right: Actions */}
                <div className='flex items-center md:flex-col justify-end gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0'>
                  {canEdit && (
                    <Button
                      variant='outline'
                      size='sm'
                      className='h-8 text-xs gap-1.5 w-full md:w-auto font-medium hover:border-primary hover:text-primary'
                      onClick={() => setEditAuditor(auditor)}
                    >
                      <Settings2 className='h-3.5 w-3.5' />
                      Kelola OPD
                    </Button>
                  )}
                  {canDelete && hasAssignments && (
                    <Button
                      variant='ghost'
                      size='sm'
                      className='h-8 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive w-full md:w-auto'
                      onClick={() => setDeleteAuditor(auditor)}
                    >
                      <Trash2 className='h-3.5 w-3.5' />
                      Cabut Semua
                    </Button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
