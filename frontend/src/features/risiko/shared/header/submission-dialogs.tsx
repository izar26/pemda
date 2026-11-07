import { AlertCircle, ArrowRightCircle, CheckCircle2, UserCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { ReadinessResponse } from '@/services/pengajuan-risiko-service'

export interface SubmissionDialogsProps {
  isSubmitOpen: boolean
  setSubmitOpen: (open: boolean) => void
  isKepalaReviewOpen: boolean
  setIsKepalaReviewOpen: (open: boolean) => void
  kepalaAction: 'approved' | 'rejected'
  setKepalaAction: (action: 'approved' | 'rejected') => void
  kepalaNotes: string
  setKepalaNotes: (notes: string) => void
  isKepalaDelegateOpen: boolean
  setIsKepalaDelegateOpen: (open: boolean) => void
  delegateNotes: string
  setDelegateNotes: (notes: string) => void
  submitToKepalaMutation: { isPending: boolean; mutate: () => void }
  reviewKepalaMutation: { isPending: boolean; mutate: () => void }
  delegateMutation: { isPending: boolean; mutate: () => void }
  readiness?: ReadinessResponse
}

export function SubmissionDialogs({
  isSubmitOpen,
  setSubmitOpen,
  isKepalaReviewOpen,
  setIsKepalaReviewOpen,
  kepalaAction,
  setKepalaAction,
  kepalaNotes,
  setKepalaNotes,
  isKepalaDelegateOpen,
  setIsKepalaDelegateOpen,
  delegateNotes,
  setDelegateNotes,
  submitToKepalaMutation,
  reviewKepalaMutation,
  delegateMutation,
  readiness,
}: SubmissionDialogsProps) {
  return (
    <>
      {/* 1. OPERATOR SUBMIT CONFIRMATION DIALOG */}
      <ConfirmDialog
        open={isSubmitOpen}
        onOpenChange={setSubmitOpen}
        title='Ajukan Lembar Kerja Risiko ke Kepala OPD?'
        desc={
          <span>
            Seluruh data lembar kerja pengelolaan risiko (Form 2B dan Form 2C) akan diajukan kepada Kepala OPD (
            <strong>{readiness?.kepala_opd?.name || 'Pimpinan OPD'}</strong>) untuk diverifikasi secara internal.
          </span>
        }
        confirmText='Ya, Ajukan ke Kepala OPD'
        isLoading={submitToKepalaMutation.isPending}
        handleConfirm={() => submitToKepalaMutation.mutate()}
      />

      {/* 2. KEPALA OPD REVIEW MODAL */}
      <Dialog open={isKepalaReviewOpen} onOpenChange={setIsKepalaReviewOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <UserCheck className='h-5 w-5 text-primary' />
              Persetujuan Internal Kepala OPD
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Sebagai Kepala OPD, Anda dapat menyetujui draf internal untuk diteruskan kepada Auditor Pengawas atau meminta revisi kepada Operator.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-4 py-2 text-xs'>
            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Keputusan Persetujuan:</Label>
              <div className='grid grid-cols-2 gap-2'>
                <Button
                  type='button'
                  variant={kepalaAction === 'approved' ? 'default' : 'outline'}
                  size='sm'
                  onClick={() => setKepalaAction('approved')}
                  className={cn(
                    'text-xs h-9 justify-center gap-1.5 font-bold',
                    kepalaAction === 'approved' && 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  )}
                >
                  <CheckCircle2 className='h-4 w-4' />
                  Setujui & Kirim ke Auditor
                </Button>
                <Button
                  type='button'
                  variant={kepalaAction === 'rejected' ? 'destructive' : 'outline'}
                  size='sm'
                  onClick={() => setKepalaAction('rejected')}
                  className='text-xs h-9 justify-center gap-1.5 font-bold'
                >
                  <AlertCircle className='h-4 w-4' />
                  Minta Revisi ke Operator
                </Button>
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>
                Catatan Kepala OPD {kepalaAction === 'rejected' && <span className='text-destructive'>* (Wajib diisi min. 5 karakter)</span>}:
              </Label>
              <Textarea
                rows={3}
                value={kepalaNotes}
                onChange={(e) => setKepalaNotes(e.target.value)}
                placeholder={
                  kepalaAction === 'approved'
                    ? 'Catatan opsional untuk auditor pengawas...'
                    : 'Instruksi perbaikan untuk operator OPD...'
                }
                className='text-xs'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsKepalaReviewOpen(false)}
              disabled={reviewKepalaMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={
                reviewKepalaMutation.isPending ||
                (kepalaAction === 'rejected' && kepalaNotes.trim().length < 5)
              }
              onClick={() => reviewKepalaMutation.mutate()}
              className={cn(
                kepalaAction === 'approved'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-destructive hover:bg-destructive/90 text-white'
              )}
            >
              {reviewKepalaMutation.isPending ? 'Menyimpan...' : 'Simpan Keputusan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 3. KEPALA OPD DELEGATE AUDITOR REVISION MODAL */}
      <Dialog open={isKepalaDelegateOpen} onOpenChange={setIsKepalaDelegateOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base font-bold'>
              <ArrowRightCircle className='h-5 w-5 text-amber-600' />
              Delegasikan Revisi ke Operator OPD
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Auditor Pengawas telah mengembalikan lembar kerja dengan catatan perbaikan. Klik delegasikan untuk membuka akses edit bagi Operator.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2 text-xs'>
            <div className='rounded-lg border bg-muted/40 p-3 space-y-2'>
              <p className='font-semibold text-foreground text-xs'>Catatan dari Auditor Pengawas:</p>
              <div className='space-y-1.5'>
                {readiness?.submission?.items
                  ?.filter((i) => i.status_auditor === 'rejected' || i.status === 'rejected')
                  .map((item) => (
                    <div key={item.id} className='text-xs bg-background/80 p-2 rounded border'>
                      <span className='font-bold uppercase text-destructive mr-1'>Form {item.form_code}:</span>
                      <span className='text-muted-foreground'>{item.catatan_auditor || item.catatan_revisi || 'Perlu perbaikan.'}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className='space-y-1.5'>
              <Label className='text-xs font-semibold'>Tambahan Instruksi Kepala OPD (Opsional):</Label>
              <Textarea
                rows={2}
                value={delegateNotes}
                onChange={(e) => setDelegateNotes(e.target.value)}
                placeholder='Instruksi khusus kepada staf penyusun...'
                className='text-xs'
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={() => setIsKepalaDelegateOpen(false)}
              disabled={delegateMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type='button'
              size='sm'
              disabled={delegateMutation.isPending}
              onClick={() => delegateMutation.mutate()}
              className='bg-amber-600 hover:bg-amber-700 text-white font-semibold'
            >
              {delegateMutation.isPending ? 'Mendelegasikan...' : 'Kirim Catatan & Buka Akses Edit Operator'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
