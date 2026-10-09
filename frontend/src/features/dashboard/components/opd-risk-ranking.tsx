import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, ArrowUpRight } from 'lucide-react'

const opdRankings = [
  {
    nama: 'Dinas Pekerjaan Umum & Penataan Ruang',
    kode: 'DPUPR-01',
    totalRisiko: 24,
    criticalCount: 4,
    complianceScore: 96,
    status: 'Sangat Baik',
    statusColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800',
  },
  {
    nama: 'Dinas Kesehatan & RSUD Daerah',
    kode: 'DINKES-02',
    totalRisiko: 21,
    criticalCount: 3,
    complianceScore: 92,
    status: 'Sangat Baik',
    statusColor: 'bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800',
  },
  {
    nama: 'Badan Pengelola Keuangan & Aset (BPKAD)',
    kode: 'BPKAD-03',
    totalRisiko: 19,
    criticalCount: 2,
    complianceScore: 88,
    status: 'Baik',
    statusColor: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800',
  },
  {
    nama: 'Dinas Pendidikan & Kebudayaan',
    kode: 'DISDIK-04',
    totalRisiko: 18,
    criticalCount: 2,
    complianceScore: 84,
    status: 'Baik',
    statusColor: 'bg-blue-500/10 text-blue-600 border-blue-300 dark:border-blue-800',
  },
  {
    nama: 'Inspektorat Daerah Kota/Kabupaten',
    kode: 'INSP-05',
    totalRisiko: 12,
    criticalCount: 1,
    complianceScore: 100,
    status: 'Sempurna',
    statusColor: 'bg-indigo-500/10 text-indigo-600 border-indigo-300 dark:border-indigo-800',
  },
]

export function OpdRiskRanking() {
  return (
    <Card className='col-span-1 lg:col-span-4'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <Building2 className='h-4 w-4 text-primary' />
              Capaian & Kepatuhan Manajemen Risiko OPD
            </CardTitle>
            <CardDescription className='text-xs'>
              5 Perangkat Daerah dengan pengawasan profil risiko paling aktif
            </CardDescription>
          </div>
          <Badge variant='outline' className='text-[11px] gap-1 bg-primary/5 text-primary border-primary/20'>
            Top 5 Instansi <ArrowUpRight className='h-3 w-3' />
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='pt-0'>
        <div className='divide-y divide-border/60 text-xs'>
          {opdRankings.map((opd, idx) => (
            <div key={opd.kode} className='py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0'>
              <div className='flex items-center gap-3 min-w-0 flex-1'>
                <span className='flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-muted-foreground text-[11px]'>
                  {idx + 1}
                </span>
                <div className='min-w-0 flex-1'>
                  <p className='font-semibold text-foreground truncate'>{opd.nama}</p>
                  <div className='flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5'>
                    <span>Kode: {opd.kode}</span>
                    <span>•</span>
                    <span>{opd.totalRisiko} Item Risiko</span>
                    {opd.criticalCount > 0 && (
                      <>
                        <span>•</span>
                        <span className='text-rose-600 dark:text-rose-400 font-medium'>
                          {opd.criticalCount} Kritis
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className='flex items-center gap-3 shrink-0'>
                <div className='text-right hidden sm:block'>
                  <p className='font-bold text-foreground'>{opd.complianceScore}%</p>
                  <p className='text-[10px] text-muted-foreground'>Skor Kepatuhan</p>
                </div>
                <Badge variant='outline' className={`text-[11px] ${opd.statusColor}`}>
                  {opd.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
