'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Award,
  Building2,
  Check,
  Crown,
  KeyRound,
  Loader2,
  Mail,
  Phone,
  Shield,
  Sparkles,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { rbacService } from '@/services/rbac-service'
import { opdService } from '@/services/opd-service'
import { userService } from '@/services/user-service'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/searchable-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { PasswordInput } from '@/components/password-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { User } from '../data/schema'

const userAccountFormSchema = z
  .object({
    account_type: z.enum(['pegawai', 'direct']),
    opd_id: z.string().optional(),
    pegawai_id: z.string().optional(),
    name: z.string().optional(),
    email: z.string().optional(),
    nip: z.string().optional(),
    phone: z.string().optional(),
    jabatan: z.string().optional(),
    role: z.string().min(1, 'Peran (Role) wajib dipilih.'),
    password: z.string().optional(),
    status: z.enum(['active', 'inactive'], {
      message: 'Status akun wajib dipilih (Aktif atau Nonaktif).',
    }),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit || data.account_type !== 'pegawai') return true
      return Boolean(data.opd_id && data.opd_id.trim().length > 0)
    },
    {
      message: 'Instansi / Perangkat Daerah (OPD) wajib dipilih terlebih dahulu.',
      path: ['opd_id'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit || data.account_type !== 'pegawai') return true
      return Boolean(data.pegawai_id && data.pegawai_id.trim().length > 0)
    },
    {
      message: 'Pegawai wajib dipilih.',
      path: ['pegawai_id'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit || data.account_type !== 'direct') return true
      return Boolean(data.name && data.name.trim().length >= 3)
    },
    {
      message: 'Nama lengkap pimpinan / pengguna wajib diisi (min. 3 karakter).',
      path: ['name'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit || data.account_type !== 'direct') return true
      if (!data.email || data.email.trim().length === 0) return false
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
    },
    {
      message: 'Email dinas / login yang valid wajib diisi.',
      path: ['email'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit || data.account_type !== 'direct') return true
      return Boolean(data.jabatan && data.jabatan.trim().length > 0)
    },
    {
      message: 'Jabatan wajib diisi (contoh: Bupati, Wakil Bupati, Sekretaris Daerah).',
      path: ['jabatan'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit) return true
      return Boolean(data.password && data.password.trim().length > 0)
    },
    {
      message: 'Kata sandi akun wajib diisi.',
      path: ['password'],
    }
  )
  .refine(
    (data) => {
      if (data.isEdit && (!data.password || data.password.length === 0)) return true
      return Boolean(data.password && data.password.length >= 8)
    },
    {
      message: 'Kata sandi minimal 8 karakter.',
      path: ['password'],
    }
  )
  .refine(
    (data) => {
      if (!data.password || data.password.length === 0) return true
      return (
        /[a-z]/.test(data.password) &&
        /[A-Z]/.test(data.password) &&
        /\d/.test(data.password) &&
        /[^a-zA-Z0-9]/.test(data.password)
      )
    },
    {
      message: 'Kata sandi harus mengandung huruf besar, huruf kecil, angka, dan simbol.',
      path: ['password'],
    }
  )

type UserAccountFormValues = z.infer<typeof userAccountFormSchema>

interface UsersActionDialogProps {
  currentRow?: User | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersActionDialog({
  currentRow,
  open,
  onOpenChange,
}: UsersActionDialogProps) {
  const isEdit = Boolean(currentRow)
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)

