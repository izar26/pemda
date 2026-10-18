import { z } from 'zod'

export const form2BSchema = z.object({
  sumber_data_id: z.string().min(1, 'Sumber Data wajib dipilih terlebih dahulu.'),
  tujuan_penilaian_id: z
    .string()
    .min(1, 'Tujuan Strategis wajib dipilih (1 OPD hanya 1 Tujuan).'),
  sasaran_ids: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 Sasaran Strategis yang akan dinilai.'),
  indikator_ids: z
    .array(z.string())
    .min(1, 'Pilih minimal 1 IKU / Indikator Renstra OPD yang akan dinilai.'),
  informasi_lain: z.string().optional(),
})

export type Form2BValues = z.infer<typeof form2BSchema>
