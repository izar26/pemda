import {
  Activity,
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  FileCheck,
  FolderTree,
  Layers,
  PieChart,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface ReviewStepPlaceholderProps {
  stepId: string
}

export function ReviewStepPlaceholder({ stepId }: ReviewStepPlaceholderProps) {
  switch (stepId) {
    case '3b':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <ShieldAlert className='h-4 w-4 text-primary shrink-0' />
            <span>
              Lembar Pemeriksaan Identifikasi Risiko Sasaran Strategis Renstra OPD (SPIP / BPKP).
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden shadow-2xs'>
            <table className='w-full text-xs text-start'>
              <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                <tr>
                  <th className='p-2.5 text-start font-semibold'>No</th>
                  <th className='p-2.5 text-start font-semibold'>Sasaran Strategis</th>
                  <th className='p-2.5 text-start font-semibold'>Pernyataan Risiko</th>
                  <th className='p-2.5 text-start font-semibold'>Kategori</th>
                  <th className='p-2.5 text-start font-semibold'>Penyebab Utama</th>
                  <th className='p-2.5 text-start font-semibold'>Dampak Terhadap Sasaran</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-mono text-muted-foreground'>1</td>
                  <td className='p-2.5 font-medium text-foreground'>
                    Peningkatan Kualitas Infrastruktur Permukiman
                  </td>
                  <td className='p-2.5 font-semibold text-destructive'>
                    Keterlambatan penyelesaian proyek fisik akibat cuaca ekstrem & sengketa lahan
                  </td>
                  <td className='p-2.5'>
                    <Badge variant='outline' className='text-[10px]'>
                      Strategis / Fisik
                    </Badge>
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Perencanaan awal belum matang & koordinasi antar stakeholder lambat
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Capaian IKU persentase permukiman layak huni tidak mencapai target Renstra
                  </td>
                </tr>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-mono text-muted-foreground'>2</td>
                  <td className='p-2.5 font-medium text-foreground'>
                    Peningkatan Akuntabilitas Pengelolaan Anggaran
                  </td>
                  <td className='p-2.5 font-semibold text-destructive'>
                    Deviasi realisasi penyerapan anggaran dengan output kinerja riil di lapangan
                  </td>
                  <td className='p-2.5'>
                    <Badge variant='outline' className='text-[10px]'>
                      Keuangan
                    </Badge>
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Kapasitas PPK dan pengawas lapangan dalam pengujian mutu belum seragam
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Potensi temuan audit BPK dan penurunan opini akuntabilitas keuangan
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )

    case '3c':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <FolderTree className='h-4 w-4 text-primary shrink-0' />
            <span>
              Lembar Pemeriksaan Identifikasi Risiko Operasional Kegiatan & Pelayanan Publik OPD.
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden shadow-2xs'>
            <table className='w-full text-xs text-start'>
              <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                <tr>
                  <th className='p-2.5 text-start font-semibold'>Kode Kegiatan</th>
                  <th className='p-2.5 text-start font-semibold'>Tahapan Proses</th>
                  <th className='p-2.5 text-start font-semibold'>Risiko Operasional</th>
                  <th className='p-2.5 text-start font-semibold'>Pengendalian Eksisting</th>
                  <th className='p-2.5 text-start font-semibold'>Status Efektivitas</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-mono text-primary font-bold'>A.1.1</td>
                  <td className='p-2.5 font-medium'>Verifikasi Dokumen Kelayakan Teknis</td>
                  <td className='p-2.5 font-semibold text-destructive'>
                    Keterlambatan verifikasi berkas permohonan masyarakat melebihi SLA standar
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Checklist dokumen manual dan buku ekspedisi fisik
                  </td>
                  <td className='p-2.5'>
                    <Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>
                      Kurang Memadai
                    </Badge>
                  </td>
                </tr>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-mono text-primary font-bold'>A.2.1</td>
                  <td className='p-2.5 font-medium'>Pelaksanaan Pengawasan Konstruksi</td>
                  <td className='p-2.5 font-semibold text-destructive'>
                    Ketidaksesuaian spesifikasi material pekerjaan dengan RAB kontrak
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Uji petik konsultan pengawas dan laporan mingguan
                  </td>
                  <td className='p-2.5'>
                    <Badge className='bg-emerald-500/15 text-emerald-700 text-[10px]'>
                      Cukup Memadai
                    </Badge>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )

    case '4':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <BarChart3 className='h-4 w-4 text-primary shrink-0' />
            <span>
              Matriks Skoring & Analisis Risiko (Kemungkinan 1-5 x Dampak 1-5).
            </span>
          </div>

          <div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
            <div className='p-3 rounded-lg border bg-destructive/10 border-destructive/30 space-y-1 shadow-2xs'>
              <span className='text-[11px] text-destructive font-semibold block'>
                Risiko Tingkat Tinggi (16-25):
              </span>
              <p className='text-2xl font-bold font-mono text-destructive'>2 Risiko</p>
              <p className='text-[10px] text-muted-foreground'>Wajib dilakukan mitigasi segera</p>
            </div>
            <div className='p-3 rounded-lg border bg-amber-500/10 border-amber-500/30 space-y-1 shadow-2xs'>
              <span className='text-[11px] text-amber-700 dark:text-amber-400 font-semibold block'>
                Risiko Tingkat Sedang (10-15):
              </span>
              <p className='text-2xl font-bold font-mono text-amber-700 dark:text-amber-400'>
                4 Risiko
              </p>
              <p className='text-[10px] text-muted-foreground'>Perlu monitoring berkala</p>
            </div>
            <div className='p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 space-y-1 shadow-2xs'>
              <span className='text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold block'>
                Risiko Rendah (1-9):
              </span>
              <p className='text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400'>
                5 Risiko
              </p>
              <p className='text-[10px] text-muted-foreground'>
                Dapat diterima dengan pengendalian eksisting
              </p>
            </div>
          </div>
        </div>
      )

    case '5':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <PieChart className='h-4 w-4 text-primary shrink-0' />
            <span>
              Penetapan Prioritas Risiko & Selera Risiko (Risk Appetite) Pemerintah Daerah.
            </span>
          </div>

          <div className='rounded-lg border p-3 bg-muted/20 space-y-1.5'>
            <div className='flex items-center justify-between border-b pb-1.5'>
              <span className='font-bold text-foreground'>Batas Selera Risiko Pemda:</span>
              <Badge className='bg-primary text-primary-foreground font-mono'>
                Nilai Maksimum: 12 (Sedang)
              </Badge>
            </div>
            <p className='text-muted-foreground leading-relaxed'>
              Semua risiko dengan skor akhir &gt; 12 berada di atas selera risiko dan diwajibkan
              menyusun Rencana Tindak Pengendalian (RTP Form 6) dengan alokasi penanggung jawab
              definitif.
            </p>
          </div>
        </div>
      )

    case '6':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <Layers className='h-4 w-4 text-primary shrink-0' />
            <span>
              Pemeriksaan Rencana Tindak Pengendalian Tambahan (RTP) untuk Menurunkan Level Risiko.
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden shadow-2xs'>
            <table className='w-full text-xs text-start'>
              <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                <tr>
                  <th className='p-2.5 text-start font-semibold'>Uraian Tindak Pengendalian</th>
                  <th className='p-2.5 text-start font-semibold'>Target Output</th>
                  <th className='p-2.5 text-start font-semibold'>Penanggung Jawab (PIC)</th>
                  <th className='p-2.5 text-start font-semibold'>Jadwal Realisasi</th>
                  <th className='p-2.5 text-start font-semibold'>Anggaran</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-semibold text-foreground'>
                    Digitalisasi Layanan Verifikasi Dokumen Terpadu (Aplikasi Web)
                  </td>
                  <td className='p-2.5'>Sistem Informasi Terintegrasi 100%</td>
                  <td className='p-2.5 font-medium'>Kepala Bidang Permukiman</td>
                  <td className='p-2.5 font-mono text-muted-foreground'>Triwulan II 2026</td>
                  <td className='p-2.5 font-mono font-bold text-emerald-600'>Rp 75.000.000</td>
                </tr>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-semibold text-foreground'>
                    Pelatihan Sertifikasi Pengawasan Konstruksi bagi PPK & PPTK
                  </td>
                  <td className='p-2.5'>15 Pegawai Tersertifikasi</td>
                  <td className='p-2.5 font-medium'>Sekretaris Dinas</td>
                  <td className='p-2.5 font-mono text-muted-foreground'>Triwulan III 2026</td>
                  <td className='p-2.5 font-mono font-bold text-emerald-600'>Rp 50.000.000</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )

    case '7':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <Activity className='h-4 w-4 text-primary shrink-0' />
            <span>Monitoring Progres Realisasi Pelaksanaan Rencana Tindak Pengendalian (RTP).</span>
          </div>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
            <div className='p-3 rounded-lg border bg-muted/20 space-y-1 shadow-2xs'>
              <span className='font-bold text-foreground block'>RTP Tuntas Tepat Waktu:</span>
              <p className='text-3xl font-bold font-mono text-emerald-600'>85%</p>
              <p className='text-muted-foreground text-[11px]'>
                Sebagian besar program mitigasi telah diimplementasikan.
              </p>
            </div>
            <div className='p-3 rounded-lg border bg-muted/20 space-y-1 shadow-2xs'>
              <span className='font-bold text-foreground block'>Kendala Lapangan:</span>
              <p className='text-xs text-muted-foreground leading-relaxed'>
                Perubahan regulasi pusat memerlukan penyesuaian petunjuk teknis pelaksanaan pada
                pertengahan triwulan.
              </p>
            </div>
          </div>
        </div>
      )

    case '8':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <AlertTriangle className='h-4 w-4 text-primary shrink-0' />
            <span>Buku Catatan Kejadian Risiko Nyata (Risk Event Register) & Tanggap Darurat.</span>
          </div>
          <div className='p-3 rounded-lg border bg-muted/20 text-muted-foreground leading-relaxed'>
            Tidak tercatat kejadian risiko mayor yang menyebabkan kerugian material atau kegagalan
            pelayanan publik selama periode penilaian berjalan.
          </div>
        </div>
      )

    case '9':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <TrendingUp className='h-4 w-4 text-primary shrink-0' />
            <span>Evaluasi Level Risiko Residual & Tren Dinamika Risiko Periode Berkala.</span>
          </div>
          <div className='p-3 rounded-lg border bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-400 font-medium'>
            Tren risiko residual menunjukkan penurunan sebesar 35% setelah penerapan RTP Form 6.
          </div>
        </div>
      )

    case '10':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <FileCheck className='h-4 w-4 text-primary shrink-0' />
            <span>Kompilasi Laporan Resmi Manajemen Risiko & Pernyataan Efektivitas SPIP.</span>
          </div>
          <div className='p-3 rounded-lg border bg-muted/20 space-y-2 text-muted-foreground leading-relaxed'>
            <p className='font-bold text-foreground'>Pernyataan Efektivitas Pengendalian Intern:</p>
            <p>
              Sistem Pengendalian Intern Pemerintah (SPIP) pada perangkat daerah telah berjalan
              memadai dan mendukung pencapaian sasaran strategis daerah secara tertib dan transparan.
            </p>
          </div>
        </div>
      )

    case 'rca':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-muted/20 text-foreground text-xs flex items-center gap-2 font-medium'>
            <BrainCircuit className='h-4 w-4 text-primary shrink-0' />
            <span>Analisis Akar Masalah (Diagram Tulang Ikan / Fishbone BPKP & 5-Whys).</span>
          </div>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs'>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>1. Man (SDM):</span>
              <span className='text-muted-foreground text-[11px]'>
                Kompetensi teknis pegawai perlu sertifikasi berkala
              </span>
            </div>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>2. Method (SOP):</span>
              <span className='text-muted-foreground text-[11px]'>
                SOP pelayanan belum seluruhnya terintegrasi digital
              </span>
            </div>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>3. Machine (TI):</span>
              <span className='text-muted-foreground text-[11px]'>
                Infrastruktur jaringan server dan backup perlu penguatan
              </span>
            </div>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>4. Material (Data):</span>
              <span className='text-muted-foreground text-[11px]'>
                Basis data spasial perumahan masih tersebar parsial
              </span>
            </div>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>5. Money (Dana):</span>
              <span className='text-muted-foreground text-[11px]'>
                Alokasi pemeliharaan berkala mencukupi standar SPM
              </span>
            </div>
            <div className='p-2.5 rounded-lg border bg-muted/20 space-y-0.5 shadow-2xs'>
              <span className='font-bold block text-primary'>6. Milieu (Eksternal):</span>
              <span className='text-muted-foreground text-[11px]'>
                Kondisi geologis daerah rawan bencana alam
              </span>
            </div>
          </div>
        </div>
      )

    case 'fraud':
      return (
        <div className='space-y-3.5 text-xs'>
          <div className='p-2.5 rounded-lg border bg-destructive/10 border-destructive/30 text-destructive text-xs flex items-center gap-2 font-medium'>
            <ShieldAlert className='h-4 w-4 shrink-0' />
            <span>
              Fraud Risk Assessment (FRA) - Matriks Titik Rawan Kecurangan & Pencegahan Korupsi (BPKP /
              KPK).
            </span>
          </div>

          <div className='rounded-lg border overflow-hidden shadow-2xs'>
            <table className='w-full text-xs text-start'>
              <thead className='bg-muted/40 border-b font-semibold text-muted-foreground'>
                <tr>
                  <th className='p-2.5 text-start font-semibold'>Area Rawan Fraud</th>
                  <th className='p-2.5 text-start font-semibold'>Bentuk Potensi Kecurangan</th>
                  <th className='p-2.5 text-start font-semibold'>Level Risiko</th>
                  <th className='p-2.5 text-start font-semibold'>Sistem Pencegahan Anti-Korupsi</th>
                </tr>
              </thead>
              <tbody className='divide-y'>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-semibold text-foreground'>Pengadaan Barang & Jasa (PBJ)</td>
                  <td className='p-2.5 text-muted-foreground'>
                    Pengondisian pemenang lelang atau pemecahan paket pekerjaan
                  </td>
                  <td className='p-2.5'>
                    <Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge>
                  </td>
                  <td className='p-2.5 font-medium text-foreground'>
                    E-Katalog lokal, probity audit inspektorat, pakta integritas vendor
                  </td>
                </tr>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-semibold text-foreground'>
                    Pelayanan Perizinan & Sertifikasi
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Permintaan imbalan / gratifikasi untuk percepatan penerbitan izin
                  </td>
                  <td className='p-2.5'>
                    <Badge className='bg-amber-500/15 text-amber-700 text-[10px]'>Sedang</Badge>
                  </td>
                  <td className='p-2.5 font-medium text-foreground'>
                    Pembayaran cashless (QRIS/Bank Jabar), CCTV ruang layanan, WBS online
                  </td>
                </tr>
                <tr className='hover:bg-muted/20'>
                  <td className='p-2.5 font-semibold text-foreground'>
                    Pengelolaan Kas & Belanja Hibah
                  </td>
                  <td className='p-2.5 text-muted-foreground'>
                    Keterlambatan penyusunan SPJ atau laporan pertanggungjawaban fiktif
                  </td>
                  <td className='p-2.5'>
                    <Badge className='bg-destructive/15 text-destructive text-[10px]'>Tinggi</Badge>
                  </td>
                  <td className='p-2.5 font-medium text-foreground'>
                    Verifikasi berlapis bendahara, CMS perbankan non-tunai, audit ketaatan
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )

    default:
      return null
  }
}
