import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'
import { risikoService } from '@/services/risiko-service'

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
  const [rejectingFormCode, setRejectingFormCode] = useState<'2b' | '2c' | null>(null)
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
      queryClient.invalidateQueries({ queryKey: ['pengawasan', 'review-detail', submissionId] })
      setRejectingFormCode(null)
      setRejectionNote('')
      onSuccess?.()
    },
    onError: (err: any) => {
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
          <Badge className='text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 gap-1'>
            <CheckCircle2 className='h-3 w-3' />
            Disetujui
          </Badge>
        )
      case 'rejected':
        return (
          <Badge className='text-[10px] bg-destructive/15 text-destructive border border-destructive/30 gap-1'>
            <XCircle className='h-3 w-3' />
            Perlu Revisi
          </Badge>
        )
      case 'submitted':
        return (
          <Badge className='text-[10px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 gap-1'>
            <Clock className='h-3 w-3' />
            Menunggu Review
          </Badge>
        )
      default:
        return (
          <Badge variant='outline' className='text-[10px] text-muted-foreground'>
            Draft OPD
          </Badge>
        )
    }
  }

  const konteks2B = konteks2BData?.data

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-4xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-start justify-between gap-4'>
            <div className='flex items-center gap-3'>
              <div className='flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                <Building2 className='h-6 w-6' />
              </div>
              <div className='space-y-0.5'>
                <div className='flex items-center gap-2 flex-wrap'>
                  <DialogTitle className='text-base font-bold text-foreground'>
                    {submission?.opd?.nama || 'Pemeriksaan Lembar Kerja Risiko'}
                  </DialogTitle>
                  {submission?.opd?.kode && (
                    <Badge variant='outline' className='font-mono text-xs'>
                      [{submission.opd.kode}]
                    </Badge>
                  )}
                </div>
                <DialogDescription className='text-xs text-muted-foreground flex items-center gap-2 flex-wrap'>
                  <span className='flex items-center gap-1'>
                    <Calendar className='h-3 w-3' />
                    Periode: {submission?.periode_penilaian?.nama_periode || '-'}
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
                <Badge className='text-xs bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 py-1 px-3'>
                  Selesai Disetujui
                </Badge>
              ) : submission?.status === 'revision_requested' ? (
                <Badge className='text-xs bg-destructive/15 text-destructive border border-destructive/30 py-1 px-3'>
                  Perlu Revisi
                </Badge>
              ) : submission?.status === 'submitted' || submission?.status === 'in_review' ? (
                <Badge className='text-xs bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-1 px-3'>
                  Menunggu Pemeriksaan
                </Badge>
              ) : (
                <Badge variant='outline' className='text-xs py-1 px-3'>
                  Draft OPD
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Content Body */}
        {isLoadingSubmission ? (
          <div className='flex flex-col items-center justify-center p-16 gap-3'>
            <Loader2 className='h-8 w-8 animate-spin text-primary' />
            <p className='text-xs text-muted-foreground'>Memuat data pengajuan risiko...</p>
          </div>
        ) : (
          <div className='flex flex-col flex-1 overflow-hidden'>
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as any)}
              className='flex flex-col flex-1 overflow-hidden'
            >
              <div className='px-6 pt-3 pb-2 border-b bg-muted/5'>
                <TabsList className='grid w-full max-w-xs grid-cols-2 h-8'>
                  <TabsTrigger value='forms' className='text-xs'>
                    Pemeriksaan Form
                  </TabsTrigger>
                  <TabsTrigger value='history' className='text-xs'>
                    Riwayat ({submission?.histories?.length || 0})
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* TAB 1: FORM EXAMINATION */}
              <TabsContent value='forms' className='flex-1 overflow-y-auto p-6 space-y-6 m-0'>
                {/* Form 2B Review Card */}
                <div className='rounded-xl border bg-card p-5 space-y-4 shadow-2xs'>
                  <div className='flex items-center justify-between pb-3 border-b'>
                    <div className='flex items-center gap-2.5'>
                      <div className='p-2 rounded-lg bg-primary/10 text-primary'>
                        <ShieldAlert className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-foreground'>
                          Form 2B: Penetapan Konteks Risiko Strategis
                        </h4>
                        <p className='text-[11px] text-muted-foreground'>
                          Sumber data, tujuan, sasaran strategis, dan indikator kinerja utama OPD.
                        </p>
                      </div>
                    </div>
                    <div>{getFormStatusBadge(item2b)}</div>
                  </div>

                  {/* Previous Revision Note if rejected */}
                  {item2b?.status === 'rejected' && item2b.catatan_revisi && (
                    <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1'>
                      <p className='font-semibold flex items-center gap-1.5'>
                        <AlertCircle className='h-3.5 w-3.5' /> Catatan Revisi Auditor:
                      </p>
                      <p className='pl-5 text-[11px]'>{item2b.catatan_revisi}</p>
                    </div>
                  )}

                  {/* Form 2B Data Summary */}
                  {isLoading2B ? (
                    <div className='py-4 text-center text-xs text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin inline mr-2' />
                      Memuat data Form 2B...
                    </div>
                  ) : konteks2B ? (
                    <div className='space-y-3 text-xs'>
                      <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-muted/20 border'>
                        <div>
                          <span className='text-muted-foreground text-[11px] block'>Sumber Data:</span>
                          <span className='font-medium text-foreground'>
                            {konteks2B.sumber_data?.nama || '-'}
                          </span>
                        </div>
                        <div>
                          <span className='text-muted-foreground text-[11px] block'>Tujuan Penilaian:</span>
                          <span className='font-medium text-foreground'>
                            {konteks2B.tujuan?.tujuan || '-'}
                          </span>
                        </div>
                      </div>

                      <div className='grid grid-cols-2 gap-3'>
                        <div className='p-2.5 rounded-lg border bg-muted/10'>
                          <span className='text-[11px] text-muted-foreground block'>Sasaran Renstra:</span>
                          <span className='font-bold text-sm text-foreground'>
                            {konteks2B.sasarans?.length || 0} Sasaran
                          </span>
                        </div>
                        <div className='p-2.5 rounded-lg border bg-muted/10'>
                          <span className='text-[11px] text-muted-foreground block'>Indikator Kinerja:</span>
                          <span className='font-bold text-sm text-foreground'>
                            {konteks2B.indikators?.length || 0} Indikator
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground italic py-2'>
                      OPD belum menyimpan pengisian Form 2B.
                    </p>
                  )}

                  {/* Form 2B Action Buttons */}
                  <div className='flex items-center justify-end gap-2 pt-2 border-t'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      className='h-8 text-xs'
                      disabled={reviewMutation.isPending || !konteks2B}
                      onClick={() => {
                        setRejectingFormCode('2b')
                        setRejectionNote(item2b?.catatan_revisi || '')
                      }}
                    >
                      <XCircle className='h-3.5 w-3.5 mr-1.5' />
                      Tolak / Minta Revisi
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                      disabled={reviewMutation.isPending || !konteks2B}
                      onClick={() => handleApprove('2b')}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                      ) : (
                        <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' />
                      )}
                      Terima Form 2B
                    </Button>
                  </div>
                </div>

                {/* Form 2C Review Card */}
                <div className='rounded-xl border bg-card p-5 space-y-4 shadow-2xs'>
                  <div className='flex items-center justify-between pb-3 border-b'>
                    <div className='flex items-center gap-2.5'>
                      <div className='p-2 rounded-lg bg-primary/10 text-primary'>
                        <FolderTree className='h-4 w-4' />
                      </div>
                      <div>
                        <h4 className='text-sm font-bold text-foreground'>
                          Form 2C: Penetapan Konteks Risiko Operasional
                        </h4>
                        <p className='text-[11px] text-muted-foreground'>
                          Pohon kinerja Program, Kegiatan, Sub-Kegiatan, dan target indikator operasional.
                        </p>
                      </div>
                    </div>
                    <div>{getFormStatusBadge(item2c)}</div>
                  </div>

                  {/* Previous Revision Note if rejected */}
                  {item2c?.status === 'rejected' && item2c.catatan_revisi && (
                    <div className='p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive space-y-1'>
                      <p className='font-semibold flex items-center gap-1.5'>
                        <AlertCircle className='h-3.5 w-3.5' /> Catatan Revisi Auditor:
                      </p>
                      <p className='pl-5 text-[11px]'>{item2c.catatan_revisi}</p>
                    </div>
                  )}

                  {/* Form 2C Data Summary */}
                  {isLoading2C ? (
                    <div className='py-4 text-center text-xs text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin inline mr-2' />
                      Memuat data Form 2C...
                    </div>
                  ) : konteks2CData ? (
                    <div className='space-y-3 text-xs'>
                      <div className='grid grid-cols-3 gap-3'>
                        <div className='p-2.5 rounded-lg border bg-muted/10'>
                          <span className='text-[11px] text-muted-foreground block'>Total Program:</span>
                          <span className='font-bold text-sm text-foreground'>
                            {konteks2CData.programs?.length || 0} Program
                          </span>
                        </div>
                        <div className='p-2.5 rounded-lg border bg-muted/10'>
                          <span className='text-[11px] text-muted-foreground block'>Kegiatan & Sub:</span>
                          <span className='font-bold text-sm text-foreground'>
                            {konteks2CData.programs?.reduce(
                              (acc, p) => acc + (p.children?.length || 0),
                              0
                            ) || 0}{' '}
                            Kegiatan
                          </span>
                        </div>
                        <div className='p-2.5 rounded-lg border bg-muted/10'>
                          <span className='text-[11px] text-muted-foreground block'>Status OPD:</span>
                          <span className='font-bold text-sm capitalize text-foreground'>
                            {konteks2CData.status || 'Draft'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className='text-xs text-muted-foreground italic py-2'>
                      OPD belum menyimpan pengisian Form 2C.
                    </p>
                  )}

                  {/* Form 2C Action Buttons */}
                  <div className='flex items-center justify-end gap-2 pt-2 border-t'>
                    <Button
                      type='button'
                      variant='destructive'
                      size='sm'
                      className='h-8 text-xs'
                      disabled={reviewMutation.isPending || !konteks2CData}
                      onClick={() => {
                        setRejectingFormCode('2c')
                        setRejectionNote(item2c?.catatan_revisi || '')
                      }}
                    >
                      <XCircle className='h-3.5 w-3.5 mr-1.5' />
                      Tolak / Minta Revisi
                    </Button>
                    <Button
                      type='button'
                      size='sm'
                      className='h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white'
                      disabled={reviewMutation.isPending || !konteks2CData}
                      onClick={() => handleApprove('2c')}
                    >
                      {reviewMutation.isPending ? (
                        <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                      ) : (
                        <CheckCircle2 className='h-3.5 w-3.5 mr-1.5' />
                      )}
                      Terima Form 2C
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* TAB 2: AUDIT TRAIL / HISTORY */}
              <TabsContent value='history' className='flex-1 overflow-y-auto p-6 space-y-4 m-0'>
                {submission?.histories && submission.histories.length > 0 ? (
                  <div className='relative border-l border-border/80 ml-3 space-y-6'>
                    {submission.histories.map((hist) => (
                      <div key={hist.id} className='relative pl-6 text-xs'>
                        <div className='absolute -left-1.5 top-0.5 h-3 w-3 rounded-full border-2 border-background bg-primary' />
                        <div className='space-y-1'>
                          <div className='flex items-center gap-2 flex-wrap'>
                            <span className='font-semibold text-foreground capitalize'>
                              {hist.action.replace('_', ' ')}
                            </span>
                            {hist.form_code && (
                              <Badge variant='outline' className='text-[10px] uppercase'>
                                Form {hist.form_code}
                              </Badge>
                            )}
                            <span className='text-[11px] text-muted-foreground'>
                              {new Date(hist.created_at).toLocaleString('id-ID', {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })}
                            </span>
                          </div>
                          {hist.catatan && (
                            <p className='p-2.5 rounded-lg bg-muted/30 border text-muted-foreground text-[11px]'>
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
          <DialogContent className='sm:max-w-md p-6 space-y-4'>
            <DialogHeader className='text-start space-y-1'>
              <DialogTitle className='text-base font-bold flex items-center gap-2 text-destructive'>
                <AlertCircle className='h-5 w-5' />
                Kembalikan untuk Revisi Form {rejectingFormCode?.toUpperCase()}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground'>
                Sampaikan poin-poin kekurangan dan instruksi perbaikan yang wajib dilengkapi oleh OPD.
              </DialogDescription>
            </DialogHeader>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                Catatan Revisi Auditor <span className='text-destructive'>*</span>
              </Label>
              <Textarea
                rows={4}
                placeholder='Tuliskan catatan perbaikan secara spesifik (minimal 5 karakter)...'
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                className='text-xs'
              />
              <span className='text-[10px] text-muted-foreground'>
                Catatan ini akan langsung tampil di halaman pengisian risiko pihak OPD.
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
                disabled={reviewMutation.isPending || rejectionNote.trim().length < 5}
                className='h-8 text-xs'
              >
                {reviewMutation.isPending ? (
                  <Loader2 className='h-3.5 w-3.5 mr-1.5 animate-spin' />
                ) : (
                  <MessageSquare className='h-3.5 w-3.5 mr-1.5' />
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
