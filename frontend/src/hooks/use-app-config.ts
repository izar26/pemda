import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemSettingService } from '@/services/system-setting-service'
import type { AppConfig } from '@/types/system-setting'

const STORAGE_KEY = 'manris_public_app_config'

const DEFAULT_CONFIG: AppConfig = {
  app_name: 'Manajemen Resiko',
  instance_name: 'Portal Pemerintah Daerah',
  app_logo_url: null,
  app_favicon_url: null,
  contact_email: 'helpdesk@pemda.go.id',
  contact_phone: '(021) 1234-5678',
  session_lifetime_minutes: 60,
  max_login_attempts: 5,
}

/**
 * Synchronously retrieves cached application configuration from localStorage
 * to eliminate initial render flash of default template content.
 */
function getCachedConfig(): AppConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      if (parsed && typeof parsed === 'object') {
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors and fallback to DEFAULT_CONFIG
  }
  return DEFAULT_CONFIG
}

export function useAppConfig() {
  const initialConfig = getCachedConfig()

  const {
    data: config = initialConfig,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['app-config'],
    queryFn: async () => {
      const liveData = await systemSettingService.getPublicAppConfig()
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(liveData))
      } catch {
        // Ignore localStorage quota errors
      }
      return liveData
    },
    initialData: initialConfig,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  })

  // Synchronize browser tab document.title reactively
  useEffect(() => {
    if (config.app_name) {
      const currentTitle = document.title
      if (
        !currentTitle ||
        currentTitle === 'Aplikasi ManRis' ||
        currentTitle === 'Manajemen Resiko' ||
        currentTitle === 'Portal Layanan Terpadu PEMDA'
      ) {
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
