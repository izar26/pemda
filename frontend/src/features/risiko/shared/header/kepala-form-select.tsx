import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { SubmissionItem } from '@/services/pengajuan-risiko-service'
import { RISIKO_WIZARD_STEPS } from '../risiko-wizard-store'

export function KepalaFormSelect({ items, value, onValueChange }: { items: SubmissionItem[]; value: string; onValueChange: (value: string) => void }) {
  const available = RISIKO_WIZARD_STEPS.filter((step) => items.some((item) => item.form_code.toLowerCase() === step.id && item.status !== 'approved'))
  return <div className='space-y-1.5'><Label htmlFor='kepala-form-revisi' className='text-xs font-semibold'>Formulir yang perlu diperbaiki <span className='text-destructive'>*</span></Label><Select value={value} onValueChange={onValueChange}><SelectTrigger id='kepala-form-revisi' className='w-full text-xs'><SelectValue placeholder='Pilih formulir' /></SelectTrigger><SelectContent>{available.map((step) => <SelectItem key={step.id} value={step.id} className='text-xs'>Form {step.code} — {step.shortTitle}</SelectItem>)}</SelectContent></Select>{available.length === 0 && <p className='text-xs text-muted-foreground'>Tidak ada formulir yang tersedia untuk direvisi.</p>}</div>
}
