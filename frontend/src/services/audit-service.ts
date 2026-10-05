import apiClient from '@/lib/api-client'
import type {
  ArchivePurgeResponse,
  AuditArchivesResponse,
  AuditLifecycleStats,
  AuditLogsResponse,
} from '@/types/audit'

export interface AuditLogFilters {
  page?: number
  per_page?: number
  search?: string
  module?: string
  action?: string
  date_from?: string
  date_to?: string
}

export interface ArchivePurgeParams {
  ids?: string[]
  exclude_ids?: string[]
  filters?: {
    search?: string
    module?: string
    action?: string
    date_from?: string
    date_to?: string
    days?: number
  }
  days?: number
  cutoff_date?: string
}

export const auditService = {
  async getLogs(filters: AuditLogFilters = {}): Promise<AuditLogsResponse> {
    const response = await apiClient.get<AuditLogsResponse>('/audit-logs', {
      params: filters,
    })
    return response.data
  },

  async getArchives(filters: AuditLogFilters = {}): Promise<AuditArchivesResponse> {
    const response = await apiClient.get<AuditArchivesResponse>('/audit-logs/archives', {
      params: filters,
    })
    return response.data
  },

  async triggerArchivePurge(params: ArchivePurgeParams): Promise<ArchivePurgeResponse> {
    const response = await apiClient.post<ArchivePurgeResponse>('/audit-logs/archive-purge', params)
    return response.data
  },

  async getStats(): Promise<{ data: AuditLifecycleStats }> {
    const response = await apiClient.get<{ data: AuditLifecycleStats }>('/audit-logs/stats')
    return response.data
  },
}
