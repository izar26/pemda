import { useMemo, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Building2, Loader2, MailPlus, Send } from 'lucide-react'

import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import { rbacService } from '@/services/rbac-service'
import { opdService } from '@/services/opd-service'
import { userService } from '@/services/user-service'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/searchable-select'
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
  opd_id: z.string().min(1, 'Instansi / Perangkat Daerah (OPD) wajib dipilih.'),
  jabatan: z
    .string()
    .min(1, 'Jabatan kedinasan wajib diisi.')
    .max(150, 'Jabatan maksimal 150 karakter.'),
  role: z.string().min(1, 'Peran (Role) wajib dipilih.'),
  notes: z
    .string()
    .min(1, 'Catatan undangan wajib diisi.')
    .max(500, 'Catatan maksimal 500 karakter.'),
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

  // Fetch dynamic OPDs
  const { data: opds = [], isLoading: isLoadingOpds } = useQuery({
    queryKey: ['opds'],
    queryFn: () => opdService.getOpds(),
    enabled: open,
  })

  const opdOptions = useMemo(() => {
    const list = Array.isArray(opds) ? opds : []
    return list.map((opd) => ({
      value: String(opd.id),
      label: opd.nama,
      group: opd.kategori || 'Perangkat Daerah',
      badge: opd.kategori,
      keywords: [opd.kode, opd.kategori],
    }))
  }, [opds])

  const form = useForm<UserInviteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      opd_id: '',
      jabatan: '',
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
        opd_id: values.opd_id,
        jabatan: values.jabatan.trim(),
        notes: values.notes.trim(),
      })

      await queryClient.invalidateQueries({ queryKey: ['users'] })
      form.reset()
      onOpenChange(false)

      toast.success(response.message || `Undangan berhasil dikirim ke ${values.email}`, {
        description: 'Pegawai dapat langsung mengaktifkan akun dan melengkapi data mandiri melalui tautan di email.',
      })
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Gagal mengirim undangan aktivasi ke pegawai.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isSubmitting) {
          form.reset()
          onOpenChange(v)
        }
      }}
    >
      <DialogContent className='sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden'>
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <DialogTitle className='flex items-center gap-2 text-base font-bold'>
            <div className='flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <MailPlus className='h-4 w-4' />
            </div>
            Undang Pegawai Baru
          </DialogTitle>
          <DialogDescription className='text-xs text-muted-foreground leading-relaxed'>
            Kirimkan tautan aktivasi mandiri ke email pegawai. Pegawai akan menentukan kata sandi serta mengisi data NIP dan kontak mereka sendiri.
          </DialogDescription>
        </DialogHeader>

        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='user-invite-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
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
                            : 'Pilih instansi / perangkat daerah'
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
                          placeholder='Contoh: Kepala Bidang'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                {/* Role / Hak Akses */}
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
                                  ? 'Memuat peran...'
                                  : 'Pilih peran akun'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Array.isArray(roles) ? roles : []).map((r) => (
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
              </div>

              {/* Catatan Undangan */}
              <FormField
                control={form.control}
                name='notes'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Catatan Undangan <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        className='resize-none text-xs'
                        rows={2}
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
        </div>

        <DialogFooter className='gap-2 px-6 py-3 border-t bg-muted/10 shrink-0'>
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
