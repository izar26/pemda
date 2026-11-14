import type { IdentifikasiRisikoOpd } from '@/types/risiko'
import { Loader2, Building2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReviewStep3BProps {
  dokumen3B?: IdentifikasiRisikoOpd | null
  urusan?: { kode: string; nama: string } | null
  isLoading: boolean
}

export function ReviewStep3B({
  dokumen3B,
  urusan,
  isLoading,
}: ReviewStep3BProps) {
  if (isLoading) {
    return (
      <div className='flex items-center justify-center gap-2 p-12 text-xs text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin text-primary' />
        <span>Memuat data Identifikasi Risiko OPD (Form 3B)...</span>
      </div>
    )
  }

  const items = dokumen3B?.items || []

  return (
    <div className='space-y-4'>
      {/* 1. Header Information */}
      <div className='grid grid-cols-1 gap-3 text-xs sm:grid-cols-3'>
        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Nama Pemda:
          </span>
          <p className='font-bold text-foreground'>
            {dokumen3B?.nama_pemda || 'Pemerintah Kabupaten Cianjur'}
          </p>
        </div>

        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Perangkat Daerah (OPD):
          </span>
          <p className='flex items-center justify-between gap-1 font-bold text-foreground'>
            <span className='truncate'>
              {dokumen3B?.opd?.nama || 'Perangkat Daerah'}
            </span>
            <Badge
              variant='outline'
              className='font-mono text-[10px] font-bold text-primary'
            >
              {dokumen3B?.singkatan_opd || 'OPD'}
            </Badge>
          </p>
        </div>

        <div className='space-y-1 rounded-lg border bg-muted/20 p-3'>
          <span className='block text-[11px] font-medium text-muted-foreground'>
            Urusan Pemerintahan:
          </span>
          <p className='flex items-center gap-1.5 font-bold text-foreground'>
            <Building2 className='h-3.5 w-3.5 text-primary' />
            {urusan
              ? `${urusan.kode} - ${urusan.nama}`
              : dokumen3B?.urusan_pemerintahan
                ? `${dokumen3B.urusan_pemerintahan.kode} - ${dokumen3B.urusan_pemerintahan.nama}`
                : 'Belum ditentukan'}
          </p>
        </div>
      </div>

      {/* 2. Real Table 3B */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground'>
              <tr>
                <th className='w-12 p-2.5 text-center'>No</th>
                <th className='min-w-[180px] p-2.5 text-start'>
                  Sasaran Strategis & Indikator
                </th>
                <th className='min-w-[140px] p-2.5 text-start'>
                  Kategori & Kode
                </th>
                <th className='min-w-[200px] p-2.5 text-start'>
                  Pernyataan Risiko
                </th>
                <th className='min-w-[110px] p-2.5 text-start'>Pemilik</th>
                <th className='min-w-[180px] border-x border-amber-500/20 bg-amber-500/5 p-2.5 text-start dark:bg-amber-500/10'>
                  Sebab & Sumber (RCA)
                </th>
                <th className='w-14 p-2.5 text-center'>C/UC</th>
                <th className='min-w-[150px] p-2.5 text-start'>
                  Uraian Dampak
                </th>
                <th className='min-w-[120px] p-2.5 text-start'>
                  Pihak Terkena
                </th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className='p-8 text-center text-muted-foreground'
                  >
                    Tidak ada butir risiko strategis OPD yang tercatat pada
                    pengajuan ini.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className='hover:bg-muted/20'>
                    <td className='p-2.5 text-center font-mono text-muted-foreground'>
                      {item.nomor_urut || idx + 1}
                    </td>
                    <td className='space-y-1 p-2.5 align-top'>
                      <span className='block leading-tight font-semibold text-foreground'>
                        {item.resolved_sasaran || '-'}
                      </span>
                      {item.resolved_indikator && (
                        <span className='block text-[11px] text-muted-foreground'>
                          Indikator: {item.resolved_indikator}
                        </span>
                      )}
                    </td>
                    <td className='space-y-1 p-2.5 align-top'>
                      <Badge variant='secondary' className='text-[10px]'>
                        {item.kategori_risiko}
                      </Badge>
                      <div>
                        <Badge className='border border-amber-500 bg-amber-400 font-mono text-[10px] font-bold text-slate-900'>
                          {item.kode_risiko}
                        </Badge>
                      </div>
                    </td>
                    <td className='p-2.5 align-top leading-snug font-medium text-foreground'>
                      {item.pernyataan_risiko}
                    </td>
                    <td className='p-2.5 align-top text-foreground'>
                      {item.pemilik_risiko || '-'}
                    </td>
                    <td className='space-y-1 border-x border-amber-500/20 bg-amber-500/5 p-2.5 align-top dark:bg-amber-500/10'>
                      {item.uraian_sebab ? (
                        <>
                          <Badge
                            variant='outline'
                            className='bg-background font-mono text-[9px]'
                          >
                            {item.sumber_risiko}
                          </Badge>
                          <p className='text-xs text-foreground italic'>
                            "{item.uraian_sebab}"
                          </p>
                        </>
                      ) : (
                        <span className='text-[11px] text-muted-foreground italic'>
                          Belum dianalisis
                        </span>
                      )}
                    </td>
                    <td className='p-2.5 text-center align-top'>
                      <Badge
                        variant='outline'
                        className={
                          item.sifat_risiko === 'C'
                            ? 'bg-emerald-500/10 text-[10px] font-bold text-emerald-700'
                            : 'bg-amber-500/10 text-[10px] font-bold text-amber-700'
                        }
                      >
                        {item.sifat_risiko || 'C'}
                      </Badge>
                    </td>
                    <td className='p-2.5 align-top text-muted-foreground'>
                      {item.uraian_dampak || '-'}
                    </td>
                    <td className='p-2.5 align-top font-medium text-foreground'>
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
