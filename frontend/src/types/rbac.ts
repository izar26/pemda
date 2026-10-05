export interface Permission {
  id: string
  name: string
  group: string
  description: string | null
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  users_count: number
  permissions_count: number
  permissions: Permission[]
  created_at: string | null
}

export interface CreateRolePayload {
  name: string
  description?: string | null
  permissions: string[]
}

export interface UpdateRolePayload {
  name: string
  description?: string | null
  permissions: string[]
}

export interface GroupedPermissionsResponse {
  permissions: Record<string, Permission[]>
}
