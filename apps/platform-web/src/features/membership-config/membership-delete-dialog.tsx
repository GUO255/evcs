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

interface MembershipDeleteDialogProps {
  open: boolean
  recordName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function MembershipDeleteDialog({
  open,
  recordName,
  onOpenChange,
  onConfirm,
}: MembershipDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>删除会员内容？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除“{recordName}”。本次操作无法撤销，刷新页面会恢复初始数据。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            确认删除
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
