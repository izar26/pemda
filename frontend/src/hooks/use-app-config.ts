import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemSettingService } from '@/services/system-setting-service'
import type { AppConfig } from '@/types/system-setting'

const DEFAULT_CONFIG: AppConfig = {
  app_name: 'Aplikasi ManRis',
  instance_name: 'Manajemen Risiko PEMDA',
  app_logo_url: null,
  app_favicon_url: null,
  contact_email: 'helpdesk@pemda.go.id',
  contact_phone: '(021) 1234-5678',
  session_lifetime_minutes: 60,
  max_login_attempts: 5,
}

export function useAppConfig() {
  const {
    data: config = DEFAULT_CONFIG,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['app-config'],
    queryFn: () => systemSettingService.getPublicAppConfig(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })

  // Synchronize browser tab document.title reactively
  useEffect(() => {
    if (config.app_name) {
      const currentTitle = document.title
      if (!currentTitle || currentTitle === 'Aplikasi ManRis' || currentTitle === 'Portal Layanan Terpadu PEMDA') {
        document.title = config.app_name
      }
    }
  }, [config.app_name])

  return {
    config,
    appName: config.app_name || DEFAULT_CONFIG.app_name,
    instanceName: config.instance_name || DEFAULT_CONFIG.instance_name,
    appLogoUrl: config.app_logo_url,
    appFaviconUrl: config.app_favicon_url,
    contactEmail: config.contact_email,
    contactPhone: config.contact_phone,
    sessionLifetimeMinutes: config.session_lifetime_minutes ?? 60,
    maxLoginAttempts: config.max_login_attempts ?? 5,
    isLoading,
    isError,
    refetch,
  }
}
