import apiClient from '@/lib/api-client'
import type { User, UserStatus } from '@/features/users/data/schema'

export interface CreateUserPayload {
  name: string
  email: string
  nip?: string
  phone?: string
  role: string
  status?: UserStatus
  password?: string
}

export interface UpdateUserPayload {
  name: string
  email: string
  nip?: string
  phone?: string
  role: string
  status: UserStatus
  password?: string
}

export interface UserQueryParams {
  search?: string
  role?: string
  status?: string
  page?: number
  per_page?: number
  sort_by?: string
  sort_direction?: 'asc' | 'desc'
}

export interface PaginatedUsersResponse {
  data: User[]
  links: {
    first: string | null
    last: string | null
    prev: string | null
    next: string | null
  }
  meta: {
    current_page: number
    from: number | null
    last_page: number
    per_page: number
    to: number | null
    total: number
  }
}

export interface InviteUserPayload {
  name: string
  email: string
  role: string
  notes?: string
}

export interface InviteUserResponse {
  message: string
  user: User
  activation_url?: string
}

export const userService = {
  async getUsers(params?: UserQueryParams): Promise<PaginatedUsersResponse> {
    const response = await apiClient.get<PaginatedUsersResponse>('/users', { params })
    return response.data
  },

  async getUser(id: number): Promise<User> {
    const response = await apiClient.get<{ data: User }>(`/users/${id}`)
    return response.data.data
  },

  async createUser(payload: CreateUserPayload): Promise<User> {
    const response = await apiClient.post<{ data: User }>('/users', payload)
    return response.data.data
  },

  async updateUser(id: number, payload: UpdateUserPayload): Promise<User> {
    const response = await apiClient.put<{ data: User }>(`/users/${id}`, payload)
    return response.data.data
  },

  async deleteUser(id: number): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(`/users/${id}`)
    return response.data
  },

  async resetTwoFactor(id: number): Promise<{ message: string }> {
    const response = await apiClient.post<{ message: string }>(`/users/${id}/reset-2fa`)
    return response.data
  },

  async inviteUser(payload: InviteUserPayload): Promise<InviteUserResponse> {
    const response = await apiClient.post<InviteUserResponse>('/users/invite', payload)
    return response.data
  },

  async resendInvitation(id: number): Promise<{ message: string; activation_url?: string }> {
    const response = await apiClient.post<{ message: string; activation_url?: string }>(
      `/users/${id}/resend-invitation`
    )
    return response.data
  },
}

