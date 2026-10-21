import React from 'react'
import type { KonteksOperasionalItemNode } from '@/types/risiko'

export function Laporan2CProgramTable({
  programs,
}: {
  programs: KonteksOperasionalItemNode[]
}) {
  return (
    <div className='overflow-x-auto rounded-lg border'>
      <table className='w-full border-collapse text-left text-xs'>
        <thead>
          <tr className='border-b bg-muted/60 text-muted-foreground font-bold uppercase tracking-wider text-[11px]'>
            <th className='w-16 px-3 py-2.5 border-r'>NO</th>
            <th className='px-4 py-2.5 border-r min-w-[260px]'>
              Nama Program / Kegiatan / Sub Kegiatan
            </th>
            <th className='px-4 py-2.5 border-r min-w-[220px]'>Indikator</th>
            <th className='w-28 px-3 py-2.5 text-right'>Target</th>
          </tr>
        </thead>
        <tbody className='divide-y'>
          {programs.length === 0 ? (
            <tr>
              <td
                colSpan={4}
                className='p-6 text-center text-muted-foreground italic'
              >
                Belum ada pohon program/kegiatan yang diinput untuk OPD ini.
              </td>
            </tr>
          ) : (
            programs.map((program) => (
              <ProgramNodeRows key={program.id} program={program} />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}

function ProgramNodeRows({ program }: { program: KonteksOperasionalItemNode }) {
  const primaryIndikator = program.indikators?.[0]
  const additionalIndikators = program.indikators?.slice(1) || []

  return (
    <>
      {/* 1. Baris Program (Level 1) */}
      <tr className='bg-muted/40 font-bold border-t-2 border-border/60'>
        <td className='px-3 py-2 border-r align-top'>{program.kode}</td>
        <td className='px-4 py-2 border-r align-top'>
          <span className='font-bold text-foreground'>{program.nama}</span>
        </td>
        <td className='px-4 py-2 border-r align-top text-foreground'>
          {primaryIndikator?.indikator || '-'}
        </td>
        <td className='px-3 py-2 text-right align-top font-bold'>
          {primaryIndikator
            ? `${primaryIndikator.target} ${primaryIndikator.satuan || ''}`
            : '-'}
        </td>
      </tr>

      {/* Tambahan indikator program */}
      {additionalIndikators.map((ind, idx) => (
        <tr key={ind.id || `prog-ind-${program.id}-${idx}`} className='bg-muted/20 border-b border-border/40'>
          <td className='px-3 py-1 border-r' />
          <td className='px-4 py-1 border-r text-muted-foreground italic text-[11px]'>
            (Indikator Program {idx + 2})
          </td>
          <td className='px-4 py-1 border-r align-top'>{ind.indikator}</td>
          <td className='px-3 py-1 text-right align-top font-medium'>
            {ind.target} {ind.satuan || ''}
          </td>
        </tr>
      ))}

      {/* 2. Baris Kegiatan (Level 2) & Sub-Kegiatan (Level 3) */}
      {program.children?.map((kegiatan) => {
        const kegIndikator = kegiatan.indikators?.[0]
        const kegAddIndikators = kegiatan.indikators?.slice(1) || []

        return (
          <React.Fragment key={kegiatan.id}>
            <tr className='bg-card hover:bg-muted/10'>
              <td className='px-3 py-2 border-r align-top font-semibold text-muted-foreground pl-4'>
                {kegiatan.kode}
              </td>
              <td className='px-4 py-2 border-r align-top'>
                <div className='pl-2 border-l-2 border-primary/40 font-semibold text-foreground'>
                  {kegiatan.nama}
                </div>
              </td>
              <td className='px-4 py-2 border-r align-top'>
                {kegIndikator?.indikator || '-'}
              </td>
              <td className='px-3 py-2 text-right align-top font-medium'>
                {kegIndikator
                  ? `${kegIndikator.target} ${kegIndikator.satuan || ''}`
                  : '-'}
              </td>
            </tr>

            {kegAddIndikators.map((ind, idx) => (
              <tr key={ind.id || `keg-ind-${kegiatan.id}-${idx}`} className='bg-card border-b border-border/40'>
                <td className='px-3 py-1 border-r' />
                <td className='px-4 py-1 border-r text-muted-foreground italic text-[11px] pl-6'>
                  (Indikator Kegiatan {idx + 2})
                </td>
                <td className='px-4 py-1 border-r align-top'>{ind.indikator}</td>
                <td className='px-3 py-1 text-right align-top font-medium'>
                  {ind.target} {ind.satuan || ''}
                </td>
              </tr>
            ))}

            {/* 3. Sub-Kegiatan (Level 3) */}
            {kegiatan.children?.map((sub) => {
              const subIndikator = sub.indikators?.[0]
              const subAddIndikators = sub.indikators?.slice(1) || []

              return (
                <React.Fragment key={sub.id}>
                  <tr className='bg-card hover:bg-muted/10 text-muted-foreground'>
                    <td className='px-3 py-1.5 border-r align-top font-mono text-[11px] pl-6'>
                      {sub.kode}
                    </td>
                    <td className='px-4 py-1.5 border-r align-top'>
                      <div className='pl-4 border-l-2 border-muted text-foreground'>
                        {sub.nama}
                      </div>
                    </td>
                    <td className='px-4 py-1.5 border-r align-top'>
                      {subIndikator?.indikator || '-'}
                    </td>
                    <td className='px-3 py-1.5 text-right align-top font-medium text-foreground'>
                      {subIndikator
                        ? `${subIndikator.target} ${subIndikator.satuan || ''}`
                        : '-'}
                    </td>
                  </tr>

                  {subAddIndikators.map((ind, idx) => (
                    <tr
                      key={ind.id || `sub-ind-${sub.id}-${idx}`}
                      className='bg-card border-b border-border/40 text-muted-foreground'
                    >
                      <td className='px-3 py-1 border-r' />
                      <td className='px-4 py-1 border-r text-muted-foreground italic text-[11px] pl-10'>
                        (Indikator Sub {idx + 2})
                      </td>
                      <td className='px-4 py-1 border-r align-top'>
                        {ind.indikator}
                      </td>
                      <td className='px-3 py-1 text-right align-top font-medium'>
                        {ind.target} {ind.satuan || ''}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              )
            })}
          </React.Fragment>
        )
      })}
    </>
  )
}
