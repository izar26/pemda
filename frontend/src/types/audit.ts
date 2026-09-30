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
  id: number
  user_id: number | null
  user_name: string
  user_nip: string | null
  user_email: string | null
  action: string
  module: string
  auditable_type?: string | null
  auditable_id?: number | null
  description: string
  ip_address: string | null
  user_agent: string | null
  context: AuditContext | null
  created_at: string
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
