import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from 'vitest-browser-react'
import '@/styles/index.css'
import type { ReadinessResponse } from '@/services/pengajuan-risiko-service'
import { RisikoWizardHeader } from './risiko-wizard-header'
import {
  RISIKO_WIZARD_STEPS,
  type ResolvedWizardStep,
} from './risiko-wizard-store'

const navigateMock = vi.fn()
const toastWarningMock = vi.fn()

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('sonner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('sonner')>()
  return {
    ...actual,
    toast: {
      ...actual.toast,
      warning: (...args: unknown[]) => toastWarningMock(...args),
    },
  }
})

function buildSteps(unlockedUpToIndex: number): ResolvedWizardStep[] {
  return RISIKO_WIZARD_STEPS.map((step, idx) => {
    const isCompleted = idx < unlockedUpToIndex
    const isUnlocked = idx <= unlockedUpToIndex
    return {
      ...step,
      isCompleted,
      isUnlocked,
      isInRevision: false,
      status: !isUnlocked ? 'locked' : isCompleted ? 'completed' : 'available',
    }
  })
}

const draftReadiness = {
  status: 'draft',
  current_tier: 'operator',
  has_auditor: true,
  assigned_auditor: null,
  is_2b_complete: true,
  is_2c_complete: true,
  all_forms_complete: false,
  missing_forms: [],
  is_ready_to_submit: false,
  is_locked: false,
  is_locked_for_operator: false,
  can_submit_to_kepala: false,
  can_review_kepala: false,
  can_delegate_operator: false,
  can_review_auditor: false,
  can_forward_revision_auditor: false,
  can_resubmit_pengawas: false,
  can_review_pengawas: false,
  unlocked_forms: ['2b', '2c', '3a', '3b', '3c', 'rca', '4', '5', '6', '7', '8'],
  submission: {
    id: 'sub-1',
    opd_id: 'opd-1',
    periode_penilaian_id: 'per-1',
    auditor_id: 'aud-1',
    status: 'draft',
    current_tier: 'operator',
    submitted_at: null,
    approved_at: null,
    catatan_umum: null,
  },
} as ReadinessResponse

function renderHeader(props: {
  currentStepId: string
  steps: ResolvedWizardStep[]
  readiness?: ReadinessResponse
}) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <RisikoWizardHeader
        currentStepId={props.currentStepId}
        steps={props.steps}
        completedCount={10}
        totalSteps={14}
        progressPercentage={71}
        readiness={props.readiness}
        effectiveOpdId='opd-1'
        activePeriodeId='per-1'
      />
    </QueryClientProvider>
  )
}

describe('RisikoWizardHeader direct URL sequential guard', () => {
  beforeEach(() => {
    navigateMock.mockClear()
    toastWarningMock.mockClear()
  })

  it('redirects to last unlocked step with toast when accessing locked step URL directly', async () => {
    // Steps 0..10 (2b..8) unlocked; step 11 (Form 9) is locked because Form 8 is not complete
    const steps = buildSteps(10)

    await renderHeader({
      currentStepId: '9',
      steps,
      readiness: draftReadiness,
    })

    await vi.waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith({
        to: '/risiko/komunikasi-pengendalian',
        replace: true,
      })
    })
    expect(toastWarningMock).toHaveBeenCalledOnce()
  })

  it('does not redirect when current step is unlocked', async () => {
    const steps = buildSteps(10)

    await renderHeader({
      currentStepId: '8',
      steps,
      readiness: draftReadiness,
    })

    expect(navigateMock).not.toHaveBeenCalled()
    expect(toastWarningMock).not.toHaveBeenCalled()
  })

  it('does not redirect prematurely while readiness is still undefined', async () => {
    const steps = buildSteps(0)

    await renderHeader({
      currentStepId: '9',
      steps,
      readiness: undefined,
    })

    expect(navigateMock).not.toHaveBeenCalled()
    expect(toastWarningMock).not.toHaveBeenCalled()
  })
})
