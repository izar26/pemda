import { Clock, FileSpreadsheet, Lock } from 'lucide-react'

interface LaporanSheetPlaceholderProps {
  formTitle: string
  shortTitle: string
  description?: string
  opdNama?: string
  tahun?: string | number
}

export function LaporanSheetPlaceholder({
  formTitle,
  shortTitle,
  description,
  opdNama,
  tahun,
}: LaporanSheetPlaceholderProps) {
  return (
    <div className='mx-auto max-w-4xl bg-card rounded-xl border border-dashed border-border shadow-sm p-10 text-center space-y-5 print:border-none print:shadow-none'>
      <div className='mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary'>
        <FileSpreadsheet className='h-7 w-7' />
      </div>

      <div className='space-y-1.5 max-w-lg mx-auto'>
        <div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 mb-2'>
          <Clock className='h-3.5 w-3.5' /> Siklus Penilaian Tahap Berikutnya
        </div>
        <h2 className='text-xl font-bold text-foreground'>
          {formTitle}
        </h2>
        <p className='text-xs text-muted-foreground leading-relaxed'>
          {description || 'Laporan resmi untuk tahapan ini akan terisi otomatis setelah OPD menyelesaikan pengisian formulir kerja pada modul Pengelolaan Risiko.'}
        </p>
      </div>

      <div className='rounded-lg border bg-muted/20 p-4 max-w-md mx-auto text-xs space-y-2 text-start'>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Perangkat Daerah:</span>
          <span className='font-semibold text-foreground'>{opdNama || 'Semua OPD'}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Tahun Penilaian:</span>
          <span className='font-semibold text-foreground'>{tahun || '2026'}</span>
        </div>
        <div className='flex justify-between'>
          <span className='text-muted-foreground'>Format Output:</span>
          <span className='font-semibold text-foreground'>Excel Standar BPKP (.xlsx) & Cetak PDF</span>
        </div>
      </div>

      <div className='pt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground'>
        <Lock className='h-3.5 w-3.5' /> Template format Excel untuk {shortTitle} telah disiapkan di sistem.
      </div>
    </div>
  )
}
