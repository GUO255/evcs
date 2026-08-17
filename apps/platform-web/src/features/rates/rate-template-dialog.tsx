import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

import { RateTemplateForm } from './rate-template-form'

export function RateTemplateDialog({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>新增费率模板</DialogTitle>
          <DialogDescription>配置电价和服务费；分时费率必须连续覆盖完整的 00:00–24:00。</DialogDescription>
        </DialogHeader>
        {open ? (
          <RateTemplateForm
            key="new-rate-template"
            cancelAction={<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>}
            onSaved={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
