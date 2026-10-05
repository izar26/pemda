export interface SystemSetting {
  id: string
  key: string
  value: string | null
  typed_value: string | boolean | number | Record<string, unknown>
  group: 'general' | 'security' | 'organization' | string
  type: 'string' | 'boolean' | 'integer' | 'json'
  label: string
  description: string | null
  updated_at?: string
}

export interface SystemSettingsResponse {
  data: SystemSetting[]
}
