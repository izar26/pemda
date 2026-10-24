import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { opdService } from '@/services/opd-service'
import { risikoService } from '@/services/risiko-service'
import { perencanaanService } from '@/services/perencanaan-service'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'

export function useLaporanData() {
  const user = useAuthStore((s) => s.auth.user)
  const userRoles = useMemo(() => {
    if (Array.isArray(user?.roles)) return user.roles
    if (user?.role) return [user.role]
    return []
  }, [user?.roles, user?.role])

  const isOpdRole = Boolean(
    userRoles.includes('OPD') &&
      !userRoles.some((r) =>
        ['Superadmin', 'Admin Office', 'Bapperida', 'Inspektorat', 'Auditor'].includes(r)
      )
  )

  const isScopedAuditor = Boolean(
    userRoles.includes('Auditor') &&
      !userRoles.some((r) => ['Superadmin', 'Admin Office', 'Inspektorat'].includes(r))
  )

  const [selectedFormId, setSelectedFormId] = useState<string>('2b')
  const [selectedOpdId, setSelectedOpdId] = useState<string>(
    user?.opd_id ? String(user.opd_id) : ''
  )
  const [isExporting, setIsExporting] = useState<boolean>(false)

  // 1. Fetch Active Periode
  const { data: activePeriode } = useQuery({
    queryKey: ['periode', 'active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    staleTime: 5 * 60 * 1000,
  })

  // 2. Fetch OPD List (auditor: only OPDs assigned to them)
  const { data: opdListResp, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-laporan', isScopedAuditor],
    queryFn: () =>
      opdService.getOpds({
        all: true,
        ...(isScopedAuditor ? { assigned_only: true } : {}),
      }),
    staleTime: 5 * 60 * 1000,
  })

  const opdOptions = useMemo(() => {
    if (!Array.isArray(opdListResp)) return []
    return opdListResp.map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
    }))
  }, [opdListResp])

  // Selected OPD must belong to the (possibly scoped) option list
  const effectiveOpdId =
    (selectedOpdId && opdOptions.some((o) => o.value === selectedOpdId)
      ? selectedOpdId
      : opdOptions[0]?.value) || ''
  const selectedOpdName =
    opdOptions.find((o) => o.value === effectiveOpdId)?.label ||
    user?.opd?.nama ||
    'Perangkat Daerah'

  // 2. Fetch Form 2B Data
  const {
    data: data2BResp,
    isLoading: isLoading2B,
    refetch: refetch2B,
  } = useQuery({
    queryKey: ['laporan', 'form-2b', effectiveOpdId],
    queryFn: () =>
      risikoService.getCurrentKonteksWithMeta({
        opd_id: effectiveOpdId || undefined,
      }),
    enabled: selectedFormId === '2b' && Boolean(effectiveOpdId),
    staleTime: 60 * 1000,
  })

  // 3. Fetch Form 2C Data
  const {
    data: data2C,
    isLoading: isLoading2C,
    refetch: refetch2C,
  } = useQuery({
    queryKey: ['laporan', 'form-2c', effectiveOpdId],
    queryFn: () =>
      risikoService.getCurrentKonteksOperasional({
        opd_id: effectiveOpdId || undefined,
      }),
    enabled: selectedFormId === '2c' && Boolean(effectiveOpdId),
    staleTime: 60 * 1000,
  })

  const currentStage: RisikoWizardStepConfig =
    RISIKO_WIZARD_STEPS.find((s) => s.id === selectedFormId) ||
    RISIKO_WIZARD_STEPS[0]

  const isLoadingData =
    (selectedFormId === '2b' && isLoading2B) ||
    (selectedFormId === '2c' && isLoading2C)

  function handleRefresh() {
    if (selectedFormId === '2b') refetch2B()
    if (selectedFormId === '2c') refetch2C()
  }

  function handlePrint() {
    window.print()
  }

  async function handleExportExcel() {
    setIsExporting(true)
    const toastId = toast.loading('Menyiapkan dan mengunduh laporan Excel...')
    try {
      if (selectedFormId === '2b') {
        const item = data2BResp?.data
        if (!item?.id) {
          toast.error('Data Form 2B belum tersedia untuk diekspor.', { id: toastId })
          return
        }
        await risikoService.exportExcel(item.id)
        toast.success('Laporan Form 2B (.xlsx) berhasil diunduh!', { id: toastId })
      } else if (selectedFormId === '2c') {
        if (!data2C?.id) {
          toast.error('Data Form 2C belum tersedia untuk diekspor.', { id: toastId })
          return
        }
        await risikoService.exportOperasionalExcel(data2C.id)
        toast.success('Laporan Form 2C (.xlsx) berhasil diunduh!', { id: toastId })
      } else {
        toast.info(
          `Format laporan Excel untuk ${currentStage.title} sedang disiapkan sesuai roadmap.`,
          { id: toastId }
        )
      }
    } catch {
      toast.error('Gagal mengunduh laporan Excel.', { id: toastId })
    } finally {
      setIsExporting(false)
    }
  }

  return {
    user,
    isOpdRole,
    isScopedAuditor,
    selectedFormId,
    setSelectedFormId,
    effectiveOpdId,
    setSelectedOpdId,
    selectedOpdName,
    opdOptions,
    isLoadingOpds,
    currentStage,
    data2BResp,
    data2C,
    activePeriode,
    isLoadingData,
    isExporting,
    handleRefresh,
    handlePrint,
    handleExportExcel,
  }
}
