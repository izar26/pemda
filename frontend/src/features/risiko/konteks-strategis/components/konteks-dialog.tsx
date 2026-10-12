import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Loader2,
  Sparkles,
  Target,
  Wand2,
} from 'lucide-react'
import { opdService } from '@/services/opd-service'
import { masterDataService } from '@/services/master-data-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import type { KonteksPenilaianFormData, KonteksPenilaianItem } from '@/types/risiko'
import type { IndikatorPenilaianItem } from '@/types/perencanaan'
import { useAuthStore } from '@/stores/auth-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/searchable-select'

const konteksFormSchema = z.object({
  opd_id: z.string().min(1, 'Perangkat Daerah (OPD) wajib dipilih.'),
  sumber_data_id: z.string().optional(),
  tujuan_penilaian_id: z.string().min(1, 'Tujuan strategis Renstra wajib dipilih (hanya 1 tujuan).'),
  sasaran_ids: z
    .array(z.string())
    .min(1, 'Minimal pilih 1 sasaran strategis yang akan dinilai risikonya.'),
  indikator_ids: z
    .array(z.string())
    .min(1, 'Minimal pilih 1 IKU / indikator Renstra yang akan dinilai risikonya.'),
  informasi_lain: z.string().max(5000).optional(),
  nama_pemda: z.string().max(150).optional(),
  nama_kepala: z.string().max(150).optional(),
  nip_kepala: z.string().max(50).optional(),
  jabatan_kepala: z.string().max(150).optional(),
  tanggal_penetapan: z.string().optional(),
  status: z.enum(['draft', 'final']),
})

type KonteksFormValues = z.infer<typeof konteksFormSchema>

interface KonteksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentKonteks?: KonteksPenilaianItem | null
  defaultOpdId?: string
  onSuccess: () => void
}

