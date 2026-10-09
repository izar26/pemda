import { useEffect, useRef, useState } from 'react'
import { FileSpreadsheet, Download, Filter, Database, Loader2 } from 'lucide-react'
import { Button, type buttonVariants } from '@/components/ui/button'
import { type VariantProps } from 'class-variance-authority'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadExcelReport } from '@/services/export-service'

interface ExportExcelButtonProps {
  endpoint: string
  /** Optional dynamic filters applied only when "Ekspor Sesuai Filter" is selected */
  params?: Record<string, unknown>
  /** Invariable contextual parameters (e.g., { archive: true }) preserved even when "Ekspor Seluruh Data" is selected */
  fixedParams?: Record<string, unknown>
  filename?: string
  label?: string
  variant?: VariantProps<typeof buttonVariants>['variant']
  size?: VariantProps<typeof buttonVariants>['size']
  className?: string
  hasFilterActive?: boolean
  disabled?: boolean
}

export function ExportExcelButton({
  endpoint,
  params = {},
  fixedParams = {},
  filename = 'Laporan_Data_PEMDA.xlsx',
  label = 'Ekspor Excel',
  variant = 'outline',
  size = 'sm',
  className = '',
  hasFilterActive = false,
  disabled = false,
}: ExportExcelButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // Automatically cancel in-flight HTTP stream if component unmounts (e.g. user switches route)
  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [])

  async function handleExport(applyFilters: boolean) {
    if (isExporting) return // Guard against rapid multi-click

    setIsExporting(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const queryParams = applyFilters
        ? { ...fixedParams, ...params }
        : { ...fixedParams }

      await downloadExcelReport(endpoint, {
        params: queryParams,
        fallbackFilename: filename,
        signal: controller.signal,
      })
    } finally {
      abortControllerRef.current = null
      if (isMountedRef.current) {
        setIsExporting(false)
      }
    }
  }

  // Count active non-empty dynamic filters
  const activeParamKeys = Object.keys(params).filter(
    (k) => params[k] !== undefined && params[k] !== '' && params[k] !== 'all'
  )
  const isFiltered = hasFilterActive || activeParamKeys.length > 0

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          disabled={disabled || isExporting}
          className={`h-9 text-xs gap-1.5 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-500/40 dark:text-emerald-400 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 font-medium ${className}`}
        >
          {isExporting ? (
            <Loader2 className='h-3.5 w-3.5 animate-spin text-emerald-600 dark:text-emerald-400' />
          ) : (
            <FileSpreadsheet className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
          )}
          <span>{label}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-64 text-xs'>
        <DropdownMenuLabel className='flex items-center gap-1.5 font-semibold text-emerald-700 dark:text-emerald-400'>
          <Download className='h-3.5 w-3.5' /> Opsi Unduh Berkas Excel (.xlsx)
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleExport(true)}
          disabled={isExporting}
          className='flex flex-col items-start gap-0.5 cursor-pointer py-2'
        >
          <div className='flex items-center gap-1.5 font-medium text-foreground'>
            <Filter className='h-3.5 w-3.5 text-primary' />
            <span>Ekspor Sesuai Filter Saat Ini</span>
          </div>
          <p className='text-[11px] text-muted-foreground pl-5'>
            {isFiltered
              ? `Mengunduh data terfilter (${activeParamKeys.length} parameter aktif)`
              : 'Mengunduh data dengan kriteria pencarian yang aktif'}
          </p>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleExport(false)}
          disabled={isExporting}
          className='flex flex-col items-start gap-0.5 cursor-pointer py-2'
        >
          <div className='flex items-center gap-1.5 font-medium text-foreground'>
            <Database className='h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400' />
            <span>Ekspor Seluruh Data (Lengkap)</span>
          </div>
          <p className='text-[11px] text-muted-foreground pl-5'>
            Mengunduh seluruh basis data tanpa filter pencarian
          </p>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
