import { useState } from 'react'
import {
  Check,
  Copy,
  Download,
  KeyRound,
  Loader2,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { useAuthStore } from '@/stores/auth-store'
import { authService } from '@/services/auth-service'
import type { TwoFactorSetupResponse } from '@/types/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/password-input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function TwoFactorSection() {
  const user = useAuthStore((state) => state.auth.user)
  const setUser = useAuthStore((state) => state.auth.setUser)

  const isEnabled = Boolean(user?.two_factor_enabled)

  // Setup state
  const [openSetup, setOpenSetup] = useState(false)
  const [setupStep, setSetupStep] = useState<'scan' | 'recovery_codes'>('scan')
  const [isGenerating, setIsGenerating] = useState(false)
  const [setupData, setSetupData] = useState<TwoFactorSetupResponse | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [isConfirming, setIsConfirming] = useState(false)
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [newlyIssuedCodes, setNewlyIssuedCodes] = useState<string[]>([])

  // Disable state
  const [openDisable, setOpenDisable] = useState(false)
  const [disablePassword, setDisablePassword] = useState('')
  const [isDisabling, setIsDisabling] = useState(false)

  // View Recovery Codes state
  const [openCodes, setOpenCodes] = useState(false)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [isLoadingCodes, setIsLoadingCodes] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)

  // Start 2FA Setup
  async function handleStartSetup() {
    setOpenSetup(true)
    setSetupStep('scan')
    setIsGenerating(true)
    setConfirmCode('')
    setNewlyIssuedCodes([])

    try {
      const data = await authService.setupTwoFactor()
      setSetupData(data)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal menyiapkan Google Authenticator. Silakan coba lagi.'
      toast.error(msg)
      setOpenSetup(false)
    } finally {
      setIsGenerating(false)
    }
  }

  // Copy secret key
  function handleCopySecret() {
    if (!setupData?.secret) return
    navigator.clipboard.writeText(setupData.secret)
    setCopiedSecret(true)
    toast.success('Kunci rahasia disalin ke clipboard.')
    setTimeout(() => setCopiedSecret(false), 2000)
  }

  // Copy all recovery codes
  function handleCopyCodes(codes: string[]) {
    navigator.clipboard.writeText(codes.join('\n'))
    toast.success('Seluruh kode pemulihan berhasil disalin.')
  }

  // Download recovery codes as text file
  function handleDownloadCodes(codes: string[]) {
    const text = `KODE PEMULIHAN DARURAT (RECOVERY CODES) - PORTAL PEMDA\nPegawai: ${user?.name || user?.email}\nNIP: ${user?.nip || '-'}\nTanggal Dibuat: ${new Date().toLocaleString('id-ID')}\n\n${codes.join('\n')}\n\n* PERINGATAN KEAMANAN:\n- Setiap kode hanya dapat digunakan 1 kali saat darurat jika kehilangan akses ponsel.\n- Simpan file ini di lokasi yang aman dan tidak dapat diakses orang lain.`
    const element = document.createElement('a')
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' })
    element.href = URL.createObjectURL(file)
    element.download = `pemda-2fa-recovery-codes-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
    toast.success('File kode pemulihan darurat berhasil diunduh.')
  }

  // Confirm and activate 2FA
  async function handleConfirmSetup() {
    if (!confirmCode || confirmCode.trim().length !== 6) {
      toast.error('Masukkan 6-digit kode verifikasi dari Google Authenticator.')
      return
    }

    setIsConfirming(true)
    try {
      const response = await authService.confirmTwoFactor(confirmCode.trim())

      if (user) {
        setUser({ ...user, two_factor_enabled: true })
      }

      // Store issued recovery codes and switch to recovery codes showcase step
      setNewlyIssuedCodes(response.recovery_codes)
      setSetupStep('recovery_codes')
      toast.success('Google Authenticator berhasil diverifikasi dan diaktifkan!')
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Kode verifikasi tidak valid. Pastikan waktu pada jam ponsel Anda akurat.'
      toast.error(msg)
    } finally {
      setIsConfirming(false)
    }
  }

  // Open view recovery codes
  async function handleViewCodes() {
    setOpenCodes(true)
    setIsLoadingCodes(true)
    try {
      const data = await authService.getRecoveryCodes()
      setRecoveryCodes(data.recovery_codes)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal memuat kode pemulihan.'
      toast.error(msg)
      setOpenCodes(false)
    } finally {
      setIsLoadingCodes(false)
    }
  }

  // Regenerate recovery codes
  async function handleRegenerateCodes() {
    setIsRegenerating(true)
    try {
      const data = await authService.regenerateRecoveryCodes()
      setRecoveryCodes(data.recovery_codes)
      toast.success('Kode pemulihan darurat baru berhasil dibuat.')
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal membuat kode pemulihan baru.'
      toast.error(msg)
    } finally {
      setIsRegenerating(false)
    }
  }

  // Confirm disable 2FA
  async function handleConfirmDisable() {
    if (!disablePassword) {
      toast.error('Masukkan kata sandi saat ini untuk konfirmasi.')
      return
    }

    setIsDisabling(true)
    try {
      await authService.disableTwoFactor(disablePassword)

      if (user) {
        setUser({ ...user, two_factor_enabled: false })
      }

      toast.success('Google Authenticator berhasil dinonaktifkan.')
      setOpenDisable(false)
      setDisablePassword('')
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Kata sandi salah. Gagal menonaktifkan 2FA.'
      toast.error(msg)
    } finally {
      setIsDisabling(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader className='pb-3'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              {isEnabled ? (
                <ShieldCheck className='h-5 w-5 text-emerald-600' />
              ) : (
                <ShieldAlert className='h-5 w-5 text-amber-500' />
              )}
              <CardTitle className='text-base font-semibold'>
                Autentikasi Dua Faktor (Google Authenticator)
              </CardTitle>
            </div>
            {isEnabled ? (
              <Badge
                variant='outline'
                className='border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
              >
                Aktif
              </Badge>
            ) : (
              <Badge variant='secondary' className='text-muted-foreground'>
                Belum Aktif
              </Badge>
            )}
          </div>
          <CardDescription className='text-xs'>
            Tingkatkan keamanan akun Anda dengan verifikasi dua langkah (2FA TOTP). Setiap kali
            masuk, Anda akan diminta memasukkan kode 6 digit dari aplikasi Google Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isEnabled ? (
            <div className='flex flex-wrap items-center gap-3 pt-1'>
              <Button
                variant='outline'
                size='sm'
                onClick={handleViewCodes}
                className='text-xs'
              >
                <KeyRound className='mr-1.5 h-3.5 w-3.5' />
                Lihat Kode Cadangan Darurat
              </Button>
              <Button
                variant='destructive'
                size='sm'
                onClick={() => setOpenDisable(true)}
                className='text-xs'
              >
                Nonaktifkan 2FA
              </Button>
            </div>
          ) : (
            <div className='pt-1'>
              <Button onClick={handleStartSetup} size='sm' className='text-xs'>
                <ShieldCheck className='mr-1.5 h-4 w-4' />
                Aktifkan Google Authenticator
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL SETUP 2FA */}
      <Dialog
        open={openSetup}
        onOpenChange={(open) => {
          // If in recovery codes view, user should intentionally close after saving
          if (!open && setupStep === 'recovery_codes') {
            setOpenSetup(false)
          } else {
            setOpenSetup(open)
          }
        }}
      >
        <DialogContent className='sm:max-w-lg'>
          {setupStep === 'scan' ? (
            <>
              <DialogHeader>
                <DialogTitle className='flex items-center gap-2 text-base'>
                  <ShieldCheck className='h-5 w-5 text-primary' />
                  Aktivasi Google Authenticator
                </DialogTitle>
                <DialogDescription className='text-xs'>
                  Pindai kode QR menggunakan Google Authenticator di ponsel Anda, lalu masukkan
                  kode 6-digit untuk mengonfirmasi.
                </DialogDescription>
              </DialogHeader>

              {isGenerating ? (
                <div className='flex flex-col items-center justify-center py-10'>
                  <Loader2 className='h-8 w-8 animate-spin text-primary' />
                  <p className='mt-2 text-xs text-muted-foreground'>
                    Membuat kunci rahasia dan kode QR...
                  </p>
                </div>
              ) : setupData ? (
                <div className='space-y-4 py-2 text-xs'>
                  {/* Langkah 1: Scan QR */}
                  <div className='space-y-2'>
                    <p className='font-semibold text-foreground'>
                      1. Buka Google Authenticator dan pindai QR berikut:
                    </p>
                    <div className='flex flex-col items-center justify-center rounded-lg border bg-white p-3 dark:bg-zinc-900'>
                      <div
                        className='[&>svg]:h-44 [&>svg]:w-44'
                        dangerouslySetInnerHTML={{ __html: setupData.qr_code_svg }}
                      />
                    </div>
                  </div>

                  {/* Langkah 2: Secret key manual */}
                  <div className='space-y-1'>
                    <p className='text-muted-foreground'>
                      Atau masukkan kunci rahasia berikut secara manual:
                    </p>
                    <div className='flex items-center gap-2'>
                      <code className='flex-1 rounded-md border bg-muted px-2 py-1.5 font-mono text-xs tracking-wider'>
                        {setupData.secret}
                      </code>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={handleCopySecret}
                      >
                        {copiedSecret ? (
                          <Check className='h-3.5 w-3.5 text-emerald-600' />
                        ) : (
                          <Copy className='h-3.5 w-3.5' />
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Langkah 3: Konfirmasi kode OTP */}
                  <div className='space-y-1.5 rounded-lg border bg-muted/30 p-3 pt-2'>
                    <label className='font-semibold text-foreground'>
                      2. Masukkan kode 6-digit dari aplikasi untuk mengonfirmasi:
                    </label>
                    <div className='flex gap-2 pt-1'>
                      <Input
                        placeholder='Contoh: 123456'
                        maxLength={6}
                        className='font-mono text-center text-sm tracking-widest'
                        value={confirmCode}
                        onChange={(e) => setConfirmCode(e.target.value)}
                        disabled={isConfirming}
                        autoFocus
                      />
                      <Button
                        onClick={handleConfirmSetup}
                        disabled={isConfirming || confirmCode.trim().length !== 6}
                      >
                        {isConfirming ? (
                          <>
                            <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                            Memverifikasi...
                          </>
                        ) : (
                          'Konfirmasi & Aktifkan'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}

              <DialogFooter>
                <Button
                  variant='outline'
                  onClick={() => setOpenSetup(false)}
                  disabled={isConfirming}
                  className='text-xs'
                >
                  Batal
                </Button>
              </DialogFooter>
            </>
          ) : (
            /* STEP 2: DITERBITKAN SETELAH SUKSES AKTIVASI */
            <>
              <DialogHeader>
                <div className='flex items-center gap-2 text-emerald-600'>
                  <ShieldCheck className='h-6 w-6' />
                  <DialogTitle className='text-base text-foreground'>
                    Google Authenticator Berhasil Diaktifkan!
                  </DialogTitle>
                </div>
                <DialogDescription className='text-xs'>
                  Akun Anda kini terlindungi oleh verifikasi dua langkah. Simpan kode pemulihan
                  darurat di bawah ini sekarang.
                </DialogDescription>
              </DialogHeader>

              <div className='space-y-4 py-2 text-xs'>
                <div className='space-y-2 rounded-lg border border-amber-500/30 bg-amber-50/60 p-3.5 dark:bg-amber-950/30'>
                  <div className='flex items-center justify-between'>
                    <p className='font-semibold text-amber-800 dark:text-amber-200'>
                      Kode Pemulihan Darurat (8 Kode Sekali Pakai):
                    </p>
                    <div className='flex gap-1'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 bg-background px-2 text-[11px]'
                        onClick={() => handleCopyCodes(newlyIssuedCodes)}
                      >
                        <Copy className='mr-1 h-3 w-3' /> Salin
                      </Button>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        className='h-7 bg-background px-2 text-[11px]'
                        onClick={() => handleDownloadCodes(newlyIssuedCodes)}
                      >
                        <Download className='mr-1 h-3 w-3' /> Unduh TXT
                      </Button>
                    </div>
                  </div>

                  <div className='grid grid-cols-2 gap-2 pt-1 font-mono text-xs text-amber-950 dark:text-amber-100'>
                    {newlyIssuedCodes.map((code) => (
                      <div
                        key={code}
                        className='rounded-md border bg-background/90 px-2.5 py-1.5 text-center font-bold tracking-wider shadow-2xs'
                      >
                        {code}
                      </div>
                    ))}
                  </div>

                  <p className='text-[11px] leading-relaxed text-amber-800/90 dark:text-amber-200/90'>
                    ⚠️ <strong>PENTING:</strong> Kode ini hanya ditampilkan saat ini. Simpan file
                    atau catat kode ini di tempat yang aman. Setiap kode dapat digunakan satu kali
                    jika Anda kehilangan akses ke aplikasi Google Authenticator.
                  </p>
                </div>
              </div>

              <DialogFooter>
                <Button
                  onClick={() => {
                    setOpenSetup(false)
                    setSetupStep('scan')
                  }}
                  className='w-full text-xs sm:w-auto'
                >
                  <Check className='mr-1.5 h-4 w-4' />
                  Saya Sudah Menyimpan Kode Pemulihan
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL LIHAT KODE PEMULIHAN (Untuk user yang sudah aktif) */}
      <Dialog open={openCodes} onOpenChange={setOpenCodes}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base'>
              <KeyRound className='h-5 w-5 text-primary' />
              Kode Pemulihan Darurat 2FA
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Kode ini dapat digunakan sekali untuk masuk jika Anda tidak memiliki akses ke aplikasi
              Google Authenticator.
            </DialogDescription>
          </DialogHeader>

          {isLoadingCodes ? (
            <div className='flex items-center justify-center py-6'>
              <Loader2 className='h-6 w-6 animate-spin text-primary' />
            </div>
          ) : (
            <div className='space-y-3 py-2'>
              <div className='grid grid-cols-2 gap-2 rounded-lg border bg-muted/40 p-3 font-mono text-xs'>
                {recoveryCodes.length > 0 ? (
                  recoveryCodes.map((code) => (
                    <div
                      key={code}
                      className='rounded bg-background px-2 py-1 text-center font-semibold shadow-2xs'
                    >
                      {code}
                    </div>
                  ))
                ) : (
                  <p className='col-span-2 text-center text-xs text-muted-foreground'>
                    Tidak ada kode pemulihan yang tersisa. Silakan buat kode baru di bawah ini.
                  </p>
                )}
              </div>

              <div className='flex items-center justify-between pt-1'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleCopyCodes(recoveryCodes)}
                  disabled={recoveryCodes.length === 0}
                  className='text-xs'
                >
                  <Copy className='mr-1.5 h-3.5 w-3.5' /> Salin Semua
                </Button>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => handleDownloadCodes(recoveryCodes)}
                  disabled={recoveryCodes.length === 0}
                  className='text-xs'
                >
                  <Download className='mr-1.5 h-3.5 w-3.5' /> Unduh TXT
                </Button>
              </div>

              <div className='border-t pt-3'>
                <Button
                  variant='ghost'
                  size='sm'
                  onClick={handleRegenerateCodes}
                  disabled={isRegenerating}
                  className='w-full text-xs text-muted-foreground hover:text-foreground'
                >
                  {isRegenerating ? (
                    <Loader2 className='mr-1.5 h-3.5 w-3.5 animate-spin' />
                  ) : (
                    <RefreshCw className='mr-1.5 h-3.5 w-3.5' />
                  )}
                  Buat Ulang 8 Kode Pemulihan Baru
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant='outline' onClick={() => setOpenCodes(false)} className='text-xs'>
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NONAKTIFKAN 2FA */}
      <Dialog open={openDisable} onOpenChange={setOpenDisable}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle className='flex items-center gap-2 text-base text-destructive'>
              <ShieldAlert className='h-5 w-5' />
              Nonaktifkan Google Authenticator
            </DialogTitle>
            <DialogDescription className='text-xs'>
              Tindakan ini akan menghapus proteksi verifikasi dua langkah pada akun Anda. Masukkan
              kata sandi saat ini untuk melanjutkan.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-3 py-2'>
            <div className='space-y-1.5'>
              <label className='text-xs font-medium'>Kata Sandi Saat Ini</label>
              <PasswordInput
                placeholder='••••••••'
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                disabled={isDisabling}
                autoFocus
              />
            </div>
          </div>

          <DialogFooter className='gap-2 sm:gap-0'>
            <Button
              variant='outline'
              onClick={() => {
                setOpenDisable(false)
                setDisablePassword('')
              }}
              disabled={isDisabling}
              className='text-xs'
            >
              Batal
            </Button>
            <Button
              variant='destructive'
              onClick={handleConfirmDisable}
              disabled={isDisabling || !disablePassword}
              className='text-xs'
            >
              {isDisabling ? (
                <>
                  <Loader2 className='mr-1.5 h-4 w-4 animate-spin' />
                  Memproses...
                </>
              ) : (
                'Ya, Nonaktifkan 2FA'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
