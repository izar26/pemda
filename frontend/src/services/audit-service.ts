import apiClient from '@/lib/api-client'
import type { AuditLogsResponse } from '@/types/audit'

export interface AuditLogFilters {
  page?: number
  per_page?: number
  search?: string
  module?: string
  action?: string
  date_from?: string
  date_to?: string
}

export const auditService = {
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const response = await apiClient.get<AuditLogsResponse>('/audit-logs', {
      params: filters,
    })
    return response.data
  },
}
