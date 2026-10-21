import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { systemSettingService } from '@/services/system-setting-service'
import type { AppConfig } from '@/types/system-setting'

const STORAGE_KEY = 'manris_public_app_config'

const DEFAULT_CONFIG: AppConfig = {
  app_name: 'Manajemen Resiko',
  instance_name: 'Kabupaten Cianjur',
  app_logo_url: null,
  app_favicon_url: null,
  contact_email: 'helpdesk@pemda.go.id',
  contact_phone: '(021) 1234-5678',
  session_lifetime_minutes: 60,
  max_login_attempts: 5,
}

/**
 * Synchronously retrieves cached application configuration from localStorage.
 * Returns null if not cached so useQuery knows it is a cold start.
 */
function getCachedConfig(): AppConfig | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppConfig>
      if (parsed && typeof parsed === 'object' && parsed.app_name) {
        return {
          ...DEFAULT_CONFIG,
          ...parsed,
        }
      }
    }
  } catch {
    // Ignore localStorage parse errors
  }
  return undefined
}

export function useAppConfig() {
  const cachedConfig = getCachedConfig()

  const {
    data: config = cachedConfig || DEFAULT_CONFIG,
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
    // Use placeholderData so background query ALWAYS fires on mount to get live data from server
    placeholderData: cachedConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    isLoading: isLoading && !cachedConfig,
    isError,
    refetch,
  }
}
