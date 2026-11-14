import { useQuery } from '@tanstack/react-query'
import { opdService } from '@/services/opd-service'
import { pengajuanRisikoService } from '@/services/pengajuan-risiko-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'
import { create } from 'zustand'
import { useAuthStore } from '@/stores/auth-store'

export type RisikoWizardStepId =
  | '2b'
  | '2c'
  | '3a'
  | '3b'
  | '3c'
  | 'rca'
  | '4'
  | '5'
  | '6'

export interface RisikoWizardStepConfig {
  stepNumber: number
  id: RisikoWizardStepId
  code: string
  title: string
  shortTitle: string
  subtitle: string
  url: string
  requiredPermission?: string
  isImplemented: boolean
}

/**
 * 6 Active Wizard Step Definitions (SPIP / BPKP Pemda):
 * Form 2B -> Form 2C -> Form 3A -> Form 3B -> Form 3C -> Form RCA.
 */
export const RISIKO_WIZARD_STEPS: RisikoWizardStepConfig[] = [
  {
    stepNumber: 1,
    id: '2b',
    code: '2B',
    title: 'Konteks Strategis (2B)',
    shortTitle: 'Konteks Strategis',
    subtitle: 'Penetapan Sumber Data, Tujuan, Sasaran & IKU Renstra OPD',
    url: '/risiko/konteks-strategis',
    requiredPermission: 'konteks_risiko.view',
    isImplemented: true,
  },
  {
    stepNumber: 2,
    id: '2c',
    code: '2C',
    title: 'Konteks Operasional (2C)',
    shortTitle: 'Konteks Operasional',
    subtitle: 'Penetapan Program, Kegiatan, Sub-Kegiatan, Indikator & Target',
    url: '/risiko/konteks-operasional',
    requiredPermission: 'konteks_operasional.view',
    isImplemented: true,
  },
  {
    stepNumber: 3,
    id: '3a',
    code: '3A',
    title: 'Identifikasi Risiko Pemda (3A)',
    shortTitle: 'Identifikasi Pemda',
    subtitle:
      'Identifikasi Pernyataan Risiko Strategis Pemda Berdasarkan Urusan',
    url: '/risiko/identifikasi-pemda',
    requiredPermission: 'identifikasi_risiko_pemda.view',
    isImplemented: true,
  },
  {
    stepNumber: 4,
    id: '3b',
    code: '3B',
    title: 'Identifikasi Risiko OPD (3B)',
    shortTitle: 'Identifikasi OPD',
    subtitle: 'Identifikasi Pernyataan Risiko Strategis Perangkat Daerah',
    url: '/risiko/identifikasi-opd',
    requiredPermission: 'identifikasi_risiko_opd.view',
    isImplemented: true,
  },
  {
    stepNumber: 5,
    id: '3c',
    code: '3C',
    title: 'Identifikasi Risiko Operasional (3C)',
    shortTitle: 'Identifikasi Operasional',
    subtitle: 'Identifikasi Pernyataan Risiko Operasional Perangkat Daerah',
    url: '/risiko/identifikasi-operasional',
    requiredPermission: 'identifikasi_risiko_opd_operasional.view',
    isImplemented: true,
  },
  {
    stepNumber: 6,
    id: 'rca',
    code: 'RCA',
    title: 'Root Cause Analysis (RCA)',
    shortTitle: 'Analisis RCA',
    subtitle:
      'Analisis Mendalam Akar Masalah (5-Whys) untuk Risiko 3A, 3B & 3C',
    url: '/risiko/rca',
    requiredPermission: 'rca.view',
    isImplemented: true,
  },
  {
    stepNumber: 7,
    id: '4',
    code: '4',
    title: 'Analisis dan Evaluasi Risiko (4)',
    shortTitle: 'Analisis Risiko',
    subtitle: 'Penilaian risiko inheren dan residual',
    url: '/risiko/analisis-risiko',
    requiredPermission: 'identifikasi_risiko_opd.view',
    isImplemented: true,
  },
  {
    stepNumber: 8,
    id: '5',
    code: '5',
    title: 'Daftar Risiko Prioritas (5)',
    shortTitle: 'Risiko Prioritas',
    subtitle: 'Risiko residual yang memerlukan perlakuan',
    url: '/risiko/risiko-prioritas',
    isImplemented: true,
  },
  {
    stepNumber: 9,
    id: '6',
    code: '6',
    title: 'Rencana Tindak Pengendalian (6)',
    shortTitle: 'Tindak Pengendalian',
    subtitle: 'Celah pengendalian dan rencana tindak risiko prioritas',
    url: '/risiko/tindak-pengendalian',
    isImplemented: true,
  },
]

