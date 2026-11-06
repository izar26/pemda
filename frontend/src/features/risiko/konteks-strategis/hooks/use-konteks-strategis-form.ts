import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { masterDataService } from '@/services/master-data-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import type { KonteksPenilaianFormData } from '@/types/risiko'
import { form2BSchema, type Form2BValues } from '../schema'

interface UseKonteksStrategisFormParams {
  effectiveOpdId: string
  activePeriodeId?: string
  konteks2B: {
    id?: string
    sumber_data_id?: string | null
    tujuan_penilaian_id?: string | null
    sasarans?: Array<{ id: string }>
    indikators?: Array<{ id: string }>
    informasi_lain?: string | null
  } | null | undefined
  opdMeta?: {
    operasional_summary?: {
      total_items?: number
      programs_count?: number
      kegiatans_count?: number
      sub_kegiatans_count?: number
    }
  } | null
  refetchWizardProgress: () => Promise<unknown>
}

export function useKonteksStrategisForm({
  effectiveOpdId,
  activePeriodeId,
  konteks2B,
  opdMeta,
  refetchWizardProgress,
}: UseKonteksStrategisFormParams) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitIntent, setSubmitIntent] = useState<'save' | 'save_and_next'>('save')

  // Crucial Change Impact Confirmation Modal State
  const [pendingCrucialPayload, setPendingCrucialPayload] = useState<{
    values: Form2BValues
    intent: 'save' | 'save_and_next'
    changedSumberData: boolean
    changedTujuan: boolean
  } | null>(null)
  const [impactMode, setImpactMode] = useState<'keep' | 'reset'>('keep')

  const form = useForm<Form2BValues>({
    resolver: zodResolver(form2BSchema),
    defaultValues: {
      sumber_data_id: '',
      tujuan_penilaian_id: '',
      sasaran_ids: [],
      indikator_ids: [],
      informasi_lain: '-',
    },
  })

  const watchedSumberDataId = form.watch('sumber_data_id')
  const watchedTujuanId = form.watch('tujuan_penilaian_id')
  const watchedSasaranIds = form.watch('sasaran_ids')
  const watchedIndikatorIds = form.watch('indikator_ids')

  // Populate form when konteks2B or effectiveOpdId changes
  useEffect(() => {
    if (konteks2B) {
      form.reset({
        sumber_data_id: konteks2B.sumber_data_id || '',
        tujuan_penilaian_id: konteks2B.tujuan_penilaian_id || '',
        sasaran_ids: konteks2B.sasarans?.map((s) => s.id) || [],
        indikator_ids: konteks2B.indikators?.map((i) => i.id) || [],
        informasi_lain: konteks2B.informasi_lain || '-',
      })
    } else {
      form.reset({
        sumber_data_id: '',
        tujuan_penilaian_id: '',
        sasaran_ids: [],
        indikator_ids: [],
        informasi_lain: '-',
      })
    }
  }, [konteks2B, effectiveOpdId, form])

  // 1. Fetch Master Sumber Data
  const { data: sumberDataResponse, isLoading: isLoadingSumberData } = useQuery({
    queryKey: ['master-sumber-data-active'],
    queryFn: () =>
      masterDataService.getItems('sumber-data', { is_active: true, per_page: 100 }),
  })
  const sumberDataList = sumberDataResponse?.data || []

  // Auto-select standard default Sumber Data (Renstra SKPD) if field is empty
  useEffect(() => {
    if (sumberDataList.length > 0 && !form.getValues('sumber_data_id') && !konteks2B?.sumber_data_id) {
      const renstra = sumberDataList.find((sd) => sd.nama.toLowerCase().includes('renstra'))
      const defaultId = renstra?.id || sumberDataList[0]?.id
      if (defaultId) {
        form.setValue('sumber_data_id', defaultId, { shouldValidate: true })
      }
    }
  }, [sumberDataList, konteks2B?.sumber_data_id, form])

  // 2. Fetch Tujuan Strategis for OPD + Active Periode (filtered by Selected Sumber Data with fallback)
  const { data: tujuanResponse, isLoading: isLoadingTujuan } = useQuery({
    queryKey: [
      'wizard-2b-tujuan',
      effectiveOpdId,
      activePeriodeId,
      watchedSumberDataId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedTujuan({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriodeId,
        sumber_data_id: watchedSumberDataId || undefined,
        all: true,
      }),
    enabled: Boolean(effectiveOpdId) && Boolean(activePeriodeId),
  })
  const tujuanList = tujuanResponse?.data || []

  // 3. Fetch Sasaran Strategis dynamically based on selected Tujuan Strategis
  const { data: sasaranResponse, isLoading: isLoadingSasaran } = useQuery({
    queryKey: [
      'wizard-2b-sasaran',
      effectiveOpdId,
      activePeriodeId,
      watchedTujuanId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedSasaran({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriodeId,
        tujuan_penilaian_id: watchedTujuanId,
        all: true,
      }),
    enabled: Boolean(effectiveOpdId) && Boolean(watchedTujuanId),
  })
  const sasaranList = sasaranResponse?.data || []

  // 4. Fetch IKU / Indikator Renstra dynamically for the OPD & Tujuan, filtered by selected Sasarans
  const { data: indikatorResponse, isLoading: isLoadingIndikator } = useQuery({
    queryKey: [
      'wizard-2b-indikator',
      effectiveOpdId,
      activePeriodeId,
      watchedTujuanId,
    ],
    queryFn: () =>
      perencanaanService.getPaginatedIndikator({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriodeId,
        tujuan_penilaian_id: watchedTujuanId,
        all: true,
      }),
    enabled: Boolean(effectiveOpdId) && Boolean(watchedTujuanId),
  })

  const availableIndikators = useMemo(() => {
    const allInds = indikatorResponse?.data || []
    if (!watchedSasaranIds || watchedSasaranIds.length === 0) return []
    return allInds.filter((ind) =>
      watchedSasaranIds.includes(ind.sasaran_penilaian_id)
    )
  }, [indikatorResponse?.data, watchedSasaranIds])

  // Keep selected indikator_ids consistent when sasaran_ids changes
  useEffect(() => {
    if (!indikatorResponse?.data) return
    const validIds = new Set(availableIndikators.map((i) => i.id))
    const currentSelected = form.getValues('indikator_ids')
    const filtered = currentSelected.filter((id) => validIds.has(id))
    if (filtered.length !== currentSelected.length) {
      form.setValue('indikator_ids', filtered, { shouldValidate: true })
    }
  }, [availableIndikators, indikatorResponse?.data, form])

  // Handlers for cascading resets
  function handleSumberDataChange(newSumberDataId: string) {
    const prevSumberDataId = form.getValues('sumber_data_id')
    form.setValue('sumber_data_id', newSumberDataId, { shouldValidate: true })
    if (prevSumberDataId && prevSumberDataId !== newSumberDataId) {
      form.setValue('tujuan_penilaian_id', '')
      form.setValue('sasaran_ids', [])
      form.setValue('indikator_ids', [])
    }
  }

  function handleTujuanChange(newTujuanId: string) {
    const prevTujuanId = form.getValues('tujuan_penilaian_id')
    form.setValue('tujuan_penilaian_id', newTujuanId, { shouldValidate: true })
    if (prevTujuanId !== newTujuanId) {
      form.setValue('sasaran_ids', [])
      form.setValue('indikator_ids', [])
    }
  }

  function toggleSasaran(sasaranId: string, checked: boolean) {
    const current = form.getValues('sasaran_ids')
    const next = checked
      ? Array.from(new Set([...current, sasaranId]))
      : current.filter((id) => id !== sasaranId)
    form.setValue('sasaran_ids', next, { shouldValidate: true })
  }

  function toggleAllSasaran() {
    if (watchedSasaranIds.length === sasaranList.length) {
      form.setValue('sasaran_ids', [], { shouldValidate: true })
    } else {
      form.setValue(
        'sasaran_ids',
        sasaranList.map((s) => s.id),
        { shouldValidate: true }
      )
    }
  }

  function toggleIndikator(indikatorId: string, checked: boolean) {
    const current = form.getValues('indikator_ids')
    const next = checked
      ? Array.from(new Set([...current, indikatorId]))
      : current.filter((id) => id !== indikatorId)
    form.setValue('indikator_ids', next, { shouldValidate: true })
  }

  function toggleAllIndikators() {
    if (watchedIndikatorIds.length === availableIndikators.length) {
      form.setValue('indikator_ids', [], { shouldValidate: true })
    } else {
      form.setValue(
        'indikator_ids',
        availableIndikators.map((i) => i.id),
        { shouldValidate: true }
      )
    }
  }

  // Handle form submission with Crucial Change Impact check
  async function handleFormSubmit(values: Form2BValues) {
    if (!effectiveOpdId || !activePeriodeId) return

    const hasExisting2CItems =
      (opdMeta?.operasional_summary?.total_items || 0) > 0
    const changedSumberData = Boolean(
      konteks2B?.id &&
        konteks2B.sumber_data_id &&
        konteks2B.sumber_data_id !== values.sumber_data_id
    )
    const changedTujuan = Boolean(
      konteks2B?.id &&
        konteks2B.tujuan_penilaian_id &&
        konteks2B.tujuan_penilaian_id !== values.tujuan_penilaian_id
    )

    if (hasExisting2CItems && (changedSumberData || changedTujuan)) {
      setImpactMode('keep')
      setPendingCrucialPayload({
        values,
        intent: submitIntent,
        changedSumberData,
        changedTujuan,
      })
      return
    }

    await executeSave(values, submitIntent, false)
  }

  async function executeSave(
    values: Form2BValues,
    intent: 'save' | 'save_and_next',
    resetOperasionalItems: boolean
  ) {
    if (!effectiveOpdId || !activePeriodeId) return
    setIsSubmitting(true)
    try {
      const payload: KonteksPenilaianFormData = {
        periode_penilaian_id: activePeriodeId,
        opd_id: effectiveOpdId,
        sumber_data_id: values.sumber_data_id,
        tujuan_penilaian_id: values.tujuan_penilaian_id,
        sasaran_ids: values.sasaran_ids,
        indikator_ids: values.indikator_ids,
        informasi_lain: values.informasi_lain?.trim() || '-',
        status: 'final',
        reset_operasional_items: resetOperasionalItems,
      }

      if (konteks2B?.id) {
        await risikoService.updateKonteks(konteks2B.id, payload)
      } else {
        await risikoService.saveKonteks(payload)
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['risiko-konteks-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-operasional-current'] }),
        queryClient.invalidateQueries({ queryKey: ['risiko-pengajuan-readiness'] }),
        queryClient.invalidateQueries({ queryKey: ['pengawasan'] }),
      ])
      await refetchWizardProgress()

      setPendingCrucialPayload(null)

      if (intent === 'save_and_next') {
        toast.success(
          'Langkah 1 (Form 2B) berhasil disimpan. Melanjutkan ke Langkah 2: Konteks Operasional (2C).'
        )
        navigate({ to: '/risiko/konteks-operasional' })
      } else {
        toast.success('Penetapan Konteks Risiko Strategis (Form 2B) berhasil disimpan.')
      }
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menyimpan data Form 2B.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    form,
    watchedSumberDataId,
    watchedTujuanId,
    watchedSasaranIds,
    watchedIndikatorIds,
    sumberDataList,
    isLoadingSumberData,
    tujuanList,
    isLoadingTujuan,
    sasaranList,
    isLoadingSasaran,
    availableIndikators,
    isLoadingIndikator,
    handleSumberDataChange,
    handleTujuanChange,
    toggleSasaran,
    toggleAllSasaran,
    toggleIndikator,
    toggleAllIndikators,
    isSubmitting,
    submitIntent,
    setSubmitIntent,
    pendingCrucialPayload,
    setPendingCrucialPayload,
    impactMode,
    setImpactMode,
    handleFormSubmit,
    executeSave,
  }
}

export type UseKonteksStrategisFormReturn = ReturnType<typeof useKonteksStrategisForm>
