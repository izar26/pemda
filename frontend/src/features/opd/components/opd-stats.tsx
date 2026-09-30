import { Building2, Building, Users, Landmark, HeartPulse, MapPin } from 'lucide-react'
import type { OpdStats } from '@/types/opd'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

interface OpdStatsCardsProps {
  stats?: OpdStats
  isLoading: boolean
}

export function OpdStatsCards({ stats, isLoading }: OpdStatsCardsProps) {
  if (isLoading) {
    return (
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className='p-3 border shadow-xs'>
            <Skeleton className='h-4 w-20 mb-2' />
            <Skeleton className='h-7 w-12' />
          </Card>
        ))}
      </div>
    )
  }

  const items = [
    {
      title: 'Total Instansi',
      value: stats?.total ?? 0,
      sub: `${stats?.active ?? 0} aktif`,
      icon: Building2,
      color: 'text-primary bg-primary/10',
    },
    {
      title: 'Dinas Daerah',
      value: stats?.by_kategori?.['Dinas'] ?? 0,
      sub: 'Dinas teknis',
      icon: Building,
      color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      title: 'Badan Daerah',
      value: stats?.by_kategori?.['Badan'] ?? 0,
      sub: 'Badan pendukung',
      icon: Landmark,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40',
    },
    {
      title: 'Kecamatan',
      value: stats?.by_kategori?.['Kecamatan'] ?? 0,
      sub: 'Wilayah kerja',
      icon: MapPin,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      title: 'Rumah Sakit (RSUD)',
      value: stats?.by_kategori?.['RSUD'] ?? 0,
      sub: 'Fasilitas kesehatan',
      icon: HeartPulse,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      title: 'Total ASN Terdaftar',
      value: stats?.total_pegawai ?? 0,
      sub: 'Pegawai bertugas',
      icon: Users,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40',
    },
  ]

  return (
    <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3'>
      {items.map((item, idx) => {
        const Icon = item.icon
        return (
          <Card key={idx} className='border shadow-xs hover:border-primary/40 transition-colors'>
            <CardContent className='p-3.5 flex items-center justify-between'>
              <div>
                <p className='text-[11px] font-medium text-muted-foreground uppercase tracking-wider'>
                  {item.title}
                </p>
                <div className='flex items-baseline gap-1.5 mt-0.5'>
                  <span className='text-xl font-bold font-mono tracking-tight text-foreground'>
                    {item.value}
                  </span>
                  <span className='text-[10px] text-muted-foreground'>
                    {item.sub}
                  </span>
                </div>
              </div>
              <div className={`p-2 rounded-lg ${item.color} shrink-0`}>
                <Icon className='h-4 w-4' />
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
