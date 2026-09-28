import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { KeyRound, Loader2, Plus, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { isAxiosError } from 'axios'
import type { Permission, Role } from '@/types/rbac'
import { rbacService } from '@/services/rbac-service'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

const roleSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama peran minimal 2 karakter.')
    .max(50, 'Nama peran maksimal 50 karakter.'),
  description: z.string().max(255, 'Deskripsi maksimal 255 karakter.').optional(),
  template: z.enum(['empty', 'readonly', 'copy']).optional(),
  copyFromRole: z.string().optional(),
})

type RoleFormValues = z.infer<typeof roleSchema>

interface RoleFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null // null for create mode, Role for edit mode
  existingRoles: Role[]
  allPermissions: Permission[]
  onSuccess: () => void
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
  existingRoles,
  allPermissions,
  onSuccess,
}: RoleFormDialogProps) {
  const isEdit = Boolean(role)
  const isSystem = Boolean(role?.is_system)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
      template: 'empty',
      copyFromRole: '',
    },
  })

  const template = form.watch('template')

  useEffect(() => {
    if (open) {
      if (role) {
        form.reset({
          name: role.name,
          description: role.description || '',
          template: 'empty',
          copyFromRole: '',
        })
      } else {
        form.reset({
          name: '',
          description: '',
          template: 'empty',
          copyFromRole: existingRoles[0]?.name || '',
        })
      }
    }
  }, [open, role, existingRoles, form])

  async function onSubmit(data: RoleFormValues) {
    setIsSubmitting(true)

    try {
      if (isEdit && role) {
        // Update name and description only (permissions are managed dynamically in matrix)
        const currentPermNames = role.permissions.map((p) => p.name)
        await rbacService.updateRole(role.id, {
          name: isSystem ? role.name : data.name,
          description: data.description,
          permissions: currentPermNames.length > 0 ? currentPermNames : ['users.view'],
        })
        toast.success(`Informasi peran "${data.name}" berhasil diperbarui.`)
      } else {
        // Compute initial permissions based on selected template
        let initialPerms: string[] = []

        if (data.template === 'readonly') {
          // Grant all view permissions
          initialPerms = allPermissions
            .filter((p) => p.name.endsWith('.view'))
            .map((p) => p.name)
        } else if (data.template === 'copy' && data.copyFromRole) {
          const source = existingRoles.find((r) => r.name === data.copyFromRole)
          initialPerms = source ? source.permissions.map((p) => p.name) : []
        }

        await rbacService.createRole({
          name: data.name,
          description: data.description,
          permissions: initialPerms,
        })
        toast.success(`Peran "${data.name}" berhasil ditambahkan ke matriks kewenangan.`)
      }

      onSuccess()
      onOpenChange(false)
    } catch (error) {
      const msg =
        isAxiosError(error) && error.response?.data?.message
          ? error.response.data.message
          : 'Terjadi kesalahan saat menyimpan peran.'
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-md max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              {isEdit ? <KeyRound className='h-5 w-5' /> : <Plus className='h-5 w-5' />}
            </div>
            <div>
              <DialogTitle className='text-base font-bold text-foreground'>
                {isEdit ? `Edit Informasi Peran: ${role?.name}` : 'Tambah Peran (Role) Baru'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Perbarui nama atau deskripsi peran. Hak akses dapat diatur langsung pada lembar matriks.'
                  : 'Definisikan jabatan peran kedinasan baru ke dalam matriks tata kelola.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='role-form-dialog'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-4'
            >
              {/* Nama Peran */}
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Nama Peran Kedinasan <span className='text-destructive'>*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Auditor Inspektorat, Bendahara Pengeluaran'
                        disabled={isSubmitting || isSystem}
                        {...field}
                      />
                    </FormControl>
                    {isSystem && (
                      <p className='text-[11px] text-blue-600 dark:text-blue-400'>
                        Nama peran bawaan sistem dilindungi dari perubahan nama.
                      </p>
                    )}
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Deskripsi */}
              <FormField
                control={form.control}
                name='description'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-xs font-semibold'>
                      Deskripsi Tugas & Kewenangan
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder='Contoh: Petugas pengawas audit kepatuhan tata kelola internal'
                        disabled={isSubmitting}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className='text-xs' />
                  </FormItem>
                )}
              />

              {/* Templat Inisialisasi Izin (Hanya untuk Mode Tambah Baru) */}
              {!isEdit && (
                <div className='pt-2 border-t space-y-3'>
                  <FormLabel className='text-xs font-semibold flex items-center gap-1.5'>
                    <Sparkles className='h-3.5 w-3.5 text-amber-500' />
                    Templat Izin Awal (Preset)
                  </FormLabel>

                  <FormField
                    control={form.control}
                    name='template'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className='grid grid-cols-1 gap-2'
                          >
                            <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                              <FormControl>
                                <RadioGroupItem value='empty' />
                              </FormControl>
                              <div className='flex flex-col'>
                                <span className='font-semibold text-foreground text-xs'>
                                  Standar Minimal (users.view)
                                </span>
                                <span className='text-[11px] text-muted-foreground'>
                                  Mulai dengan hak akses dasar, lalu sesuaikan di lembar matriks.
                                </span>
                              </div>
                            </FormItem>

                            <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                              <FormControl>
                                <RadioGroupItem value='readonly' />
                              </FormControl>
                              <div className='flex flex-col'>
                                <span className='font-semibold text-foreground text-xs'>
                                  Akses Hanya-Lihat (Read-Only)
                                </span>
                                <span className='text-[11px] text-muted-foreground'>
                                  Otomatis memberikan hak lihat/pantau di semua modul tanpa izin modifikasi.
                                </span>
                              </div>
                            </FormItem>

                            <FormItem className='flex items-center space-x-2 space-y-0 rounded-lg border p-2.5 text-xs font-medium cursor-pointer [&:has([data-state=checked])]:border-primary [&:has([data-state=checked])]:bg-primary/5'>
                              <FormControl>
                                <RadioGroupItem value='copy' />
                              </FormControl>
                              <div className='flex flex-col'>
                                <span className='font-semibold text-foreground text-xs'>
                                  Salin dari Peran yang Ada
                                </span>
                                <span className='text-[11px] text-muted-foreground'>
                                  Menduplikasi konfigurasi hak akses dari peran lain.
                                </span>
                              </div>
                            </FormItem>
                          </RadioGroup>
                        </FormControl>
                        <FormMessage className='text-xs' />
                      </FormItem>
                    )}
                  />

                  {template === 'copy' && (
                    <FormField
                      control={form.control}
                      name='copyFromRole'
                      render={({ field }) => (
                        <FormItem className='pt-1'>
                          <FormLabel className='text-xs'>Pilih Peran Sumber</FormLabel>
                          <Select
                            disabled={isSubmitting}
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder='Pilih peran...' />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {existingRoles.map((r) => (
                                <SelectItem key={r.id} value={r.name}>
                                  {r.name} ({r.permissions_count} Izin)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  )}
                </div>
              )}
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
          <Button type='submit' form='role-form-dialog' disabled={isSubmitting}>
            {isSubmitting && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {isEdit ? 'Simpan Informasi' : 'Buat Peran Baru'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
