import { useState } from 'react'
import type { AxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'
import { risikoService } from '@/services/risiko-service'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FolderTree,
  Loader2,
  MessageSquare,
  ShieldAlert,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'

interface ReviewDialogProps {
  submissionId: string | null
  opdId: string | null
  periodeId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReviewDialog({
  submissionId,
  opdId,
  periodeId,
  open,
  onOpenChange,
  onSuccess,
}: ReviewDialogProps) {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<'forms' | 'history'>('forms')

  // State for rejection notes modal/input
  const [rejectingFormCode, setRejectingFormCode] = useState<
    '2b' | '2c' | null
  >(null)
  const [rejectionNote, setRejectionNote] = useState('')

  // 1. Fetch submission detail
  const { data: submission, isLoading: isLoadingSubmission } = useQuery({
    queryKey: ['pengawasan', 'review-detail', submissionId],
    queryFn: () => pengajuanRisikoService.getSubmissionDetail(submissionId!),
    enabled: Boolean(submissionId) && open,
  })

  // 2. Fetch Form 2B details
  const { data: konteks2BData, isLoading: isLoading2B } = useQuery({
    queryKey: ['risiko-2b-detail', opdId, periodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksWithMeta({
        opd_id: opdId || undefined,
        periode_penilaian_id: periodeId || undefined,
      }),
    enabled: Boolean(opdId) && open,
  })

  // 3. Fetch Form 2C details
  const { data: konteks2CData, isLoading: isLoading2C } = useQuery({
    queryKey: ['risiko-2c-detail', opdId, periodeId],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: opdId || undefined,
        periode_penilaian_id: periodeId || undefined,
      }),
    enabled: Boolean(opdId) && open,
  })

  // Mutation for reviewing item (Approve / Reject)
  const reviewMutation = useMutation({
    mutationFn: ({
      formCode,
      status,
      catatan,
    }: {
      formCode: '2b' | '2c'
      status: 'approved' | 'rejected'
      catatan?: string
    }) =>
      pengajuanRisikoService.reviewItem(submissionId!, {
        form_code: formCode,
        status,
        catatan_revisi: catatan,
      }),
    onSuccess: (res) => {
      toast.success(res.message || 'Status form berhasil diperbarui.')
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      queryClient.invalidateQueries({
        queryKey: ['pengawasan', 'review-detail', submissionId],
      })
      setRejectingFormCode(null)
      setRejectionNote('')
      onSuccess?.()
    },
    onError: (
      err: AxiosError<{ message?: string; errors?: Record<string, string[]> }>
    ) => {
      const msg =
        err.response?.data?.message ||
        err.response?.data?.errors?.catatan_revisi?.[0] ||
        'Gagal memproses review form.'
      toast.error(msg)
    },
  })

  const handleApprove = (formCode: '2b' | '2c') => {
    reviewMutation.mutate({ formCode, status: 'approved' })
  }

  const handleConfirmReject = () => {
    if (!rejectingFormCode) return
    if (!rejectionNote || rejectionNote.trim().length < 5) {
      toast.error('Catatan revisi wajib diisi minimal 5 karakter.')
      return
    }

    reviewMutation.mutate({
      formCode: rejectingFormCode,
      status: 'rejected',
      catatan: rejectionNote.trim(),
    })
  }

  const item2b = submission?.items?.find((i) => i.form_code === '2b')
  const item2c = submission?.items?.find((i) => i.form_code === '2c')
  const isDraftSubmission = !submission || submission.status === 'draft'

  const getFormStatusBadge = (item?: typeof item2b) => {
    if (!item) {
      return (
        <Badge variant='outline' className='text-[10px] text-muted-foreground'>
          Draft / Belum Mengirim
        </Badge>
      )
    }

    switch (item.status) {
      case 'approved':
        return (
          <Badge className='gap-1 border border-emerald-500/30 bg-emerald-500/15 text-[10px] text-emerald-700 dark:text-emerald-400'>
            <CheckCircle2 className='h-3 w-3' />
            Disetujui
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className='gap-1 border border-destructive/30 bg-destructive/15 text-[10px] text-destructive'>
            <XCircle className='h-3 w-3' />
            Perlu Revisi
          </Badge>
        )
      case 'submitted':
        return (
          <Badge className='gap-1 border border-amber-500/30 bg-amber-500/15 text-[10px] text-amber-700 dark:text-amber-400'>
            <Clock className='h-3 w-3' />
            Menunggu Review
          </Badge>
        )
      default:
        return (
          <Badge
            variant='outline'
            className='text-[10px] text-muted-foreground'
          >
            Draft OPD
          </Badge>
        )
    }
  }

  const konteks2B = konteks2BData?.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 shadow-2xl sm:max-w-4xl'>
        {/* Header */}
        <DialogHeader className='shrink-0 border-b bg-muted/10 px-6 pt-5 pb-4 text-start'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Building2 className='h-6 w-6' />
              </div>
              <div className='space-y-0.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <DialogTitle className='text-base font-bold text-foreground'>
                    {submission?.opd?.nama || 'Pemeriksaan Lembar Kerja Risiko'}
                  </DialogTitle>
                  {submission?.opd?.kode && (
                    <Badge variant='outline' className='font-mono text-xs'>
                      [{submission.opd.kode}]
                    </Badge>
                  )}
                </div>
                <DialogDescription className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <span className='flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    Periode:{' '}
                    {submission?.periode_penilaian?.nama_periode || '-'}
                  </span>
                  <span>•</span>
                  <span className='flex items-center gap-1'>
                    <User className='h-3 w-3' />
                    Auditor: {submission?.auditor?.name || 'Belum ditugaskan'}
                  </span>
                </DialogDescription>
              </div>
            </div>

            {/* Overall Submission Badge */}
            <div className='shrink-0'>
              {submission?.status === 'approved' ? (
                <Badge className='border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-700 dark:text-emerald-400'>
                  Selesai Disetujui
                </Badge>
              ) : submission?.status === 'revision_requested' ? (
                <Badge className='border border-destructive/30 bg-destructive/15 px-3 py-1 text-xs text-destructive'>
                  Perlu Revisi
                </Badge>
              ) : submission?.status === 'submitted' ||
                submission?.status === 'in_review' ? (
                <Badge className='border border-amber-500/30 bg-amber-500/15 px-3 py-1 text-xs text-amber-700 dark:text-amber-400'>
                  Menunggu Pemeriksaan
                </Badge>
              ) : (
                <Badge variant='outline' className='px-3 py-1 text-xs'>
                  Draft OPD
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {isLoadingSubmission ? (
          <div className='flex flex-col items-center justify-center gap-3 p-16'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>
              Memuat data pengajuan risiko...
            </p>
          </div>
        ) : (
          <div className='flex flex-1 flex-col overflow-hidden'>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'forms' | 'history')}
              className='flex flex-1 flex-col overflow-hidden'
            >
              <div className='border-b bg-muted/5 px-6 pt-3 pb-2'>
                <TabsList className='grid h-8 w-full max-w-xs grid-cols-2'>
                  <TabsTrigger value='forms' className='text-xs'>
                    Pemeriksaan Form
                  </TabsTrigger>
                  <TabsTrigger value='history' className='text-xs'>
                    Riwayat ({submission?.histories?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: FORM EXAMINATION */}
              <TabsContent
                value='forms'
                className='m-0 flex-1 space-y-6 overflow-y-auto p-6'
              >
                {isDraftSubmission && (
                  <div className='flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-800 dark:text-amber-400'>
                    <Clock className='h-4 w-4 shrink-0' />
                    <span>
                      Perangkat daerah belum mengirimkan lembar kerja risiko
                      kepada auditor (Status: <strong>Draft</strong>). Anda
                      dapat melihat pratinjau data, namun tombol persetujuan
                      baru akan aktif setelah OPD melakukan pengiriman resmi.
                    </span>
                  </div>
                )}
                {/* Form 2B Review Card */}
                <div className='space-y-4 rounded-xl border bg-card p-5 shadow-2xs'>
                  <div className='flex items-center justify-between border-b pb-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                        <ShieldAlert className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-foreground'>
                          Form 2B: Penetapan Konteks Risiko Strategis
                        </h4>
                        <p className='text-[11px] text-muted-foreground'>
                          Sumber data, tujuan, sasaran strategis, dan indikator
                          kinerja utama OPD.
                        </p>
                      </div>
                    </div>
                    <div>{getFormStatusBadge(item2b)}</div>
                  </div>

                  {/* Previous Revision Note if rejected */}
                  {item2b?.status === 'rejected' && item2b.catatan_revisi && (
                    <div className='space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
                      <p className='flex items-center gap-1.5 font-semibold'>
                        <AlertCircle className='h-3.5 w-3.5' /> Catatan Revisi
                        Auditor:
                      </p>
                      <p className='pl-5 text-[11px]'>
                        {item2b.catatan_revisi}
                      </p>
                    </div>
                  )}

                  {/* Form 2B Data Summary */}
                  {isLoading2B ? (
                    <div className='py-4 text-center text-xs text-muted-foreground'>
                      <Loader2 className='mr-2 inline h-4 w-4 animate-spin' />
                      Memuat data Form 2B...
                    </div>
                  ) : konteks2B ? (
                    <div className='space-y-3 text-xs'>
                      <div className='grid grid-cols-1 gap-3 rounded-lg border bg-muted/20 p-3 sm:grid-cols-2'>
                        <div>
                          <span className='block text-[11px] text-muted-foreground'>
                            Sumber Data:
                          </span>
                          <span className='font-medium text-foreground'>
                            {konteks2B.sumber_data?.nama || '-'}
                          </span>
                        </div>
                        <div>
                          <span className='block text-[11px] text-muted-foreground'>
                            Tujuan Penilaian:
                          </span>
                          <span className='font-medium text-foreground'>
                            {konteks2B.tujuan?.tujuan || '-'}
                          </span>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-3'>
                        <div className='rounded-lg border bg-muted/10 p-2.5'>
                          <span className='block text-[11px] text-muted-foreground'>
                            Sasaran Renstra:
                          </span>
                          <span className='text-sm font-bold text-foreground'>
                            {konteks2B.sasarans?.length || 0} Sasaran
                          </span>
                        </div>
                        <div className='rounded-lg border bg-muted/10 p-2.5'>
                          <span className='block text-[11px] text-muted-foreground'>
                            Indikator Kinerja:
                          </span>
                          <span className='text-sm font-bold text-foreground'>
                            {konteks2B.indikators?.length || 0} Indikator
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='py-2 text-xs text-muted-foreground italic'>
                      OPD belum menyimpan pengisian Form 2B.
                    </p>
                  )}

                  {/* Form 2B Action Buttons */}
                  <div className='flex items-center justify-end gap-2 border-t pt-2'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      className='h-8 text-xs'
                      disabled={
                        reviewMutation.isPending ||
                        !konteks2B ||
                        isDraftSubmission
                      }
                      onClick={() => {
                        setRejectingFormCode('2b')
                        setRejectionNote(item2b?.catatan_revisi || '')
                      }}
                    >
                      <XCircle className='mr-1.5 h-3.5 w-3.5' />
                      Tolak / Minta Revisi
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'
                      disabled={
                        reviewMutation.isPending ||
                        !konteks2B ||
                        isDraftSubmission
                      }
                      onClick={() => handleApprove('2b')}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                      )}
                      Terima Form 2B
                    </Button>
                  </div>
                </div>

                {/* Form 2C Review Card */}
                <div className='space-y-4 rounded-xl border bg-card p-5 shadow-2xs'>
                  <div className='flex items-center justify-between border-b pb-3'>
                    <div className='flex items-center gap-2.5'>
                      <div className='rounded-lg bg-primary/10 p-2 text-primary'>
                        <FolderTree className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-foreground'>
                          Form 2C: Penetapan Konteks Risiko Operasional
                        </h4>
                        <p className='text-[11px] text-muted-foreground'>
                          Pohon kinerja Program, Kegiatan, Sub-Kegiatan, dan
                          target indikator operasional.
                        </p>
                      </div>
                    </div>
                    <div>{getFormStatusBadge(item2c)}</div>
                  </div>

                  {/* Previous Revision Note if rejected */}
                  {item2c?.status === 'rejected' && item2c.catatan_revisi && (
                    <div className='space-y-1 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive'>
                      <p className='flex items-center gap-1.5 font-semibold'>
                        <AlertCircle className='h-3.5 w-3.5' /> Catatan Revisi
                        Auditor:
                      </p>
                      <p className='pl-5 text-[11px]'>
                        {item2c.catatan_revisi}
                      </p>
                    </div>
                  )}

                  {/* Form 2C Data Summary */}
                  {isLoading2C ? (
                    <div className='py-4 text-center text-xs text-muted-foreground'>
                      <Loader2 className='mr-2 inline h-4 w-4 animate-spin' />
                      Memuat data Form 2C...
                    </div>
                  ) : konteks2CData ? (
                    <div className='space-y-3 text-xs'>
                      <div className='grid grid-cols-3 gap-3'>
                        <div className='rounded-lg border bg-muted/10 p-2.5'>
                          <span className='block text-[11px] text-muted-foreground'>
                            Total Program:
                          </span>
                          <span className='text-sm font-bold text-foreground'>
                            {konteks2CData.programs?.length || 0} Program
                          </span>
                        </div>
                        <div className='rounded-lg border bg-muted/10 p-2.5'>
                          <span className='block text-[11px] text-muted-foreground'>
                            Kegiatan & Sub:
                          </span>
                          <span className='text-sm font-bold text-foreground'>
                            {konteks2CData.programs?.reduce(
                              (acc, p) => acc + (p.children?.length || 0),
                              0
                            ) || 0}{' '}
                            Kegiatan
                          </span>
                        </div>
                        <div className='rounded-lg border bg-muted/10 p-2.5'>
                          <span className='block text-[11px] text-muted-foreground'>
                            Status OPD:
                          </span>
                          <span className='text-sm font-bold text-foreground capitalize'>
                            {konteks2CData.status || 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='py-2 text-xs text-muted-foreground italic'>
                      OPD belum menyimpan pengisian Form 2C.
                    </p>
                  )}

                  {/* Form 2C Action Buttons */}
                  <div className='flex items-center justify-end gap-2 border-t pt-2'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      className='h-8 text-xs'
                      disabled={
                        reviewMutation.isPending ||
                        !konteks2CData ||
                        isDraftSubmission
                      }
                      onClick={() => {
                        setRejectingFormCode('2c')
                        setRejectionNote(item2c?.catatan_revisi || '')
                      }}
                    >
                      <XCircle className='mr-1.5 h-3.5 w-3.5' />
                      Tolak / Minta Revisi
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-8 bg-emerald-600 text-xs text-white hover:bg-emerald-700'
                      disabled={
                        reviewMutation.isPending ||
                        !konteks2CData ||
                        isDraftSubmission
                      }
                      onClick={() => handleApprove('2c')}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <CheckCircle2 className='mr-1.5 h-3.5 w-3.5' />
                      )}
                      Terima Form 2C
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: AUDIT TRAIL / HISTORY */}
              <TabsContent
                value='history'
                className='m-0 flex-1 space-y-4 overflow-y-auto p-6'
              >
                {submission?.histories && submission.histories.length > 0 ? (
                  <div className='relative ml-3 space-y-6 border-l border-border/80'>
                    {submission.histories.map((hist) => (
                      <div key={hist.id} className='relative pl-6 text-xs'>
                        <div className='absolute top-0.5 -left-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary' />
                        <div className='space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='font-semibold text-foreground capitalize'>
                              {hist.action.replace('_', ' ')}
                            </span>
                            {hist.form_code && (
                              <Badge
                                variant='outline'
                                className='text-[10px] uppercase'
                              >
                                Form {hist.form_code}
                              </Badge>
                            )}
                            <span className='text-[11px] text-muted-foreground'>
                              {new Date(hist.created_at).toLocaleString(
                                'id-ID',
                                {
                                  dateStyle: 'medium',
                                  timeStyle: 'short',
                                }
                              )}
                            </span>
                          </div>
                          {hist.catatan && (
                            <p className='rounded-lg border bg-muted/30 p-2.5 text-[11px] text-muted-foreground'>
                              {hist.catatan}
                            </p>
                          )}
                          <p className='text-[10px] text-muted-foreground'>
                            Oleh: {hist.user?.name || 'Sistem'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='py-8 text-center text-xs text-muted-foreground'>
                    Belum ada riwayat aktivitas review.
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* Nested Modal: Input Catatan Revisi */}
        <Dialog
          open={rejectingFormCode !== null}
          onOpenChange={(isOpen) => !isOpen && setRejectingFormCode(null)}
        >
          <DialogContent className='space-y-4 p-6 sm:max-w-md'>
            <DialogHeader className='space-y-1 text-start'>
              <DialogTitle className='flex items-center gap-2 text-base font-bold text-destructive'>
                <AlertCircle className='h-5 w-5' />
                Kembalikan untuk Revisi Form {rejectingFormCode?.toUpperCase()}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Sampaikan poin-poin kekurangan dan instruksi perbaikan yang
                wajib dilengkapi oleh OPD.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                Catatan Revisi Auditor{' '}
                <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                rows={4}
                placeholder='Tuliskan catatan perbaikan secara spesifik (minimal 5 karakter)...'
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className='text-xs'
              />
              <span className='text-[10px] text-muted-foreground'>
                Catatan ini akan langsung tampil di halaman pengisian risiko
                pihak OPD.
              </span>
            </div>

            <div className='flex items-center justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => setRejectingFormCode(null)}
                disabled={reviewMutation.isPending}
                className='h-8 text-xs'
              >
                Batal
              </Button>
              <Button
                type='button'
                variant='destructive'
                size='sm'
                onClick={handleConfirmReject}
                disabled={
                  reviewMutation.isPending || rejectionNote.trim().length < 5
                }
                className='h-8 text-xs'
              >
                {reviewMutation.isPending ? (
                  <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                ) : (
                  <MessageSquare className='mr-1.5 h-3.5 w-3.5' />
                )}
                Kirim Catatan Revisi
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  )
}
