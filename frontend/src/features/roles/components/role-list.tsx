import { Edit, KeyRound, MoreVertical, Shield, ShieldCheck, Trash2, Users } from 'lucide-react'
import type { Role } from '@/types/rbac'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface RoleListProps {
  roles: Role[]
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
}

export function RoleList({ roles, onEdit, onDelete }: RoleListProps) {
  return (
    <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-2'>
      {roles.map((role) => {
        const isSystem = role.is_system
        const permissions = role.permissions || []
        const previewPerms = permissions.slice(0, 4)
        const remainingCount = permissions.length - previewPerms.length

        return (
          <Card
            key={role.id}
            className='flex flex-col justify-between hover:shadow-md transition-shadow border-muted/80'
          >
            <CardHeader className='pb-3'>
              <div className='flex items-start justify-between gap-2'>
                <div className='flex items-start gap-3'>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-2xs ${
                      isSystem
                        ? 'bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400'
                        : 'bg-emerald-600/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                    }`}
                  >
                    {isSystem ? <ShieldCheck className='h-5 w-5' /> : <KeyRound className='h-5 w-5' />}
                  </div>
                  <div>
                    <div className='flex items-center gap-2'>
                      <CardTitle className='text-base font-bold text-foreground'>
                        {role.name}
                      </CardTitle>
                      {isSystem ? (
                        <Badge variant='outline' className='text-[10px] text-blue-600 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20'>
                          Sistem
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='text-[10px] text-emerald-600 border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20'>
                          Kustom
                        </Badge>
                      )}
                    </div>
                    <CardDescription className='text-xs text-muted-foreground mt-1 line-clamp-2'>
                      {role.description || 'Tidak ada deskripsi khusus.'}
                    </CardDescription>
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant='ghost' size='icon' className='h-8 w-8 text-muted-foreground'>
                      <MoreVertical className='h-4 w-4' />
                      <span className='sr-only'>Menu aksi</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align='end'>
                    <DropdownMenuItem onClick={() => onEdit(role)}>
                      <Edit className='mr-2 h-4 w-4' />
                      Atur Hak Akses
                    </DropdownMenuItem>
                    {!isSystem && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(role)}
                          className='text-destructive focus:text-destructive'
                        >
                          <Trash2 className='mr-2 h-4 w-4' />
                          Hapus Peran
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className='py-2 flex-1 space-y-3'>
              {/* Stat Chips */}
              <div className='flex flex-wrap items-center gap-2 text-xs'>
                <div className='flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground'>
                  <Users className='h-3.5 w-3.5 text-foreground' />
                  <span>
                    <strong className='text-foreground'>{role.users_count}</strong> Pegawai
                  </span>
                </div>

                <div className='flex items-center gap-1.5 rounded-md bg-muted/60 px-2 py-1 text-muted-foreground'>
                  <Shield className='h-3.5 w-3.5 text-foreground' />
                  <span>
                    <strong className='text-foreground'>{role.permissions_count}</strong> Hak Akses
                  </span>
                </div>
              </div>

              {/* Permissions Preview */}
              <div className='space-y-1.5 pt-1'>
                <p className='text-[11px] font-medium text-muted-foreground'>Izin Akses Terdaftar:</p>
                <div className='flex flex-wrap gap-1'>
                  {previewPerms.length > 0 ? (
                    <>
                      {previewPerms.map((perm) => (
                        <Badge
                          key={perm.name}
                          variant='secondary'
                          className='text-[10px] font-mono font-normal py-0 px-1.5 bg-muted/80'
                        >
                          {perm.name}
                        </Badge>
                      ))}
                      {remainingCount > 0 && (
                        <Badge
                          variant='outline'
                          className='text-[10px] py-0 px-1.5 text-muted-foreground'
                        >
                          +{remainingCount} lainnya
                        </Badge>
                      )}
                    </>
                  ) : (
                    <span className='text-[11px] text-muted-foreground italic'>
                      Belum ada hak akses yang dikaitkan.
                    </span>
                  )}
                </div>
              </div>
            </CardContent>

            <CardFooter className='pt-3 border-t bg-muted/10 flex items-center justify-between'>
              <span className='text-[11px] text-muted-foreground'>
                Dibuat: {role.created_at ? new Date(role.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
              </span>

              <Button
                variant='outline'
                size='sm'
                className='text-xs h-7'
                onClick={() => onEdit(role)}
              >
                <Edit className='mr-1.5 h-3.5 w-3.5' />
                Atur Izin
              </Button>
            </CardFooter>
          </Card>
        )
      })}
    </div>
  )
}
