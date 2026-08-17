import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface PointsProductDeleteDialogProps {
  open: boolean
  productName: string
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

export function PointsProductDeleteDialog({
  open,
  productName,
  onOpenChange,
  onConfirm,
}: PointsProductDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>删除积分兑换商品？</AlertDialogTitle>
          <AlertDialogDescription>
            将删除“{productName}”。本次操作仅影响当前 MOCK 页面数据。
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
