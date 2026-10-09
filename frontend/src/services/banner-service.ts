import apiClient from '@/lib/api-client'
import type { Banner, BannerFilters } from '@/types/banner'

export const bannerService = {
  /**
   * Fetch active banners for public display (unauthenticated)
   */
  async getPublicBanners(placement: string = 'login'): Promise<Banner[]> {
    const response = await apiClient.get<{ data: Banner[] }>('/content/banners/public', {
      params: { placement },
    })
    return response.data.data
  },

  /**
   * Fetch banners for admin panel with pagination & filters
   */
  async getBanners(filters?: BannerFilters): Promise<{ data: Banner[]; meta?: any }> {
    const response = await apiClient.get<{ data: Banner[]; meta?: any }>('/content/banners', {
      params: filters,
    })
    return response.data
  },

  /**
   * Upload & create new banner
   */
  async createBanner(formData: FormData): Promise<Banner> {
    const response = await apiClient.post<{ message: string; data: Banner }>(
      '/content/banners',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  /**
   * Update existing banner
   */
  async updateBanner(id: string, formData: FormData): Promise<Banner> {
    // Use POST with _method=PUT to safely handle file upload in Laravel
    formData.append('_method', 'PUT')
    const response = await apiClient.post<{ message: string; data: Banner }>(
      `/content/banners/${id}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  /**
   * Toggle is_active status
   */
  async toggleActive(id: string): Promise<Banner> {
    const response = await apiClient.patch<{ message: string; data: Banner }>(
      `/content/banners/${id}/toggle-active`
    )
    return response.data.data
  },

  /**
   * Reorder banners
   */
  async reorderBanners(bannerIds: string[]): Promise<void> {
    await apiClient.post('/content/banners/reorder', {
      banner_ids: bannerIds,
    })
  },

  /**
   * Delete banner
   */
  async deleteBanner(id: string): Promise<void> {
    await apiClient.delete(`/content/banners/${id}`)
  },
}
