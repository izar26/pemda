import { useMemo } from 'react'
import { AlertCircle, AlertTriangle } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { NavbarStatus } from '@/components/layout/navbar-status'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ConfigDrawer } from '@/components/config-drawer'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Form } from '@/components/ui/form'
import { Skeleton } from '@/components/ui/skeleton'
import { usePermissions } from '@/hooks/use-permissions'
import {
  RisikoWizardHeader,
  RisikoWorkflowBanners,
} from '../shared/risiko-wizard-header'
import { useRisikoWizardProgress } from '../shared/risiko-wizard-store'
import {
  StrategisFields,
  StrategisFooterNav,
  StrategisIdentityCard,
  StrategisImpactDialog,
} from './components'
import { useKonteksStrategisForm } from './hooks/use-konteks-strategis-form'

export function KonteksStrategisPage() {
  const { hasPermission } = usePermissions()

  const {
    user,
    isOpdRole,
    isScopedAuditor,
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
    isLoading,
    readiness,
    hasAuditor,
    isLocked,
    refetchWizardProgress,
  } = useRisikoWizardProgress()

  const is2BApproved = Boolean(readiness?.is_2b_approved)

  const canEdit =
    (hasPermission('konteks_risiko.create') || hasPermission('konteks_risiko.edit')) &&
    hasAuditor &&
    !isLocked &&
    !is2BApproved

  const formState = useKonteksStrategisForm({
    effectiveOpdId,
    activePeriodeId: activePeriode?.id,
    konteks2B,
    opdMeta,
    refetchWizardProgress,
  })

  const resolvedOpdName = useMemo(() => {
    if (isOpdRole) {
      return user?.opd?.nama || konteks2B?.opd?.nama || 'Perangkat Daerah Anda'
    }
    const found = opds.find((o) => String(o.id) === String(effectiveOpdId))
    return found ? `${found.kode} - ${found.nama}` : 'Pilih Perangkat Daerah'
  }, [isOpdRole, user?.opd?.nama, konteks2B?.opd?.nama, opds, effectiveOpdId])

  const resolvedKepalaNama =
    opdMeta?.kepala_opd?.nama || konteks2B?.nama_kepala || 'Belum diatur di Manajemen Pegawai'
  const resolvedKepalaNip =
    opdMeta?.kepala_opd?.nip || konteks2B?.nip_kepala || '-'

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <NavbarStatus />
        <ThemeSwitch />
        <ConfigDrawer />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6 pb-12'>
        {/* Unified Sticky Header: Title + Badges + Progress + Submit + Stepper */}
        <RisikoWizardHeader
          pageTitle='Penetapan Konteks Risiko Strategis OPD'
          formCode='2B'
          stepNumber={1}
          currentStepId='2b'
          steps={steps}
          completedCount={completedCount}
          totalSteps={totalSteps}
          progressPercentage={progressPercentage}
          readiness={readiness}
          effectiveOpdId={effectiveOpdId}
          activePeriodeId={activePeriode?.id}
          onSubmissionSuccess={refetchWizardProgress}
        />

        {/* Workflow Banners (Scrollable underneath the sticky header) */}
        <RisikoWorkflowBanners readiness={readiness} />

        {/* Active Periode Guard */}
        {!isLoading && !activePeriode ? (
          <div className='flex items-start gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-5 text-destructive'>
            <AlertTriangle className='h-5 w-5 shrink-0 mt-0.5' />
            <div className='text-xs space-y-1'>
              <p className='font-bold text-sm'>
                Form Tidak Dapat Diisi: Belum Ada Periode Penilaian Aktif
              </p>
              <p className='text-destructive/90 leading-relaxed'>
                Formulir Penetapan Konteks Risiko Strategis (2B) hanya dapat diisi apabila terdapat Periode Penilaian yang berstatus <strong>Aktif</strong>. Silakan hubungi Administrator / Bapperida untuk mengaktifkan periode penilaian pada menu <strong>Perencanaan Kinerja &rarr; Periode Penilaian</strong>.
              </p>
            </div>
          </div>
        ) : isScopedAuditor && !isLoading && opds.length === 0 ? (
          <div className='rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 flex items-start gap-4'>
            <AlertCircle className='h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5' />
            <div className='space-y-1.5 text-xs text-amber-900 dark:text-amber-200'>
              <p className='font-bold text-sm'>
                Belum Ada Penugasan OPD Binaan
              </p>
              <p className='leading-relaxed'>
                Akun Auditor Anda belum memiliki penugasan Perangkat Daerah (OPD) aktif dari Inspektorat pada periode ini.
                Silakan hubungi administrator Inspektorat untuk menambahkan penugasan pembinaan OPD Anda pada menu <strong>Pengawasan &rarr; Penugasan Auditor</strong>.
              </p>
            </div>
          </div>
        ) : isLoading ? (
          <div className='space-y-4'>
            <Skeleton className='h-44 w-full rounded-xl' />
            <Skeleton className='h-96 w-full rounded-xl' />
          </div>
        ) : (
          <Form {...formState.form}>
            <form
              onSubmit={formState.form.handleSubmit(formState.handleFormSubmit)}
              className='space-y-6'
            >
              {/* CARD 1: IDENTITAS & KONTEKS INSTANSI */}
              <StrategisIdentityCard
                namaPemda={konteks2B?.nama_pemda}
                tahunPenilaian={activePeriode?.tahun_penilaian}
                rentangTahun={activePeriode?.rentang_tahun}
                isOpdRole={isOpdRole}
                isScopedAuditor={isScopedAuditor}
                resolvedOpdName={resolvedOpdName}
                effectiveOpdId={effectiveOpdId}
                onOpdChange={setSelectedOpdId}
                opds={opds}
                resolvedKepalaNama={resolvedKepalaNama}
                resolvedKepalaNip={resolvedKepalaNip}
              />

              {/* CARD 2: FORM CASCADING & NAVIGATION */}
              <div className='rounded-xl border bg-card shadow-2xs overflow-hidden divide-y'>
                <StrategisFields
                  form={formState.form}
                  canEdit={canEdit}
                  watchedSumberDataId={formState.watchedSumberDataId}
                  watchedTujuanId={formState.watchedTujuanId}
                  watchedSasaranIds={formState.watchedSasaranIds}
                  watchedIndikatorIds={formState.watchedIndikatorIds}
                  sumberDataList={formState.sumberDataList}
                  isLoadingSumberData={formState.isLoadingSumberData}
                  tujuanList={formState.tujuanList}
                  isLoadingTujuan={formState.isLoadingTujuan}
                  sasaranList={formState.sasaranList}
                  isLoadingSasaran={formState.isLoadingSasaran}
                  availableIndikators={formState.availableIndikators}
                  isLoadingIndikator={formState.isLoadingIndikator}
                  handleSumberDataChange={formState.handleSumberDataChange}
                  handleTujuanChange={formState.handleTujuanChange}
                  toggleSasaran={formState.toggleSasaran}
                  toggleAllSasaran={formState.toggleAllSasaran}
                  toggleIndikator={formState.toggleIndikator}
                  toggleAllIndikators={formState.toggleAllIndikators}
                />

                <StrategisFooterNav
                  canEdit={canEdit}
                  hasAuditor={hasAuditor}
                  is2BApproved={is2BApproved}
                  isSubmitting={formState.isSubmitting}
                  submitIntent={formState.submitIntent}
                  onSetSubmitIntent={formState.setSubmitIntent}
                />
              </div>
            </form>
          </Form>
        )}
      </Main>

      {/* CRUCIAL CHANGE IMPACT CONFIRMATION DIALOG (2B -> 2C) */}
      <StrategisImpactDialog
        open={Boolean(formState.pendingCrucialPayload)}
        isSubmitting={formState.isSubmitting}
        changedSumberData={Boolean(formState.pendingCrucialPayload?.changedSumberData)}
        changedTujuan={Boolean(formState.pendingCrucialPayload?.changedTujuan)}
        programsCount={opdMeta?.operasional_summary?.programs_count || 0}
        kegiatansCount={opdMeta?.operasional_summary?.kegiatans_count || 0}
        subKegiatansCount={opdMeta?.operasional_summary?.sub_kegiatans_count || 0}
        impactMode={formState.impactMode}
        onImpactModeChange={formState.setImpactMode}
        onCancel={() => formState.setPendingCrucialPayload(null)}
        onConfirm={() => {
          if (!formState.pendingCrucialPayload) return
          formState.executeSave(
            formState.pendingCrucialPayload.values,
            formState.pendingCrucialPayload.intent,
            formState.impactMode === 'reset'
          )
        }}
      />
    </>
  )
}

export { KonteksStrategisPage as KonteksStrategisFeature }
