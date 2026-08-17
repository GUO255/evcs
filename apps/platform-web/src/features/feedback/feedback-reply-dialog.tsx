import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

import { formatFeedbackDateTime } from './feedback-date'
import { getFeedbackTypeLabel, type FeedbackRecord } from './feedback-data'

interface FeedbackReplyDialogProps {
  record: FeedbackRecord | null
  onOpenChange: (open: boolean) => void
  onReply: (reply: string) => void
}

export function FeedbackReplyDialog({
  record,
  onOpenChange,
  onReply,
}: FeedbackReplyDialogProps) {
  const [reply, setReply] = useState('')
  const [error, setError] = useState<string>()

  useEffect(() => {
    setReply(record?.reply ?? '')
    setError(undefined)
  }, [record])

  return (
    <Dialog open={Boolean(record)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{record?.status === 'replied' ? '修改回复' : '回复记录'}</DialogTitle>
          <DialogDescription>
            {record ? `${getFeedbackTypeLabel(record.type)} · ${record.code} · ${record.submitterName} · ${formatFeedbackDateTime(record.submittedAt)}` : '填写回复内容。'}
          </DialogDescription>
        </DialogHeader>
        {record ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              const normalizedReply = reply.trim()
              if (!normalizedReply) {
                setError('请输入回复内容')
                return
              }
              onReply(normalizedReply)
            }}
            noValidate
          >
            <Card size="sm">
              <CardHeader>
                <CardTitle>{record.subject}</CardTitle>
                <CardDescription>{record.relatedTarget}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap leading-6">{record.content}</p>
              </CardContent>
            </Card>
            <FieldGroup>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="feedback-reply">回复内容 *</FieldLabel>
                <Textarea
                  id="feedback-reply"
                  className="min-h-32"
                  value={reply}
                  onChange={(event) => {
                    setReply(event.target.value)
                    if (error) setError(undefined)
                  }}
                  placeholder="填写处理结果或对用户反馈的回复"
                  aria-invalid={Boolean(error)}
                />
                <FieldDescription>回复提交后，该记录将标记为已回复。</FieldDescription>
                <FieldError>{error}</FieldError>
              </Field>
            </FieldGroup>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
              <Button type="submit">{record.status === 'replied' ? '更新回复' : '确认回复'}</Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
