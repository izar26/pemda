import type { KonteksOperasionalItem } from '@/types/risiko'
import { Laporan2CProgramTable } from './laporan-2c-program-table'

interface LaporanTable2CProps {
  data: KonteksOperasionalItem | null
}

export function LaporanTable2C({ data }: LaporanTable2CProps) {
  if (!data) {
    return (
      <div className='p-6 text-center text-xs text-muted-foreground border rounded-lg'>
        Data Konteks Operasional (Form 2C) belum terisi untuk periode ini.
      </div>
    )
  }

  const programs =
    data.programs || data.items?.filter((i) => i.jenis === 'program') || []

  return (
    <div className='space-y-6 text-xs sm:text-sm text-foreground'>
      {/* 1. Atribut Identitas Penilaian */}
      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg bg-muted/20 border border-border/60 text-xs'>
        <div className='flex gap-2'>
          <span className='w-36 shrink-0 text-muted-foreground font-medium'>
            Periode Penilaian:
          </span>
          <span className='font-semibold text-foreground'>
            {data.periode?.nama_periode || data.periode?.rentang_tahun || '-'}
          </span>
        </div>
        <div className='flex gap-2'>
          <span className='w-36 shrink-0 text-muted-foreground font-medium'>
            Sumber Data:
          </span>
          <span className='font-semibold text-foreground'>
            {data.sumber_data?.nama || 'Renstra SKPD'}
          </span>
        </div>
        <div className='sm:col-span-2 flex gap-2 pt-1 border-t border-border/50'>
          <span className='w-36 shrink-0 text-muted-foreground font-medium'>
            Tujuan Strategis Terkait:
          </span>
          <span className='font-semibold text-foreground leading-snug'>
            {data.tujuan_strategis?.tujuan ||
              'Mengacu pada sasaran penetapan Konteks Strategis (Form 2B)'}
          </span>
        </div>
      </div>

      {/* 2. Tabel Hierarki Pohon Kinerja */}
      <div className='space-y-2'>
        <div className='flex items-center justify-between border-b pb-1'>
          <div className='font-bold text-sm text-foreground uppercase tracking-wide'>
            Struktur Program, Kegiatan & Sub-Kegiatan
          </div>
          <span className='text-xs text-muted-foreground font-medium'>
            Total: {programs.length} Program Induk
          </span>
        </div>

        <Laporan2CProgramTable programs={programs} />
      </div>
    </div>
  )
}
