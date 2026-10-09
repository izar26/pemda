import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldAlert } from 'lucide-react'

const riskDistributionData = [
  { name: 'Sangat Tinggi (Critical)', value: 12, color: '#e11d48', desc: 'Perlu Mitigasi Langsung Sekda/Bupati' },
  { name: 'Tinggi (High)', value: 32, color: '#f59e0b', desc: 'Perlu Monitoring Ketat Pimpinan OPD' },
  { name: 'Sedang (Medium)', value: 67, color: '#eab308', desc: 'Penanganan Rutin Unit Kerja' },
  { name: 'Rendah (Low)', value: 37, color: '#10b981', desc: 'Pemantauan Berkala' },
]

export function RiskHeatmap() {
  const total = riskDistributionData.reduce((acc, curr) => acc + curr.value, 0)

  return (
    <Card className='col-span-1 lg:col-span-3 flex flex-col justify-between'>
      <CardHeader>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <ShieldAlert className='h-4 w-4 text-rose-500' />
              Distribusi Peta Risiko PEMDA
            </CardTitle>
            <CardDescription className='text-xs'>
              Profil tingkat keparahan risiko teridentifikasi (Total: {total} Item)
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className='flex-1 pb-4'>
        <div className='h-60 w-full'>
          <ResponsiveContainer width='100%' height='100%'>
            <PieChart>
              <Pie
                data={riskDistributionData}
                cx='50%'
                cy='50%'
                innerRadius={60}
                outerRadius={85}
                paddingAngle={4}
                dataKey='value'
              >
                {riskDistributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} stroke='transparent' />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload
                    return (
                      <div className='rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1'>
                        <p className='font-semibold text-popover-foreground flex items-center gap-1.5'>
                          <span className='h-2.5 w-2.5 rounded-full' style={{ backgroundColor: data.color }} />
                          {data.name}
                        </p>
                        <p className='text-muted-foreground'>Jumlah: <strong className='text-foreground'>{data.value} Risk Items</strong> ({Math.round((data.value / total) * 100)}%)</p>
                        <p className='text-[11px] text-muted-foreground italic'>{data.desc}</p>
                      </div>
                    )
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign='bottom'
                height={36}
                formatter={(value) => <span className='text-xs text-foreground font-medium'>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Level breakdown summary pills */}
        <div className='grid grid-cols-2 gap-2 mt-4 pt-4 border-t text-xs'>
          {riskDistributionData.map((item) => (
            <div key={item.name} className='flex items-center justify-between p-2 rounded-md bg-muted/40'>
              <div className='flex items-center gap-1.5 truncate'>
                <span className='h-2 w-2 rounded-full shrink-0' style={{ backgroundColor: item.color }} />
                <span className='truncate text-muted-foreground'>{item.name.split(' ')[0]}</span>
              </div>
              <span className='font-bold tabular-nums text-foreground'>{item.value}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
