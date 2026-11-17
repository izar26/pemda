import { Badge } from '@/components/ui/badge'
import type { RootCauseAnalysis } from '@/types/risiko'

interface LaporanTableRcaProps {
  data: RootCauseAnalysis[] | null
}

export function LaporanTableRca({ data }: LaporanTableRcaProps) {
  const items = Array.isArray(data) ? data : []

  if (items.length === 0) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Analisis Akar Masalah (Form RCA) belum terisi untuk periode ini.
      </div>
    )
  }

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Ringkasan RCA */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Metode Analisis:
          </span>
          <span className='font-semibold text-foreground'>
            5-Whys Root Cause Analysis (Standar BPKP)
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Butir Dianalisis:
          </span>
          <span className='font-bold text-foreground'>{items.length} Analisis RCA</span>
        </div>
      </div>

      {/* 2. Tabel Formal Root Cause Analysis */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2.5 text-center'>No</th>
                <th className='min-w-[190px] p-2.5 text-start'>
                  Pernyataan Risiko & Asal
                </th>
                <th className='min-w-[110px] p-2.5 text-start'>Why 1</th>
                <th className='min-w-[110px] p-2.5 text-start'>Why 2</th>
                <th className='min-w-[110px] p-2.5 text-start'>Why 3</th>
                <th className='min-w-[110px] p-2.5 text-start'>Why 4</th>
                <th className='min-w-[110px] p-2.5 text-start'>Why 5</th>
                <th className='min-w-[160px] border-x border-emerald-500/20 bg-emerald-500/5 p-2.5 text-start dark:bg-emerald-500/10 print:bg-transparent'>
                  Akar Penyebab (Root Cause)
                </th>
                <th className='min-w-[90px] p-2.5 text-center'>Sumber</th>
                <th className='min-w-[160px] p-2.5 text-start'>Rencana Pengendalian</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.map((rca: RootCauseAnalysis, idx: number) => {
                const item = rca.item
                const source = (
                  rca.source_type ||
                  (rca.identifikasi_risiko_opd_operasional_item_id
                    ? '3c'
                    : rca.identifikasi_risiko_opd_item_id
                      ? '3b'
                      : '3a')
                ).toUpperCase()

                return (
                  <tr key={rca.id} className='hover:bg-muted/20'>
                    <td className='p-2.5 text-center font-mono text-muted-foreground'>
                      {item?.nomor_urut || idx + 1}
                    </td>
                    <td className='space-y-1 p-2.5 align-top'>
                      <div className='flex items-center gap-1.5'>
                        <Badge variant='outline' className='text-[9px]'>
                          Form {source}
                        </Badge>
                        <Badge className='bg-amber-400 font-mono text-[9px] font-bold text-slate-900'>
                          {item?.kode_risiko || '-'}
                        </Badge>
                      </div>
                      <p className='leading-snug font-medium text-foreground print:text-black'>
                        {item?.pernyataan_risiko || '-'}
                      </p>
                    </td>
                    <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                      {rca.why_1 || '-'}
                    </td>
                    <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                      {rca.why_2 || '-'}
                    </td>
                    <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                      {rca.why_3 || '-'}
                    </td>
                    <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                      {rca.why_4 || '-'}
                    </td>
                    <td className='p-2.5 align-top leading-snug text-muted-foreground print:text-black'>
                      {rca.why_5 || '-'}
                    </td>
                    <td className='space-y-1 border-x border-emerald-500/20 bg-emerald-500/5 p-2.5 align-top dark:bg-emerald-500/10 print:bg-transparent'>
                      <p className='font-semibold leading-tight text-foreground print:text-black'>
                        {rca.akar_penyebab || '-'}
                      </p>
                      {rca.jenis_penyebab && (
                        <span className='block text-[10px] text-muted-foreground'>
                          Jenis: {rca.jenis_penyebab}
                        </span>
                      )}
                    </td>
                    <td className='p-2.5 text-center align-top'>
                      <Badge variant='outline' className='font-mono text-[9px]'>
                        {item?.sifat_risiko === 'E'
                          ? 'Eksternal'
                          : item?.sifat_risiko === 'I'
                            ? 'Internal'
                            : item?.sifat_risiko || '-'}
                      </Badge>
                    </td>
                    <td className='p-2.5 align-top leading-snug text-foreground print:text-black'>
                      {rca.kegiatan_pengendalian || '-'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
