import type { ReactNode } from 'react'
import { FileText, ShieldCheck } from 'lucide-react'
import type { LaporanData } from '@/services/laporan-service'
import { LaporanAuditBanner } from './laporan-audit-banner'
import { LaporanSignatureBlock } from './laporan-signature-block'

interface LaporanDocumentWrapperProps {
  laporan: LaporanData | null
  children: ReactNode
}

export function LaporanDocumentWrapper({
  laporan,
  children,
}: LaporanDocumentWrapperProps) {
  if (!laporan) {
    return (
      <div className='rounded-xl border border-dashed border-border/80 bg-muted/20 p-12 text-center'>
        <FileText className='mx-auto h-12 w-12 text-muted-foreground/60' />
        <h3 className='mt-4 text-base font-semibold text-foreground'>
          Data Laporan Belum Tersedia
        </h3>
        <p className='mt-1 text-xs text-muted-foreground max-w-md mx-auto'>
          Silakan pilih Perangkat Daerah dan Formulir untuk memuat lembar kerja laporan risiko.
        </p>
      </div>
    )
  }

  const { form_code, form_title, opd, periode, audit_status, penandatangan } = laporan

  return (
    <div className='mx-auto max-w-5xl bg-card rounded-xl border border-border shadow-md print:shadow-none print:border-none print:m-0 print:p-0 print:w-full overflow-hidden text-foreground font-sans'>
      {/* 1. Header Kop Lembar Dokumen Resmi BPKP / Pemda */}
      <div className='border-b-2 border-foreground/20 bg-muted/30 px-6 sm:px-8 py-5 print:bg-white print:px-0 print:py-4'>
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-1.5'>
            <div className='flex items-center gap-2'>
              <span className='inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 print:border-black print:text-black'>
                <ShieldCheck className='h-3.5 w-3.5' /> Formulir Resmi {form_code.toUpperCase()}
              </span>
              <span className='text-xs font-semibold text-muted-foreground print:text-black'>
                Tahun Penilaian: {periode.tahun}
              </span>
            </div>
            <h2 className='text-lg sm:text-xl font-black tracking-tight text-foreground uppercase print:text-black'>
              {form_title}
            </h2>
            <p className='text-xs text-muted-foreground font-medium print:text-black'>
              Sistem Pengendalian Intern Pemerintah (SPIP) & Manajemen Risiko — {opd.nama}
            </p>
          </div>

          <div className='text-left sm:text-right text-xs space-y-0.5 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/50'>
            <span className='text-muted-foreground block text-[11px] font-medium print:text-black'>
              Unit Pengelola Risiko (OPD):
            </span>
            <span className='font-bold text-foreground block print:text-black'>
              {opd.nama}
            </span>
            <span className='text-[11px] text-muted-foreground font-mono print:text-black'>
              Kode: {opd.kode || '-'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Audit Governance & Status Protection Banner */}
      <div className='px-6 sm:px-8 pt-5 print:hidden'>
        <LaporanAuditBanner auditStatus={audit_status} />
      </div>

      {/* 3. Table / Sheet Content Area */}
      <div className='p-6 sm:p-8 print:p-0 print:pt-4'>
        {children}

        {/* 4. Official Signature Block (Pengesahan Kepala OPD) */}
        <LaporanSignatureBlock penandatangan={penandatangan} />
      </div>
    </div>
  )
}
