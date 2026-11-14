import type { AnalisisRow } from '@/features/risiko/analisis-risiko/api'

export function ReviewStep4({
  items,
  isLoading,
}: {
  items: AnalisisRow[]
  isLoading: boolean
}) {
  if (isLoading) return <p className='p-4 text-sm'>Memuat analisis risiko...</p>
  if (!items.length)
    return (
      <p className='p-4 text-sm text-muted-foreground'>
        Tidak ada risiko 3B atau 3C untuk dianalisis.
      </p>
    )
  return (
    <div className='space-y-3'>
      {items.map((item) => (
        <article
          key={`${item.source}-${item.id}`}
          className='space-y-3 rounded-lg border p-4 text-sm'
        >
          <div>
            <span className='font-mono text-xs'>
              {item.kode_risiko} · {item.source.toUpperCase()}
            </span>
            <p className='font-semibold'>{item.pernyataan_risiko}</p>
            <p className='text-xs text-muted-foreground'>
              {item.kategori_risiko} · {item.pemilik_risiko || '-'}
            </p>
            <span className='text-xs text-muted-foreground'>
              {item.complete
                ? 'Lengkap'
                : item.analysis
                  ? 'Belum lengkap'
                  : 'Belum ada analisis'}
            </span>
          </div>
          <div className='grid gap-3 md:grid-cols-3'>
            <div className='rounded-md bg-muted/30 p-3'>
              <strong>Inheren</strong>
              <p>
                Kemungkinan: {item.analysis?.kriteria_kemungkinan || '-'} (
                {item.analysis?.inheren_kemungkinan ?? '-'})
              </p>
              <p>
                Dampak: {item.analysis?.kriteria_dampak || '-'} (
                {item.analysis?.inheren_dampak ?? '-'})
              </p>
              <p>Skala: {item.skala_inheren ?? '-'}</p>
            </div>
            <div className='rounded-md bg-muted/30 p-3'>
              <strong>Pengendalian yang ada</strong>
              <p>
                {item.analysis?.pengendalian_ada === null ||
                item.analysis?.pengendalian_ada === undefined
                  ? 'Belum ditentukan'
                  : item.analysis.pengendalian_ada
                    ? 'Ada'
                    : 'Belum ada'}
              </p>
              <p>{item.analysis?.pengendalian_uraian || '-'}</p>
              <p>Sub-unsur SPIP: {item.analysis?.sub_unsur?.nama || '-'}</p>
              <p>
                {item.analysis?.pengendalian_memadai === null ||
                item.analysis?.pengendalian_memadai === undefined
                  ? '-'
                  : item.analysis.pengendalian_memadai
                    ? 'Memadai'
                    : 'Belum memadai'}
              </p>
            </div>
            <div className='rounded-md bg-muted/30 p-3'>
              <strong>Residual</strong>
              <p>
                Kemungkinan:{' '}
                {item.analysis?.residual_kriteria_kemungkinan || '-'} (
                {item.analysis?.residual_kemungkinan ?? '-'})
              </p>
              <p>
                Dampak: {item.analysis?.residual_kriteria_dampak || '-'} (
                {item.analysis?.residual_dampak ?? '-'})
              </p>
              <p>
                Skala: {item.skala_residual ?? '-'} · Peringkat:{' '}
                {item.peringkat ?? '-'}
              </p>
              <p>{item.evaluasi || 'Belum dievaluasi'}</p>
            </div>
          </div>
          {item.analysis?.rencana_tindak && (
            <p>
              <strong>Rencana tindak:</strong> {item.analysis.rencana_tindak}
            </p>
          )}
        </article>
      ))}
    </div>
  )
}
