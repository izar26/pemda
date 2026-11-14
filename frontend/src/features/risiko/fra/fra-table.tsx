import { Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { FraudRiskAssessmentRow } from './types'

interface FraTableProps {
  items: FraudRiskAssessmentRow[]
  canEdit: boolean
  onEdit: (item: FraudRiskAssessmentRow) => void
  onDelete: (item: FraudRiskAssessmentRow) => void
}

export function getSkalaBadgeClass(skala: number): string {
  if (skala >= 20) {
    return 'bg-rose-600 text-white hover:bg-rose-700'
  }
  if (skala >= 13) {
    return 'bg-amber-600 text-white hover:bg-amber-700'
  }
  if (skala >= 6) {
    return 'bg-yellow-500 text-slate-900 hover:bg-yellow-600'
  }
  return 'bg-emerald-600 text-white hover:bg-emerald-700'
}

export function getSkalaLabel(skala: number): string {
  if (skala >= 20) return 'Sangat Tinggi'
  if (skala >= 13) return 'Tinggi'
  if (skala >= 6) return 'Sedang'
  return 'Rendah'
}

export function FraTable({
  items,
  canEdit,
  onEdit,
  onDelete,
}: FraTableProps) {
  if (items.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center rounded-md border border-dashed py-12 text-center'>
        <p className='text-sm text-muted-foreground'>
          Belum ada catatan penilaian risiko kecurangan (FRA) untuk periode ini.
        </p>
      </div>
    )
  }

  return (
    <div className='overflow-x-auto rounded-md border'>
      <Table>
        <TableHeader>
          <TableRow className='bg-muted/50'>
            <TableHead className='w-[48px] text-center'>No</TableHead>
            <TableHead className='min-w-[150px]'>Proses Bisnis</TableHead>
            <TableHead className='min-w-[240px]'>Identifikasi & Skenario Kecurangan</TableHead>
            <TableHead className='min-w-[140px]'>Jenis & Penyebab</TableHead>
            <TableHead className='min-w-[130px]'>Pemilik Risiko</TableHead>
            <TableHead className='min-w-[180px]'>Existing Control</TableHead>
            <TableHead className='min-w-[160px] text-center'>
              Analisis Risiko (K × D)
            </TableHead>
            <TableHead className='min-w-[180px]'>Mitigasi</TableHead>
            {canEdit && <TableHead className='w-[90px] text-center'>Aksi</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id} className='hover:bg-muted/30'>
              <TableCell className='text-center font-medium'>
                {item.nomor_urut ?? index + 1}
              </TableCell>
              <TableCell>
                <span className='font-medium text-foreground text-sm'>
                  {item.proses_bisnis}
                </span>
              </TableCell>
              <TableCell className='space-y-1.5'>
                <p className='font-semibold text-foreground text-sm'>
                  {item.identifikasi_risiko_kecurangan}
                </p>
                <div className='text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground/80'>Skenario: </span>
                  {item.skenario_kecurangan}
                </div>
              </TableCell>
              <TableCell className='space-y-1'>
                <Badge variant='outline' className='font-normal text-xs'>
                  {item.jenis_risiko_kecurangan}
                </Badge>
                <div className='text-xs text-muted-foreground'>
                  <span className='font-medium text-foreground/80'>Pemicu: </span>
                  {item.penyebab}
                </div>
              </TableCell>
              <TableCell className='text-sm'>{item.pemilik_risiko}</TableCell>
              <TableCell className='text-xs text-muted-foreground whitespace-pre-line'>
                {item.existing_control}
              </TableCell>
              <TableCell className='text-center space-y-1.5'>
                <div className='flex items-center justify-center gap-1.5 text-xs'>
                  <span className='rounded bg-muted px-1.5 py-0.5 font-mono'>
                    K:{item.kemungkinan_skor}
                  </span>
                  <span>×</span>
                  <span className='rounded bg-muted px-1.5 py-0.5 font-mono'>
                    D:{item.dampak_skor}
                  </span>
                </div>
                <div className='flex flex-col items-center gap-0.5'>
                  <Badge className={`${getSkalaBadgeClass(item.skala_risiko)} text-xs px-2 py-0.5 font-semibold`}>
                    Skala {item.skala_risiko}
                  </Badge>
                  <span className='text-[10px] text-muted-foreground'>
                    {getSkalaLabel(item.skala_risiko)}
                  </span>
                </div>
              </TableCell>
              <TableCell className='text-xs text-foreground whitespace-pre-line'>
                {item.mitigasi}
              </TableCell>
              {canEdit && (
                <TableCell className='text-center'>
                  <div className='flex items-center justify-center gap-1'>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-muted-foreground hover:text-foreground'
                      onClick={() => onEdit(item)}
                      title='Ubah Catatan FRA'
                    >
                      <Edit className='h-4 w-4' />
                    </Button>
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-8 w-8 text-rose-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30'
                      onClick={() => onDelete(item)}
                      title='Hapus Catatan FRA'
                    >
                      <Trash2 className='h-4 w-4' />
                    </Button>
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