  // 1. Fetch OPDs
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds', 'list'],
    queryFn: () => opdService.getOpds(),
    enabled: open && !isEdit,
    staleTime: 5 * 60 * 1000,
  })

  // 2. Fetch Roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacService.getRoles,
    enabled: open,
    staleTime: 5 * 60 * 1000,
  })

  const form = useForm<UserAccountFormValues>({
    resolver: zodResolver(userAccountFormSchema),
    defaultValues: {
      account_type: 'pegawai',
      opd_id: '',
      pegawai_id: '',
      name: '',
      email: '',
      nip: '',
      phone: '',
      jabatan: '',
      role: '',
      password: '',
      status: 'active',
      isEdit: false,
    },
    mode: 'onChange',
  })

  const watchedAccountType = form.watch('account_type')
  const watchedOpdId = form.watch('opd_id')
  const watchedPegawaiId = form.watch('pegawai_id')
  const watchedPassword = form.watch('password') || ''

  // 3. Fetch Pegawai filtered by selected OPD who do NOT yet have an account
  const { data: pegawaiResponse, isLoading: isLoadingPegawai } = useQuery({
    queryKey: ['pegawai', 'available-for-account', watchedOpdId],
    queryFn: () =>
      userService.getPegawai({
        opd_id: watchedOpdId,
        has_account: false,
        per_page: 200,
      }),
    enabled: open && !isEdit && watchedAccountType === 'pegawai' && Boolean(watchedOpdId),
    staleTime: 0,
  })

  const availablePegawaiList = useMemo(
    () => pegawaiResponse?.data || [],
    [pegawaiResponse]
  )

  const opdOptions = useMemo(() => {
    return (Array.isArray(opds) ? opds : []).map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori],
    }))
  }, [opds])

  const pegawaiOptions = useMemo(() => {
    return availablePegawaiList.map((p) => ({
      value: String(p.id),
      label: `${p.name}${p.nip ? ` — NIP. ${p.nip}` : ''}`,
      group: p.jabatan === 'Kepala OPD' ? 'Kepala OPD' : 'Pegawai',
      badge: p.jabatan || 'Pegawai',
      keywords: [p.nip || '', p.email || '', p.jabatan || ''],
    }))
  }, [availablePegawaiList])

  const selectedPegawai = useMemo(() => {
    if (isEdit && currentRow) return currentRow
    if (watchedAccountType === 'direct') return null
    return availablePegawaiList.find((p) => String(p.id) === String(watchedPegawaiId)) || null
  }, [isEdit, currentRow, watchedAccountType, availablePegawaiList, watchedPegawaiId])

  const criteria = [
    { id: 'min_length', label: 'Min. 8 Karakter', valid: watchedPassword.length >= 8 },
    { id: 'uppercase', label: 'Huruf Besar (A-Z)', valid: /[A-Z]/.test(watchedPassword) },
    { id: 'lowercase', label: 'Huruf Kecil (a-z)', valid: /[a-z]/.test(watchedPassword) },
    { id: 'number', label: 'Angka (0-9)', valid: /[0-9]/.test(watchedPassword) },
    {
      id: 'symbol',
      label: 'Simbol Unik (!@#$%)',
      valid: /[^a-zA-Z0-9]/.test(watchedPassword),
    },
  ]

  const validCount = criteria.filter((c) => c.valid).length
  const isAllValid = validCount === criteria.length

  useEffect(() => {
    if (open) {
      if (currentRow) {
        const normalizedStatus =
          currentRow.status === 'inactive' ? 'inactive' : 'active'
        form.reset({
          account_type: 'pegawai',
          opd_id: currentRow.opd_id ? String(currentRow.opd_id) : 'assigned',
          pegawai_id: String(currentRow.id),
          name: currentRow.name || '',
          email: currentRow.email || '',
          nip: currentRow.nip || '',
          phone: currentRow.phone || '',
          jabatan: currentRow.jabatan || '',
          role: currentRow.role || '',
          password: '',
          status: normalizedStatus,
          isEdit: true,
        })
      } else {
        form.reset({
          account_type: 'pegawai',
          opd_id: '',
          pegawai_id: '',
          name: '',
          email: '',
          nip: '',
          phone: '',
          jabatan: '',
          role: '',
          password: '',
          status: 'active',
          isEdit: false,
        })
      }
    }
  }, [open, currentRow, form])

  // Generator for strong passwords
  function generateSecurePassword() {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
    const lowercase = 'abcdefghijkmnopqrstuvwxyz'
    const numbers = '23456789'
    const symbols = '!@#$%^&*()_+-='
    const all = uppercase + lowercase + numbers + symbols

    let pwd = ''
    pwd += uppercase[Math.floor(Math.random() * uppercase.length)]
    pwd += lowercase[Math.floor(Math.random() * lowercase.length)]
    pwd += numbers[Math.floor(Math.random() * numbers.length)]
    pwd += symbols[Math.floor(Math.random() * symbols.length)]

    for (let i = 4; i < 14; i++) {
      pwd += all[Math.floor(Math.random() * all.length)]
    }

    pwd = pwd
      .split('')
      .sort(() => 0.5 - Math.random())
      .join('')

    form.setValue('password', pwd, { shouldValidate: true })
    navigator.clipboard.writeText(pwd)
    setCopiedPassword(true)
    toast.info('Kata sandi acak disalin ke clipboard.')
    setTimeout(() => setCopiedPassword(false), 3000)
  }

  async function onSubmit(data: UserAccountFormValues) {
    setIsSubmitting(true)
    try {
      if (isEdit && currentRow) {
        await userService.updateUserAccount(currentRow.id, {
          role: data.role,
          status: data.status,
          password: data.password ? data.password : undefined,
        })
        toast.success(`Akun user "${currentRow.name}" berhasil diperbarui.`)
      } else if (data.account_type === 'direct') {
        const createdUser = await userService.createUserAccount({
          account_type: 'direct',
          name: data.name,
          email: data.email,
          nip: data.nip || undefined,
          phone: data.phone || undefined,
          jabatan: data.jabatan,
          opd_id: data.opd_id && data.opd_id !== 'all' ? data.opd_id : undefined,
          role: data.role,
          password: data.password!,
          status: data.status,
        })
        toast.success(
          `Akun pimpinan "${createdUser.name}" (${data.jabatan || 'Executive'}) berhasil dibuat.`
        )
      } else {
        await userService.createUserAccount({
          account_type: 'pegawai',
          pegawai_id: data.pegawai_id!,
          role: data.role,
          password: data.password!,
          status: data.status,
        })
        toast.success(
          `Akun login untuk "${selectedPegawai?.name || 'Pegawai'}" berhasil dibuat.`
        )
      }

      queryClient.invalidateQueries({ queryKey: ['user-accounts'] })
      queryClient.invalidateQueries({ queryKey: ['pegawai'] })
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      onOpenChange(false)
    } catch (error) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as {
          message?: string
          errors?: Record<string, string[]>
        }
        const firstFieldError = errorData.errors
          ? Object.values(errorData.errors)[0]?.[0]
          : undefined
        toast.error(
          firstFieldError ||
            errorData.message ||
            'Terjadi kesalahan saat menyimpan akun user.'
        )
      } else {
        toast.error('Terjadi kesalahan saat menyimpan akun user.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-xl max-h-[88vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              {isEdit ? (
                <UserCheck className='h-5 w-5' />
              ) : watchedAccountType === 'direct' ? (
                <Crown className='h-5 w-5 text-amber-600 dark:text-amber-400' />
              ) : (
                <UserPlus className='h-5 w-5' />
              )}
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit
                  ? `Edit Akun User: ${currentRow?.name}`
                  : watchedAccountType === 'direct'
                  ? 'Tambah Akun Eksekutif / Pimpinan Daerah'
                  : 'Tambah Akun User Pegawai'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui peran akses (RBAC), kata sandi, atau status aktif akun login pegawai.'
                  : watchedAccountType === 'direct'
                  ? 'Buat akun langsung untuk Bupati, Wakil Bupati, Sekda, atau pimpinan daerah tanpa terikat data pegawai ASN.'
                  : 'Pilih OPD dan pegawai terlebih dahulu untuk memberikan akses akun login ke sistem.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='users-dialog-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Selector Mode Pembuatan Akun (Hanya di mode Tambah) */}
              {!isEdit && (
                <div className='p-1 bg-muted/60 rounded-xl grid grid-cols-2 gap-1 border text-xs'>
                  <button
                    type='button'
                    onClick={() => {
                      form.setValue('account_type', 'pegawai')
                      form.clearErrors()
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all text-xs cursor-pointer',
                      watchedAccountType === 'pegawai'
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Users className='h-3.5 w-3.5' />
                    <span>Dari Pegawai OPD (ASN)</span>
                  </button>
                  <button
                    type='button'
                    onClick={() => {
                      form.setValue('account_type', 'direct')
                      form.clearErrors()
                    }}
                    className={cn(
                      'flex items-center justify-center gap-2 py-2 px-3 rounded-lg font-medium transition-all text-xs cursor-pointer',
                      watchedAccountType === 'direct'
                        ? 'bg-background text-foreground shadow-2xs font-semibold'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Crown className='h-3.5 w-3.5 text-amber-600 dark:text-amber-400' />
                    <span>Akun Eksekutif / Pimpinan</span>
                  </button>
                </div>
              )}

              {/* JIKA MODE 1: DARI PEGAWAI OPD (ASN) */}
              {!isEdit && watchedAccountType === 'pegawai' && (
                <>
                  {/* 1. Pilih OPD Terlebih Dahulu */}
                  <FormField
                    control={form.control}
                    name='opd_id'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                          <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary'>
                            1
                          </span>
                          <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                          Pilih Perangkat Daerah (OPD){' '}
                          <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            disabled={isSubmitting || isLoadingOpds}
                            value={field.value}
                            onValueChange={(val) => {
                              field.onChange(val)
                              form.setValue('pegawai_id', '', {
                                shouldValidate: false,
                              })
                            }}
                            options={opdOptions}
                            placeholder={
                              isLoadingOpds
                                ? 'Memuat daftar OPD...'
                                : 'Pilih perangkat daerah untuk memfilter pegawai...'
                            }
                            searchPlaceholder='Cari nama atau kode OPD...'
                            emptyMessage='Tidak ada perangkat daerah yang cocok.'
                          />
                        </FormControl>
                        <FormMessage className='text-xs' />
                      </FormItem>
                    )}
                  />

                  {/* 2. Pilih Pegawai */}
                  <FormField
                    control={form.control}
                    name='pegawai_id'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                          <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary'>
                            2
                          </span>
                          <Users className='h-3.5 w-3.5 text-muted-foreground' />
                          Pilih Pegawai <span className='text-destructive'>*</span>
                        </FormLabel>
                        <FormControl>
                          <SearchableSelect
                            disabled={
                              isSubmitting ||
                              !watchedOpdId ||
                              isLoadingPegawai
                            }
                            value={field.value}
                            onValueChange={field.onChange}
                            options={pegawaiOptions}
                            placeholder={
                              !watchedOpdId
                                ? 'Pilih OPD terlebih dahulu di langkah 1...'
                                : isLoadingPegawai
                                  ? 'Memuat daftar pegawai OPD...'
                                  : availablePegawaiList.length === 0
                                    ? 'Semua pegawai di OPD ini sudah memiliki akun / belum ada data'
                                    : 'Pilih pegawai yang akan diberikan akun...'
                            }
                            searchPlaceholder='Cari nama atau NIP pegawai...'
                            emptyMessage='Tidak ada pegawai tanpa akun pada OPD ini.'
                          />
                        </FormControl>
                        <FormMessage className='text-xs' />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* JIKA MODE 2: AKUN EKSEKUTIF / PIMPINAN (Bupati / Sekda) */}
              {!isEdit && watchedAccountType === 'direct' && (
                <div className='space-y-3.5 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/5 text-xs'>
                  <div className='flex items-center gap-2 font-medium text-amber-800 dark:text-amber-300'>
                    <Crown className='h-4 w-4 text-amber-600 shrink-0' />
                    <span>Profil Pimpinan Daerah / Akun Eksekutif</span>
                  </div>
                  <p className='text-[11px] text-muted-foreground leading-relaxed'>
                    Akun ini ditujukan untuk Kepala Daerah (Bupati/Wakil Bupati) atau Pejabat Utama (Sekda) tanpa perlu mendaftarkan ke data pegawai ASN dinas terlebih dahulu.
                  </p>

                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1'>
                    {/* Nama Lengkap */}
                    <FormField
                      control={form.control}
                      name='name'
                      render={({ field }) => (
                        <FormItem className='sm:col-span-2'>
                          <FormLabel className='text-xs font-semibold'>
                            Nama Lengkap Pimpinan <span className='text-destructive'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder='contoh: H. Syamsuddin, S.E., M.Si (atau Bupati ...)'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />

                    {/* Email Login */}
                    <FormField
                      control={form.control}
                      name='email'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-semibold'>
                            Email Login Resmi <span className='text-destructive'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type='email'
                              placeholder='contoh: bupati@pemda.go.id'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />

                    {/* Jabatan */}
                    <FormField
                      control={form.control}
                      name='jabatan'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-semibold'>
                            Jabatan Resmi <span className='text-destructive'>*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder='contoh: Bupati / Sekda / Wakil Bupati'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <div className='flex items-center gap-1 flex-wrap pt-1'>
                            <span className='text-[10px] text-muted-foreground'>Cepat:</span>
                            {['Bupati', 'Wakil Bupati', 'Sekretaris Daerah'].map((item) => (
                              <button
                                key={item}
                                type='button'
                                onClick={() => form.setValue('jabatan', item, { shouldValidate: true })}
                                className='text-[10px] px-1.5 py-0.5 rounded border bg-background hover:bg-muted text-muted-foreground hover:text-foreground font-medium cursor-pointer transition-colors'
                              >
                                {item}
                              </button>
                            ))}
                          </div>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />

                    {/* NIP (Opsional) */}
                    <FormField
                      control={form.control}
                      name='nip'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-semibold flex items-center justify-between'>
                            <span>NIP (Nomor Induk Pegawai)</span>
                            <span className='text-[10px] font-normal text-muted-foreground font-mono'>Opsional</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder='Kosongkan jika non-ASN (Bupati/Wabup)'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />

                    {/* Nomor Telepon (Opsional) */}
                    <FormField
                      control={form.control}
                      name='phone'
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className='text-xs font-semibold flex items-center justify-between'>
                            <span>Nomor Telepon / WhatsApp</span>
                            <span className='text-[10px] font-normal text-muted-foreground font-mono'>Opsional</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              placeholder='08xxxxxxxxxx'
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />

                    {/* Unit Kerja / Instansi Naungan (Opsional) */}
                    <FormField
                      control={form.control}
                      name='opd_id'
                      render={({ field }) => (
                        <FormItem className='sm:col-span-2'>
                          <FormLabel className='text-xs font-semibold flex items-center justify-between'>
                            <span>Unit Kerja / Instansi Naungan</span>
                            <span className='text-[10px] font-normal text-muted-foreground font-mono'>Opsional</span>
                          </FormLabel>
                          <FormControl>
                            <SearchableSelect
                              disabled={isSubmitting || isLoadingOpds}
                              value={field.value}
                              onValueChange={field.onChange}
                              options={[
                                {
                                  value: 'all',
                                  label: 'Pemerintah Daerah (Seluruh Wilayah Pemda / Tanpa Batas OPD)',
                                  group: 'Tingkat Daerah',
                                  badge: 'Pemda',
                                },
                                ...opdOptions,
                              ]}
                              placeholder='Pilih instansi (contoh: Sekretariat Daerah) atau biarkan kosong...'
                              searchPlaceholder='Cari OPD...'
                              emptyMessage='Tidak ada perangkat daerah yang cocok.'
                            />
                          </FormControl>
                          <p className='text-[10px] text-muted-foreground'>
                            Untuk Bupati, biarkan default/kosong (Tingkat Daerah). Untuk Sekda, dapat memilih <strong>Sekretariat Daerah</strong>.
                          </p>
                          <FormMessage className='text-xs' />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              )}

              {/* Selected Pegawai Summary Card (shown in Edit mode or once Pegawai is chosen) */}
              {selectedPegawai && (
                <div className='rounded-lg border bg-muted/20 p-3 text-xs space-y-2'>
                  <div className='flex items-start justify-between gap-2'>
                    <div>
                      <p className='font-semibold text-foreground text-sm'>
                        {selectedPegawai.name}
                      </p>
                      <p className='text-muted-foreground font-mono text-[11px]'>
                        NIP. {selectedPegawai.nip || '-'}
                      </p>
                    </div>
                    <Badge
                      variant='outline'
                      className={cn(
                        'text-[11px] font-medium gap-1',
                        selectedPegawai.jabatan === 'Kepala OPD'
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          : 'border-border bg-background text-foreground'
                      )}
                    >
                      {selectedPegawai.jabatan === 'Kepala OPD' && (
                        <Award className='h-3 w-3' />
                      )}
                      {selectedPegawai.jabatan || 'Pegawai'}
                    </Badge>
                  </div>
                  <div className='grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 border-t text-[11px] text-muted-foreground'>
                    <div className='flex items-center gap-1.5 truncate'>
                      <Mail className='h-3 w-3 shrink-0' />
                      <span className='truncate'>{selectedPegawai.email}</span>
                    </div>
                    <div className='flex items-center gap-1.5'>
                      <Phone className='h-3 w-3 shrink-0' />
                      <span className='font-mono'>
                        {selectedPegawai.phone || '-'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* PILIH ROLE RBAC (Bebas dipilih oleh user, TIDAK otomatis) */}
              <FormField
                control={form.control}
                name='role'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                      {!isEdit && (
                        <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary'>
                          {watchedAccountType === 'direct' ? '2' : '3'}
                        </span>
                      )}
                      <Shield className='h-3.5 w-3.5 text-muted-foreground' />
                      Pilih Peran (Role RBAC){' '}
                      <span className='text-destructive'>*</span>
                    </FormLabel>
                    <Select
                      disabled={isSubmitting || isLoadingRoles}
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className='w-full'>
                          <SelectValue placeholder='Pilih peran hak akses...' />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Array.isArray(roles) ? roles : []).map((r) => (
                          <SelectItem key={r.id} value={r.name}>
                            <div className='flex items-center gap-2'>
                              <span>{r.name}</span>
                              {r.is_system && (
                                <span className='text-[10px] text-blue-600 bg-blue-50 dark:bg-blue-950 px-1 py-0.2 rounded'>
                                  Sistem
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* MASUKKAN KATA SANDI */}
              <div className='space-y-1.5'>
                <div className='flex items-center justify-between'>
                  <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                    {!isEdit && (
                      <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary'>
                        {watchedAccountType === 'direct' ? '3' : '4'}
                      </span>
                    )}
                    <KeyRound className='h-3.5 w-3.5 text-muted-foreground' />
                    {isEdit ? 'Ubah Kata Sandi (Opsional)' : 'Masukkan Kata Sandi'}{' '}
                    {!isEdit && <span className='text-destructive'>*</span>}
                  </FormLabel>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={generateSecurePassword}
                    className='text-[11px] h-6 text-primary hover:text-primary gap-1 px-1.5'
                  >
                    <Sparkles className='h-3 w-3' />
                    {copiedPassword ? 'Tersalin!' : 'Acak Kata Sandi Kuat'}
                  </Button>
                </div>

                <FormField
                  control={form.control}
                  name='password'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <PasswordInput
                          placeholder={
                            isEdit
                              ? 'Biarkan kosong bila tidak ingin mengganti sandi'
                              : 'Masukkan kata sandi login...'
                          }
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {watchedPassword.length > 0 && (
                  <div className='mt-2 p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1.5'>
                    <div className='flex items-center justify-between font-medium text-[11px] text-muted-foreground mb-1'>
                      <span>Standar Keamanan Kata Sandi:</span>
                      <span
                        className={cn(
                          'font-semibold',
                          isAllValid ? 'text-emerald-600' : 'text-amber-600'
                        )}
                      >
                        {validCount} dari {criteria.length} Terpenuhi
                      </span>
                    </div>
                    <div className='grid grid-cols-2 gap-1.5'>
                      {criteria.map((c) => (
                        <div
                          key={c.id}
                          className={cn(
                            'flex items-center gap-1.5 text-[11px] transition-colors',
                            c.valid
                              ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                              : 'text-muted-foreground'
                          )}
                        >
                          <div
                            className={cn(
                              'h-3.5 w-3.5 rounded-full flex items-center justify-center shrink-0 text-[9px]',
                              c.valid
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground'
                            )}
                          >
                            {c.valid ? <Check className='h-2.5 w-2.5' /> : '•'}
                          </div>
                          <span>{c.label}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* STATUS AKUN */}
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='space-y-2 pt-1'>
                    <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                      {!isEdit && (
                        <span className='flex h-4 w-4 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary'>
                          {watchedAccountType === 'direct' ? '4' : '5'}
                        </span>
                      )}
                      Status Akun <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className='grid grid-cols-2 gap-3'
                      >
                        <FormItem className='flex items-center space-x-2.5 space-y-0 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors [&:has([data-state=checked])]:border-emerald-500 [&:has([data-state=checked])]:bg-emerald-500/5'>
                          <FormControl>
                            <RadioGroupItem value='active' />
                          </FormControl>
                          <FormLabel className='font-semibold cursor-pointer text-xs text-emerald-700 dark:text-emerald-400'>
                            Aktif (Dapat Login)
                          </FormLabel>
                        </FormItem>

                        <FormItem className='flex items-center space-x-2.5 space-y-0 rounded-lg border p-3 text-xs font-medium cursor-pointer transition-colors [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                          <FormControl>
                            <RadioGroupItem value='inactive' />
                          </FormControl>
                          <FormLabel className='font-semibold cursor-pointer text-xs text-muted-foreground'>
                            Nonaktif (Akses Diblokir)
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        {/* Pinned Footer */}
        <DialogFooter className='px-6 py-3 border-t bg-muted/10 shrink-0 flex items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type='submit'
            size='sm'
            form='users-dialog-form'
            disabled={isSubmitting}
            className='min-w-[120px]'
          >
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan...
              </>
            ) : isEdit ? (
              'Simpan Perubahan'
            ) : (
              'Buat Akun User'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
