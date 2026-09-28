import { z } from 'zod'

export const userStatusSchema = z.enum([
  'active',
  'inactive',
  'suspended',
  'pending_activation',
])
export type UserStatus = z.infer<typeof userStatusSchema>

export const opdSchema = z.object({
  id: z.number(),
  nama: z.string(),
  kode: z.string(),
  kategori: z.string(),
  kepala: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
})
export type Opd = z.infer<typeof opdSchema>

export const userSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string().email(),
  nip: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  pangkat_gol: z.string().nullable().optional(),
  jabatan: z.string().nullable().optional(),
  opd_id: z.number().nullable().optional(),
  opd: opdSchema.nullable().optional(),
  role: z.string(),
  roles: z.array(z.string()).optional(),
  permissions: z.array(z.string()).optional(),
  status: userStatusSchema,
  is_pending_activation: z.boolean().optional(),
  invitation_sent_at: z.string().nullable().optional(),
  two_factor_enabled: z.boolean(),
  last_login_at: z.string().nullable().optional(),
  last_login_ip: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type User = z.infer<typeof userSchema>
