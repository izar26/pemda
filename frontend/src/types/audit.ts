export interface AuditLog {
  id: number
  user_id: number | null
  user_name: string
  user_nip: string | null
  user_email: string | null
  action: string
  module: string
  description: string
  ip_address: string | null
  user_agent: string | null
  context: Record<string, unknown> | null
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
