import { PetaRisikoView } from '@/features/risiko/peta-risiko/components/peta-risiko-view'
import type { PetaRisikoData } from '@/features/risiko/peta-risiko/types'

interface LaporanTable7Props {
  data: PetaRisikoData | null
}

export function LaporanTable7({ data }: LaporanTable7Props) {
  if (!data) {
    return (
      <div className='p-8 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Peta Risiko 5x5 (Form 7) belum terisi untuk periode ini.
      </div>
    )
  }

  const rekapitulasi = data.rekapitulasi || []

  return (
    <div className='space-y-8 text-xs sm:text-sm text-foreground'>
      {/* 1. Interactive 5x5 Matrix Heatmap View */}
      <div className='print:break-after-page'>
        <PetaRisikoView data={data} showSourceFilter={false} />
      </div>

      {/* 2. Formal Audit Summary Table (Rekapitulasi Sebaran Zona Risiko) */}
      <div className='space-y-3 pt-4 border-t'>
        <div className='flex items-center justify-between'>
          <h4 className='font-bold text-sm uppercase tracking-wide text-foreground'>
            Tabel Rekapitulasi Distribusi Zona Risiko (SPIP Terintegrasi)
          </h4>
          <span className='text-xs text-muted-foreground'>
            Total Risiko Terpetakan: {data.total_all?.residual ?? 0} Butir
          </span>
        </div>

        <div className='overflow-hidden rounded-lg border bg-card shadow-2xs print:border'>
          <div className='overflow-x-auto'>
            <table className='w-full text-start text-xs'>
              <thead className='border-b bg-muted/50 font-semibold text-muted-foreground print:bg-slate-100 print:text-black'>
                <tr>
                  <th className='w-12 p-2.5 text-center'>No</th>
                  <th className='min-w-[180px] p-2.5 text-start'>Tingkat Zona Risiko</th>
                  <th className='w-32 p-2.5 text-center'>Rentang Skor</th>
                  <th className='w-32 p-2.5 text-center bg-muted/20'>Jumlah Inheren</th>
                  <th className='w-32 p-2.5 text-center bg-muted/20'>Jumlah Residual</th>
                  <th className='w-32 p-2.5 text-center bg-muted/20'>Jumlah Treated</th>
                </tr>
              </thead>
              <tbody className='divide-y divide-border/60'>
                {rekapitulasi.map((item, idx) => (
                  <tr key={item.zona} className='hover:bg-muted/20'>
                    <td className='p-2.5 text-center font-mono text-muted-foreground'>
                      {idx + 1}
                    </td>
                    <td className='p-2.5 font-semibold text-foreground print:text-black'>
                      <span className='inline-block w-3 h-3 rounded-full mr-2 align-middle' style={{ backgroundColor: item.color }} />
                      {item.label}
                    </td>
                    <td className='p-2.5 text-center font-mono text-muted-foreground print:text-black'>
                      {item.skor_range}
                    </td>
                    <td className='p-2.5 text-center font-mono font-bold text-foreground print:text-black'>
                      {item.inherent_count}
                    </td>
                    <td className='p-2.5 text-center font-mono font-bold text-foreground print:text-black'>
                      {item.residual_count}
                    </td>
                    <td className='p-2.5 text-center font-mono font-bold text-foreground print:text-black'>
                      {item.treated_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
