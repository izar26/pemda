import apiClient from '@/lib/api-client'
import type { AppConfig, PublicAppConfigResponse, SystemSetting, SystemSettingsResponse } from '@/types/system-setting'

export const systemSettingService = {
  /**
   * Get public application identity and branding configuration.
   */
  async getPublicAppConfig(): Promise<AppConfig> {
    const response = await apiClient.get<PublicAppConfigResponse>('/public/app-config')
    return response.data.data
  },

  /**
   * Get full system settings (requires settings.view permission).
   */
  async getSettings(): Promise<SystemSetting[]> {
    const response = await apiClient.get<SystemSettingsResponse>('/system-settings')
    return response.data.data
  },

  /**
   * Update key-value system settings.
   */
  async updateSettings(settings: Record<string, unknown>): Promise<{ message: string; data: SystemSetting[] }> {
    const response = await apiClient.put<{ message: string; data: SystemSetting[] }>(
      '/system-settings',
      { settings }
    )
    return response.data
  },

  /**
   * Upload and process application official logo.
   */
  async uploadLogo(file: File): Promise<{ message: string; data: { key: string; value: string; url: string } }> {
    const formData = new FormData()
    formData.append('logo', file)

    const response = await apiClient.post<{ message: string; data: { key: string; value: string; url: string } }>(
      '/system-settings/logo',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  },

  /**
   * Delete application logo and restore fallback icon.
   */
  async deleteLogo(): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>('/system-settings/logo')
    return response.data
  },
}
