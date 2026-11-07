import { Clock, AlertCircle, CheckCircle2, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ReadinessResponse } from '@/services/pengajuan-risiko-service'
import { ApprovalTierStepper } from '../approval-tier-stepper'

export interface RisikoWorkflowBannersProps {
  readiness?: ReadinessResponse
}

export function RisikoWorkflowBanners({
  readiness,
}: RisikoWorkflowBannersProps) {
  if (!readiness) return null

  const hasAuditorWarning = !readiness.has_auditor
  const status = readiness.status

  const getContextGuidance = () => {
    switch (status) {
      case 'draft':
        return null
      case 'submitted_to_kepala_opd':
        return {
          title: 'Menunggu Persetujuan Internal Kepala OPD (Tier 2)',
          badgeText: 'Review Internal',
          borderCls: 'border-sky-500/30 bg-sky-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-sky-600 dark:text-sky-400',
          kondisi: `Lembar kerja telah diajukan kepada Kepala OPD (${readiness.kepala_opd?.name || 'Pimpinan OPD'}) dan sedang menunggu persetujuan internal.`,
          tindakan: readiness.can_review_kepala
            ? 'Sebagai Kepala OPD, Anda dapat memeriksa sasaran, program, dan indikator, lalu menyetujui (kirim ke Auditor) atau meminta perbaikan.'
            : 'Lembar kerja berstatus read-only bagi Operator hingga Kepala OPD memberikan keputusan.',
          langkahBerikutnya:
            'Jika disetujui Kepala OPD, berkas diteruskan ke Auditor Pengawas Inspektorat. Jika ditolak, berkas dikembalikan ke Operator.',
        }
      case 'revision_by_kepala_opd':
        return {
          title: 'Permintaan Revisi Internal oleh Kepala OPD',
          badgeText: 'Revisi Internal',
          borderCls: 'border-destructive/30 bg-destructive/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-destructive',
          kondisi:
            'Kepala OPD mengembalikan lembar kerja dengan catatan perbaikan internal sebelum diteruskan ke APIP.',
          tindakan:
            'Operator OPD dapat membuka kembali formulir yang ditandai catatan revisi dan memperbaikinya.',
          langkahBerikutnya:
            'Setelah perbaikan selesai disimpan, Operator dapat mengajukan kembali berkas ke Kepala OPD.',
        }
      case 'submitted_to_auditor':
      case 'in_review_auditor':
      case 'submitted':
      case 'in_review':
        return {
          title: 'Pemeriksaan Kepatuhan Teknis oleh Auditor Pengawas (Tier 3)',
          badgeText: 'Pemeriksaan Auditor',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-amber-600 dark:text-amber-400',
          kondisi: `Lembar kerja telah disetujui Kepala OPD dan sedang dalam pemeriksaan Auditor Pengawas (${readiness.assigned_auditor?.name || 'Inspektorat'}).`,
          tindakan: readiness.can_review_auditor
            ? 'Sebagai Auditor Pengawas, periksa lembar kerja risiko, lalu setujui ke Pengawas atau minta perbaikan ke OPD.'
            : 'Lembar kerja berstatus read-only bagi OPD selama proses pemeriksaan berlangsung.',
          langkahBerikutnya:
            'Jika disetujui Auditor, berkas diajukan ke Pengawas APIP. Jika ada catatan, berkas dikembalikan ke Kepala OPD.',
        }
      case 'revision_by_auditor':
        return {
          title: 'Catatan Perbaikan dari Auditor Pengawas',
          badgeText: 'Revisi Auditor',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-amber-600',
          kondisi:
            'Auditor Pengawas menemukan hal yang perlu disempurnakan dan mengembalikan berkas ke Kepala OPD beserta catatan.',
          tindakan: readiness.can_delegate_operator
            ? 'Kepala OPD dapat mempelajari catatan auditor lalu mendelegasikan tugas perbaikan teknis kepada Operator OPD.'
            : 'Operator OPD menunggu disposisi / delegasi instruksi perbaikan dari Kepala OPD.',
          langkahBerikutnya:
            'Kepala OPD mendelegasikan revisi kepada Operator agar formulir dapat dibuka kembali untuk diedit.',
        }
      case 'revision_to_operator':
        return {
          title: 'Perbaikan Telah Didelegasikan kepada Operator OPD',
          badgeText: 'Perbaikan Didelegasikan',
          borderCls: 'border-destructive/30 bg-destructive/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-destructive',
          kondisi:
            'Kepala OPD telah menginstruksikan Operator untuk menindaklanjuti catatan perbaikan teknis dari Auditor Pengawas.',
          tindakan:
            'Operator OPD dapat mengedit formulir yang ditandai dan memperbaiki data sesuai catatan perbaikan.',
          langkahBerikutnya:
            'Setelah perbaikan disimpan, Operator mengajukan kembali ke Kepala OPD untuk diteruskan ke Auditor.',
        }
      case 'submitted_to_pengawas':
      case 'in_review_pengawas':
        return {
          title: 'Tahap Pengesahan Akhir oleh Pengawas APIP (Tier 4)',
          badgeText: 'Pengesahan APIP',
          borderCls: 'border-purple-500/30 bg-purple-500/5',
          headerIcon: Clock,
          headerIconCls: 'text-purple-600 dark:text-purple-400',
          kondisi:
            'Seluruh lembar kerja telah disetujui oleh Auditor Pengawas dan kini berada pada meja Pengawas Inspektorat untuk pengesahan akhir.',
          tindakan: readiness.can_review_pengawas
            ? 'Sebagai Pengawas APIP, Anda dapat mengesahkan berkas secara final atau mengembalikan ke Auditor jika ada klarifikasi.'
            : 'Lembar kerja berstatus read-only bagi OPD dan Auditor.',
          langkahBerikutnya:
            'Jika disahkan oleh Pengawas, dokumen menjadi resmi dan sah. Jika dikembalikan, Auditor akan menindaklanjuti klarifikasi.',
        }
      case 'revision_by_pengawas':
        return {
          title: 'Pengawas Mengembalikan Berkas ke Auditor',
          badgeText: 'Klarifikasi APIP',
          borderCls: 'border-amber-500/30 bg-amber-500/5',
          headerIcon: AlertCircle,
          headerIconCls: 'text-amber-600',
          kondisi:
            'Pengawas APIP meminta klarifikasi teknis kepada Auditor Pengawas sebelum pengesahan final diterbitkan.',
          tindakan:
            readiness.can_forward_revision_auditor || readiness.can_review_auditor
              ? 'Auditor Pengawas dapat meninjau catatan pengawas, meneruskan perbaikan ke OPD, atau mengajukan kembali ke Pengawas.'
              : 'Berkas sedang dalam penanganan klarifikasi teknis antara Pengawas dan Auditor.',
          langkahBerikutnya:
            'Auditor menyelesaikan klarifikasi teknis atau meneruskan revisi ke OPD jika data awal memerlukan penyesuaian.',
        }
      case 'approved':
        return {
          title: 'Dokumen Manajemen Risiko Telah Disahkan Final',
          badgeText: 'Disahkan Final',
          borderCls: 'border-emerald-500/30 bg-emerald-500/5',
          headerIcon: CheckCircle2,
          headerIconCls: 'text-emerald-600 dark:text-emerald-400',
          kondisi:
            'Dokumen Pengelolaan Risiko periode ini telah melalui verifikasi 4 tingkat dan resmi disahkan oleh Inspektorat.',
          tindakan:
            'Dokumen resmi berstatus terkunci permanen dan dapat diunduh untuk lampiran laporan kinerja pemda.',
          langkahBerikutnya:
            'Pelaksanaan rencana tindak pengendalian (RTP) dan pemantauan risiko berkala sepanjang tahun berjalan.',
        }
      default:
        return null
    }
  }

  const guidance = getContextGuidance()

  const rejectedItems =
    readiness.submission?.items?.filter(
      (i) =>
        i.status === 'rejected' ||
        i.status_kepala_opd === 'rejected' ||
        i.status_auditor === 'rejected' ||
        i.status_pengawas === 'rejected'
    ) || []

  return (
    <div className='space-y-3 mb-3'>
      {hasAuditorWarning && (
        <div className='flex items-start gap-2.5 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive text-start'>
          <ShieldAlert className='h-4.5 w-4.5 shrink-0 mt-0.5' />
          <div className='space-y-0.5 text-xs'>
            <p className='font-bold text-foreground'>
              Belum Ada Auditor Pengawas yang Ditugaskan
            </p>
            <p className='text-muted-foreground leading-relaxed'>
              Perangkat Daerah (OPD) Anda belum memiliki Auditor Pengawas yang ditetapkan oleh Inspektorat. Pengisian lembar kerja berstatus <strong>read-only</strong> hingga Inspektorat menetapkan penugasan auditor binaan.
            </p>
          </div>
        </div>
      )}

      <ApprovalTierStepper readiness={readiness} />

      {guidance && (
        <div
          className={cn(
            'rounded-xl border p-3.5 sm:p-4 text-xs transition-colors shadow-2xs',
            guidance.borderCls
          )}
        >
          <div className='flex items-center justify-between gap-2 pb-2.5 border-b border-border/50'>
            <div className='flex items-center gap-2'>
              <guidance.headerIcon
                className={cn('h-4 w-4 shrink-0', guidance.headerIconCls)}
              />
              <span className='font-bold text-foreground text-xs sm:text-sm'>
                {guidance.title}
              </span>
            </div>
            <Badge variant='outline' className='text-[10px] font-medium'>
              {guidance.badgeText}
            </Badge>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 text-[11px] leading-relaxed'>
            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  1
                </span>
                <span>Kondisi Berkas Terkini</span>
              </div>
              <p className='text-muted-foreground'>{guidance.kondisi}</p>
            </div>

            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  2
                </span>
                <span>Tindakan Anda</span>
              </div>
              <p className='text-muted-foreground'>{guidance.tindakan}</p>
            </div>

            <div className='space-y-1 p-2 rounded-lg bg-background/60 border border-border/40'>
              <div className='flex items-center gap-1.5 font-bold text-foreground'>
                <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-[10px] text-primary'>
                  3
                </span>
                <span>Langkah Selanjutnya</span>
              </div>
              <p className='text-muted-foreground'>{guidance.langkahBerikutnya}</p>
            </div>
          </div>

          {rejectedItems.length > 0 && (
            <div className='mt-3 pt-2.5 border-t border-border/50 space-y-2'>
              <span className='font-bold text-destructive text-[11px] uppercase tracking-wide flex items-center gap-1.5'>
                <AlertCircle className='h-3.5 w-3.5' />
                Rincian Catatan Perbaikan Formulir:
              </span>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
                {rejectedItems.map((item) => {
                  const note =
                    item.catatan_kepala_opd ||
                    item.catatan_auditor ||
                    item.catatan_pengawas ||
                    item.catatan_revisi ||
                    'Perlu perbaikan data formulir.'
                  return (
                    <div
                      key={item.id}
                      className='p-2 rounded-md bg-destructive/10 border border-destructive/20 text-[11px] text-foreground space-y-0.5'
                    >
                      <span className='font-bold uppercase text-destructive mr-1.5'>
                        Form {item.form_code}:
                      </span>
                      <span className='text-muted-foreground'>{note}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
