import apiClient from '@/lib/api-client'
import type {
  CreateRolePayload,
  GroupedPermissionsResponse,
  Role,
  UpdateRolePayload,
} from '@/types/rbac'

export const rbacService = {
  /**
   * Get all roles
   */
  async getRoles(): Promise<Role[]> {
    const response = await apiClient.get<{ data: Role[] }>('/roles')
    return response.data.data
  },

  /**
   * Get single role details with permissions
   */
  async getRole(id: number): Promise<Role> {
    const response = await apiClient.get<{ data: Role }>(`/roles/${id}`)
    return response.data.data
  },

  /**
   * Create new dynamic role
   */
  async createRole(
    payload: CreateRolePayload
  ): Promise<{ message: string; role: Role }> {
    const response = await apiClient.post<{ message: string; role: Role }>(
      '/roles',
      payload
    )
    return response.data
  },

  /**
   * Update existing role & permissions
   */
  async updateRole(
    id: number,
    payload: UpdateRolePayload
  ): Promise<{ message: string; role: Role }> {
    const response = await apiClient.put<{ message: string; role: Role }>(
      `/roles/${id}`,
      payload
    )
    return response.data
  },

  /**
   * Delete custom role
   */
  async deleteRole(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/roles/${id}`)
    return response.data
  },

  /**
   * Get master permissions grouped by category
   */
  async getGroupedPermissions(): Promise<Record<string, Role['permissions']>> {
    const response = await apiClient.get<GroupedPermissionsResponse>(
      '/permissions'
    )
    return response.data.permissions
  },
}
