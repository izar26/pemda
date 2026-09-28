import apiClient from '@/lib/api-client'
import type { SystemSetting } from '@/types/system-setting'

export const systemSettingService = {
  async getSettings(): Promise<SystemSetting[]> {
    const response = await apiClient.get<{ data: SystemSetting[] }>('/system-settings')
    return response.data.data
  },

  async updateSettings(settings: Record<string, unknown>): Promise<{ message: string; data: SystemSetting[] }> {
    const response = await apiClient.put<{ message: string; data: SystemSetting[] }>(
      '/system-settings',
      { settings }
    )
    return response.data
  },
}
