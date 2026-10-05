export interface AuditDiffItem {
  old: unknown
  new: unknown
}

export interface AuditContext {
  action_type?: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | string
  entity_name?: string
  record_title?: string
  entity_id?: number | string
  changes?: Record<string, AuditDiffItem>
  snapshot?: Record<string, unknown>
  attributes?: Record<string, unknown>
  old?: Record<string, unknown>
  new?: Record<string, unknown>
  [key: string]: unknown
}

export interface AuditLog {
  id: string
  user_id: string | null
  user_name: string
  user_nip: string | null
  user_email: string | null
  action: string
  module: string
  auditable_type?: string | null
  auditable_id?: string | number | null
  description: string
  ip_address: string | null
  user_agent: string | null
  context: AuditContext | null
  created_at: string
}

export interface AuditLogArchive extends AuditLog {
  original_audit_id?: string | null
  archived_at: string
  archived_by?: string | null
}

export interface AuditLogsResponse {
  data: AuditLog[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface AuditArchivesResponse {
  data: AuditLogArchive[]
  meta?: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

export interface AuditLifecycleStats {
  active_logs_count: number
  archived_logs_count: number
  oldest_active_log: string | null
  newest_active_log: string | null
  last_archived_at: string | null
}

export interface ArchivePurgeResponse {
  message: string
  archived_count: number
  mode: 'selected_ids' | 'filter_criteria' | 'retention_threshold'
  cutoff_date?: string
}
