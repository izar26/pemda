export interface BannerMeta {
  size?: number
  width?: number
  height?: number
  original_name?: string
  mime?: string
}

export interface Banner {
  id: string
  title: string | null
  description: string | null
  image_path: string
  image_url: string
  placement: 'login' | 'homepage' | string
  order: number
  is_active: boolean
  meta?: BannerMeta | null
  creator?: {
    id: string
    name: string
    email: string
  } | null
  created_at: string
  updated_at: string
}

export interface BannerFilters {
  placement?: string
  is_active?: boolean | string
  search?: string
  per_page?: number
}
