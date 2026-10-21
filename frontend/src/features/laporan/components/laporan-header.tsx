import { Download, Printer, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'

interface LaporanHeaderProps {
  isLoadingData: boolean
  isExporting: boolean
  onRefresh: () => void
  onPrint: () => void
  onExportExcel: () => void
}

export function LaporanHeader({
  isLoadingData,
  isExporting,
  onRefresh,
  onPrint,
  onExportExcel,
}: LaporanHeaderProps) {
  return (
    <PageHeader className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden'>
      <div className='space-y-1 min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <h2 className='text-2xl font-bold tracking-tight text-foreground'>
            Laporan Pengelolaan Risiko
          </h2>
        </div>
        <p className='text-xs text-muted-foreground'>
          Pratinjau lembar formulir resmi dan ekspor berkas Excel sesuai format baku Pemerintah Kabupaten Cianjur.
        </p>
      </div>

      <div className='flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap'>
        <Button
          variant='outline'
          size='sm'
          className='h-9 text-xs'
          onClick={onRefresh}
          disabled={isLoadingData}
        >
          <RefreshCw
            className={`h-3.5 w-3.5 mr-1.5 ${isLoadingData ? 'animate-spin' : ''}`}
          />
          Segarkan
        </Button>
        <Button
          variant='outline'
          size='sm'
          className='h-9 text-xs gap-1.5'
          onClick={onPrint}
        >
          <Printer className='h-3.5 w-3.5' />
          Cetak / PDF
        </Button>
        <Button
          size='sm'
          className='h-9 text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm'
          onClick={onExportExcel}
          disabled={isExporting}
        >
          <Download className='h-3.5 w-3.5' />
          Unduh Excel (.xlsx)
        </Button>
      </div>
    </PageHeader>
  )
}
