import apiClient from '@/lib/api-client'
import type { AuditLogsResponse } from '@/types/audit'

export interface DashboardStats {
  total_instansi: number
  active_instansi: number
  total_pegawai: number
  total_iku?: number
  mitigation_rate: number
  high_risk_count: number
  spip_score: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats')
    return response.data
  },

  async getRecentActivities(limit = 6): Promise<AuditLogsResponse> {
    const response = await apiClient.get<AuditLogsResponse>('/dashboard/recent-activities', {
      params: { limit },
    })
    return response.data
  },
}
