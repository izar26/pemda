import {
  Building2,
  Edit,
  Loader2,
  MoreHorizontal,
  Search,
  Trash2,
  Users,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { opdService } from '@/services/opd-service'
import { usePermissions } from '@/hooks/use-permissions'
import { OPD_CATEGORIES, type OpdItem, type OpdQueryParams } from '@/types/opd'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface OpdTableProps {
  data: OpdItem[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
  isLoading: boolean
  queryParams: OpdQueryParams
  setQueryParams: React.Dispatch<React.SetStateAction<OpdQueryParams>>
  onEdit: (item: OpdItem) => void
  onDelete: (item: OpdItem) => void
}

function getCategoryBadgeClass(kategori: string): string {
  switch (kategori) {
    case 'Dinas':
      return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
    case 'Badan':
      return 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800'
    case 'Sekretariat':
      return 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-700'
    case 'Inspektorat':
      return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
    case 'RSUD':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
    case 'Kecamatan':
      return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
    default:
      return 'bg-muted text-muted-foreground border-border'
  }
}

export function OpdTable({
  data,
  meta,
  isLoading,
  queryParams,
  setQueryParams,
  onEdit,
  onDelete,
}: OpdTableProps) {
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()

  const canEdit = hasPermission('opd.edit')
  const canDelete = hasPermission('opd.delete')

  const toggleMutation = useMutation({
    mutationFn: (id: number) => opdService.toggleActive(id),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['opds'] })
      queryClient.invalidateQueries({ queryKey: ['opds-stats'] })
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

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    setQueryParams((prev) => ({
      ...prev,
      search: e.target.value,
      page: 1,
    }))
  }

  function handleCategoryChange(val: string) {
    setQueryParams((prev) => ({
      ...prev,
      kategori: val === 'all' ? undefined : val,
      page: 1,
    }))
  }

  function handleStatusChange(val: string) {
    setQueryParams((prev) => ({
      ...prev,
      status: val === 'all' ? undefined : (val as 'active' | 'inactive'),
      page: 1,
    }))
  }

  function handleSort(column: string) {
    setQueryParams((prev) => {
      const isAsc = prev.sort_by === column && prev.sort_direction === 'asc'
      return {
        ...prev,
        sort_by: column,
        sort_direction: isAsc ? 'desc' : 'asc',
      }
    })
  }

  return (
    <div className='space-y-4'>
      {/* Toolbar Filters */}
      <div className='flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3'>
        <div className='flex flex-1 items-center gap-2'>
          <div className='relative flex-1 max-w-sm'>
            <Search className='absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground' />
            <Input
              placeholder='Cari nama, kode, atau kepala instansi...'
              value={queryParams.search || ''}
              onChange={handleSearchChange}
              className='pl-8 h-9 text-xs'
            />
          </div>

          <Select
            value={queryParams.kategori || 'all'}
            onValueChange={handleCategoryChange}
          >
            <SelectTrigger className='w-[160px] h-9 text-xs'>
              <SelectValue placeholder='Semua Kategori' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua Kategori</SelectItem>
              {OPD_CATEGORIES.map((kat) => (
                <SelectItem key={kat} value={kat}>
                  {kat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={queryParams.status || 'all'}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className='w-[130px] h-9 text-xs'>
              <SelectValue placeholder='Semua Status' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>Semua Status</SelectItem>
              <SelectItem value='active'>Aktif</SelectItem>
              <SelectItem value='inactive'>Nonaktif</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className='text-xs text-muted-foreground font-mono self-end sm:self-center'>
          {meta ? `Total: ${meta.total} instansi` : ''}
        </div>
      </div>

      {/* Table Container */}
      <div className='rounded-md border bg-card shadow-2xs overflow-hidden'>
        <Table>
          <TableHeader className='bg-muted/40'>
            <TableRow>
              <TableHead className='w-12 text-center text-xs font-semibold'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs font-semibold'
                  onClick={() => handleSort('urutan')}
                >
                  No.
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead className='w-28 text-xs font-semibold'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs font-semibold'
                  onClick={() => handleSort('kode')}
                >
                  Kode OPD
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead className='text-xs font-semibold'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs font-semibold'
                  onClick={() => handleSort('nama')}
                >
                  Nama Perangkat Daerah
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead className='w-32 text-xs font-semibold'>
                <Button
                  variant='ghost'
                  size='sm'
                  className='h-7 text-xs font-semibold'
                  onClick={() => handleSort('kategori')}
                >
                  Kategori
                  <ArrowUpDown className='ml-1 h-3 w-3' />
                </Button>
              </TableHead>
              <TableHead className='text-xs font-semibold'>Kepala Instansi</TableHead>
              <TableHead className='w-28 text-center text-xs font-semibold'>
                Pegawai
              </TableHead>
              <TableHead className='w-28 text-center text-xs font-semibold'>
                Status
              </TableHead>
              <TableHead className='w-16 text-center text-xs font-semibold'>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className='h-40 text-center'>
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Loader2 className='h-6 w-6 animate-spin text-primary' />
                    <span className='text-xs'>Memuat data perangkat daerah...</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className='h-40 text-center'>
                  <div className='flex flex-col items-center justify-center gap-2 text-muted-foreground'>
                    <Building2 className='h-8 w-8 text-muted-foreground/40' />
                    <span className='text-xs font-medium'>
                      Tidak ada data perangkat daerah ditemukan.
                    </span>
                    {(queryParams.search || queryParams.kategori || queryParams.status) && (
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() =>
                          setQueryParams({
                            page: 1,
                            per_page: 10,
                          })
                        }
                        className='text-xs text-primary'
                      >
                        Reset Filter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => {
                const rowNumber = meta
                  ? (meta.current_page - 1) * meta.per_page + index + 1
                  : index + 1

                return (
                  <TableRow
                    key={item.id}
                    className='hover:bg-muted/30 transition-colors'
                  >
                    <TableCell className='text-center font-mono text-xs text-muted-foreground'>
                      {item.urutan || rowNumber}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className='font-mono text-xs font-semibold bg-muted/40 border-muted-foreground/20'
                      >
                        {item.kode}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex flex-col py-0.5'>
                        <span className='font-semibold text-sm text-foreground'>
                          {item.nama}
                        </span>
                        <span className='text-[11px] text-muted-foreground font-mono'>
                          ID: #{item.id}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant='outline'
                        className={`text-xs font-medium border ${getCategoryBadgeClass(item.kategori)}`}
                      >
                        {item.kategori}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className='text-xs text-foreground/90'>
                        {item.kepala ? (
                          item.kepala
                        ) : (
                          <span className='text-muted-foreground/60 italic'>
                            Belum ditentukan
                          </span>
                        )}
                      </span>
                    </TableCell>
                    <TableCell className='text-center'>
                      <Badge
                        variant='secondary'
                        className='gap-1 font-mono text-xs'
                      >
                        <Users className='h-3 w-3 text-muted-foreground' />
                        {item.users_count ?? 0}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-center'>
                      {canEdit ? (
                        <div className='flex items-center justify-center gap-1.5'>
                          <Switch
                            checked={item.is_active}
                            onCheckedChange={() => toggleMutation.mutate(item.id)}
                            disabled={toggleMutation.isPending}
                            aria-label='Toggle status aktif'
                          />
                          <span className='text-[11px] font-mono'>
                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </div>
                      ) : (
                        <div className='flex items-center justify-center gap-1'>
                          {item.is_active ? (
                            <Badge
                              variant='outline'
                              className='bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[10px]'
                            >
                              <CheckCircle2 className='h-3 w-3 mr-1' />
                              Aktif
                            </Badge>
                          ) : (
                            <Badge
                              variant='outline'
                              className='bg-destructive/10 text-destructive border-destructive/20 text-[10px]'
                            >
                              <XCircle className='h-3 w-3 mr-1' />
                              Nonaktif
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className='text-center'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant='ghost'
                            size='icon'
                            className='h-8 w-8 p-0'
                          >
                            <MoreHorizontal className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end' className='w-40'>
                          {canEdit && (
                            <DropdownMenuItem
                              onClick={() => onEdit(item)}
                              className='gap-2 text-xs cursor-pointer'
                            >
                              <Edit className='h-3.5 w-3.5 text-muted-foreground' />
                              Edit Instansi
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(item)}
                                className='gap-2 text-xs text-destructive focus:text-destructive cursor-pointer'
                              >
                                <Trash2 className='h-3.5 w-3.5' />
                                Hapus Instansi
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {meta && meta.last_page > 1 && (
        <div className='flex items-center justify-between px-2 pt-1'>
          <div className='text-xs text-muted-foreground'>
            Halaman {meta.current_page} dari {meta.last_page} ({meta.total} total data)
          </div>
          <div className='flex items-center gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={meta.current_page <= 1 || isLoading}
              onClick={() =>
                setQueryParams((prev) => ({
                  ...prev,
                  page: (prev.page || 1) - 1,
                }))
              }
              className='text-xs h-8'
            >
              Sebelumnya
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={meta.current_page >= meta.last_page || isLoading}
              onClick={() =>
                setQueryParams((prev) => ({
                  ...prev,
                  page: (prev.page || 1) + 1,
                }))
              }
              className='text-xs h-8'
            >
              Selanjutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
