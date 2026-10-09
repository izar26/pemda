import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp } from 'lucide-react'

const trendData = [
  { bulan: 'Jan', selesai: 14, berjalan: 8, terhambat: 2 },
  { bulan: 'Feb', selesai: 22, berjalan: 12, terhambat: 3 },
  { bulan: 'Mar', selesai: 35, berjalan: 15, terhambat: 1 },
  { bulan: 'Apr', selesai: 48, berjalan: 18, terhambat: 4 },
  { bulan: 'Mei', selesai: 62, berjalan: 20, terhambat: 2 },
  { bulan: 'Jun', selesai: 78, berjalan: 24, terhambat: 3 },
  { bulan: 'Jul', selesai: 94, berjalan: 28, terhambat: 2 },
  { bulan: 'Agu', selesai: 110, berjalan: 22, terhambat: 1 },
  { bulan: 'Sep', selesai: 126, berjalan: 18, terhambat: 4 },
]

export function MitigationTrendChart() {
  return (
    <Card className='col-span-1 lg:col-span-4 flex flex-col justify-between'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <TrendingUp className='h-4 w-4 text-emerald-500' />
              Tren Progres Mitigasi & Rencana Aksi Pemda
            </CardTitle>
            <CardDescription className='text-xs'>
              Akumulasi status tindak lanjut penanganan risiko per bulan (Tahun 2026)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 pb-4'>
        <div className='h-72 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={trendData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <CartesianGrid strokeDasharray='3 3' vertical={false} className='stroke-muted/60' />
              <XAxis dataKey='bulan' tickLine={false} axisLine={false} fontSize={12} className='text-muted-foreground' />
              <YAxis tickLine={false} axisLine={false} fontSize={12} className='text-muted-foreground' />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className='rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1.5'>
                        <p className='font-semibold text-popover-foreground border-b pb-1'>Periode: Bulan {label} 2026</p>
                        {payload.map((p) => (
                          <div key={p.name} className='flex items-center justify-between gap-4'>
                            <span className='flex items-center gap-1.5 text-muted-foreground'>
                              <span className='h-2 w-2 rounded-full' style={{ backgroundColor: p.color }} />
                              {p.name}:
                            </span>
                            <span className='font-bold tabular-nums text-foreground'>{p.value} Tindakan</span>
                          </div>
                        ))}
                      </div>
                    )
                  }
                  return null
                }}
              />
              <Legend
                verticalAlign='top'
                align='right'
                iconType='circle'
                wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
              />
              <Bar dataKey='selesai' name='Mitigasi Selesai' fill='#10b981' radius={[4, 4, 0, 0]} stackId='a' />
              <Bar dataKey='berjalan' name='Sedang Progres' fill='#3b82f6' radius={[4, 4, 0, 0]} stackId='a' />
              <Bar dataKey='terhambat' name='Kendala / Terhambat' fill='#f43f5e' radius={[4, 4, 0, 0]} stackId='a' />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
