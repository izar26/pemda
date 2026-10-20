import { create } from 'zustand'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/auth-store'
import { opdService } from '@/services/opd-service'
import { perencanaanService } from '@/services/perencanaan-service'
import { risikoService } from '@/services/risiko-service'

export type RisikoWizardStepId =
  | '2b'
  | '2c'
  | '3b'
  | '3c'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'rca'
  | 'fraud'

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
 * Scalable Wizard Step Definitions.
 * Aligned with Pedoman Pengelolaan Risiko Pemda (SPIP / BPKP):
 * Form 2B through Form 10, RCA (Root Cause Analysis), and Fraud Risk Assessment.
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
    id: '3b',
    code: '3B',
    title: 'Identifikasi Risiko Strategis (3B)',
    shortTitle: 'Identifikasi Strategis',
    subtitle: 'Identifikasi Pernyataan Risiko, Penyebab & Dampak Strategis',
    url: '/risiko/identifikasi-strategis',
    isImplemented: false,
  },
  {
    stepNumber: 4,
    id: '3c',
    code: '3C',
    title: 'Identifikasi Risiko Operasional (3C)',
    shortTitle: 'Identifikasi Operasional',
    subtitle: 'Identifikasi Risiko Program, Kegiatan & Sub-Kegiatan',
    url: '/risiko/identifikasi-operasional',
    isImplemented: false,
  },
  {
    stepNumber: 5,
    id: '4',
    code: '4',
    title: 'Analisis Risiko (Form 4)',
    shortTitle: 'Analisis Risiko',
    subtitle: 'Penilaian Kriteria Kemungkinan, Dampak & Skoring Risiko',
    url: '/risiko/analisis',
    isImplemented: false,
  },
  {
    stepNumber: 6,
    id: '5',
    code: '5',
    title: 'Evaluasi Risiko (Form 5)',
    shortTitle: 'Evaluasi Risiko',
    subtitle: 'Penetapan Prioritas Risiko, Profil Risiko & Selera Risiko',
    url: '/risiko/evaluasi',
    isImplemented: false,
  },
  {
    stepNumber: 7,
    id: '6',
    code: '6',
    title: 'Rencana Tindak Pengendalian (6)',
    shortTitle: 'RTP (Form 6)',
    subtitle: 'Penyusunan Rencana Tindak Pengendalian Risiko Teridentifikasi',
    url: '/risiko/rtp',
    isImplemented: false,
  },
  {
    stepNumber: 8,
    id: '7',
    code: '7',
    title: 'Pemantauan Pelaksanaan RTP (7)',
    shortTitle: 'Pemantauan RTP',
    subtitle: 'Monitoring Realisasi dan Progres Tindak Pengendalian',
    url: '/risiko/pemantauan-rtp',
    isImplemented: false,
  },
  {
    stepNumber: 9,
    id: '8',
    code: '8',
    title: 'Kejadian Risiko (Form 8)',
    shortTitle: 'Kejadian Risiko',
    subtitle: 'Pencatatan Peristiwa Gangguan & Deviasi Kejadian Nyata',
    url: '/risiko/kejadian-risiko',
    isImplemented: false,
  },
  {
    stepNumber: 10,
    id: '9',
    code: '9',
    title: 'Pemantauan Risiko Berkala (9)',
    shortTitle: 'Pemantauan Risiko',
    subtitle: 'Review Dinamika Profil & Level Risiko Secara Periodik',
    url: '/risiko/pemantauan-risiko',
    isImplemented: false,
  },
  {
    stepNumber: 11,
    id: '10',
    code: '10',
    title: 'Laporan Pengelolaan Risiko (10)',
    shortTitle: 'Laporan Risiko',
    subtitle: 'Kompilasi Laporan Resmi Manajemen Risiko Pemda',
    url: '/risiko/laporan',
    isImplemented: false,
  },
  {
    stepNumber: 12,
    id: 'rca',
    code: 'RCA',
    title: 'Root Cause Analysis (RCA)',
    shortTitle: 'Analisis RCA',
    subtitle: 'Analisis Mendalam Akar Masalah (Fishbone / 5-Whys)',
    url: '/risiko/rca',
    isImplemented: false,
  },
  {
    stepNumber: 13,
    id: 'fraud',
    code: 'Fraud',
    title: 'Risiko Kecurangan (Fraud)',
    shortTitle: 'Risiko Fraud',
    subtitle: 'Identifikasi & Pencegahan Potensi Kecurangan / Korupsi',
    url: '/risiko/fraud',
    isImplemented: false,
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

  const isOpdRole = Boolean(
    user?.roles?.includes('OPD') &&
      !user?.roles?.includes('Superadmin') &&
      !user?.roles?.includes('Admin Office')
  )

  // Fetch active evaluation period
  const { data: activePeriode, isLoading: isLoadingPeriode } = useQuery({
    queryKey: ['periode-active'],
    queryFn: () => perencanaanService.getActivePeriode(),
    enabled: Boolean(user) && enabled,
    staleTime: 30_000,
  })

  // Fetch OPD list for Admin / Superadmin selector
  const { data: opdResponse, isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds-list-active'],
    queryFn: () => opdService.getOpds({ is_active: '1', per_page: 200 }),
    enabled: Boolean(user) && !isOpdRole && enabled,
    staleTime: 60_000,
  })

  const opds = opdResponse || []

  const defaultAdminOpdId = (() => {
    if (selectedOpdId) return selectedOpdId
    // If the user has an assigned OPD that exists in the list, prefer it
    if (user?.opd_id && opds.some((o) => String(o.id) === String(user.opd_id))) {
      return String(user.opd_id)
    }
    // Prefer prominent OPD with data (e.g. DPUTR, Dinkes, Diskominfo) before first index
    const prioritizedOpd = opds.find((o) =>
      ['DPUTR', 'Dinkes', 'Diskominfo', 'Disdik'].includes(o.kode)
    )
    return prioritizedOpd ? String(prioritizedOpd.id) : (opds[0]?.id ? String(opds[0].id) : '')
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
    enabled: Boolean(user) && Boolean(effectiveOpdId) && Boolean(activePeriode?.id) && enabled,
  })

  const konteks2B = currentKonteksResponse?.data ?? null
  const opdMeta = currentKonteksResponse?.meta

  const isStep2BCompleted = Boolean(
    konteks2B &&
      konteks2B.sumber_data_id &&
      konteks2B.tujuan_penilaian_id &&
      (konteks2B.sasarans?.length || 0) > 0 &&
      (konteks2B.indikators?.length || 0) > 0
  )

  const isStep2CCompleted = Boolean(
    isStep2BCompleted && (opdMeta?.operasional_summary?.programs_count || 0) > 0
  )

  const steps: ResolvedWizardStep[] = RISIKO_WIZARD_STEPS.map((step) => {
    if (step.id === '2b') {
      return {
        ...step,
        isCompleted: isStep2BCompleted,
        isUnlocked: Boolean(activePeriode),
        status: isStep2BCompleted ? 'completed' : activePeriode ? 'available' : 'locked',
      }
    }

    if (step.id === '2c') {
      const isUnlocked = Boolean(activePeriode) && isStep2BCompleted
      return {
        ...step,
        isCompleted: isStep2CCompleted,
        isUnlocked,
        status: !isUnlocked ? 'locked' : isStep2CCompleted ? 'completed' : 'available',
      }
    }

    // Future stages (3B to Fraud) are planned in the roadmap but not yet implemented
    return {
      ...step,
      isCompleted: false,
      isUnlocked: false,
      status: 'locked' as WizardStepStatus,
    }
  })

  const completedCount = steps.filter((s) => s.isCompleted).length
  const totalSteps = steps.length
  const progressPercentage =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0

  return {
    user,
    isOpdRole,
    opds,
    effectiveOpdId,
    setSelectedOpdId,
    activePeriode,
    konteks2B,
    opdMeta,
    steps,
    completedCount,
    totalSteps,
    progressPercentage,
    isStep2BCompleted,
    isStep2CCompleted,
    isLoading: isLoadingPeriode || (!isOpdRole && isLoadingOpds) || isLoadingKonteks,
    isFetching: isFetchingKonteks,
    refetchWizardProgress,
  }
}
