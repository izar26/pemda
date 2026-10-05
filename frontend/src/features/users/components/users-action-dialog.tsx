'use client'

import { useEffect, useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Check, Loader2, Sparkles, UserPlus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { rbacService } from '@/services/rbac-service'
import { opdService } from '@/services/opd-service'
import { userService } from '@/services/user-service'
import { PANGKAT_GOLONGAN_OPTIONS } from '../data/pangkat-golongan'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
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
import { Input } from '@/components/ui/input'
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

const userFormSchema = z
  .object({
    name: z
      .string()
      .min(1, 'Nama lengkap beserta gelar wajib diisi.')
      .min(2, 'Nama lengkap minimal 2 karakter.')
      .max(100, 'Maksimal 100 karakter.'),
    email: z
      .string()
      .min(1, 'Email resmi / dinas wajib diisi.')
      .email('Format email dinas tidak valid.')
      .max(100, 'Maksimal 100 karakter.'),
    nip: z
      .string()
      .min(1, 'NIP (Nomor Induk Pegawai) wajib diisi.')
      .max(30, 'NIP maksimal 30 karakter.'),
    phone: z
      .string()
      .min(1, 'Nomor WhatsApp / HP wajib diisi.')
      .max(20, 'Nomor telepon maksimal 20 karakter.'),
    opd_id: z
      .string()
      .min(1, 'Instansi / Perangkat Daerah (OPD) wajib dipilih.'),
    pangkat_gol: z
      .string()
      .min(1, 'Pangkat / Golongan Ruang wajib dipilih.'),
    jabatan: z
      .string()
      .min(1, 'Jabatan kedinasan wajib diisi.')
      .max(150, 'Jabatan maksimal 150 karakter.'),
    role: z.string().min(1, 'Peran (Role) wajib dipilih.'),
    status: z.enum(['active', 'inactive', 'suspended', 'pending_activation'], {
      message: 'Status akun pegawai wajib dipilih.',
    }),
    password: z.string().optional(),
    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit) return true
      return Boolean(data.password && data.password.trim().length > 0)
    },
    {
      message: 'Kata sandi awal akun wajib diisi.',
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
        /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(data.password)
      )
    },
    {
      message: 'Kata sandi harus mengandung huruf besar, huruf kecil, angka, dan simbol.',
      path: ['password'],
    }
  )

