import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  pengajuanRisikoService,
  type PendingApprovalItem,
} from '@/services/pengajuan-risiko-service'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { id as idLocale } from 'date-fns/locale'

export function ApprovalActionInbox() {
  const { data: pendingData, isLoading } = useQuery({
    queryKey: ['risiko-pending-counts'],
    queryFn: () => pengajuanRisikoService.getPendingCounts(),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  if (isLoading) {
    return (
      <Card className='border-border/60 shadow-xs animate-pulse'>
        <CardHeader className='pb-3'>
          <div className='h-5 w-48 bg-muted rounded' />
          <div className='h-4 w-72 bg-muted/60 rounded mt-1' />
        </CardHeader>
        <CardContent>
          <div className='h-16 bg-muted/40 rounded-lg' />
        </CardContent>
      </Card>
    )
  }

  const items = pendingData?.pending_items || []
  const totalCount =
    pendingData?.total_action_required ||
    pendingData?.my_pending_total ||
    items.length ||
    0

  if (totalCount === 0 || items.length === 0) {
    return (
      <Card className='border-emerald-500/20 bg-emerald-500/5 shadow-xs transition-colors'>
        <CardContent className='flex flex-col sm:flex-row items-center justify-between gap-4 p-4 sm:p-5'>
          <div className='flex items-center gap-3.5 min-w-0'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'>
              <CheckCircle2 className='h-5 w-5' />
            </div>
            <div className='space-y-0.5 min-w-0'>
              <h4 className='text-sm font-semibold text-foreground tracking-tight'>
                Semua Pengajuan Risiko Terkendali
              </h4>
              <p className='text-xs text-muted-foreground'>
                Tidak ada berkas penilaian risiko yang membutuhkan tindakan atau persetujuan mendesak dari akun Anda saat ini.
              </p>
            </div>
          </div>
          <Badge
            variant='outline'
            className='bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs px-2.5 py-1 shrink-0'
          >
            Aman & Tertib
          </Badge>
        </CardContent>
      </Card>
    )
  }

  const getTargetUrl = (item: PendingApprovalItem) => {
    const roleKey = item.action_required_by || (item.tier === 'kepala_opd' ? 'kepala_opd' : item.tier === 'auditor' ? 'auditor' : item.tier === 'pengawas' ? 'pengawas' : 'operator')
    switch (roleKey) {
      case 'kepala_opd':
      case 'auditor':
      case 'pengawas':
        return '/pengawasan/review-risiko'
      case 'operator':
      default:
        return '/risiko/konteks-strategis'
    }
  }

  const getRoleActionLabel = (item: PendingApprovalItem) => {
    const roleKey = item.action_required_by || (item.tier === 'kepala_opd' ? 'kepala_opd' : item.tier === 'auditor' ? 'auditor' : item.tier === 'pengawas' ? 'pengawas' : 'operator')
    switch (roleKey) {
      case 'kepala_opd':
        return 'Persetujuan Kepala OPD'
      case 'auditor':
        return 'Pemeriksaan Auditor'
      case 'pengawas':
        return 'Pengesahan Pengawas'
      case 'operator':
        return 'Tindak Lanjuti Revisi'
      default:
        return 'Tinjau Berkas'
    }
  }

  const getStatusBadge = (item: PendingApprovalItem) => {
    switch (item.status) {
      case 'submitted_to_kepala_opd':
        return (
          <Badge className='text-[11px] bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 gap-1.5 py-0.5 px-2 font-medium'>
            <Clock className='h-3 w-3 text-sky-600 animate-pulse' />
            Review Kepala OPD
          </Badge>
        )
      case 'revision_by_auditor':
        return (
          <Badge className='text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 gap-1.5 py-0.5 px-2 font-medium'>
            <AlertCircle className='h-3 w-3 text-amber-600' />
            Revisi Auditor (Delegasikan)
          </Badge>
        )
      case 'submitted_to_auditor':
      case 'in_review_auditor':
        return (
          <Badge className='text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 gap-1.5 py-0.5 px-2 font-medium'>
            <Clock className='h-3 w-3 text-amber-600 animate-pulse' />
            Pemeriksaan Auditor
          </Badge>
        )
      case 'revision_by_pengawas':
        return (
          <Badge className='text-[11px] bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-0.5 px-2 font-medium'>
            <AlertCircle className='h-3 w-3 text-destructive' />
            Revisi Pengawas
          </Badge>
        )
      case 'submitted_to_pengawas':
      case 'in_review_pengawas':
        return (
          <Badge className='text-[11px] bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 gap-1.5 py-0.5 px-2 font-medium'>
            <Clock className='h-3 w-3 text-purple-600 animate-pulse' />
            Pengesahan Pengawas
          </Badge>
        )
      case 'revision_by_kepala_opd':
      case 'revision_to_operator':
        return (
          <Badge className='text-[11px] bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-0.5 px-2 font-medium'>
            <AlertCircle className='h-3 w-3 text-destructive' />
            Perlu Perbaikan Operator
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-[11px]'>
            {item.status}
          </Badge>
        )
    }
  }

  const formatSubmittedTime = (dateStr: string | null) => {
    if (!dateStr) return '-'
    try {
      return formatDistanceToNow(parseISO(dateStr), {
        addSuffix: true,
        locale: idLocale,
      })
    } catch {
      return dateStr
    }
  }

  return (
    <Card className='border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/10 shadow-xs'>
      <CardHeader className='pb-3 pt-4 sm:pt-5'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex items-center gap-2.5 min-w-0'>
            <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400'>
              <ShieldAlert className='h-4.5 w-4.5' />
            </div>
            <div>
              <CardTitle className='text-sm sm:text-base font-bold text-foreground flex items-center gap-2'>
                <span>Perlu Tindakan & Persetujuan Anda</span>
                <span className='inline-flex items-center justify-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white shadow-2xs'>
                  {totalCount} Berkas
                </span>
              </CardTitle>
              <CardDescription className='text-xs mt-0.5'>
                Daftar pengajuan risiko yang memerlukan peninjauan, persetujuan, atau perbaikan teknis dari peran Anda saat ini.
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className='pt-0 pb-4 sm:pb-5 space-y-2.5'>
        {items.map((item) => (
          <div
            key={item.id}
            className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border border-border/70 bg-card hover:bg-accent/40 transition-colors shadow-2xs'
          >
            <div className='space-y-1.5 min-w-0 flex-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='inline-flex items-center gap-1.5 text-xs font-semibold text-foreground'>
                  <Building2 className='h-3.5 w-3.5 text-primary shrink-0' />
                  {item.opd_nama}
                </span>
                <span className='text-[11px] text-muted-foreground font-mono'>
                  ({item.opd_kode})
                </span>
                {getStatusBadge(item)}
              </div>

              {item.catatan_terakhir && (
                <p className='text-xs text-muted-foreground line-clamp-1 italic bg-muted/40 px-2 py-1 rounded border border-border/40'>
                  &ldquo;{item.catatan_terakhir}&rdquo;
                </p>
              )}

              <div className='flex items-center gap-3 text-[11px] text-muted-foreground'>
                <span>Periode: <strong>{item.periode_nama || 'RPJMD Aktif'}</strong></span>
                <span>&bull;</span>
                <span>Diajukan: {formatSubmittedTime(item.submitted_at)}</span>
              </div>
            </div>

            <div className='shrink-0 sm:self-center pt-2 sm:pt-0'>
              <Button asChild size='sm' className='h-8 text-xs font-medium gap-1.5 w-full sm:w-auto shadow-2xs'>
                <Link to={getTargetUrl(item)}>
                  <span>{getRoleActionLabel(item)}</span>
                  <ArrowRight className='h-3.5 w-3.5' />
                </Link>
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