export function KonteksDialog({
  open,
  onOpenChange,
  currentKonteks,
  defaultOpdId,
  onSuccess,
}: KonteksDialogProps) {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const user = useAuthStore((s) => s.auth.user)
  const isSuperadminOrAdminOffice =
    user?.role === 'Superadmin' ||
    user?.roles?.some(
      (r: { name: string } | string) =>
        (typeof r === 'string' ? r : r.name) === 'Superadmin' ||
        (typeof r === 'string' ? r : r.name) === 'Admin Office'
    )

  const form = useForm<KonteksFormValues>({
    resolver: zodResolver(konteksFormSchema),
    defaultValues: {
      opd_id: defaultOpdId || (user?.opd_id ? String(user.opd_id) : ''),
      sumber_data_id: '',
      tujuan_penilaian_id: '',
      sasaran_ids: [],
      indikator_ids: [],
      informasi_lain: '-',
      nama_pemda: 'Pemerintah Kabupaten Cianjur',
      nama_kepala: '',
      nip_kepala: '',
      jabatan_kepala: '',
      tanggal_penetapan: new Date().toISOString().slice(0, 10),
      status: 'final',
    },
  })

  const watchedOpdId = form.watch('opd_id')
  const watchedTujuanId = form.watch('tujuan_penilaian_id')
  const watchedSasaranIds = form.watch('sasaran_ids') || []
  const watchedIndikatorIds = form.watch('indikator_ids') || []

  // 1. Fetch OPDs (for admin dropdown)
  const { data: opdList = [], isLoading: isLoadingOpd } = useQuery({
    queryKey: ['opds', 'all-for-konteks-dialog'],
    queryFn: () => opdService.getOpds({ all: true }),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(isSuperadminOrAdminOffice),
  })

  // 2. Fetch Sumber Data from Master
  const { data: sumberDataRes } = useQuery({
    queryKey: ['master-sumber-data', 'all'],
    queryFn: () => masterDataService.getItems('sumber-data'),
    staleTime: 5 * 60 * 1000,
  })
  const sumberDataList = sumberDataRes?.data || []

  // 3. Fetch Tujuans for selected OPD
  const { data: tujuanData, isLoading: isLoadingTujuan } = useQuery({
    queryKey: ['tujuan', 'for-konteks', watchedOpdId],
    queryFn: () => perencanaanService.getPaginatedTujuan({ opd_id: watchedOpdId, all: true }),
    enabled: Boolean(watchedOpdId),
    staleTime: 30 * 1000,
  })
  const tujuans = useMemo(() => tujuanData?.data || [], [tujuanData?.data])

  // 4. Fetch Sasarans for selected OPD
  const { data: sasaranData, isLoading: isLoadingSasaran } = useQuery({
    queryKey: ['sasaran', 'for-konteks', watchedOpdId],
    queryFn: () => perencanaanService.getPaginatedSasaran({ opd_id: watchedOpdId, all: true }),
    enabled: Boolean(watchedOpdId),
    staleTime: 30 * 1000,
  })
  const allSasarans = useMemo(() => sasaranData?.data || [], [sasaranData?.data])

  // Filter Sasarans that strictly belong to watchedTujuanId
  const availableSasarans = useMemo(() => {
    if (!watchedTujuanId) return []
    return allSasarans.filter((s) => s.tujuan_penilaian_id === watchedTujuanId)
  }, [allSasarans, watchedTujuanId])

  // 5. Fetch Indikators for selected OPD
  const { data: indikatorData, isLoading: isLoadingIndikator } = useQuery({
    queryKey: ['indikator', 'for-konteks', watchedOpdId],
    queryFn: () => perencanaanService.getPaginatedIndikator({ opd_id: watchedOpdId, all: true }),
    enabled: Boolean(watchedOpdId),
    staleTime: 30 * 1000,
  })
  const indikatorList = useMemo(() => indikatorData?.data || [], [indikatorData?.data])

  // Selected Tujuan Object
  const selectedTujuanObj = useMemo(() => {
    return tujuans.find((t) => t.id === watchedTujuanId)
  }, [tujuans, watchedTujuanId])

  // Selected OPD Object
  const selectedOpdObj = useMemo(() => {
    return opdList.find((o) => String(o.id) === watchedOpdId) || (user?.opd_id ? user?.opd : undefined)
  }, [opdList, watchedOpdId, user])

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep(1)
      if (currentKonteks) {
        form.reset({
          opd_id: currentKonteks.opd_id,
          sumber_data_id: currentKonteks.sumber_data_id || '',
          tujuan_penilaian_id: currentKonteks.tujuan_penilaian_id,
          sasaran_ids: currentKonteks.sasarans?.map((s) => s.id) || [],
          indikator_ids: currentKonteks.indikators?.map((i) => i.id) || [],
          informasi_lain: currentKonteks.informasi_lain || '-',
          nama_pemda: currentKonteks.nama_pemda || 'Pemerintah Kabupaten Cianjur',
          nama_kepala: currentKonteks.nama_kepala || '',
          nip_kepala: currentKonteks.nip_kepala || '',
          jabatan_kepala: currentKonteks.jabatan_kepala || '',
          tanggal_penetapan: currentKonteks.tanggal_penetapan || new Date().toISOString().slice(0, 10),
          status: currentKonteks.status || 'final',
        })
      } else {
        const resolvedOpdId = defaultOpdId || (user?.opd_id ? String(user.opd_id) : '')
        form.reset({
          opd_id: resolvedOpdId,
          sumber_data_id: sumberDataList[0]?.id ? String(sumberDataList[0].id) : '',
          tujuan_penilaian_id: '',
          sasaran_ids: [],
          indikator_ids: [],
          informasi_lain: '-',
          nama_pemda: 'Pemerintah Kabupaten Cianjur',
          nama_kepala: selectedOpdObj?.kepala || '',
          nip_kepala: '',
          jabatan_kepala: selectedOpdObj ? `Kepala ${selectedOpdObj.nama}` : '',
          tanggal_penetapan: new Date().toISOString().slice(0, 10),
          status: 'final',
        })
      }
    }
  }, [open, currentKonteks, defaultOpdId, user, form, sumberDataList, selectedOpdObj])

  // Cascading cleanup when tujuan changes
  function handleTujuanChange(newTujuanId: string) {
    form.setValue('tujuan_penilaian_id', newTujuanId)
    // Filter out previously checked sasarans that don't belong to this tujuan
    const validSasaranIds = allSasarans
      .filter((s) => s.tujuan_penilaian_id === newTujuanId && watchedSasaranIds.includes(s.id))
      .map((s) => s.id)
    form.setValue('sasaran_ids', validSasaranIds)

    // Filter out previously checked indikators that don't belong to valid sasarans
    const validIndikatorIds = indikatorList
      .filter((i: IndikatorPenilaianItem) => validSasaranIds.includes(i.sasaran_penilaian_id) && watchedIndikatorIds.includes(i.id))
      .map((i: IndikatorPenilaianItem) => i.id)
    form.setValue('indikator_ids', validIndikatorIds)
  }

  // Toggle Sasaran selection (Multi-select)
  function toggleSasaran(sasaranId: string, checked: boolean) {
    const nextSasaranIds = checked
      ? [...watchedSasaranIds, sasaranId]
      : watchedSasaranIds.filter((id) => id !== sasaranId)

    form.setValue('sasaran_ids', nextSasaranIds)

    // If a sasaran is checked, automatically select all its child indicators by default
    if (checked) {
      const childInds = indikatorList.filter((i: IndikatorPenilaianItem) => i.sasaran_penilaian_id === sasaranId)
      const childIds = childInds.map((i: IndikatorPenilaianItem) => i.id)
      const combined = Array.from(new Set([...watchedIndikatorIds, ...childIds]))
      form.setValue('indikator_ids', combined)
    } else {
      // If unchecked, remove its child indicators
      const nextIndikatorIds = watchedIndikatorIds.filter((indId) => {
        const item = indikatorList.find((i: IndikatorPenilaianItem) => i.id === indId)
        return item && item.sasaran_penilaian_id !== sasaranId
      })
      form.setValue('indikator_ids', nextIndikatorIds)
    }
  }

  // Toggle Indikator selection (Multi-select)
  function toggleIndikator(indikatorId: string, checked: boolean) {
    const nextIndikatorIds = checked
      ? [...watchedIndikatorIds, indikatorId]
      : watchedIndikatorIds.filter((id) => id !== indikatorId)

    form.setValue('indikator_ids', nextIndikatorIds)
  }

  // Select all child indicators for a given Sasaran
  function selectAllChildIndicators(sasaranId: string, selectAll: boolean) {
    const childInds = indikatorList.filter((i: IndikatorPenilaianItem) => i.sasaran_penilaian_id === sasaranId)
    const childIds = childInds.map((i: IndikatorPenilaianItem) => i.id)

    if (selectAll) {
      const combined = Array.from(new Set([...watchedIndikatorIds, ...childIds]))
      form.setValue('indikator_ids', combined)
    } else {
      const remaining = watchedIndikatorIds.filter((id) => !childIds.includes(id))
      form.setValue('indikator_ids', remaining)
    }
  }

  // Auto-fill Kepala OPD from current OPD master data
  function handleAutoFillKepala() {
    if (selectedOpdObj) {
      if (selectedOpdObj.kepala) {
        form.setValue('nama_kepala', selectedOpdObj.kepala)
      }
      form.setValue('jabatan_kepala', `Kepala ${selectedOpdObj.nama}`)
      toast.success('Data Kepala OPD berhasil disinkronkan dari profil instansi.')
    }
  }

  // Navigation handlers with step validation
  function handleNextStep() {
    if (currentStep === 1) {
      if (!watchedOpdId) {
        toast.error('Silakan pilih Perangkat Daerah (OPD).')
        return
      }
      if (!watchedTujuanId) {
        toast.error('Silakan pilih 1 Tujuan Strategis fokus penilaian terlebih dahulu.')
        return
      }
      setCurrentStep(2)
    } else if (currentStep === 2) {
      if (watchedSasaranIds.length === 0) {
        toast.error('Pilih minimal 1 Sasaran Strategis yang akan dinilai risikonya.')
        return
      }
      if (watchedIndikatorIds.length === 0) {
        toast.error('Pilih minimal 1 IKU / Indikator Renstra yang akan dinilai risikonya.')
        return
      }
      setCurrentStep(3)
    }
  }

  function handlePrevStep() {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as 1 | 2)
    }
  }

  async function onSubmit(values: KonteksFormValues) {
    setIsSubmitting(true)
    try {
      const payload: KonteksPenilaianFormData = {
        opd_id: values.opd_id,
        sumber_data_id: values.sumber_data_id || undefined,
        tujuan_penilaian_id: values.tujuan_penilaian_id,
        sasaran_ids: values.sasaran_ids,
        indikator_ids: values.indikator_ids,
        informasi_lain: values.informasi_lain?.trim() || '-',
        nama_pemda: values.nama_pemda?.trim() || 'Pemerintah Kabupaten Cianjur',
        nama_kepala: values.nama_kepala?.trim() || undefined,
        nip_kepala: values.nip_kepala?.trim() || undefined,
        jabatan_kepala: values.jabatan_kepala?.trim() || undefined,
        tanggal_penetapan: values.tanggal_penetapan || undefined,
        status: values.status,
      }

      await risikoService.saveKonteks(payload)
      toast.success(
        values.status === 'final'
          ? 'Penetapan Konteks Risiko Strategis OPD (Form 2B) berhasil ditetapkan!'
          : 'Draft Konteks Risiko Strategis OPD (Form 2B) berhasil disimpan.'
      )

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data?.errors) {
        const errors = error.response.data.errors
        Object.keys(errors).forEach((key) => {
          form.setError(key as keyof KonteksFormValues, {
            type: 'manual',
            message: errors[key][0],
          })
        })
        toast.error('Periksa kembali isian Form 2B.')
      } else if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Terjadi kesalahan saat menyimpan formulir Form 2B.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const opdOptions = useMemo(() => {
    return opdList.map((opd) => ({
      value: String(opd.id),
      label: `${opd.nama} (${opd.kode})`,
    }))
  }, [opdList])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-3xl max-h-[92vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <FileSpreadsheet className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {currentKonteks ? 'Ubah Penetapan Konteks Risiko (Form 2B)' : 'Tetapkan Konteks Risiko Strategis OPD (Form 2B)'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                Alur bertahap: Tentukan 1 Tujuan fokus, petakan pohon Sasaran & IKU, serta lengkapi pengesahan.
              </DialogDescription>
            </div>
          </div>

          {/* Stepper Wizard Indicator */}
          <div className='grid grid-cols-3 gap-2 mt-4 pt-3 border-t'>
            <button
              type='button'
              onClick={() => setCurrentStep(1)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                currentStep === 1
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : watchedTujuanId
                    ? 'bg-muted/60 text-foreground hover:bg-muted'
                    : 'bg-muted/30 text-muted-foreground'
              }`}
            >
              <span className='flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]'>
                {watchedTujuanId && currentStep !== 1 ? <Check className='h-3 w-3' /> : '1'}
              </span>
              <span className='truncate'>1. Identitas & Tujuan</span>
            </button>

            <button
              type='button'
              disabled={!watchedTujuanId}
              onClick={() => watchedTujuanId && setCurrentStep(2)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                currentStep === 2
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : watchedSasaranIds.length > 0
                    ? 'bg-muted/60 text-foreground hover:bg-muted'
                    : 'bg-muted/30 text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
            >
              <span className='flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]'>
                {watchedSasaranIds.length > 0 && currentStep !== 2 ? <Check className='h-3 w-3' /> : '2'}
              </span>
              <span className='truncate'>2. Sasaran & IKU</span>
            </button>

            <button
              type='button'
              disabled={watchedSasaranIds.length === 0 || watchedIndikatorIds.length === 0}
              onClick={() => watchedSasaranIds.length > 0 && watchedIndikatorIds.length > 0 && setCurrentStep(3)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all text-left ${
                currentStep === 3
                  ? 'bg-primary text-primary-foreground shadow-xs'
                  : 'bg-muted/30 text-muted-foreground opacity-60 cursor-not-allowed'
              }`}
            >
              <span className='flex h-5 w-5 items-center justify-center rounded-full bg-background/20 text-[10px]'>
                3
              </span>
              <span className='truncate'>3. Pengesahan</span>
            </button>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-5'>
          <Form {...form}>
            <form id='konteks-form-2b' onSubmit={form.handleSubmit(onSubmit)} className='space-y-6'>
              {/* ================= STEP 1: IDENTITAS & TUJUAN FOKUS ================= */}
              {currentStep === 1 && (
                <div className='space-y-6 animate-in fade-in-50 duration-200'>
                  {/* Card 1: Instansi & Sumber Data */}
                  <div className='rounded-xl border p-4 bg-card space-y-4 shadow-2xs'>
                    <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                      <Building2 className='h-3.5 w-3.5 text-primary' />
                      Identitas Instansi & Sumber Data
                    </h4>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      {/* OPD Selector */}
                      <FormField
                        control={form.control}
                        name='opd_id'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              Perangkat Daerah (OPD) <span className='text-destructive'>*</span>
                            </FormLabel>
                            <FormControl>
                              {isSuperadminOrAdminOffice ? (
                                <SearchableSelect
                                  options={opdOptions}
                                  value={field.value}
                                  onValueChange={(val) => {
                                    field.onChange(val)
                                    form.setValue('tujuan_penilaian_id', '')
                                    form.setValue('sasaran_ids', [])
                                    form.setValue('indikator_ids', [])
                                  }}
                                  placeholder='Pilih instansi perangkat daerah...'
                                  searchPlaceholder='Cari nama/kode OPD...'
                                  emptyMessage='Perangkat daerah tidak ditemukan.'
                                  disabled={isSubmitting || isLoadingOpd}
                                />
                              ) : (
                                <Input
                                  value={user?.opd?.nama || 'Perangkat Daerah'}
                                  readOnly
                                  disabled
                                  className='bg-muted/50 cursor-not-allowed font-medium text-xs'
                                />
                              )}
                            </FormControl>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />

                      {/* Sumber Data Dropdown */}
                      <FormField
                        control={form.control}
                        name='sumber_data_id'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              Sumber Data Renstra
                            </FormLabel>
                            <Select
                              value={field.value || ''}
                              onValueChange={field.onChange}
                              disabled={isSubmitting}
                            >
                              <FormControl>
                                <SelectTrigger className='w-full text-xs'>
                                  <SelectValue placeholder='Pilih sumber data...' />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {sumberDataList.map((item) => (
                                  <SelectItem key={item.id} value={String(item.id)} className='text-xs'>
                                    {item.nama}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Card 2: Pemilihan 1 Tujuan Strategis */}
                  <div className='rounded-xl border p-4 bg-card space-y-3 shadow-2xs'>
                    <div className='flex items-center justify-between'>
                      <div>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                          <Target className='h-3.5 w-3.5 text-primary' />
                          Pilih 1 Tujuan Strategis Fokus Penilaian
                          <span className='text-destructive'>*</span>
                        </h4>
                        <p className='text-[11px] text-muted-foreground mt-0.5'>
                          Sesuai ketentuan Form 2B, pilih tepat 1 tujuan Renstra OPD yang menjadi fokus kajian risiko tahun berjalan.
                        </p>
                      </div>
                      <Badge variant='outline' className='text-[10px] bg-primary/10 text-primary border-primary/20 shrink-0'>
                        Hanya Boleh 1
                      </Badge>
                    </div>

                    {isLoadingTujuan ? (
                      <div className='p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin text-primary' />
                        Memuat tujuan strategis OPD...
                      </div>
                    ) : tujuans.length > 0 ? (
                      <RadioGroup
                        value={watchedTujuanId}
                        onValueChange={handleTujuanChange}
                        className='space-y-2 pt-1'
                      >
                        {tujuans.map((t) => {
                          const isSelected = watchedTujuanId === t.id
                          return (
                            <Label
                              key={t.id}
                              htmlFor={`tujuan-${t.id}`}
                              className={`flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                isSelected
                                  ? 'bg-primary/5 border-primary shadow-xs'
                                  : 'bg-background hover:bg-muted/40 border-muted'
                              }`}
                            >
                              <RadioGroupItem
                                id={`tujuan-${t.id}`}
                                value={t.id}
                                className='mt-1 text-primary border-primary'
                              />
                              <div className='flex-1 min-w-0'>
                                <div className='flex items-center gap-2 flex-wrap mb-1'>
                                  {t.kode_tujuan && (
                                    <Badge variant='outline' className='font-mono text-[10px] px-1.5 py-0 bg-background'>
                                      {t.kode_tujuan}
                                    </Badge>
                                  )}
                                  {isSelected && (
                                    <Badge variant='default' className='text-[9px] px-1.5 py-0'>
                                      Fokus Terpilih
                                    </Badge>
                                  )}
                                </div>
                                <p className='text-xs font-semibold text-foreground leading-snug'>
                                  {t.tujuan}
                                </p>
                              </div>
                            </Label>
                          )
                        })}
                      </RadioGroup>
                    ) : (
                      <div className='p-6 text-center rounded-xl border border-dashed text-xs text-muted-foreground'>
                        Belum ada tujuan strategis untuk OPD ini pada periode aktif berjalan. (Silakan input terlebih dahulu di menu Perencanaan Kinerja &gt; Tujuan Renstra).
                      </div>
                    )}
                    {form.formState.errors.tujuan_penilaian_id && (
                      <p className='text-xs font-medium text-destructive'>
                        {form.formState.errors.tujuan_penilaian_id.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 2: POHON SASARAN & IKU RENSTRA (TREE SELECTOR) ================= */}
              {currentStep === 2 && (
                <div className='space-y-6 animate-in fade-in-50 duration-200'>
                  {/* Context Header: Tujuan Fokus */}
                  <div className='rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-start gap-3'>
                    <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground text-xs font-bold'>
                      1
                    </div>
                    <div className='flex-1 min-w-0'>
                      <div className='flex items-center gap-2 flex-wrap mb-0.5'>
                        <span className='text-[10px] font-bold uppercase tracking-wider text-primary'>
                          Tujuan Strategis Fokus Penilaian:
                        </span>
                        {selectedTujuanObj?.kode_tujuan && (
                          <Badge variant='outline' className='font-mono text-[10px] px-1.5 py-0'>
                            {selectedTujuanObj.kode_tujuan}
                          </Badge>
                        )}
                      </div>
                      <p className='text-xs font-semibold text-foreground leading-relaxed'>
                        {selectedTujuanObj?.tujuan || '-'}
                      </p>
                    </div>
                  </div>

                  {/* Hierarchical Sasaran & IKU Tree Selection */}
                  <div className='space-y-3'>
                    <div className='flex items-center justify-between flex-wrap gap-2'>
                      <div>
                        <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                          <CheckCircle2 className='h-3.5 w-3.5 text-primary' />
                          Pemetaan Sasaran & IKU Terpadu (Hierarki Renstra)
                          <span className='text-destructive'>*</span>
                        </h4>
                        <p className='text-[11px] text-muted-foreground mt-0.5'>
                          Centang Sasaran yang akan dinilai. IKU di bawah sasaran terpilih akan otomatis tampil untuk dicentang.
                        </p>
                      </div>
                      <Badge variant='secondary' className='text-[11px] font-semibold'>
                        {watchedSasaranIds.length} Sasaran • {watchedIndikatorIds.length} IKU Terpilih
                      </Badge>
                    </div>

                    {isLoadingSasaran || isLoadingIndikator ? (
                      <div className='p-8 text-center text-xs text-muted-foreground flex items-center justify-center gap-2'>
                        <Loader2 className='h-4 w-4 animate-spin text-primary' />
                        Memuat data Sasaran & IKU Renstra...
                      </div>
                    ) : availableSasarans.length > 0 ? (
                      <div className='space-y-4 pt-1'>
                        {availableSasarans.map((sas, sIdx) => {
                          const isSasaranChecked = watchedSasaranIds.includes(sas.id)
                          // Children indicators
                          const childInds = indikatorList.filter(
                            (i: IndikatorPenilaianItem) => i.sasaran_penilaian_id === sas.id
                          )
                          const selectedChildCount = childInds.filter((i: IndikatorPenilaianItem) =>
                            watchedIndikatorIds.includes(i.id)
                          ).length

                          return (
                            <div
                              key={sas.id}
                              className={`rounded-xl border transition-all ${
                                isSasaranChecked
                                  ? 'border-primary/40 bg-card shadow-2xs'
                                  : 'border-muted bg-background/50 opacity-90 hover:opacity-100'
                              }`}
                            >
                              {/* Sasaran Header Row */}
                              <div className='flex items-start gap-3 p-3.5'>
                                <Checkbox
                                  id={`sasaran-${sas.id}`}
                                  checked={isSasaranChecked}
                                  onCheckedChange={(checked) => toggleSasaran(sas.id, Boolean(checked))}
                                  className='mt-1'
                                />
                                <Label
                                  htmlFor={`sasaran-${sas.id}`}
                                  className='flex-1 cursor-pointer min-w-0'
                                >
                                  <div className='flex items-center gap-2 flex-wrap mb-1'>
                                    <span className='inline-flex h-5 w-5 items-center justify-center rounded-full bg-muted text-muted-foreground text-[10px] font-bold'>
                                      {sIdx + 1}
                                    </span>
                                    {sas.kode_sasaran && (
                                      <Badge variant='outline' className='text-[10px] px-1.5 py-0 font-mono'>
                                        {sas.kode_sasaran}
                                      </Badge>
                                    )}
                                    <Badge variant='outline' className='text-[10px] px-1.5 py-0'>
                                      {childInds.length} IKU/Indikator
                                    </Badge>
                                    {isSasaranChecked && (
                                      <Badge variant='default' className='text-[9px] px-1.5 py-0'>
                                        {selectedChildCount} Terpilih
                                      </Badge>
                                    )}
                                  </div>
                                  <p className='text-xs font-semibold text-foreground leading-snug'>
                                    {sas.sasaran}
                                  </p>
                                </Label>
                              </div>

                              {/* Nested Children (IKU / Indikator) Container */}
                              {isSasaranChecked && (
                                <div className='ml-6 md:ml-9 mr-3.5 mb-3.5 pl-4 border-l-2 border-dashed border-primary/30 space-y-2 pt-1'>
                                  <div className='flex items-center justify-between text-[11px] pb-1 border-b border-border/50'>
                                    <span className='font-semibold text-muted-foreground flex items-center gap-1'>
                                      <Sparkles className='h-3 w-3 text-primary' />
                                      Pilih IKU / Indikator Terkait:
                                    </span>
                                    <div className='flex items-center gap-2'>
                                      <button
                                        type='button'
                                        onClick={() => selectAllChildIndicators(sas.id, true)}
                                        className='text-[10px] text-primary hover:underline font-medium'
                                      >
                                        Pilih Semua
                                      </button>
                                      <span className='text-muted-foreground'>•</span>
                                      <button
                                        type='button'
                                        onClick={() => selectAllChildIndicators(sas.id, false)}
                                        className='text-[10px] text-muted-foreground hover:underline'
                                      >
                                        Batal Semua
                                      </button>
                                    </div>
                                  </div>

                                  {childInds.length > 0 ? (
                                    childInds.map((ind: IndikatorPenilaianItem) => {
                                      const isIndChecked = watchedIndikatorIds.includes(ind.id)
                                      const isIku = ind.jenis === 'IKU'

                                      return (
                                        <Label
                                          key={ind.id}
                                          htmlFor={`indikator-${ind.id}`}
                                          className={`flex items-start gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                                            isIndChecked
                                              ? 'bg-primary/5 border-primary/30'
                                              : 'bg-background hover:bg-muted/40 border-muted'
                                          }`}
                                        >
                                          <Checkbox
                                            id={`indikator-${ind.id}`}
                                            checked={isIndChecked}
                                            onCheckedChange={(checked) => toggleIndikator(ind.id, Boolean(checked))}
                                            className='mt-0.5'
                                          />
                                          <div className='flex-1 min-w-0'>
                                            <div className='flex items-center gap-1.5 flex-wrap mb-0.5'>
                                              <Badge
                                                variant={isIku ? 'default' : 'secondary'}
                                                className='text-[9px] px-1.5 py-0 font-medium'
                                              >
                                                {isIku ? 'IKU Utama' : 'Indikator Biasa'}
                                              </Badge>
                                              {ind.kode_indikator && (
                                                <Badge variant='outline' className='font-mono text-[9px] px-1.5 py-0'>
                                                  {ind.kode_indikator}
                                                </Badge>
                                              )}
                                            </div>
                                            <p className='text-xs font-medium text-foreground leading-snug'>
                                              {ind.indikator}
                                            </p>
                                          </div>
                                        </Label>
                                      )
                                    })
                                  ) : (
                                    <div className='p-3 rounded-lg border border-dashed text-[11px] text-muted-foreground italic bg-muted/20'>
                                      Tidak ada data indikator / IKU pada sasaran ini di master Perencanaan.
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <div className='p-6 text-center rounded-xl border border-dashed text-xs text-muted-foreground'>
                        Belum ada sasaran strategis yang terhubung dengan tujuan terpilih.
                      </div>
                    )}

                    {form.formState.errors.sasaran_ids && (
                      <p className='text-xs font-medium text-destructive'>
                        {form.formState.errors.sasaran_ids.message}
                      </p>
                    )}
                    {form.formState.errors.indikator_ids && (
                      <p className='text-xs font-medium text-destructive'>
                        {form.formState.errors.indikator_ids.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* ================= STEP 3: PENGESAHAN & FINALISASI ================= */}
              {currentStep === 3 && (
                <div className='space-y-6 animate-in fade-in-50 duration-200'>
                  {/* Summary Box */}
                  <div className='rounded-xl border bg-muted/20 p-4 text-xs space-y-1.5'>
                    <div className='flex items-center justify-between'>
                      <span className='font-bold text-foreground'>Ringkasan Ruang Lingkup Form 2B:</span>
                      <Badge variant='default' className='text-[10px]'>
                        Siap Ditetapkan
                      </Badge>
                    </div>
                    <p className='text-muted-foreground'>
                      • <strong>Tujuan:</strong> {selectedTujuanObj?.tujuan}
                    </p>
                    <p className='text-muted-foreground'>
                      • <strong>Cakupan:</strong> {watchedSasaranIds.length} Sasaran Strategis & {watchedIndikatorIds.length} IKU Renstra terpilih.
                    </p>
                  </div>

                  {/* Informasi Lain Textarea */}
                  <div className='rounded-xl border p-4 bg-card space-y-3 shadow-2xs'>
                    <FormField
                      control={form.control}
                      name='informasi_lain'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-semibold'>
                            Informasi Lain / Isu Strategis Lingkungan Risiko
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder='Contoh: Isu strategis keterbatasan anggaran pemeliharaan, kondisi geografis, perubahan regulasi nasional...'
                              className='min-h-[85px] text-xs'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormDescription className='text-[11px]'>
                            Catatan atau pertimbangan lingkungan strategis OPD dalam penetapan risiko.
                          </FormDescription>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Lembar Pengesahan */}
                  <div className='rounded-xl border p-4 bg-card space-y-4 shadow-2xs'>
                    <div className='flex items-center justify-between flex-wrap gap-2'>
                      <h4 className='text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2'>
                        <FileText className='h-3.5 w-3.5 text-primary' />
                        Lembar Pengesahan Kepala OPD
                      </h4>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleAutoFillKepala}
                        className='h-7 text-xs gap-1.5'
                      >
                        <Wand2 className='h-3 w-3 text-primary' />
                        <span>Isi Cepat dari Profil OPD</span>
                      </Button>
                    </div>

                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                      <FormField
                        control={form.control}
                        name='nama_kepala'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              Nama Kepala Dinas / Pimpinan OPD
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder='Contoh: ERI RIHANDIAR, S.T., M.T.'
                                className='text-xs'
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='nip_kepala'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              NIP Kepala Dinas
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder='Contoh: 19680801 199703 1 005'
                                className='text-xs font-mono'
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='jabatan_kepala'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              Jabatan Penandatangan
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder='Contoh: Kepala Dinas Pekerjaan Umum dan Tata Ruang'
                                className='text-xs'
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name='tanggal_penetapan'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='text-xs font-semibold'>
                              Tanggal Penetapan Form 2B
                            </FormLabel>
                            <FormControl>
                              <Input
                                type='date'
                                className='text-xs'
                                disabled={isSubmitting}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className='text-xs' />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Status Switch */}
                    <FormField
                      control={form.control}
                      name='status'
                      render={({ field }) => (
                        <FormItem className='pt-2 border-t'>
                          <FormLabel className='text-xs font-semibold'>
                            Status Dokumen Penetapan
                          </FormLabel>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isSubmitting}
                          >
                            <FormControl>
                              <SelectTrigger className='w-full text-xs'>
                                <SelectValue placeholder='Pilih status...' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value='final' className='text-xs font-medium'>
                                Final (Telah Ditetapkan Pimpinan & Siap Masuk ke Form 2C)
                              </SelectItem>
                              <SelectItem value='draft' className='text-xs'>
                                Draft (Konsep Sementara / Belum Ditetapkan)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}
            </form>
          </Form>
        </div>

        {/* Pinned Footer with Navigation Controls */}
        <DialogFooter className='px-6 py-4 border-t bg-muted/10 shrink-0 flex items-center justify-between sm:justify-between gap-2'>
          <div>
            {currentStep > 1 && (
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={handlePrevStep}
                disabled={isSubmitting}
                className='text-xs gap-1.5'
              >
                <ArrowLeft className='h-3.5 w-3.5' />
                <span>Kembali</span>
              </Button>
            )}
          </div>

          <div className='flex items-center gap-2'>
            <Button
              type='button'
              variant='ghost'
              size='sm'
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className='text-xs'
            >
              Batal
            </Button>

            {currentStep < 3 ? (
              <Button
                type='button'
                size='sm'
                onClick={handleNextStep}
                className='text-xs gap-1.5'
              >
                <span>Selanjutnya</span>
                <ArrowRight className='h-3.5 w-3.5' />
              </Button>
            ) : (
              <Button
                type='submit'
                form='konteks-form-2b'
                size='sm'
                disabled={isSubmitting}
                className='text-xs gap-1.5 min-w-[140px]'
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className='h-3.5 w-3.5 animate-spin' />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className='h-3.5 w-3.5' />
                    <span>Simpan & Tetapkan Konteks (Form 2B)</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
