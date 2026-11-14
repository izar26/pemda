import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { getReviewStepConfig } from './review-step-registry'

interface ReviewStepContentProps {
  formCode: string
  data: unknown
  isLoading: boolean
  isError: boolean
  onRetry: () => void
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  } | null
  search: string
  onSearchChange: (value: string) => void
  page: number
  onPageChange: (page: number) => void
  rcaSource?: string
  onRcaSourceChange?: (source: string) => void
  rcaStatus?: string
  onRcaStatusChange?: (status: string) => void
}

export function ReviewStepContent({
  formCode,
  data,
  isLoading,
  isError,
  onRetry,
  meta,
  search,
  onSearchChange,
  page,
  onPageChange,
  rcaSource = '',
  onRcaSourceChange,
  rcaStatus = '',
  onRcaStatusChange,
}: ReviewStepContentProps) {
  const config = getReviewStepConfig(formCode)

  if (!config) {
    return (
      <div className='p-4 text-xs text-muted-foreground'>
        Komponen tampilan review untuk form {formCode.toUpperCase()} belum
        terdaftar.
      </div>
    )
  }

  const { filters, isPaginated, render } = config

  return (
    <div className='p-3.5 sm:p-4'>
      {/* 1. Universal Search Filter */}
      {filters?.hasSearch && !isError && (
        <div className='mb-4'>
          <Input
            aria-label={filters.searchPlaceholder || 'Cari data'}
            placeholder={filters.searchPlaceholder || 'Cari data...'}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>
      )}

      {/* 2. RCA Specific Filters */}
      {filters?.hasRcaFilters && !isError && (
        <div className='mb-4 flex flex-wrap gap-2'>
          <select
            aria-label='Filter asal risiko'
            className='h-9 rounded-md border bg-background px-2 text-sm'
            value={rcaSource}
            onChange={(e) => onRcaSourceChange?.(e.target.value)}
          >
            <option value=''>Semua form</option>
            <option value='3a'>Form 3A</option>
            <option value='3b'>Form 3B</option>
            <option value='3c'>Form 3C</option>
          </select>
          <select
            aria-label='Filter status analisis'
            className='h-9 rounded-md border bg-background px-2 text-sm'
            value={rcaStatus}
            onChange={(e) => onRcaStatusChange?.(e.target.value)}
          >
            <option value=''>Semua status</option>
            <option value='complete'>Lengkap</option>
            <option value='incomplete'>Belum lengkap</option>
          </select>
        </div>
      )}

      {/* 3. Error Fallback */}
      {isError && (
        <div
          role='alert'
          className='space-y-2 rounded-lg border border-destructive/40 p-4 text-sm'
        >
          <p>
            Data form gagal dimuat. Periksa koneksi atau hak akses, lalu coba
            lagi.
          </p>
          <Button variant='outline' size='sm' onClick={onRetry}>
            Coba lagi
          </Button>
        </div>
      )}

      {/* 4. Main Step Body via Registry */}
      {!isError && render({ data, isLoading, formCode })}

      {/* 5. Universal Pagination */}
      {isPaginated && meta && !isError && (
        <div className='flex flex-wrap items-center justify-between gap-2 pt-4 text-xs'>
          <span>
            {meta.total} data · Halaman {meta.current_page} dari{' '}
            {meta.last_page}
          </span>
          <div className='flex gap-2'>
            <Button
              variant='outline'
              size='sm'
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(page - 1, 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant='outline'
              size='sm'
              disabled={page >= meta.last_page}
              onClick={() => onPageChange(page + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
