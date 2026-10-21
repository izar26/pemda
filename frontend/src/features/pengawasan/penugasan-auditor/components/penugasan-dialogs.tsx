import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Building2,
  Check,
  Loader2,
  Search,
  UserCheck,
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
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
  const isEditing = open === 'edit' && Boolean(currentRow)

  // Form states
  const [selectedAuditorId, setSelectedAuditorId] = useState<string>('')
  const [selectedOpdIds, setSelectedOpdIds] = useState<string[]>([])
  const [nomorSuratTugas, setNomorSuratTugas] = useState('')
  const [tanggalMulai, setTanggalMulai] = useState('')
  const [tanggalSelesai, setTanggalSelesai] = useState('')
  const [catatan, setCatatan] = useState('')
  const [opdSearch, setOpdSearch] = useState('')

  // 1. Fetch eligible auditors for selection
  const { data: eligibleAuditors = [], isLoading: isLoadingAuditors } = useQuery({
    queryKey: ['pengawasan', 'eligible-auditors'],
    queryFn: () => penugasanAuditorService.getEligibleAuditors(),
    enabled: isFormOpen && !isEditing,
  })

  // 2. Fetch all active OPDs
  const { data: opdList = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-active-list'],
    queryFn: () => opdService.getOpds(),
    enabled: isFormOpen,
  })

  // Populate form on edit
  useEffect(() => {
    if (isEditing && currentRow) {
      setSelectedAuditorId(currentRow.id)
      const opdIds = currentRow.auditor_assignments?.map((a) => a.opd_id) || []
      setSelectedOpdIds(opdIds)

      const first = currentRow.auditor_assignments?.[0]
      setNomorSuratTugas(first?.nomor_surat_tugas || '')
      setTanggalMulai(first?.tanggal_mulai ? first.tanggal_mulai.substring(0, 10) : '')
      setTanggalSelesai(first?.tanggal_selesai ? first.tanggal_selesai.substring(0, 10) : '')
      setCatatan(first?.catatan || '')
      setOpdSearch('')
    } else if (open === 'add') {
      setSelectedAuditorId('')
      setSelectedOpdIds([])
      setNomorSuratTugas('')
      setTanggalMulai('')
      setTanggalSelesai('')
      setCatatan('')
      setOpdSearch('')
    }
  }, [isEditing, currentRow, open])

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

  // Toggle OPD selection
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
    mutationFn: (data: {
      auditor_id: string
      opd_ids: string[]
      nomor_surat_tugas?: string
      tanggal_mulai?: string
      tanggal_selesai?: string
      catatan?: string
    }) => penugasanAuditorService.createAssignment(data),
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
    mutationFn: (data: {
      auditorId: string
      payload: {
        opd_ids: string[]
        nomor_surat_tugas?: string
        tanggal_mulai?: string
        tanggal_selesai?: string
        catatan?: string
      }
    }) => penugasanAuditorService.updateAssignment(data.auditorId, data.payload),
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
      nomor_surat_tugas: nomorSuratTugas.trim() || undefined,
      tanggal_mulai: tanggalMulai || undefined,
      tanggal_selesai: tanggalSelesai || undefined,
      catatan: catatan.trim() || undefined,
    }

    if (isEditing && currentRow) {
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
        <DialogContent className='max-w-2xl max-h-[90vh] flex flex-col p-0'>
          <DialogHeader className='px-6 pt-6 pb-2 border-b shrink-0'>
            <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
              <UserCheck className='h-5 w-5 text-primary' />
              {isEditing
                ? `Kelola OPD Binaan: ${currentRow?.name}`
                : 'Tambah Penugasan Auditor Pengawas'}
            </DialogTitle>
            <DialogDescription className='text-xs text-muted-foreground'>
              {isEditing
                ? 'Sesuaikan daftar OPD binaan yang akan disetujui (approval) oleh auditor ini.'
                : 'Pilih auditor pengawas dan tentukan instansi OPD yang menjadi tanggung jawab approval-nya.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className='flex flex-col flex-1 overflow-hidden'>
            <ScrollArea className='flex-1 px-6 py-4 space-y-4'>
              <div className='space-y-4'>
                {/* Auditor Selection */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>
                    Auditor Pengawas <span className='text-destructive'>*</span>
                  </Label>
                  {isEditing ? (
                    <div className='flex items-center gap-3 p-3 rounded-lg border bg-muted/40'>
                      <div className='h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm'>
                        {currentRow?.name?.charAt(0) || 'A'}
                      </div>
                      <div className='min-w-0 flex-1'>
                        <p className='text-sm font-semibold truncate text-foreground'>
                          {currentRow?.name}
                        </p>
                        <p className='text-xs text-muted-foreground'>
                          NIP. {currentRow?.nip || '-'} • {currentRow?.jabatan || 'Auditor'}
                        </p>
                      </div>
                      <Badge variant='outline' className='text-[10px] bg-primary/5 text-primary border-primary/20'>
                        Terkunci (Edit Mode)
                      </Badge>
                    </div>
                  ) : (
                    <div>
                      {isLoadingAuditors ? (
                        <div className='flex items-center gap-2 text-xs text-muted-foreground py-2'>
                          <Loader2 className='h-4 w-4 animate-spin text-primary' />
                          Memuat daftar auditor...
                        </div>
                      ) : (
                        <select
                          className='w-full text-xs h-9 rounded-md border border-input bg-background px-3 py-1 text-foreground shadow-sm focus:outline-none focus:ring-1 focus:ring-ring'
                          value={selectedAuditorId}
                          onChange={(e) => setSelectedAuditorId(e.target.value)}
                          required
                        >
                          <option value=''>-- Pilih Auditor Pengawas --</option>
                          {eligibleAuditors.map((auditor: AuditorUser) => (
                            <option key={auditor.id} value={auditor.id}>
                              {auditor.name} ({auditor.nip ? `NIP. ${auditor.nip}` : auditor.email}) - {auditor.active_opd_count ?? 0} OPD ditugaskan
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  )}
                </div>

                {/* OPD Selection with Multi-Select & Search */}
                <div className='space-y-2'>
                  <div className='flex items-center justify-between'>
                    <Label className='text-xs font-semibold'>
                      Pilih Perangkat Daerah (OPD) Binaan{' '}
                      <span className='text-destructive'>*</span>
                    </Label>
                    <span className='text-xs font-medium text-primary'>
                      {selectedOpdIds.length} OPD Terpilih
                    </span>
                  </div>

                  {/* Selected Pills */}
                  {selectedOpdIds.length > 0 && (
                    <div className='flex flex-wrap gap-1.5 p-2 bg-muted/30 border rounded-md max-h-24 overflow-y-auto'>
                      {selectedOpdIds.map((id) => {
                        const opd = opdList.find((o) => o.id === id)
                        return (
                          <Badge
                            key={id}
                            variant='secondary'
                            className='text-[11px] gap-1 py-0.5 px-2 bg-background border shadow-xs text-foreground font-normal'
                          >
                            <Building2 className='h-3 w-3 text-muted-foreground' />
                            <span className='max-w-[200px] truncate'>{opd?.nama || id}</span>
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

                  {/* Search and Action Bar */}
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
                        className='h-8 text-[11px] text-destructive shrink-0'
                        onClick={handleDeselectAll}
                      >
                        Reset
                      </Button>
                    )}
                  </div>

                  {/* Scrollable Checkbox List */}
                  <div className='border rounded-md divide-y max-h-48 overflow-y-auto bg-card'>
                    {isLoadingOpds ? (
                      <div className='flex items-center justify-center p-6 gap-2 text-xs text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin text-primary' />
                        Memuat data OPD...
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

                {/* Surat Tugas & Rentang Tanggal */}
                <div className='grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1'>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Nomor Surat Tugas</Label>
                    <Input
                      placeholder='Contoh: ST/023/ITDA/2027'
                      className='h-8 text-xs'
                      value={nomorSuratTugas}
                      onChange={(e) => setNomorSuratTugas(e.target.value)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Tanggal Mulai</Label>
                    <Input
                      type='date'
                      className='h-8 text-xs'
                      value={tanggalMulai}
                      onChange={(e) => setTanggalMulai(e.target.value)}
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs font-semibold'>Tanggal Selesai</Label>
                    <Input
                      type='date'
                      className='h-8 text-xs'
                      value={tanggalSelesai}
                      onChange={(e) => setTanggalSelesai(e.target.value)}
                    />
                  </div>
                </div>

                {/* Catatan / Keterangan */}
                <div className='space-y-1.5'>
                  <Label className='text-xs font-semibold'>Catatan / Lingkup Penugasan</Label>
                  <Textarea
                    placeholder='Catatan lingkup pengawasan atau pembinaan OPD (misal: Reviu Form 2B & 2C)...'
                    className='text-xs min-h-[60px] resize-none'
                    value={catatan}
                    onChange={(e) => setCatatan(e.target.value)}
                  />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className='px-6 py-3 border-t bg-muted/20 shrink-0 gap-2 sm:gap-0'>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handleCloseForm}
                disabled={isSaving}
                className='text-xs'
              >
                Batal
              </Button>
              <Button
                type='submit'
                size='sm'
                disabled={isSaving || selectedOpdIds.length === 0}
                className='text-xs'
              >
                {isSaving ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin mr-1.5' />
                    Menyimpan...
                  </>
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
              <strong>{selectedAssignment.opd?.nama}</strong>? Auditor tidak akan
              dapat melakukan approval form untuk OPD ini lagi.
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
