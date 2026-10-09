import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { History, Loader2, Activity } from 'lucide-react'
import { auditService } from '@/services/audit-service'

export function RecentActivityFeed() {
  const { data: logsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-audit-logs'],
    queryFn: () => auditService.getLogs({ per_page: 6 }),
  })

  const logs = logsResponse?.data || []

  return (
    <Card className='col-span-1 lg:col-span-3 flex flex-col justify-between'>
      <CardHeader className='pb-3'>
        <div className='flex items-center justify-between'>
          <div>
            <CardTitle className='text-base font-bold flex items-center gap-2'>
              <History className='h-4 w-4 text-blue-500' />
              Aktivitas & Log Sistem Terakhir
            </CardTitle>
            <CardDescription className='text-xs'>
              Umpan real-time transparan rekam jejak pengguna
            </CardDescription>
          </div>
          <Badge variant='outline' className='bg-blue-500/10 text-blue-600 border-blue-300 text-[10px] gap-1'>
            <Activity className='h-3 w-3 animate-pulse' /> Live System
          </Badge>
        </div>
      </CardHeader>
      <CardContent className='pt-0 flex-1'>
        {isLoading ? (
          <div className='flex flex-col items-center justify-center h-48 gap-2 text-muted-foreground'>
            <Loader2 className='h-6 w-6 animate-spin text-primary' />
            <span className='text-xs'>Memuat aktivitas log...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-48 text-muted-foreground text-xs'>
            Belum ada rekam log aktivitas tercatat hari ini.
          </div>
        ) : (
          <div className='relative pl-4 border-l border-border/60 space-y-4 my-2 text-xs'>
            {logs.map((log) => {
              const isSecurity = log.module === 'Autentikasi' || log.module === 'Peran & Izin'
              const isMaster = log.module === 'Master Data'

              return (
                <div key={log.id} className='relative group'>
                  {/* Bullet Dot */}
                  <span
                    className={`absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                      isSecurity
                        ? 'bg-blue-500'
                        : isMaster
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                    }`}
                  />
                  <div className='flex flex-col space-y-0.5'>
                    <div className='flex items-center justify-between gap-2'>
                      <span className='font-semibold text-foreground truncate'>
                        {log.user_name || 'Sistem'}
                      </span>
                      <span className='text-[10px] text-muted-foreground whitespace-nowrap shrink-0'>
                        {log.created_at ? new Date(log.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'} WIB
                      </span>
                    </div>
                    <p className='text-[11px] text-muted-foreground line-clamp-2 leading-relaxed'>
                      {log.description}
                    </p>
                    <div className='flex items-center gap-2 pt-1'>
                      <Badge variant='outline' className='text-[10px] px-1.5 py-0 h-4 bg-muted/50 text-muted-foreground border-border/50'>
                        {log.module}
                      </Badge>
                      {log.ip_address && (
                        <span className='text-[10px] text-muted-foreground font-mono'>
                          IP: {log.ip_address}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
