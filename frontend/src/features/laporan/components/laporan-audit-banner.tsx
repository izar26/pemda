import { AlertCircle, CheckCircle2, ShieldCheck, Lock } from 'lucide-react'
import type { LaporanAuditStatus } from '@/services/laporan-service'

interface LaporanAuditBannerProps {
  auditStatus: LaporanAuditStatus
}

export function LaporanAuditBanner({ auditStatus }: LaporanAuditBannerProps) {
  const { is_approved, status, current_tier, approved_at, approved_by_name } = auditStatus

  if (is_approved) {
    return (
      <div className='flex items-start gap-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-950 dark:text-emerald-200 print:hidden'>
        <ShieldCheck className='h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5' />
        <div className='space-y-0.5'>
          <div className='flex items-center gap-2'>
            <span className='font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-300'>
              Status Kertas Kerja: Disetujui (Approved)
            </span>
            <span className='inline-flex items-center rounded-full bg-emerald-600/20 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300'>
              <CheckCircle2 className='mr-1 h-3 w-3' /> Sah untuk Pemeriksaan BPKP / SPIP
            </span>
          </div>
          <p className='text-muted-foreground'>
            Paket penilaian risiko OPD telah disetujui resmi oleh Inspektorat
            {approved_by_name ? ` (${approved_by_name})` : ''}
            {approved_at ? ` pada tanggal ${new Date(approved_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}.
            Dokumen cetak dan file Excel yang dihasilkan merupakan arsip valid.
          </p>
        </div>
      </div>
    )
  }

  const getTierLabel = () => {
    switch (current_tier) {
      case 'operator':
        return 'Tahap Operator OPD (Penyusunan Kertas Kerja)'
      case 'kepala_opd':
        return 'Tahap Verifikasi Kepala OPD'
      case 'auditor':
        return 'Tahap Penilaian Tim Auditor Inspektorat'
      case 'pengawas':
        return 'Tahap Finalisasi Koordinator Pengawas Inspektorat'
      default:
        return `Tahap: ${current_tier}`
    }
  }

  return (
    <div className='flex items-start gap-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-950 dark:text-amber-200 print:hidden'>
      <Lock className='h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5' />
      <div className='space-y-1'>
        <div className='flex items-center gap-2'>
          <span className='font-semibold uppercase tracking-wider text-amber-800 dark:text-amber-300'>
            Status Dokumen: Belum Disetujui (Status: {status.replace(/_/g, ' ').toUpperCase()})
          </span>
          <span className='inline-flex items-center rounded-full bg-amber-600/20 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-300'>
            <AlertCircle className='mr-1 h-3 w-3' /> {getTierLabel()}
          </span>
        </div>
        <p className='text-muted-foreground'>
          Sesuai tata kelola kepatuhan audit SPIP, tombol <strong>Ekspor Excel Resmi</strong> dikunci hingga seluruh paket penilaian risiko OPD berstatus <em>Approved</em> oleh Inspektorat. Cetakan pratinjau saat ini otomatis ditandai watermark <strong>DRAFT</strong>.
        </p>
      </div>
    </div>
  )
}
