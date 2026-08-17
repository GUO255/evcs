import { ArrowDownIcon, ArrowUpIcon, Trash2Icon } from '@/components/ui/icons'

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

import type { Campaign } from './campaign-data'

export type CampaignAction = 'publish' | 'offline' | 'delete'

interface CampaignActionDialogProps {
  action?: CampaignAction
  campaign?: Campaign
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}

const actionContent = {
  publish: {
    title: '上架活动？',
    description: '上架后活动将进入执行状态，并面向目标用户生效。',
    confirmLabel: '确认上架',
    icon: ArrowUpIcon,
  },
  offline: {
    title: '下架活动？',
    description: '下架后活动将停止继续参与，已有业务记录不会被删除。',
    confirmLabel: '确认下架',
    icon: ArrowDownIcon,
  },
  delete: {
    title: '删除活动？',
    description: '活动资料将被删除，本次操作无法撤销。',
    confirmLabel: '确认删除',
    icon: Trash2Icon,
  },
} as const

export function CampaignActionDialog({
  action,
  campaign,
  onOpenChange,
  onConfirm,
}: CampaignActionDialogProps) {
  const open = Boolean(action && campaign)
  const content = action ? actionContent[action] : actionContent.publish
  const Icon = content.icon

  function handleConfirm() {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia><Icon /></AlertDialogMedia>
          <AlertDialogTitle>{content.title}</AlertDialogTitle>
          <AlertDialogDescription>
            “{campaign?.name ?? ''}”：{content.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            variant={action === 'delete' ? 'destructive' : 'default'}
            onClick={handleConfirm}
          >
            {content.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
