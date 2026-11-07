import { useEffect, useMemo, useState } from 'react'
import { isAxiosError } from 'axios'
import { toast } from 'sonner'
import { risikoService } from '@/services/risiko-service'
import type {
  KonteksOperasionalItemJenis,
  KonteksOperasionalItemNode,
} from '@/types/risiko'

export function getItemLabel(jenis: KonteksOperasionalItemJenis) {
  switch (jenis) {
    case 'program':
      return 'Program'
    case 'kegiatan':
      return 'Kegiatan'
    case 'sub_kegiatan':
      return 'Sub Kegiatan'
  }
}

interface UseOperasionalTreeStateProps {
  konteksId: string
  programs: KonteksOperasionalItemNode[]
  onRefetch: () => void
}

export function useOperasionalTreeState({
  konteksId,
  programs,
  onRefetch,
}: UseOperasionalTreeStateProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedPrograms, setCollapsedPrograms] = useState<Record<string, boolean>>({})
  const [collapsedKegiatans, setCollapsedKegiatans] = useState<Record<string, boolean>>({})
  const [deleteTarget, setDeleteTarget] = useState<KonteksOperasionalItemNode | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Auto-expand all matching nodes when user types in search
  useEffect(() => {
    if (searchQuery.trim()) {
      setCollapsedPrograms({})
      setCollapsedKegiatans({})
    }
  }, [searchQuery])

  function toggleCollapseProgram(id: string) {
    setCollapsedPrograms((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  function toggleCollapseKegiatan(id: string) {
    setCollapsedKegiatans((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const allExpanded = useMemo(() => {
    if (programs.length === 0) return true
    const anyProgCollapsed = programs.some((p) => Boolean(collapsedPrograms[p.id]))
    const anyKegCollapsed = programs.some((p) =>
      p.children?.some((k) => Boolean(collapsedKegiatans[k.id]))
    )
    return !anyProgCollapsed && !anyKegCollapsed
  }, [programs, collapsedPrograms, collapsedKegiatans])

  function handleToggleAll() {
    if (allExpanded) {
      const nextProg: Record<string, boolean> = {}
      const nextKeg: Record<string, boolean> = {}
      programs.forEach((p) => {
        nextProg[p.id] = true
        p.children?.forEach((k) => {
          nextKeg[k.id] = true
        })
      })
      setCollapsedPrograms(nextProg)
      setCollapsedKegiatans(nextKeg)
    } else {
      setCollapsedPrograms({})
      setCollapsedKegiatans({})
    }
  }

  async function handleReorder(siblingIds: string[]) {
    try {
      await risikoService.reorderKonteksOperasionalItems(konteksId, siblingIds)
      toast.success('Urutan operasional berhasil disesuaikan.')
      onRefetch()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal memperbarui urutan operasional.')
      }
    }
  }

  function handleMoveProgram(index: number, direction: 'up' | 'down') {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= programs.length) return

    const newIds = programs.map((p) => p.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  function handleMoveKegiatan(
    program: KonteksOperasionalItemNode,
    index: number,
    direction: 'up' | 'down'
  ) {
    const siblings = program.children || []
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return

    const newIds = siblings.map((k) => k.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  function handleMoveSubKegiatan(
    kegiatan: KonteksOperasionalItemNode,
    index: number,
    direction: 'up' | 'down'
  ) {
    const siblings = kegiatan.children || []
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    if (targetIdx < 0 || targetIdx >= siblings.length) return

    const newIds = siblings.map((s) => s.id)
    const temp = newIds[index]
    newIds[index] = newIds[targetIdx]
    newIds[targetIdx] = temp
    handleReorder(newIds)
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await risikoService.deleteKonteksOperasionalItem(konteksId, deleteTarget.id)
      toast.success(
        `${getItemLabel(deleteTarget.jenis)} (${deleteTarget.kode}) berhasil dihapus dan penomoran disesuaikan.`
      )
      setDeleteTarget(null)
      onRefetch()
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.data?.message) {
        toast.error(error.response.data.message)
      } else {
        toast.error('Gagal menghapus rincian operasional.')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const filteredPrograms = useMemo(() => {
    if (!searchQuery.trim()) return programs
    const q = searchQuery.toLowerCase()

    return programs
      .map((prog) => {
        const progMatches =
          prog.kode.toLowerCase().includes(q) ||
          prog.nama.toLowerCase().includes(q) ||
          prog.indikators?.some((ind) =>
            ind.indikator.toLowerCase().includes(q)
          )

        const filteredKegiatans =
          (prog.children
            ?.map((keg) => {
              const kegMatches =
                keg.kode.toLowerCase().includes(q) ||
                keg.nama.toLowerCase().includes(q) ||
                keg.indikators?.some((ind) =>
                  ind.indikator.toLowerCase().includes(q)
                )

              const filteredSub =
                keg.children?.filter((sub) => {
                  return (
                    sub.kode.toLowerCase().includes(q) ||
                    sub.nama.toLowerCase().includes(q) ||
                    sub.indikators?.some((ind) =>
                      ind.indikator.toLowerCase().includes(q)
                    )
                  )
                }) || []

              if (kegMatches || filteredSub.length > 0) {
                return {
                  ...keg,
                  children: kegMatches ? keg.children : filteredSub,
                }
              }
              return null
            })
            .filter(Boolean) as KonteksOperasionalItemNode[]) || []

        if (progMatches || filteredKegiatans.length > 0) {
          return {
            ...prog,
            children: progMatches ? prog.children : filteredKegiatans,
          }
        }
        return null
      })
      .filter(Boolean) as KonteksOperasionalItemNode[]
  }, [programs, searchQuery])

  const summary = useMemo(() => {
    let totalKeg = 0
    let totalSub = 0

    programs.forEach((p) => {
      p.children?.forEach((k) => {
        totalKeg++
        k.children?.forEach(() => {
          totalSub++
        })
      })
    })

    return {
      progCount: programs.length,
      kegCount: totalKeg,
      subCount: totalSub,
    }
  }, [programs])

  return {
    searchQuery,
    setSearchQuery,
    collapsedPrograms,
    setCollapsedPrograms,
    toggleCollapseProgram,
    collapsedKegiatans,
    setCollapsedKegiatans,
    toggleCollapseKegiatan,
    allExpanded,
    handleToggleAll,
    deleteTarget,
    setDeleteTarget,
    isDeleting,
    handleDelete,
    handleMoveProgram,
    handleMoveKegiatan,
    handleMoveSubKegiatan,
    filteredPrograms,
    summary,
  }
}
