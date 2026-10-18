export interface SystemSetting {
  id: string
  key: string
  value: string | null
  typed_value: string | boolean | number | Record<string, unknown>
  group: 'general' | 'security' | 'organization' | 'branding' | string
  type: 'string' | 'boolean' | 'integer' | 'json'
  label: string
  description: string | null
  asset_url?: string | null
  updated_at?: string
}

export interface SystemSettingsResponse {
  data: SystemSetting[]
}

export interface AppConfig {
  app_name: string
  instance_name: string
  app_logo_url: string | null
  app_favicon_url: string | null
  contact_email: string
  contact_phone: string
  session_lifetime_minutes?: number
  max_login_attempts?: number
}

export interface PublicAppConfigResponse {
  data: AppConfig
}
