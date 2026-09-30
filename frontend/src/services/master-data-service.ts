import apiClient from '@/lib/api-client'
import type {
  MasterDataBaseItem,
  MasterDataPayload,
  MasterDataResponse,
  MasterEntityKey,
} from '@/types/master-data'

export interface MasterQueryParams {
  search?: string
  is_active?: string | boolean
  unsur_spip_id?: number
}

export const masterDataService = {
  /**
   * Get list of records for a specific master entity
   */
  async getItems(
    entity: MasterEntityKey,
    params?: MasterQueryParams
  ): Promise<MasterDataResponse> {
    const response = await apiClient.get<MasterDataResponse>(`/master/${entity}`, {
      params,
    })
    return response.data
  },

  /**
   * Get single item
   */
  async getItem(
    entity: MasterEntityKey,
    id: number
  ): Promise<{ data: MasterDataBaseItem }> {
    const response = await apiClient.get<{ data: MasterDataBaseItem }>(
      `/master/${entity}/${id}`
    )
    return response.data
  },

  /**
   * Create new item
   */
  async createItem(
    entity: MasterEntityKey,
    payload: MasterDataPayload
  ): Promise<{ message: string; data: MasterDataBaseItem }> {
    const response = await apiClient.post<{
      message: string
      data: MasterDataBaseItem
    }>(`/master/${entity}`, payload)
    return response.data
  },

  /**
   * Update existing item
   */
  async updateItem(
    entity: MasterEntityKey,
    id: number,
    payload: MasterDataPayload
  ): Promise<{ message: string; data: MasterDataBaseItem }> {
    const response = await apiClient.put<{
      message: string
      data: MasterDataBaseItem
    }>(`/master/${entity}/${id}`, payload)
    return response.data
  },

  /**
   * Toggle is_active status
   */
  async toggleActive(
    entity: MasterEntityKey,
    id: number
  ): Promise<{ message: string; data: MasterDataBaseItem }> {
    const response = await apiClient.patch<{
      message: string
      data: MasterDataBaseItem
    }>(`/master/${entity}/${id}/toggle`)
    return response.data
  },

  /**
   * Delete item
   */
  async deleteItem(
    entity: MasterEntityKey,
    id: number
  ): Promise<{ message: string }> {
    const response = await apiClient.delete<{ message: string }>(
      `/master/${entity}/${id}`
    )
    return response.data
  },
}
