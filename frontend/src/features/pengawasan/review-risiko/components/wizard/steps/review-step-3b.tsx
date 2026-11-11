import { Loader2, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { IdentifikasiRisikoOpd } from '@/types/risiko'

interface ReviewStep3BProps {
  dokumen3B?: IdentifikasiRisikoOpd | null
  isLoading: boolean
}

export function ReviewStep3B({ dokumen3B, isLoading }: ReviewStep3BProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center p-12 text-xs text-muted-foreground gap-2'>
        <Loader2 className='h-4 w-4 animate-spin text-primary' />
        <span>Memuat data Identifikasi Risiko OPD (Form 3B)...</span>
      </div>
    )
  }

  const items = dokumen3B?.items || []

  return (
    <div className='space-y-4'>
      {/* 1. Header Information */}
      <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs'>
        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Nama Pemda:
          </span>
          <p className='font-bold text-foreground'>
            {dokumen3B?.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
          </p>
        </div>

        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Perangkat Daerah (OPD):
          </span>
          <p className='font-bold text-foreground flex items-center justify-between gap-1'>
            <span className='truncate'>{dokumen3B?.opd?.nama || 'Perangkat Daerah'}</span>
            <Badge variant='outline' className='font-mono font-bold text-primary text-[10px]'>
              {dokumen3B?.singkatan_opd || 'OPD'}
            </Badge>
          </p>
        </div>

        <div className='p-3 rounded-lg border bg-muted/20 space-y-1'>
          <span className='text-[11px] text-muted-foreground block font-medium'>
            Urusan Pemerintahan:
          </span>
          <p className='font-bold text-foreground flex items-center gap-1.5'>
            <Building2 className='h-3.5 w-3.5 text-primary' />
            {dokumen3B?.urusan_pemerintahan
              ? `${dokumen3B.urusan_pemerintahan.kode} - ${dokumen3B.urusan_pemerintahan.nama}`
              : 'Belum ditentukan'}
          </p>
        </div>
      </div>

      {/* 2. Real Table 3B */}
      <div className='rounded-lg border overflow-hidden shadow-2xs bg-card'>
        <div className='overflow-x-auto'>
          <table className='w-full text-xs text-start'>
            <thead className='bg-muted/50 border-b text-muted-foreground font-semibold'>
              <tr>
                <th className='p-2.5 text-center w-12'>No</th>
                <th className='p-2.5 text-start min-w-[180px]'>Sasaran Strategis & Indikator</th>
                <th className='p-2.5 text-start min-w-[140px]'>Kategori & Kode</th>
                <th className='p-2.5 text-start min-w-[200px]'>Pernyataan Risiko</th>
                <th className='p-2.5 text-start min-w-[110px]'>Pemilik</th>
                <th className='p-2.5 text-start min-w-[180px] bg-amber-500/5 dark:bg-amber-500/10 border-x border-amber-500/20'>
                  Sebab & Sumber (RCA)
                </th>
                <th className='p-2.5 text-center w-14'>C/UC</th>
                <th className='p-2.5 text-start min-w-[150px]'>Uraian Dampak</th>
                <th className='p-2.5 text-start min-w-[120px]'>Pihak Terkena</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={9} className='p-8 text-center text-muted-foreground'>
                    Tidak ada butir risiko strategis OPD yang tercatat pada pengajuan ini.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className='hover:bg-muted/20'>
                    <td className='p-2.5 text-center font-mono text-muted-foreground'>
                      {item.nomor_urut || idx + 1}
                    </td>
                    <td className='p-2.5 space-y-1 align-top'>
                      <span className='font-semibold text-foreground block leading-tight'>
                        {item.resolved_sasaran || '-'}
                      </span>
                      {item.resolved_indikator && (
                        <span className='text-[11px] text-muted-foreground block'>
                          Indikator: {item.resolved_indikator}
                        </span>
                      )}
                    </td>
                    <td className='p-2.5 space-y-1 align-top'>
                      <Badge variant='secondary' className='text-[10px]'>
                        {item.kategori_risiko}
                      </Badge>
                      <div>
                        <Badge className='text-[10px] font-mono font-bold bg-amber-400 text-slate-900 border border-amber-500'>
                          {item.kode_risiko}
                        </Badge>
                      </div>
                    </td>
                    <td className='p-2.5 align-top font-medium text-foreground leading-snug'>
                      {item.pernyataan_risiko}
                    </td>
                    <td className='p-2.5 align-top text-foreground'>
                      {item.pemilik_risiko || 'Kepala OPD'}
                    </td>
                    <td className='p-2.5 align-top bg-amber-500/5 dark:bg-amber-500/10 border-x border-amber-500/20 space-y-1'>
                      {item.uraian_sebab ? (
                        <>
                          <Badge variant='outline' className='text-[9px] font-mono bg-background'>
                            {item.sumber_risiko}
                          </Badge>
                          <p className='text-xs italic text-foreground'>
                            "{item.uraian_sebab}"
                          </p>
                        </>
                      ) : (
                        <span className='text-muted-foreground italic text-[11px]'>
                          Belum dianalisis
                        </span>
                      )}
                    </td>
                    <td className='p-2.5 text-center align-top'>
                      <Badge
                        variant='outline'
                        className={
                          item.sifat_risiko === 'C'
                            ? 'text-[10px] font-bold text-emerald-700 bg-emerald-500/10'
                            : 'text-[10px] font-bold text-amber-700 bg-amber-500/10'
                        }
                      >
                        {item.sifat_risiko || 'C'}
                      </Badge>
                    </td>
                    <td className='p-2.5 align-top text-muted-foreground'>
                      {item.uraian_dampak || '-'}
                    </td>
                    <td className='p-2.5 align-top text-foreground font-medium'>
                      {item.pihak_terkena || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
