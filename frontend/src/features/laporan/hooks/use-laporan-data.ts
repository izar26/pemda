import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { laporanService, type LaporanData } from '@/services/laporan-service'
import {
  RISIKO_WIZARD_STEPS,
  type RisikoWizardStepConfig,
} from '@/features/risiko/shared/risiko-wizard-store'

const LEADERSHIP_TITLES = [
  'Bupati',
  'Wakil Bupati',
  'Sekda',
  'Sekretaris Daerah',
  'Pimpinan Daerah',
]

export function useLaporanData() {
  const user = useAuthStore((s) => s.auth.user)
  const userRoles = useMemo(() => {
    if (Array.isArray(user?.roles)) return user.roles
    if (user?.role) return [user.role]
    return []
  }, [user])

  const isGlobalRole = userRoles.some((r) =>
    [
      'Superadmin',
      'Administrator',
      'Admin Office',
      'Bapperida',
      'Koordinator Pengawas',
      'Inspektorat',
    ].includes(r)
  )

  const isScopedAuditor = Boolean(
    (userRoles.includes('Evaluator / Reviewer') ||
      userRoles.includes('Auditor')) &&
      !isGlobalRole
  )

  const isRegionalLeader = Boolean(
    (user?.jabatan && LEADERSHIP_TITLES.includes(user.jabatan)) ||
      (userRoles.includes('Executive') && !user?.opd_id)
  )

  const isKepalaOpd = Boolean(
    (userRoles.includes('Executive') || userRoles.includes('Kepala OPD')) &&
      Boolean(user?.opd_id) &&
      !isRegionalLeader &&
      !isGlobalRole &&
      !isScopedAuditor
  )

  const isOpdRole = Boolean(
    (userRoles.includes('Operator OPD') || userRoles.includes('OPD')) &&
      !isGlobalRole &&
      !isScopedAuditor
  )

  // Kepala OPD (role Executive ber-opd_id) & Operator OPD terkunci pada OPD masing-masing
  const isOpdLocked = isKepalaOpd || isOpdRole

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

  // 2. Fetch OPD List (skip untuk user yang terkunci pada OPD miliknya sendiri)
  const { data: opdListResp, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'all-for-laporan', isScopedAuditor],
    queryFn: () =>
      opdService.getOpds({
        all: true,
        ...(isScopedAuditor ? { assigned_only: true } : {}),
      }),
    enabled: !isOpdLocked,
    staleTime: 5 * 60 * 1000,
  })

  const opdOptions = useMemo(() => {
    if (isOpdLocked || !Array.isArray(opdListResp)) return []
    return opdListResp.map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
    }))
  }, [isOpdLocked, opdListResp])

  // Selected OPD must belong to the (possibly scoped) option list, or strictly user's own OPD when locked
  const effectiveOpdId = isOpdLocked
    ? user?.opd_id
      ? String(user.opd_id)
      : ''
    : (selectedOpdId && opdOptions.some((o) => o.value === selectedOpdId)
        ? selectedOpdId
        : opdOptions[0]?.value) || ''

  const selectedOpdName = isOpdLocked
    ? user?.opd?.nama || 'Perangkat Daerah Anda'
    : opdOptions.find((o) => o.value === effectiveOpdId)?.label ||
      user?.opd?.nama ||
      'Perangkat Daerah'

  const resolvedTahun = activePeriode?.tahun_penilaian

  // 3. Unified Fetch Laporan Data via LaporanRisikoService
  const {
    data: laporanResp,
    isLoading: isLoadingData,
    refetch: refetchLaporan,
  } = useQuery({
    queryKey: [
      'laporan',
      'unified',
      selectedFormId,
      effectiveOpdId,
      resolvedTahun,
    ],
    queryFn: () =>
      laporanService.getLaporan(selectedFormId, {
        opd_id: effectiveOpdId || undefined,
        tahun: resolvedTahun || undefined,
      }),
    enabled: Boolean(selectedFormId) && Boolean(effectiveOpdId),
    staleTime: 60 * 1000,
  })

  const laporanData: LaporanData | null = laporanResp?.data || null
  const isApproved = Boolean(laporanData?.audit_status?.is_approved)

  const currentStage: RisikoWizardStepConfig =
    RISIKO_WIZARD_STEPS.find((s) => s.id === selectedFormId) ||
    RISIKO_WIZARD_STEPS[0]

  function handleRefresh() {
    refetchLaporan()
  }

  function handlePrint() {
    if (!isApproved) {
      toast.warning(
        'Perhatian: Dokumen ini belum disetujui penuh oleh Inspektorat. Anda dapat mencetak pratinjau, namun dokumen ini belum berstatus dokumen resmi audit.',
        { duration: 5000 }
      )
    }
    window.print()
  }

  async function handleExportExcel() {
    if (!isApproved) {
      toast.error(
        'Ekspor Excel Resmi Ditolak: Seluruh paket penilaian risiko OPD harus disetujui penuh (Approved) oleh Inspektorat sebelum kertas kerja resmi dapat diunduh.'
      )
      return
    }

    setIsExporting(true)
    try {
      await laporanService.exportExcel(
        selectedFormId,
        {
          opd_id: effectiveOpdId || undefined,
          tahun: resolvedTahun || undefined,
        },
        `Laporan_${selectedFormId.toUpperCase()}_${selectedOpdName}`
      )
    } catch {
      // Error message already displayed in toast inside laporanService
    } finally {
      setIsExporting(false)
    }
  }

  return {
    user,
    isOpdRole,
    isOpdLocked,
    isScopedAuditor,
    selectedFormId,
    setSelectedFormId,
    effectiveOpdId,
    setSelectedOpdId,
    selectedOpdName: isOpdLocked
      ? laporanData?.opd?.nama || selectedOpdName
      : selectedOpdName,
    opdOptions,
    isLoadingOpds,
    currentStage,
    activePeriode,
    resolvedTahun,
    laporanData,
    isApproved,
    isLoadingData,
    isExporting,
    handleRefresh,
    handlePrint,
    handleExportExcel,
  }
}
