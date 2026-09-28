'use client'

import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, KeyRound, Loader2, Sparkles, UserPlus, UserCheck } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { rbacService } from '@/services/rbac-service'
import { userService } from '@/services/user-service'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

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
import { Badge } from '@/components/ui/badge'
import type { User } from '../data/schema'


const userFormSchema = z
  .object({
    name: z.string().min(2, 'Nama lengkap minimal 2 karakter.').max(100, 'Maksimal 100 karakter.'),
    email: z.string().email('Format email dinas tidak valid.').max(100),
    nip: z.string().max(30, 'NIP maksimal 30 karakter.').optional(),
    phone: z.string().max(20, 'Nomor telepon maksimal 20 karakter.').optional(),
    role: z.string().min(1, 'Peran (Role) wajib dipilih.'),
    status: z.enum(['active', 'inactive', 'suspended', 'pending_activation']),
    password: z.string().optional(),

    isEdit: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.isEdit) return true
      return Boolean(data.password && data.password.length >= 8)
    },
    {
      message: 'Kata sandi minimal 8 karakter untuk akun baru.',
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

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      name: '',
      email: '',
      nip: '',
      phone: '',
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
          role: roles[0]?.name || '',
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

    // Shuffle characters
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
          name: data.name,
          email: data.email,
          nip: data.nip || undefined,
          phone: data.phone || undefined,
          role: data.role,
          status: data.status,
          password: data.password ? data.password : undefined,
        })
        toast.success(`Data pegawai "${data.name}" berhasil diperbarui.`)
      } else {
        await userService.createUser({
          name: data.name,
          email: data.email,
          nip: data.nip || undefined,
          phone: data.phone || undefined,
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
      <DialogContent className='sm:max-w-xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
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
                  ? 'Perbarui informasi identitas, jabatan/peran, dan status akun pegawai.'
                  : 'Daftarkan akun pegawai resmi ke portal PEMDA.'}
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
                          NIP (Nomor Induk Pegawai)
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

                <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
                  {/* No HP / WA */}
                  <FormField
                    control={form.control}
                    name='phone'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className='text-xs font-semibold'>No. WhatsApp / HP</FormLabel>
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
                            {roles.map((r) => (
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
                      <FormLabel className='text-xs font-semibold'>Status Akun Pegawai</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
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
                    <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                      <KeyRound className='h-3.5 w-3.5 text-primary' />
                      {isEdit ? 'Ubah Kata Sandi (Opsional)' : 'Kata Sandi Awal Akun'}
                      {!isEdit && <span className='text-destructive'>*</span>}
                    </FormLabel>

                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      className='h-6 text-[11px] px-2 gap-1'
                      onClick={generateSecurePassword}
                    >
                      {copiedPassword ? (
                        <>
                          <Check className='h-3 w-3 text-emerald-600' />
                          Tersalin!
                        </>
                      ) : (
                        <>
                          <Sparkles className='h-3 w-3 text-amber-500' />
                          Generate Acak
                        </>
                      )}
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
                                ? 'Biarkan kosong jika kata sandi tidak ingin diubah'
                                : 'Minimal 8 karakter (huruf, angka, simbol)'
                            }
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <p className='text-[11px] text-muted-foreground mt-1'>
                          {isEdit
                            ? 'Isi hanya jika ingin menyetel ulang kata sandi pegawai ini.'
                            : 'Kata sandi harus minimal 8 karakter, berisi huruf besar, huruf kecil, angka, dan simbol.'}
                        </p>
                        <FormMessage className='text-xs' />

                        {/* Interactive Strength Meter & Rules */}
                        {watchedPassword.length > 0 && (
                          <div className='mt-2.5 space-y-2 rounded-lg border bg-card/60 p-3 shadow-2xs'>
                            {/* Visual Strength Bar */}
                            <div className='space-y-1.5'>
                              <div className='flex items-center justify-between text-xs'>
                                <span className='text-muted-foreground text-[11px]'>Kekuatan Sandi:</span>
                                <span
                                  className={cn('font-semibold text-[11px] transition-colors', {
                                    'text-muted-foreground': validCount === 0,
                                    'text-destructive': validCount > 0 && validCount <= 2,
                                    'text-amber-500': validCount === 3 || validCount === 4,
                                    'text-emerald-600 dark:text-emerald-400': isAllValid,
                                  })}
                                >
                                  {validCount === 0 && 'Belum Diisi'}
                                  {validCount > 0 && validCount <= 2 && 'Lemah (Belum Memenuhi Syarat)'}
                                  {(validCount === 3 || validCount === 4) && 'Sedang'}
                                  {isAllValid && 'Sangat Kuat (Memenuhi Standar Keamanan)'}
                                </span>
                              </div>

                              {/* Segmented Strength Bar */}
                              <div className='grid grid-cols-5 gap-1.5 h-1.5'>
                                {[1, 2, 3, 4, 5].map((level) => (
                                  <div
                                    key={level}
                                    className={cn(
                                      'h-full rounded-full transition-all duration-300',
                                      validCount >= level
                                        ? validCount <= 2
                                          ? 'bg-destructive'
                                          : validCount <= 4
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        : 'bg-muted'
                                    )}
                                  />
                                ))}
                              </div>
                            </div>

                            {/* Checklist Badges / Pills */}
                            <div className='pt-0.5'>
                              <p className='text-[11px] font-medium text-muted-foreground mb-1.5'>
                                Syarat kata sandi yang aman:
                              </p>
                              <div className='flex flex-wrap gap-1.5'>
                                {criteria.map((item) => (
                                  <Badge
                                    key={item.id}
                                    variant={item.valid ? 'default' : 'outline'}
                                    className={cn(
                                      'text-[10px] font-normal transition-all duration-200 py-0.5 px-2 gap-1 select-none',
                                      item.valid
                                        ? 'bg-emerald-600 hover:bg-emerald-600 text-white dark:bg-emerald-500 dark:text-emerald-950 font-medium'
                                        : 'text-muted-foreground border-border/80 bg-muted/30'
                                    )}
                                  >
                                    {item.valid ? (
                                      <Check className='h-3 w-3 shrink-0' />
                                    ) : (
                                      <span className='h-1.5 w-1.5 rounded-full bg-muted-foreground/40 shrink-0' />
                                    )}
                                    {item.label}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </div>

            </form>
          </Form>
        </div>

        {/* Pinned Footer */}
        <DialogFooter className='px-6 py-3.5 border-t bg-muted/20 shrink-0 flex flex-row items-center justify-end gap-2'>
          <Button
            type='button'
            variant='outline'
            disabled={isSubmitting}
            onClick={() => onOpenChange(false)}
          >
            Batal
          </Button>
          <Button type='submit' form='users-dialog-form' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isEdit ? 'Simpan Perubahan' : 'Daftarkan Pegawai'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
