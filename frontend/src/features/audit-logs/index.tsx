import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  Database,
  History,
  Loader2,
  Lock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { auditService } from '@/services/audit-service'
import { useAuthStore } from '@/stores/auth-store'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AuditLogsTable } from './components/audit-logs-table'
import { AuditLogsDialogs } from './components/audit-logs-dialogs'
import { AuditPurgeDialog } from './components/audit-purge-dialog'
import { AuditLogsProvider } from './components/audit-logs-provider'

function AuditLogsContent() {
  const user = useAuthStore((s) => s.auth.user)
  const isSuperadmin =
    (user?.roles?.includes('Superadmin') || user?.role === 'Superadmin') ?? false

  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active')
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false)

  // 1. Fetch active operational logs
  const {
    data: logsResponse,
    isLoading: isLoadingActive,
    isRefetching: isRefetchingActive,
    refetch: refetchActive,
  } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () =>
      auditService.getLogs({
        per_page: 200,
      }),
  })

  // 2. Fetch archive vault logs (only if Superadmin and tab is archive)
  const {
    data: archivesResponse,
    isLoading: isLoadingArchive,
    isRefetching: isRefetchingArchive,
    refetch: refetchArchive,
  } = useQuery({
    queryKey: ['audit-archives'],
    queryFn: () =>
      auditService.getArchives({
        per_page: 200,
      }),
    enabled: isSuperadmin && activeTab === 'archive',
  })

  const logs = logsResponse?.data || []
  const archives = archivesResponse?.data || []

  const isLoading = activeTab === 'active' ? isLoadingActive : isLoadingArchive
  const isRefetching = activeTab === 'active' ? isRefetchingActive : isRefetchingArchive

  function handleRefresh() {
    if (activeTab === 'active') {
      refetchActive()
    } else {
      refetchArchive()
    }
  }

  return (
    <>
      <Header fixed>
        <Search className='me-auto' />
        <ThemeSwitch />
        <ProfileDropdown />
      </Header>

      <Main className='flex flex-1 flex-col gap-5 sm:gap-6'>
        {/* Header Title & Actions */}
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4'>
          <div className='space-y-0.5 min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              <h2 className='text-2xl font-bold tracking-tight text-foreground'>
                Rekam Jejak & Log Audit Keamanan
              </h2>
              {isSuperadmin && activeTab === 'archive' && (
                <Badge
                  variant='outline'
                  className='bg-emerald-500/10 text-emerald-600 border-emerald-300 dark:border-emerald-800 text-xs px-2 py-0.5 font-medium'
                >
                  <Lock className='h-3 w-3 mr-1 inline' />
                  Kubah Arsip (WORM)
                </Badge>
              )}
            </div>
            <p className='text-xs text-muted-foreground'>
              Transparansi riwayat aktivitas pengguna, sesi autentikasi, dan perubahan hak akses sistem.
            </p>
          </div>

          <div className='flex items-center gap-2 shrink-0'>
            {isSuperadmin && (
              <Button
                variant='outline'
                size='sm'
                className='h-9 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5 hover:text-primary'
                onClick={() => setPurgeDialogOpen(true)}
              >
                <Archive className='h-3.5 w-3.5' />
                Arsipkan & Bersihkan Log
              </Button>
            )}

            <Button
              variant='outline'
              size='sm'
              className='h-9 text-xs'
              onClick={handleRefresh}
              disabled={isLoading || isRefetching}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 mr-1.5 ${isRefetching ? 'animate-spin' : ''}`}
              />
              Segarkan
            </Button>
          </div>
        </div>

        {/* Superadmin Tab Navigation */}
        {isSuperadmin ? (
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as 'active' | 'archive')}
            className='space-y-4'
          >
            <TabsList className='grid w-full sm:w-auto sm:inline-grid grid-cols-2 h-9 p-1 bg-muted/60'>
              <TabsTrigger
                value='active'
                className='text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
              >
                <Database className='h-3.5 w-3.5' />
                Log Operasional (Aktif)
              </TabsTrigger>
              <TabsTrigger
                value='archive'
                className='text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-xs'
              >
                <History className='h-3.5 w-3.5' />
                Kubah Arsip Permanen (WORM)
              </TabsTrigger>
            </TabsList>

            <TabsContent value='active' className='space-y-4 m-0'>
              {isLoadingActive ? (
                <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                  <p className='text-xs text-muted-foreground'>
                    Memuat data log audit aktif...
                  </p>
                </div>
              ) : (
                <AuditLogsTable data={logs} isArchiveTab={false} totalCount={logsResponse?.meta?.total} />
              )}
            </TabsContent>

            <TabsContent value='archive' className='space-y-4 m-0'>
              {/* Security Banner for Archive Vault */}
              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-950 dark:border-emerald-900/60 dark:bg-emerald-950/20 dark:text-emerald-200'>
                <div className='flex items-center gap-2'>
                  <ShieldCheck className='h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0' />
                  <span>
                    <strong>Kubah Arsip Permanen (Superadmin Only):</strong> Seluruh catatan di halaman ini dilindungi oleh proteksi trigger database tingkat mesin. Catatan bersifat abadi dan dilarang dihapus atau diubah oleh siapapun.
                  </span>
                </div>
                <Badge
                  variant='outline'
                  className='bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 text-[11px] w-fit shrink-0'
                >
                  Terproteksi WORM
                </Badge>
              </div>

              {isLoadingArchive ? (
                <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                  <p className='text-xs text-muted-foreground'>
                    Membuka kubah arsip log audit permanen...
                  </p>
                </div>
              ) : (
                <AuditLogsTable data={archives} isArchiveTab={true} totalCount={archivesResponse?.meta?.total} />
              )}
            </TabsContent>
          </Tabs>
        ) : (
          /* Non-superadmin view: Regular active logs only */
          isLoadingActive ? (
            <div className='flex flex-col items-center justify-center h-64 gap-2 rounded-lg border bg-card/50'>
              <Loader2 className='h-8 w-8 animate-spin text-primary' />
              <p className='text-xs text-muted-foreground'>
                Memuat data log audit keamanan...
              </p>
            </div>
          ) : (
            <AuditLogsTable data={logs} isArchiveTab={false} totalCount={logsResponse?.meta?.total} />
          )
        )}
      </Main>

      {/* Shared Detail Sheet */}
      <AuditLogsDialogs />

      {/* Superadmin Archive & Purge Dialog */}
      {isSuperadmin && (
        <AuditPurgeDialog
          open={purgeDialogOpen}
          onOpenChange={setPurgeDialogOpen}
        />
      )}
    </>
  )
}

export function AuditLogs() {
  return (
    <AuditLogsProvider>
      <AuditLogsContent />
    </AuditLogsProvider>
  )
}

export default AuditLogs
