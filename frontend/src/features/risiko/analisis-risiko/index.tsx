import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { usePermissions } from '@/hooks/use-permissions'
import { RisikoWizardHeader, RisikoWorkflowBanners } from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import { analisisRisikoApi, type AnalisisData, type AnalisisRow } from './api'
import { AnalisisDialog } from './components/analisis-dialog'
import { AnalisisFooterNav } from './components/analisis-footer-nav'
import { AnalisisList } from './components/analisis-list'

export function AnalisisRisikoPage() {
  const wizard = useRisikoWizardProgress()
  const queryClient = useQueryClient()
  const { hasPermission } = usePermissions()
  const [row, setRow] = useState<AnalisisRow | null>(null)
  const [search, setSearch] = useState('')
  const [source, setSource] = useState('all')
  const [status, setStatus] = useState('')
  const [pagination, setPagination] = useState({ context: '', page: 1 })
  const [submitOpen, setSubmitOpen] = useState(false)
  const opdId = wizard.effectiveOpdId
  const periodeId = wizard.activePeriode?.id
  const context = `${opdId || ''}:${periodeId || ''}`
  const page = pagination.context === context ? pagination.page : 1
  const setPage = (next: number) => setPagination({ context, page: next })
  const key = ['analisis-risiko', opdId, periodeId]
  const result = useQuery({
    queryKey: ['analisis-risiko', opdId, periodeId, page, search, source, status],
    queryFn: () => analisisRisikoApi.list(opdId, periodeId!, page, search, source, status),
    enabled: Boolean(opdId && periodeId),
  })
  const save = useMutation({
    mutationFn: ({ selected, data }: { selected: AnalisisRow; data: AnalisisData }) => analisisRisikoApi.save(selected, data),
    onSuccess: async () => {
      toast.success('Analisis risiko tersimpan.')
      setRow(null)
      await Promise.all([queryClient.invalidateQueries({ queryKey: key }), wizard.refetchWizardProgress()])
    },
    onError: (error: unknown) => toast.error(isAxiosError<{ message?: string }>(error) ? error.response?.data?.message || 'Gagal menyimpan analisis.' : 'Gagal menyimpan analisis.'),
  })
  const canEdit = (item: AnalisisRow) => Boolean(wizard.hasAuditor && wizard.isStepRCACompleted && !wizard.isLocked && !wizard.readiness?.is_4_approved && hasPermission(item.source === '3b' ? 'identifikasi_risiko_opd.edit' : 'identifikasi_risiko_opd_operasional.edit'))
  const lockMessage = !wizard.hasAuditor ? 'Formulir terkunci: belum memiliki Auditor Pengawas yang ditugaskan.' : !wizard.isStepRCACompleted ? 'Lengkapi RCA sebelum mengisi Form 4.' : wizard.readiness?.is_4_approved ? 'Form 4 telah disetujui dan hanya dapat dilihat.' : wizard.isLocked ? 'Formulir sedang dalam pemeriksaan dan hanya dapat dilihat.' : null

  return <>
    <Header fixed><Search className='me-auto' /><NavbarStatus /><ThemeSwitch /><ConfigDrawer /><ProfileDropdown /></Header>
    <Main className='mx-auto min-w-0 max-w-7xl space-y-4 px-3 py-4 sm:space-y-6 sm:px-6 sm:py-6'>
      <RisikoWizardHeader pageTitle='Analisis dan Evaluasi Risiko' formCode='4' stepNumber={7} currentStepId='4' steps={wizard.steps} completedCount={wizard.completedCount} totalSteps={wizard.totalSteps} progressPercentage={wizard.progressPercentage} readiness={wizard.readiness} effectiveOpdId={wizard.effectiveOpdId} activePeriodeId={wizard.activePeriode?.id} onSubmissionSuccess={wizard.refetchWizardProgress} isSubmitDialogOpen={submitOpen} setIsSubmitDialogOpen={setSubmitOpen} />
      <RisikoWorkflowBanners readiness={wizard.readiness} />
      <AnalisisList data={result.data} isLoading={result.isLoading || wizard.isLoading} isError={result.isError} source={source} search={search} status={status} onSource={(value) => { setSource(value); setPage(1) }} onSearch={(value) => { setSearch(value); setPage(1) }} onStatus={(value) => { setStatus(value); setPage(1) }} onPage={setPage} onRetry={() => void result.refetch()} canEdit={canEdit} onOpen={setRow} />
      {!wizard.isLoading && <AnalisisFooterNav allComplete={Boolean(wizard.readiness?.all_forms_complete)} isLocked={wizard.isLocked} lockMessage={lockMessage} />}
    </Main>
    {row && <AnalisisDialog row={row} canEdit={canEdit(row)} isSaving={save.isPending} subUnsur={result.data?.meta.sub_unsur_spip || []} onClose={() => setRow(null)} onSave={(selected, data) => save.mutate({ selected, data })} />}
  </>
}
