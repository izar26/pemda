import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, MailPlus, Send } from 'lucide-react'

import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { rbacService } from '@/services/rbac-service'
import { userService } from '@/services/user-service'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
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
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const formSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama lengkap minimal 2 karakter.')
    .max(100, 'Nama lengkap maksimal 100 karakter.'),
  email: z
    .string()
    .min(1, 'Email dinas wajib diisi.')
    .email('Format alamat email tidak valid.')
    .max(100, 'Email maksimal 100 karakter.'),
  role: z.string().min(1, 'Peran (Role) wajib dipilih.'),
  notes: z.string().max(500, 'Catatan maksimal 500 karakter.').optional(),
})

type UserInviteFormValues = z.infer<typeof formSchema>

type UserInviteDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UsersInviteDialog({
  open,
  onOpenChange,
}: UserInviteDialogProps) {
  const queryClient = useQueryClient()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Fetch dynamic roles
  const { data: roles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => rbacService.getRoles(),
    enabled: open,
  })

  const form = useForm<UserInviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      role: '',
      notes: '',
    },
  })

  const onSubmit = async (values: UserInviteFormValues) => {
    setIsSubmitting(true)
    try {
      const response = await userService.inviteUser({
        name: values.name.trim(),
        email: values.email.trim().toLowerCase(),
        role: values.role,
        notes: values.notes?.trim() || undefined,
      })

      await queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset()
      onOpenChange(false)

      toast.success(response.message || `Undangan berhasil dikirim ke ${values.email}`, {
        description: 'Pegawai dapat langsung mengaktifkan akun dan melengkapi data mandiri melalui tautan di email.',
      })
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data) {
        const errorData = error.response.data as {
          message?: string
          errors?: Record<string, string[]>
        }

        if (errorData.errors) {
          Object.entries(errorData.errors).forEach(([field, msgs]) => {
            const formField = field as keyof UserInviteFormValues
            if (formField in form.getValues()) {
              form.setError(formField, {
                type: 'server',
                message: msgs[0],
              })
            }
          })
        }

        toast.error('Gagal Mengirim Undangan', {
          description:
            errorData.message ||
            'Terjadi kesalahan saat mengirim undangan aktivasi akun pegawai.',
        })
      } else {
        toast.error('Kesalahan Jaringan', {
          description: 'Tidak dapat terhubung ke server. Silakan coba kembali.',
        })
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(state) => {
        if (!state) {
          form.reset()
        }
        onOpenChange(state)
      }}
    >
      <DialogContent className='sm:max-w-lg'>
        <DialogHeader className='text-start'>
          <DialogTitle className='flex items-center gap-2 text-lg font-bold'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <MailPlus className='h-4 w-4' />
            </div>
            Undang Pegawai Baru
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground leading-relaxed'>
            Kirimkan tautan aktivasi mandiri ke email pegawai. Pegawai akan menentukan kata sandi serta mengisi data NIP dan kontak mereka sendiri.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            id='user-invite-form'
            onSubmit={form.handleSubmit(onSubmit)}
            className='space-y-4 pt-1'
          >
            {/* Nama Lengkap Pegawai */}
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Nama Lengkap Pegawai <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder='Contoh: Budi Prasetyo, S.STP'
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Email Dinas / Kontak */}
            <FormField
              control={form.control}
              name='email'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Email Dinas / Pegawai <span className='text-destructive'>*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type='email'
                      placeholder='nama.pegawai@pemda.go.id'
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />

            {/* Role / Jabatan */}
            <FormField
              control={form.control}
              name='role'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold'>
                    Peran & Hak Akses (Role) <span className='text-destructive'>*</span>
                  </FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={isSubmitting || isLoadingRoles}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={
                            isLoadingRoles
                              ? 'Memuat daftar peran...'
                              : 'Pilih peran jabatan pegawai'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.name}>
                          <div className='flex items-center gap-2'>
                            <span className='font-medium'>{r.name}</span>
                            {r.is_system && (
                              <span className='text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded'>
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

            {/* Catatan Undangan */}
            <FormField
              control={form.control}
              name='notes'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-semibold text-muted-foreground'>
                    Catatan Undangan (Opsional)
                  </FormLabel>
                  <FormControl>
                    <Textarea
                      className='resize-none text-xs'
                      rows={3}
                      placeholder='Contoh: Selamat bergabung di Dinas Kominfo Kabupaten. Silakan aktifkan akun untuk akses portal.'
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className='text-xs' />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className='gap-2 pt-2 border-t'>
          <DialogClose asChild>
            <Button variant='outline' size='sm' disabled={isSubmitting}>
              Batal
            </Button>
          </DialogClose>
          <Button
            type='submit'
            size='sm'
            form='user-invite-form'
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className='h-4 w-4 animate-spin mr-1.5' />
                Mengirim Undangan...
              </>
            ) : (
              <>
                <Send className='h-4 w-4 mr-1.5' />
                Kirim Undangan
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
