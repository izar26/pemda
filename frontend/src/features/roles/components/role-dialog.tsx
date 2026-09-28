import { useEffect, useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Check, CheckSquare, Loader2, Shield, ShieldCheck, Square } from 'lucide-react'
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
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

const roleFormSchema = z.object({
  name: z
    .string()
    .min(2, 'Nama peran minimal 2 karakter.')
    .max(50, 'Nama peran maksimal 50 karakter.'),
  description: z.string().max(255, 'Deskripsi maksimal 255 karakter.').optional(),
  permissions: z.array(z.string()).min(1, 'Pilih setidaknya satu hak akses untuk peran ini.'),
})

type RoleFormValues = z.infer<typeof roleFormSchema>

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: Role | null // null for create mode, Role for edit mode
  groupedPermissions: Record<string, Permission[]>
  onSuccess: () => void
}

export function RoleDialog({
  open,
  onOpenChange,
  role,
  groupedPermissions,
  onSuccess,
}: RoleDialogProps) {
  const isEdit = Boolean(role)
  const isSystemRole = Boolean(role?.is_system)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  })

  // Populate form on edit
  useEffect(() => {
    if (open) {
      if (role) {
        form.reset({
          name: role.name,
          description: role.description || '',
          permissions: role.permissions.map((p) => p.name),
        })
      } else {
        form.reset({
          name: '',
          description: '',
          permissions: [],
        })
      }
    }
  }, [open, role, form])

  const selectedPermissions = form.watch('permissions') || []

  // Toggle all permissions in a specific group
  function toggleGroup(groupPermissions: Permission[]) {
    const groupPermNames = groupPermissions.map((p) => p.name)
    const allSelected = groupPermNames.every((name) => selectedPermissions.includes(name))

    let updated: string[]
    if (allSelected) {
      // Uncheck all in group
      updated = selectedPermissions.filter((name) => !groupPermNames.includes(name))
    } else {
      // Check all in group
      const newPerms = groupPermNames.filter((name) => !selectedPermissions.includes(name))
      updated = [...selectedPermissions, ...newPerms]
    }

    form.setValue('permissions', updated, { shouldValidate: true })
  }

  // Toggle single permission
  function togglePermission(permName: string) {
    const isChecked = selectedPermissions.includes(permName)
    const updated = isChecked
      ? selectedPermissions.filter((name) => name !== permName)
      : [...selectedPermissions, permName]

    form.setValue('permissions', updated, { shouldValidate: true })
  }

  async function onSubmit(data: RoleFormValues) {
    setIsSubmitting(true)

    try {
      if (isEdit && role) {
        await rbacService.updateRole(role.id, {
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        })
        toast.success(`Peran "${data.name}" berhasil diperbarui.`)
      } else {
        await rbacService.createRole({
          name: data.name,
          description: data.description,
          permissions: data.permissions,
        })
        toast.success(`Peran "${data.name}" berhasil ditambahkan.`)
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

  const totalPermissions = Object.values(groupedPermissions).flat().length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='sm:max-w-2xl max-h-[85vh] flex flex-col p-0 gap-0 overflow-hidden shadow-2xl'>
        {/* Pinned Header */}
        <DialogHeader className='px-6 pt-5 pb-4 border-b bg-muted/10 shrink-0 text-start'>
          <div className='flex items-center gap-3'>
            <div className='flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary'>
              <ShieldCheck className='h-5 w-5' />
            </div>
            <div>
              <DialogTitle className='text-lg font-bold text-foreground'>
                {isEdit ? `Edit Peran: ${role?.name}` : 'Tambah Peran (Role) Baru'}
              </DialogTitle>
              <DialogDescription className='text-xs text-muted-foreground mt-0.5'>
                {isEdit
                  ? 'Sesuaikan nama, deskripsi, dan matriks hak akses untuk peran ini.'
                  : 'Tentukan nama peran kerja dan pilih hak akses operasional yang diizinkan.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Body with min-h-0 */}
        <div className='flex-1 overflow-y-auto px-6 py-4 min-h-0'>
          <Form {...form}>
            <form
              id='role-dialog-form'
              onSubmit={form.handleSubmit(onSubmit)}
              className='space-y-5'
            >
              {/* Info Sistem Badge jika peran bawaan */}
              {isSystemRole && (
                <div className='flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-800 dark:text-amber-300'>
                  <Shield className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
                  <span>
                    Ini adalah <strong>Peran Sistem Bawaan</strong>. Nama peran tidak dapat
                    diubah, namun Anda tetap dapat menyesuaikan hak aksesnya.
                  </span>
                </div>
              )}

              {/* Form Nama & Deskripsi */}
              <div className='grid gap-4 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>Nama Peran</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: Auditor Inspektorat'
                          disabled={isSubmitting || isSystemRole}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='description'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className='text-xs font-semibold'>Deskripsi Singkat</FormLabel>
                      <FormControl>
                        <Input
                          placeholder='Contoh: Pengawas audit internal tata kelola'
                          disabled={isSubmitting}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage className='text-xs' />
                    </FormItem>
                  )}
                />
              </div>

              {/* Matriks Hak Akses (Permissions Matrix) */}
              <div className='space-y-3 pt-2'>
                <div className='flex items-center justify-between border-b pb-2'>
                  <div>
                    <h4 className='text-xs font-bold uppercase tracking-wider text-foreground'>
                      Matriks Hak Akses (Permissions)
                    </h4>
                    <p className='text-[11px] text-muted-foreground'>
                      Centang hak akses yang diizinkan untuk peran ini.
                    </p>
                  </div>
                  <Badge variant='secondary' className='text-[11px] font-mono'>
                    {selectedPermissions.length} / {totalPermissions} Terpilih
                  </Badge>
                </div>

                {form.formState.errors.permissions && (
                  <p className='text-xs font-medium text-destructive'>
                    {form.formState.errors.permissions.message}
                  </p>
                )}

                {/* Kelompok Hak Akses per Modul */}
                <div className='space-y-4 pt-1'>
                  {Object.entries(groupedPermissions).map(([groupName, groupPerms]) => {
                    const groupNames = groupPerms.map((p) => p.name)
                    const isGroupAllSelected = groupNames.every((n) =>
                      selectedPermissions.includes(n)
                    )

                    return (
                      <div
                        key={groupName}
                        className='rounded-lg border bg-card/60 p-3.5 space-y-3 shadow-2xs'
                      >
                        <div className='flex items-center justify-between'>
                          <span className='font-semibold text-xs text-foreground flex items-center gap-1.5'>
                            <div className='h-2 w-2 rounded-full bg-primary' />
                            {groupName}
                          </span>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            className='h-6 px-2 text-[10px] text-muted-foreground hover:text-foreground'
                            onClick={() => toggleGroup(groupPerms)}
                          >
                            {isGroupAllSelected ? (
                              <>
                                <CheckSquare className='h-3 w-3 mr-1 text-primary' />
                                Batal Pilih Semua
                              </>
                            ) : (
                              <>
                                <Square className='h-3 w-3 mr-1' />
                                Pilih Semua
                              </>
                            )}
                          </Button>
                        </div>

                        <div className='grid gap-2 sm:grid-cols-2 pt-1'>
                          {groupPerms.map((perm) => {
                            const isChecked = selectedPermissions.includes(perm.name)
                            return (
                              <div
                                key={perm.name}
                                onClick={() => togglePermission(perm.name)}
                                className={`flex items-start gap-2.5 rounded-md border p-2.5 text-xs transition-colors cursor-pointer select-none ${
                                  isChecked
                                    ? 'border-primary/40 bg-primary/5 text-foreground'
                                    : 'border-border/60 hover:bg-muted/40 text-muted-foreground'
                                }`}
                              >
                                <Checkbox
                                  checked={isChecked}
                                  onCheckedChange={() => togglePermission(perm.name)}
                                  className='mt-0.5'
                                />
                                <div className='space-y-0.5 leading-none'>
                                  <span className='font-mono font-medium text-foreground text-[11px] block'>
                                    {perm.name}
                                  </span>
                                  {perm.description && (
                                    <p className='text-[10px] text-muted-foreground leading-normal'>
                                      {perm.description}
                                    </p>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
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
          <Button type='submit' form='role-dialog-form' disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                Menyimpan...
              </>
            ) : (
              <>
                <Check className='mr-2 h-4 w-4' />
                {isEdit ? 'Simpan Perubahan' : 'Buat Peran'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