type UserFormValues = z.infer<typeof userFormSchema>

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

  // Fetch dynamic roles for the dropdown
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: rbacService.getRoles,
    staleTime: 60 * 1000,
  })

  // Fetch dynamic OPDs for the dropdown
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getOpds(),
    staleTime: 5 * 60 * 1000,
  })

  const opdOptions = useMemo(() => {
    return (Array.isArray(opds) ? opds : []).map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori],
    }))
  }, [opds])

  const pangkatOptions = useMemo(() => {
    return PANGKAT_GOLONGAN_OPTIONS.map((opt) => ({
      value: opt.value,
      label: opt.label,
      group: opt.golongan,
      badge: opt.golongan,
      keywords: [opt.golongan],
    }))
  }, [])

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      nip: '',
      phone: '',
      opd_id: '',
      pangkat_gol: '',
      jabatan: '',
      role: '',
      status: 'active',
      password: '',
      isEdit: false,
    },
    mode: 'onChange',
  })

  const watchedPassword = form.watch('password') || ''

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

  // Sync form when dialog opens or currentRow changes
  useEffect(() => {
    if (open) {
      if (currentRow) {
        form.reset({
          name: currentRow.name,
          email: currentRow.email,
          nip: currentRow.nip || '',
          phone: currentRow.phone || '',
          opd_id: currentRow.opd_id ? String(currentRow.opd_id) : '',
          pangkat_gol: currentRow.pangkat_gol || '',
          jabatan: currentRow.jabatan || '',
          role: currentRow.role,
          status: currentRow.status,
          password: '',
          isEdit: true,
        })
      } else {
        form.reset({
          name: '',
          email: '',
          nip: '',
          phone: '',
          opd_id: '',
          pangkat_gol: '',
          jabatan: '',
          role: Array.isArray(roles) && roles[0] ? roles[0].name : '',
          status: 'active',
          password: '',
          isEdit: false,
        })
      }
    }
  }, [open, currentRow, form, roles])

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

    pwd = pwd.split('').sort(() => 0.5 - Math.random()).join('')

    form.setValue('password', pwd, { shouldValidate: true })
    navigator.clipboard.writeText(pwd)
    setCopiedPassword(true)
    toast.info('Kata sandi acak disalin ke clipboard.')
    setTimeout(() => setCopiedPassword(false), 3000)
  }

  async function onSubmit(data: UserFormValues) {
    setIsSubmitting(true)
    try {
      if (isEdit && currentRow) {
        await userService.updateUser(currentRow.id, {
          name: data.name.trim(),
          email: data.email.trim(),
          nip: data.nip.trim(),
          phone: data.phone.trim(),
          opd_id: data.opd_id,
          pangkat_gol: data.pangkat_gol,
          jabatan: data.jabatan.trim(),
          role: data.role,
          status: data.status,
          password: data.password ? data.password : undefined,
        })
        toast.success(`Data pegawai "${data.name}" berhasil diperbarui.`)
      } else {
        await userService.createUser({
          name: data.name.trim(),
          email: data.email.trim(),
          nip: data.nip.trim(),
          phone: data.phone.trim(),
          opd_id: data.opd_id,
          pangkat_gol: data.pangkat_gol,
          jabatan: data.jabatan.trim(),
          role: data.role,
          status: data.status,
          password: data.password!,
        })
        toast.success(`Pegawai "${data.name}" berhasil ditambahkan.`)
      }

      queryClient.invalidateQueries({ queryKey: ['users'] })
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan data pegawai.'
      toast.error(msg)
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
              {isEdit ? <UserCheck className='h-5 w-5' /> : <UserPlus className='h-5 w-5' />}
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? `Edit Pegawai: ${currentRow?.name}` : 'Tambah Pegawai Baru'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui identitas, instansi, jabatan, dan hak akses akun pegawai.'
                  : 'Daftarkan akun pegawai resmi ke sistem portal PEMDA. Semua kolom wajib diisi.'}
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
              {/* Nama Lengkap */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Nama Lengkap Beserta Gelar <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Dr. H. Ahmad Sudrajat, M.Si'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* Email Dinas */}
                <FormField
                  control={form.control}
                  name='email'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Email Resmi / Dinas <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          type='email'
                          placeholder='ahmad.sudrajat@pemda.go.id'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* NIP */}
                <FormField
                  control={form.control}
                  name='nip'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        NIP (Nomor Induk Pegawai) <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='198503152010011002'
                          maxLength={30}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Instansi / OPD */}
              <FormField
                control={form.control}
                name='opd_id'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                      <Building2 className='h-3.5 w-3.5 text-muted-foreground' />
                      Instansi / Perangkat Daerah (OPD) <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        disabled={isSubmitting || isLoadingOpds}
                        value={field.value}
                        onValueChange={field.onChange}
                        options={opdOptions}
                        placeholder={
                          isLoadingOpds
                            ? 'Memuat daftar OPD...'
                            : 'Pilih perangkat daerah...'
                        }
                        searchPlaceholder='Cari nama atau singkatan OPD (misal: Disdik, Setda, Bappeda)...'
                        emptyMessage='Tidak ada perangkat daerah yang cocok.'
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* Jabatan Kedinasan */}
                <FormField
                  control={form.control}
                  name='jabatan'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Jabatan Kedinasan <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: Kepala Bidang Informatika'
                          maxLength={150}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Pangkat / Golongan */}
                <FormField
                  control={form.control}
                  name='pangkat_gol'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Pangkat / Golongan Ruang <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <SearchableSelect
                          disabled={isSubmitting}
                          value={field.value}
                          onValueChange={field.onChange}
                          options={pangkatOptions}
                          placeholder='Pilih pangkat / golongan...'
                          searchPlaceholder='Cari nama pangkat atau ruang (misal: Pembina, III/a, PPPK)...'
                          emptyMessage='Tidak ada pangkat yang cocok.'
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {/* No HP / WA */}
                <FormField
                  control={form.control}
                  name='phone'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        No. WhatsApp / HP <span className='text-destructive'>*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder='081234567890'
                          maxLength={20}
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Role Dropdown */}
                <FormField
                  control={form.control}
                  name='role'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>
                        Peran (Role) <span className='text-destructive'>*</span>
                      </FormLabel>
                      <Select
                        disabled={isSubmitting || isLoadingRoles}
                        onValueChange={field.onChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger className='w-full'>
                            <SelectValue placeholder='Pilih peran pegawai...' />
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
              </div>

              {/* Status Pegawai */}
              <FormField
                control={form.control}
                name='status'
                render={({ field }) => (
                  <FormItem className='space-y-2 pt-1'>
                    <FormLabel className='text-xs font-semibold'>
                      Status Akun Pegawai <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        value={field.value}
                        className={cn(
                          'grid gap-2',
                          field.value === 'pending_activation' ? 'grid-cols-4' : 'grid-cols-3'
                        )}
                      >
                        <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                          <FormControl>
                            <RadioGroupItem value='active' />
                          </FormControl>
                          <FormLabel className='font-normal cursor-pointer text-xs'>
                            Aktif
                          </FormLabel>
                        </FormItem>

                        {field.value === 'pending_activation' && (
                          <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-amber-500 [&:has([data-state=checked])]:bg-amber-500/5'>
                            <FormControl>
                              <RadioGroupItem value='pending_activation' />
                            </FormControl>
                            <FormLabel className='font-normal cursor-pointer text-xs text-amber-700 dark:text-amber-400'>
                              Menunggu
                            </FormLabel>
                          </FormItem>
                        )}

                        <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                          <FormControl>
                            <RadioGroupItem value='inactive' />
                          </FormControl>
                          <FormLabel className='font-normal cursor-pointer text-xs'>
                            Nonaktif
                          </FormLabel>
                        </FormItem>

                        <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-destructive [&:has([data-state=checked])]:bg-destructive/5'>
                          <FormControl>
                            <RadioGroupItem value='suspended' />
                          </FormControl>
                          <FormLabel className='font-normal cursor-pointer text-xs'>
                            Ditangguhkan
                          </FormLabel>
                        </FormItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Password Field */}
              <div className='pt-2 border-t'>
                <div className='flex items-center justify-between pb-1.5'>
                  <FormLabel className='text-xs font-semibold'>
                    {isEdit ? 'Ubah Kata Sandi (Opsional)' : 'Kata Sandi Awal Akun'}{' '}
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
                              : 'Masukkan kata sandi awal pegawai...'
                          }
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Password Strength Checklist */}
                {watchedPassword.length > 0 && (
                  <div className='mt-2.5 p-2.5 rounded-lg border bg-muted/20 text-xs space-y-1.5'>
                    <div className='flex items-center justify-between font-medium text-[11px] text-muted-foreground mb-1'>
                      <span>Standar Keamanan Sandi Sandi:</span>
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
              'Tambah Pegawai'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
