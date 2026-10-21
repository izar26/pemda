import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Check,
  Loader2,
  Search,
  UserCheck,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  SearchableSelect,
  type SearchableSelectOption,
} from '@/components/searchable-select'
import {
  penugasanAuditorService,
  type AuditorUser,
} from '@/services/penugasan-auditor-service'
import { opdService } from '@/services/opd-service'
import { usePenugasan } from './penugasan-provider'

interface PenugasanDialogsProps {
  onSuccess?: () => void
}

export function PenugasanDialogs({ onSuccess }: PenugasanDialogsProps) {
  const queryClient = useQueryClient()
  const {
    open,
    setOpen,
    currentRow,
    setCurrentRow,
    selectedAssignment,
    setSelectedAssignment,
  } = usePenugasan()

  const isFormOpen = open === 'add' || open === 'edit'
  const isEdit = open === 'edit' && Boolean(currentRow)

  // Form states
  const [selectedAuditorId, setSelectedAuditorId] = useState<string>('')
  const [selectedOpdIds, setSelectedOpdIds] = useState<string[]>([])
  const [opdSearch, setOpdSearch] = useState('')

  // 1. Fetch eligible auditors for dropdown
  const { data: eligibleAuditors = [], isLoading: isLoadingAuditors } = useQuery({
    queryKey: ['pengawasan', 'eligible-auditors'],
    queryFn: () => penugasanAuditorService.getEligibleAuditors(),
    enabled: isFormOpen && !isEdit,
  })

  // 2. Fetch all active OPDs
  const { data: opdList = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-active-list'],
    queryFn: () => opdService.getOpds(),
    enabled: isFormOpen,
  })

  // Populate form on open/edit
  useEffect(() => {
    if (isEdit && currentRow) {
      setSelectedAuditorId(currentRow.id)
      const opdIds = currentRow.auditor_assignments?.map((a) => a.opd_id) || []
      setSelectedOpdIds(opdIds)
      setOpdSearch('')
    } else if (open === 'add') {
      setSelectedAuditorId('')
      setSelectedOpdIds([])
      setOpdSearch('')
    }
  }, [isEdit, currentRow, open])

  // Map auditors to SearchableSelect options
  const auditorOptions: SearchableSelectOption[] = useMemo(() => {
    return eligibleAuditors.map((auditor: AuditorUser) => ({
      value: auditor.id,
      label: auditor.name,
      description: `${auditor.nip ? `NIP. ${auditor.nip}` : auditor.email} • ${
        auditor.active_opd_count ?? 0
      } OPD ditugaskan`,
    }))
  }, [eligibleAuditors])

  // Filtered OPDs for multi-select
  const filteredOpds = useMemo(() => {
    if (!opdSearch.trim()) return opdList
    const term = opdSearch.toLowerCase()
    return opdList.filter(
      (opd) =>
        opd.nama.toLowerCase().includes(term) ||
        (opd.kode && opd.kode.toLowerCase().includes(term))
    )
  }, [opdList, opdSearch])

  const handleCloseForm = () => {
    setOpen(null)
    setTimeout(() => setCurrentRow(null), 200)
  }

  const handleToggleOpd = (id: string) => {
    setSelectedOpdIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleSelectAllFiltered = () => {
    const idsToAdd = filteredOpds.map((o) => String(o.id))
    setSelectedOpdIds((prev) => Array.from(new Set([...prev, ...idsToAdd])))
  }

  const handleDeselectAll = () => {
    setSelectedOpdIds([])
  }

  // Create Assignment Mutation
  const createMutation = useMutation({
    mutationFn: (data: { auditor_id: string; opd_ids: string[] }) =>
      penugasanAuditorService.createAssignment(data),
    onSuccess: (res) => {
      toast.success(res.message || 'Penugasan auditor berhasil disimpan.')
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      handleCloseForm()
      onSuccess?.()
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || 'Gagal menyimpan penugasan auditor.'
      toast.error(msg)
    },
  })

  // Update/Sync Assignment Mutation
  const updateMutation = useMutation({
    mutationFn: (data: { auditorId: string; payload: { opd_ids: string[] } }) =>
      penugasanAuditorService.updateAssignment(data.auditorId, data.payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Penugasan auditor berhasil diperbarui.')
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      handleCloseForm()
      onSuccess?.()
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.message || 'Gagal memperbarui penugasan auditor.'
      toast.error(msg)
    },
  })

  // Delete Single Assignment Mutation
  const deleteSingleMutation = useMutation({
    mutationFn: (id: string) => penugasanAuditorService.deleteAssignment(id),
    onSuccess: (res) => {
      toast.success(res.message || 'Penugasan OPD berhasil dicabut.')
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      setOpen(null)
      setSelectedAssignment(null)
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencabut penugasan.')
    },
  })

  // Delete All Assignments for Auditor Mutation
  const deleteAllMutation = useMutation({
    mutationFn: (auditorId: string) =>
      penugasanAuditorService.deleteAuditorAssignments(auditorId),
    onSuccess: (res) => {
      toast.success(res.message || 'Seluruh penugasan auditor berhasil dicabut.')
      queryClient.invalidateQueries({ queryKey: ['pengawasan'] })
      setOpen(null)
      setCurrentRow(null)
      onSuccess?.()
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Gagal mencabut penugasan.')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAuditorId) {
      toast.error('Pilih auditor pengawas terlebih dahulu.')
      return
    }

    if (selectedOpdIds.length === 0) {
      toast.error('Pilih minimal 1 Perangkat Daerah (OPD).')
      return
    }

    const payload = {
      opd_ids: selectedOpdIds,
    }

    if (isEdit && currentRow) {
      updateMutation.mutate({ auditorId: currentRow.id, payload })
    } else {
      createMutation.mutate({
        auditor_id: selectedAuditorId,
        ...payload,
      })
    }
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
      {/* 1. Modal Tambah / Edit Penugasan */}
      <Dialog open={isFormOpen} onOpenChange={(isOpen) => !isOpen && handleCloseForm()}>
        <DialogContent className='sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
          <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
            <div className='flex items-center gap-3'>
              <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary'>
                {isEdit ? (
                  <UserCheck className='h-5 w-5' />
                ) : (
                  <UserPlus className='h-5 w-5' />
                )}
              </div>
              <div>
                <DialogTitle className='text-base font-bold text-foreground'>
                  {isEdit ? 'Kelola Penugasan OPD' : 'Tambah Penugasan Auditor'}
                </DialogTitle>
                <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                  {isEdit
                    ? `Sesuaikan perangkat daerah (OPD) binaan untuk auditor ${currentRow?.name}.`
                    : 'Pilih auditor dan tentukan instansi OPD binaan untuk persetujuan (approval) lembar kerja risiko.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form
            id='penugasan-form'
            onSubmit={handleSubmit}
            className='flex flex-col flex-1 overflow-hidden'
          >
            <div className='flex-1 overflow-y-auto px-6 py-5 min-h-0 space-y-5'>
              {/* Auditor Field */}
              <div className='space-y-1.5'>
                <Label className='text-xs font-semibold flex items-center gap-1.5'>
                  <Users className='h-3.5 w-3.5 text-muted-foreground' />
                  Auditor Pengawas <span className='text-destructive'>*</span>
                </Label>

                {isEdit && currentRow ? (
                  <div className='flex items-center gap-3 p-3 rounded-lg border bg-muted/20'>
                    <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-xs text-primary'>
                      {currentRow.name.charAt(0)}
                    </div>
                    <div className='min-w-0 flex-1'>
                      <p className='text-sm font-semibold truncate text-foreground'>
                        {currentRow.name}
                      </p>
                      <p className='text-xs text-muted-foreground font-mono'>
                        {currentRow.nip ? `NIP. ${currentRow.nip}` : currentRow.email}
                      </p>
                    </div>
                    <Badge variant='outline' className='text-[10px] bg-background text-muted-foreground'>
                      Auditor Terpilih
                    </Badge>
                  </div>
                ) : (
                  <div>
                    <SearchableSelect
                      disabled={isSaving || isLoadingAuditors}
                      value={selectedAuditorId}
                      onValueChange={setSelectedAuditorId}
                      options={auditorOptions}
                      placeholder={
                        isLoadingAuditors
                          ? 'Memuat daftar auditor...'
                          : 'Pilih auditor pengawas...'
                      }
                      searchPlaceholder='Cari nama atau NIP auditor...'
                      emptyMessage='Tidak ada auditor yang cocok.'
                    />
                  </div>
                )}
              </div>

              {/* OPD Multi-Select Field */}
              <div className='space-y-2.5'>
                <div className='flex items-center justify-between'>
                  <Label className='text-xs font-semibold flex items-center gap-1.5'>
                    <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                    Pilih Perangkat Daerah (OPD) Binaan{' '}
                    <span className='text-destructive'>*</span>
                  </Label>
                  <Badge
                    variant='secondary'
                    className='text-[11px] font-semibold text-primary bg-primary/10 border-primary/20'
                  >
                    {selectedOpdIds.length} OPD Terpilih
                  </Badge>
                </div>

                {/* Selected Pills */}
                {selectedOpdIds.length > 0 && (
                  <div className='flex flex-wrap gap-1.5 p-2 bg-muted/20 border rounded-lg max-h-24 overflow-y-auto'>
                    {selectedOpdIds.map((id) => {
                      const opd = opdList.find((o) => o.id === id)
                      return (
                        <Badge
                          key={id}
                          variant='outline'
                          className='text-[11px] font-normal py-0.5 px-2 gap-1 bg-background text-foreground border-border shadow-2xs'
                        >
                          <Building2 className='h-3 w-3 text-primary shrink-0' />
                          <span className='max-w-[190px] truncate'>
                            {opd?.nama || id}
                          </span>
                          <button
                            type='button'
                            onClick={() => handleToggleOpd(id)}
                            className='ml-0.5 hover:text-destructive focus:outline-none'
                          >
                            <X className='h-3 w-3' />
                          </button>
                        </Badge>
                      )
                    })}
                  </div>
                )}

                {/* Search & Bulk Select Toolbar */}
                <div className='flex items-center gap-2'>
                  <div className='relative flex-1'>
                    <Search className='absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground' />
                    <Input
                      type='text'
                      placeholder='Cari nama atau kode dinas OPD...'
                      className='pl-8 h-8 text-xs'
                      value={opdSearch}
                      onChange={(e) => setOpdSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    className='h-8 text-[11px] shrink-0'
                    onClick={handleSelectAllFiltered}
                    disabled={filteredOpds.length === 0}
                  >
                    Pilih Hasil
                  </Button>
                  {selectedOpdIds.length > 0 && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      className='h-8 text-[11px] text-destructive shrink-0 hover:bg-destructive/10'
                      onClick={handleDeselectAll}
                    >
                      Reset
                    </Button>
                  )}
                </div>

                {/* Scrollable Checkbox Checklist */}
                <div className='border rounded-lg divide-y max-h-56 overflow-y-auto bg-card'>
                  {isLoadingOpds ? (
                    <div className='flex items-center justify-center p-6 gap-2 text-xs text-muted-foreground'>
                      <Loader2 className='h-4 w-4 animate-spin text-primary' />
                      Memuat daftar OPD...
                    </div>
                  ) : filteredOpds.length === 0 ? (
                    <p className='p-4 text-center text-xs text-muted-foreground'>
                      Tidak ada OPD yang cocok dengan pencarian.
                    </p>
                  ) : (
                    filteredOpds.map((opd) => {
                      const opdId = String(opd.id)
                      const isChecked = selectedOpdIds.includes(opdId)
                      return (
                        <label
                          key={opdId}
                          className={`flex items-center gap-3 px-3 py-2 text-xs cursor-pointer transition-colors ${
                            isChecked
                              ? 'bg-primary/5 font-medium text-primary'
                              : 'hover:bg-muted/50 text-foreground'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleOpd(opdId)}
                          />
                          <div className='flex-1 min-w-0'>
                            <span className='font-mono text-[10px] text-muted-foreground mr-1.5'>
                              [{opd.kode || '-'}]
                            </span>
                            <span>{opd.nama}</span>
                          </div>
                          {isChecked && (
                            <Check className='h-3.5 w-3.5 text-primary shrink-0' />
                          )}
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCloseForm}
                disabled={isSaving}
                className='h-9 text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isSaving || selectedOpdIds.length === 0 || !selectedAuditorId}
                className='min-w-[130px] h-9 text-xs'
              >
                {isSaving ? (
                  <>
                    <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                    Menyimpan...
                  </>
                ) : isEdit ? (
                  'Simpan Perubahan'
                ) : (
                  'Simpan Penugasan'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 2. Dialog Konfirmasi Cabut Single Assignment */}
      <ConfirmDialog
        open={open === 'delete-single' && Boolean(selectedAssignment)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setSelectedAssignment(null)
          }
        }}
        title='Cabut Penugasan OPD'
        desc={
          selectedAssignment ? (
            <span>
              Apakah Anda yakin ingin mencabut penugasan dari perangkat daerah{' '}
              <strong>{selectedAssignment.opd?.nama}</strong>? Auditor ini tidak akan
              dapat melakukan approval formulir risiko untuk OPD tersebut lagi.
            </span>
          ) : (
            ''
          )
        }
        confirmText='Ya, Cabut Penugasan'
        destructive
        isLoading={deleteSingleMutation.isPending}
        handleConfirm={() => {
          if (selectedAssignment) {
            deleteSingleMutation.mutate(selectedAssignment.id)
          }
        }}
      />

      {/* 3. Dialog Konfirmasi Cabut Semua Assignment Auditor */}
      <ConfirmDialog
        open={open === 'delete' && Boolean(currentRow)}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setOpen(null)
            setCurrentRow(null)
          }
        }}
        title='Cabut Seluruh Penugasan Auditor'
        desc={
          currentRow ? (
            <span>
              Apakah Anda yakin ingin mencabut seluruh penugasan (
              <strong>{currentRow.auditor_assignments?.length ?? 0} OPD</strong>)
              dari auditor <strong>{currentRow.name}</strong>?
            </span>
          ) : (
            ''
          )
        }
        confirmText='Cabut Semua'
        destructive
        isLoading={deleteAllMutation.isPending}
        handleConfirm={() => {
          if (currentRow) {
            deleteAllMutation.mutate(currentRow.id)
          }
        }}
      />
    </>
  )
}
