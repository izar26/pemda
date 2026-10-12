import apiClient from '@/lib/api-client'

export interface DashboardStats {
  total_instansi: number
  active_instansi: number
  total_pegawai: number
  mitigation_rate: number
  high_risk_count: number
  spip_score: number
}

export const dashboardService = {
  async getStats(): Promise<DashboardStats> {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats')
    return response.data
  },
}
