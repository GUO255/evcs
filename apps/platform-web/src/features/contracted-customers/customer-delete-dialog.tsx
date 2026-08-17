import { Trash2Icon } from '@/components/ui/icons'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface CustomerDeleteDialogProps {
  open: boolean
  customerName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function CustomerDeleteDialog({
  open,
  customerName,
  onOpenChange,
  onConfirm,
}: CustomerDeleteDialogProps) {
  function handleConfirm() {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>删除签约客户？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除“{customerName}”的全部 Mock 客户资料。本次操作无法撤销，刷新页面会恢复初始数据。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={handleConfirm}>确认删除</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
