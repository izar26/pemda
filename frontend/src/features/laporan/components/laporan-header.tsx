import { Download, Lock, Printer, RefreshCw } from 'lucide-react'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'

interface LaporanHeaderProps {
  isLoadingData: boolean
  isExporting: boolean
  onRefresh: () => void
  onPrint: () => void
  onExportExcel: () => void
  isApproved?: boolean
}

export function LaporanHeader({
  isLoadingData,
  isExporting,
  onRefresh,
  onPrint,
  onExportExcel,
  isApproved = false,
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
          title={
            isApproved
              ? 'Cetak lembar laporan resmi dalam format A4 Landscape'
              : 'Cetak pratinjau (akan ditandai watermark DRAFT)'
          }
        >
          <Printer className='h-3.5 w-3.5' />
          {isApproved ? 'Cetak Dokumen Resmi' : 'Cetak Pratinjau (Draft)'}
        </Button>
        <Button
          size='sm'
          className={`h-9 text-xs gap-1.5 font-medium shadow-sm ${
            isApproved
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
              : 'bg-muted text-muted-foreground hover:bg-muted border'
          }`}
          onClick={onExportExcel}
          disabled={isExporting}
          title={
            isApproved
              ? 'Unduh file Excel resmi'
              : 'Terkunci: Pengajuan risiko OPD belum disetujui penuh oleh Inspektorat'
          }
        >
          {isApproved ? (
            <Download className='h-3.5 w-3.5' />
          ) : (
            <Lock className='h-3.5 w-3.5 text-muted-foreground' />
          )}
          {isApproved ? 'Unduh Excel (.xlsx)' : 'Excel (Terkunci)'}
        </Button>
      </div>
    </PageHeader>
  )
}
