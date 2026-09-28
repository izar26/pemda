export interface PangkatGolonganOption {
  value: string
  label: string
  golongan: string
}

export const PANGKAT_GOLONGAN_OPTIONS: PangkatGolonganOption[] = [
  // Golongan IV (Pembina)
  { value: 'Pembina Utama (IV/e)', label: 'Pembina Utama (IV/e)', golongan: 'Golongan IV' },
  { value: 'Pembina Utama Madya (IV/d)', label: 'Pembina Utama Madya (IV/d)', golongan: 'Golongan IV' },
  { value: 'Pembina Utama Muda (IV/c)', label: 'Pembina Utama Muda (IV/c)', golongan: 'Golongan IV' },
  { value: 'Pembina Tingkat I (IV/b)', label: 'Pembina Tingkat I (IV/b)', golongan: 'Golongan IV' },
  { value: 'Pembina (IV/a)', label: 'Pembina (IV/a)', golongan: 'Golongan IV' },

  // Golongan III (Penata)
  { value: 'Penata Tingkat I (III/d)', label: 'Penata Tingkat I (III/d)', golongan: 'Golongan III' },
  { value: 'Penata (III/c)', label: 'Penata (III/c)', golongan: 'Golongan III' },
  { value: 'Penata Muda Tingkat I (III/b)', label: 'Penata Muda Tingkat I (III/b)', golongan: 'Golongan III' },
  { value: 'Penata Muda (III/a)', label: 'Penata Muda (III/a)', golongan: 'Golongan III' },

  // Golongan II (Pengatur)
  { value: 'Pengatur Tingkat I (II/d)', label: 'Pengatur Tingkat I (II/d)', golongan: 'Golongan II' },
  { value: 'Pengatur (II/c)', label: 'Pengatur (II/c)', golongan: 'Golongan II' },
  { value: 'Pengatur Muda Tingkat I (II/b)', label: 'Pengatur Muda Tingkat I (II/b)', golongan: 'Golongan II' },
  { value: 'Pengatur Muda (II/a)', label: 'Pengatur Muda (II/a)', golongan: 'Golongan II' },

  // Golongan I (Juru)
  { value: 'Juru Tingkat I (I/d)', label: 'Juru Tingkat I (I/d)', golongan: 'Golongan I' },
  { value: 'Juru (I/c)', label: 'Juru (I/c)', golongan: 'Golongan I' },
  { value: 'Juru Muda Tingkat I (I/b)', label: 'Juru Muda Tingkat I (I/b)', golongan: 'Golongan I' },
  { value: 'Juru Muda (I/a)', label: 'Juru Muda (I/a)', golongan: 'Golongan I' },

  // Pegawai Non-PNS
  { value: 'PPPK', label: 'PPPK (Pegawai Pemerintah dengan Perjanjian Kerja)', golongan: 'Lainnya' },
  { value: 'Non-ASN / Tenaga Kontrak', label: 'Non-ASN / Tenaga Kontrak / Honorer', golongan: 'Lainnya' },
]
