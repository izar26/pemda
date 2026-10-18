import { Separator } from '@/components/ui/separator'
import { NavbarClock } from './navbar-clock'
import { TahunPenilaianBadge } from './tahun-penilaian-badge'

export function NavbarStatus() {
  return (
    <div className='flex items-center gap-2 sm:gap-2.5 shrink-0'>
      <TahunPenilaianBadge />
      <Separator orientation='vertical' className='h-5 hidden md:block' />
      <NavbarClock />
      <Separator orientation='vertical' className='h-5 hidden md:block' />
    </div>
  )
}

export { NavbarClock, TahunPenilaianBadge }
