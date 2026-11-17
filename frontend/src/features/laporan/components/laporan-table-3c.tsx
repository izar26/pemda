import { Badge } from '@/components/ui/badge'
import type {
  IdentifikasiRisikoOpdOperasional,
  IdentifikasiRisikoOpdOperasionalItem,
} from '@/types/risiko'

interface LaporanTable3CProps {
  data: IdentifikasiRisikoOpdOperasional | null
}

export function LaporanTable3C({ data }: LaporanTable3CProps) {
  if (!data) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Identifikasi Risiko Operasional OPD (Form 3C) belum terisi untuk periode ini.
      </div>
    )
  }

  const items = data.items || []
  const urusanText = data.urusan_pemerintahan
    ? `${data.urusan_pemerintahan.kode} - ${data.urusan_pemerintahan.nama}`
    : 'Urusan Pemerintahan Daerah'

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Header Parameter Urusan & Jumlah Risiko */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Urusan Pemerintahan:
          </span>
          <span className='font-semibold text-foreground'>{urusanText}</span>
        </div>
        <div className='flex gap-2'>
          <span className='w-40 shrink-0 text-muted-foreground font-medium'>
            Total Risiko Operasional:
          </span>
          <span className='font-bold text-foreground'>{items.length} Butir Risiko</span>
        </div>
      </div>

      {/* 2. Tabel Formal Identifikasi Risiko Operasional OPD */}
      <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
        <div className='overflow-x-auto'>
          <table className='w-full text-start text-xs'>
            <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
              <tr>
                <th className='w-10 p-2.5 text-center'>No</th>
                <th className='min-w-[190px] p-2.5 text-start'>
                  Sub-Kegiatan Operasional
                </th>
                <th className='min-w-[100px] p-2.5 text-start'>PROBIS</th>
                <th className='min-w-[130px] p-2.5 text-start'>Kategori & Kode</th>
                <th className='min-w-[190px] p-2.5 text-start'>Pernyataan Risiko</th>
                <th className='min-w-[110px] p-2.5 text-start'>Pemilik Risiko</th>
                <th className='min-w-[160px] border-x border-amber-500/20 bg-amber-500/5 p-2.5 text-start dark:bg-amber-500/10 print:bg-transparent'>
                  Sebab & Sumber (RCA)
                </th>
                <th className='w-14 p-2.5 text-center'>C/UC</th>
                <th className='min-w-[150px] p-2.5 text-start'>Uraian Dampak</th>
                <th className='min-w-[110px] p-2.5 text-start'>Pihak Terkena</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-border/60'>
              {items.length === 0 ? (
                <tr>
                  <td colSpan={10} className='p-8 text-center text-muted-foreground'>
                    Tidak ada butir risiko operasional OPD yang tercatat pada periode ini.
                  </td>
                </tr>
              ) : (
                items.map((item: IdentifikasiRisikoOpdOperasionalItem, idx: number) => {
                  const subKegiatanName = item.sub_kegiatan?.nama || '-'

                  return (
                    <tr key={item.id} className='hover:bg-muted/20'>
                      <td className='p-2.5 text-center font-mono text-muted-foreground'>
                        {item.nomor_urut || idx + 1}
                      </td>
                      <td className='space-y-1 p-2.5 align-top'>
                        <span className='block leading-tight font-semibold text-foreground print:text-black'>
                          {subKegiatanName}
                        </span>
                      </td>
                      <td className='p-2.5 align-top text-foreground font-mono text-[11px] print:text-black'>
                        {item.probis || '-'}
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
                      <td className='p-2.5 align-top leading-snug font-medium text-foreground print:text-black'>
                        {item.pernyataan_risiko}
                      </td>
                      <td className='p-2.5 align-top text-foreground print:text-black'>
                        {item.pemilik_risiko || '-'}
                      </td>
                      <td className='space-y-1 border-x border-amber-500/20 bg-amber-500/5 p-2.5 align-top dark:bg-amber-500/10 print:bg-transparent'>
                        {item.uraian_sebab ? (
                          <>
                            <Badge variant='outline' className='bg-background font-mono text-[9px]'>
                              {item.sumber_risiko === 'I'
                                ? 'Internal'
                                : item.sumber_risiko === 'E'
                                  ? 'Eksternal'
                                  : item.sumber_risiko || 'Internal'}
                            </Badge>
                            <p className='leading-tight text-foreground print:text-black'>
                              {item.uraian_sebab}
                            </p>
                          </>
                        ) : (
                          <span className='italic text-muted-foreground'>Belum ada RCA</span>
                        )}
                      </td>
                      <td className='p-2.5 text-center align-top font-mono text-xs'>
                        <Badge
                          variant={item.sifat_risiko === 'C' ? 'default' : 'secondary'}
                          className='text-[9px]'
                        >
                          {item.sifat_risiko || 'C'}
                        </Badge>
                      </td>
                      <td className='p-2.5 align-top leading-snug text-foreground print:text-black'>
                        {item.uraian_dampak || '-'}
                      </td>
                      <td className='p-2.5 align-top text-foreground print:text-black'>
                        {item.pihak_terkena || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