interface RisikoWizardStoreState {
  selectedOpdId: string
  setSelectedOpdId: (opdId: string) => void
}

export const useRisikoWizardStore = create<RisikoWizardStoreState>((set) => ({
  selectedOpdId: '',
  setSelectedOpdId: (opdId: string) => set({ selectedOpdId: opdId }),
}))

export type WizardStepStatus = 'completed' | 'available' | 'locked'

export interface ResolvedWizardStep extends RisikoWizardStepConfig {
  status: WizardStepStatus
  isCompleted: boolean
  isUnlocked: boolean
}

/**
 * Shared hook used by both the Wizard pages and the App Sidebar to resolve
 * active OPD, active Periode, and step completion/lock states.
 */
export function useRisikoWizardProgress(enabled = true) {
  const user = useAuthStore((state) => state.auth.user)
  const { selectedOpdId, setSelectedOpdId } = useRisikoWizardStore()

  const userRoles = Array.isArray(user?.roles)
    ? user.roles
    : user?.role
      ? [user.role]
      : []

  const isOpdRole = Boolean(
    userRoles.includes('OPD') &&
    !userRoles.includes('Superadmin') &&
    !userRoles.includes('Admin Office')
  )

  const isScopedAuditor = Boolean(
    userRoles.includes('Auditor') &&
    !userRoles.some((r) =>
      ['Superadmin', 'Admin Office', 'Inspektorat'].includes(r)
    )
  )

  // Fetch active evaluation period
  const { data: activePeriode, isLoading: isLoadingPeriode } = useQuery({
    queryKey: ['periode-active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    enabled: Boolean(user) && enabled,
    staleTime: 30_000,
  })

  // Fetch OPD list for Admin / Superadmin / Auditor selector
  const { data: opdResponse, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds-list-active', isScopedAuditor],
    queryFn: () =>
      opdService.getOpds({
        all: true,
        ...(isScopedAuditor ? { assigned_only: true } : {}),
      }),
    enabled: Boolean(user) && !isOpdRole && enabled,
    staleTime: 60_000,
  })

  const opds = opdResponse || []

  const defaultAdminOpdId = (() => {
    // If selectedOpdId is valid in the loaded OPD list, keep it
    if (
      selectedOpdId &&
      opds.some((o) => String(o.id) === String(selectedOpdId))
    ) {
      return selectedOpdId
    }
    // If the user has an assigned OPD that exists in the list, prefer it
    if (
      user?.opd_id &&
      opds.some((o) => String(o.id) === String(user.opd_id))
    ) {
      return String(user.opd_id)
    }
    // For non-auditors, prefer prominent OPD with data (e.g. DPUTR, Dinkes, Diskominfo) before first index
    if (!isScopedAuditor) {
      const prioritizedOpd = opds.find((o) =>
        ['DPUTR', 'Dinkes', 'Diskominfo', 'Disdik'].includes(o.kode)
      )
      if (prioritizedOpd) return String(prioritizedOpd.id)
    }
    return opds[0]?.id ? String(opds[0].id) : ''
  })()

  const effectiveOpdId = isOpdRole
    ? String(user?.opd_id || '')
    : defaultAdminOpdId

  // Fetch Form 2B + OPD Meta (includes Form 2C summary counts)
  const {
    data: currentKonteksResponse,
    isLoading: isLoadingKonteks,
    isFetching: isFetchingKonteks,
    refetch: refetchWizardProgress,
  } = useQuery({
    queryKey: ['risiko-konteks-current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentKonteksWithMeta({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(user) &&
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      enabled,
  })

  // Fetch Form 3A (Identifikasi Risiko Pemda)
  const {
    data: identifikasi3AResponse,
    isLoading: isLoading3A,
    refetch: refetch3A,
  } = useQuery({
    queryKey: ['risiko-3a-current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentIdentifikasiPemda({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(user) &&
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      enabled,
  })

  // Fetch Form 3B (Identifikasi Risiko Strategis OPD)
  const {
    data: identifikasi3BResponse,
    isLoading: isLoading3B,
    refetch: refetch3B,
  } = useQuery({
    queryKey: ['risiko-3b-current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentIdentifikasiOpd({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(user) &&
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      enabled,
  })

  // Fetch Form 3C (Identifikasi Risiko Operasional OPD)
  const {
    data: identifikasi3CResponse,
    isLoading: isLoading3C,
    refetch: refetch3C,
  } = useQuery({
    queryKey: ['risiko-3c-current', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      risikoService.getCurrentIdentifikasiOperasional({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(user) &&
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      enabled,
  })

  // Fetch submission & auditor readiness
  const {
    data: readiness,
    isLoading: isLoadingReadiness,
    refetch: refetchReadiness,
  } = useQuery({
    queryKey: ['risiko-pengajuan-readiness', effectiveOpdId, activePeriode?.id],
    queryFn: () =>
      pengajuanRisikoService.getReadiness({
        opd_id: effectiveOpdId,
        periode_penilaian_id: activePeriode?.id,
      }),
    enabled:
      Boolean(user) &&
      Boolean(effectiveOpdId) &&
      Boolean(activePeriode?.id) &&
      enabled,
    staleTime: 0,
  })

  const konteks2B = currentKonteksResponse?.data ?? null
  const opdMeta = currentKonteksResponse?.meta
  const dokumen3A = identifikasi3AResponse?.data ?? null
  const meta3A = identifikasi3AResponse?.meta ?? null
  const dokumen3B = identifikasi3BResponse?.data ?? null
  const meta3B = identifikasi3BResponse?.meta ?? null
  const dokumen3C = identifikasi3CResponse?.data ?? null
  const meta3C = identifikasi3CResponse?.meta ?? null

  const isStep2BCompleted = Boolean(
    readiness?.form_completeness?.['2b']?.is_complete ??
    readiness?.is_2b_complete ??
    (konteks2B &&
      konteks2B.sumber_data_id &&
      konteks2B.tujuan_penilaian_id &&
      (konteks2B.sasarans?.length || 0) > 0 &&
      (konteks2B.indikators?.length || 0) > 0)
  )

  const isStep2CCompleted = Boolean(
    readiness?.form_completeness?.['2c']?.is_complete ??
    readiness?.is_2c_complete ??
    (isStep2BCompleted &&
      (opdMeta?.operasional_summary?.programs_count || 0) > 0)
  )

  const isStep3ACompleted = Boolean(
    readiness?.form_completeness?.['3a']?.is_complete ??
    readiness?.is_3a_complete ??
    (isStep2CCompleted &&
      dokumen3A &&
      dokumen3A.master_urusan_pemerintahan_id &&
      (dokumen3A.items?.length || 0) > 0)
  )

  const isStep3BCompleted = Boolean(
    readiness?.form_completeness?.['3b']?.is_complete ??
    readiness?.is_3b_complete ??
    (isStep3ACompleted && dokumen3B && (dokumen3B.items?.length || 0) > 0)
  )

  const isStep3CCompleted = Boolean(
    readiness?.form_completeness?.['3c']?.is_complete ??
    readiness?.is_3c_complete ??
    (isStep3BCompleted && dokumen3C && (dokumen3C.items?.length || 0) > 0)
  )

  const isStepRCACompleted = Boolean(
    readiness?.form_completeness?.['rca']?.is_complete ??
    readiness?.is_rca_complete ??
    (isStep3CCompleted &&
      dokumen3A?.items &&
      dokumen3A.items.length > 0 &&
      dokumen3A.items.every((it) => it.has_rca) &&
      dokumen3B?.items &&
      dokumen3B.items.length > 0 &&
      dokumen3B.items.every((it) => it.has_rca) &&
      dokumen3C?.items &&
      dokumen3C.items.length > 0 &&
      dokumen3C.items.every((it) => it.has_rca))
  )

  const steps: ResolvedWizardStep[] = RISIKO_WIZARD_STEPS.map((step) => {
    if (step.id === '2b') {
      return {
        ...step,
        isCompleted: isStep2BCompleted,
        isUnlocked: Boolean(activePeriode),
        status: isStep2BCompleted
          ? 'completed'
          : activePeriode
            ? 'available'
            : 'locked',
      }
    }

    if (step.id === '2c') {
      const isUnlocked = Boolean(activePeriode) && isStep2BCompleted
      return {
        ...step,
        isCompleted: isStep2CCompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isStep2CCompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === '3a') {
      const isUnlocked = Boolean(activePeriode) && isStep2CCompleted
      return {
        ...step,
        isCompleted: isStep3ACompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isStep3ACompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === '3b') {
      const isUnlocked = Boolean(activePeriode) && isStep3ACompleted
      return {
        ...step,
        isCompleted: isStep3BCompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isStep3BCompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === '3c') {
      const isUnlocked = Boolean(activePeriode) && isStep3BCompleted
      return {
        ...step,
        isCompleted: isStep3CCompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isStep3CCompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === 'rca') {
      const isUnlocked = Boolean(activePeriode) && isStep3CCompleted
      return {
        ...step,
        isCompleted: isStepRCACompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isStepRCACompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === '4') {
      const isUnlocked = Boolean(activePeriode) && isStepRCACompleted
      const isCompleted = Boolean(
        readiness?.form_completeness?.['4']?.is_complete ??
        readiness?.is_4_complete
      )
      return {
        ...step,
        isCompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isCompleted
            ? 'completed'
            : 'available',
      }
    }

    if (step.id === '5' || step.id === '6') {
      const isUnlocked = Boolean(activePeriode && readiness?.is_4_complete)
      const isCompleted = Boolean(
        step.id === '5'
          ? (readiness?.form_completeness?.['5']?.is_complete ??
              readiness?.is_5_complete)
          : (readiness?.form_completeness?.['6']?.is_complete ??
              readiness?.is_6_complete)
      )
      return {
        ...step,
        isCompleted,
        isUnlocked,
        status: !isUnlocked
          ? 'locked'
          : isCompleted
            ? 'completed'
            : 'available',
      }
    }

    const formCode = step.id.toLowerCase()
    const isCompleted = Boolean(
      readiness?.form_completeness?.[formCode]?.is_complete ??
      (readiness as Record<string, unknown> | undefined)?.[
        `is_${formCode}_complete`
      ]
    )
    const isUnlocked = Boolean(activePeriode && readiness?.is_6_complete)

    return {
      ...step,
      isCompleted,
      isUnlocked,
      status: !isUnlocked ? 'locked' : isCompleted ? 'completed' : 'available',
    }
  })

  const completedCount = steps.filter((s) => s.isCompleted).length
  const totalSteps = steps.length
  const progressPercentage =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return {
    user,
    isOpdRole,
    isScopedAuditor,
    opds,
    effectiveOpdId,
    setSelectedOpdId,
    activePeriode,
    konteks2B,
    opdMeta,
    dokumen3A,
    meta3A,
    dokumen3B,
    meta3B,
    dokumen3C,
    meta3C,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isStep2BCompleted,
    isStep2CCompleted,
    isStep3ACompleted,
    isStep3BCompleted,
    isStep3CCompleted,
    isStepRCACompleted,
    readiness,
    isLoadingReadiness,
    refetchReadiness,
    refetch3A,
    refetch3B,
    refetch3C,
    hasAuditor: Boolean(readiness?.has_auditor),
    isLocked: readiness ? readiness.is_locked : false,
    submissionStatus: readiness ? readiness.status : 'draft',
    isLoading:
      isLoadingPeriode ||
      (!isOpdRole && isLoadingOpds) ||
      isLoadingKonteks ||
      isLoading3A ||
      isLoading3B ||
      isLoading3C ||
      isLoadingReadiness,
    isFetching: isFetchingKonteks,
    refetchWizardProgress: async () => {
      await Promise.all([
        refetchWizardProgress(),
        refetch3A(),
        refetch3B(),
        refetch3C(),
        refetchReadiness(),
      ])
    },
  }
}
