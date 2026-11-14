import { useNavigate } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props { allComplete: boolean; isLocked: boolean; lockMessage: string | null; form4Complete: boolean }

export function AnalisisFooterNav({ allComplete, isLocked, lockMessage, form4Complete }: Props) {
  const navigate = useNavigate()
  return <div className='flex min-w-0 flex-col justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-4 sm:px-5 lg:flex-row lg:items-center'>
    <Button type='button' variant='outline' size='sm' onClick={() => navigate({ to: '/risiko/rca' })} className='h-auto min-h-9 w-full gap-1.5 whitespace-normal py-2 text-center sm:w-auto'><ArrowLeft className='h-4 w-4' /> Kembali ke Root Cause Analysis (RCA)</Button>
    <div className='flex min-w-0 flex-wrap items-center justify-end gap-2.5'>{allComplete && !isLocked && <div className='flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400'><CheckCircle2 className='h-4 w-4 shrink-0' /> Seluruh lembar kerja lengkap dan siap diajukan.</div>}{lockMessage && <div className='flex items-center gap-2 rounded-md border bg-background px-3 py-1 text-xs italic text-muted-foreground'><Lock className='h-3.5 w-3.5 shrink-0 text-amber-500' />{lockMessage}</div>}<Button type='button' size='sm' disabled={!form4Complete} onClick={() => navigate({ to: '/risiko/risiko-prioritas' })}>Lanjut ke Form 5</Button></div>
  </div>
}
