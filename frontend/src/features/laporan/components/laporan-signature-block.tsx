import type { LaporanPenandatangan } from '@/services/laporan-service'

interface LaporanSignatureBlockProps {
  penandatangan: LaporanPenandatangan
  kota?: string
}

export function LaporanSignatureBlock({
  penandatangan,
  kota = 'Tempat',
}: LaporanSignatureBlockProps) {
  const { nama, nip, jabatan, tanggal } = penandatangan

  return (
    <div className='mt-8 pt-4 flex justify-end break-inside-avoid print:mt-10 print:break-inside-avoid'>
      <div className='w-72 sm:w-80 text-center space-y-1 text-xs sm:text-sm text-foreground'>
        <p className='text-muted-foreground print:text-black'>
          {kota}, {tanggal}
        </p>
        <p className='font-semibold tracking-wide print:text-black'>{jabatan}</p>

        {/* Space for physical signature & official OPD stamp */}
        <div className='h-20 sm:h-24 flex items-center justify-center'>
          <span className='text-[10px] italic text-muted-foreground/40 print:hidden'>
            (Tanda Tangan & Cap OPD)
          </span>
        </div>

        <p className='font-bold underline uppercase tracking-wider text-foreground print:text-black'>
          {nama}
        </p>
        <p className='text-xs text-muted-foreground print:text-black'>
          NIP. {nip}
        </p>
      </div>
    </div>
  )
}
