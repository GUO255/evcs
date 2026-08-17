import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeftIcon, MessageSquareReplyIcon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Textarea } from '@/components/ui/textarea'

import { formatFeedbackDateTime } from './feedback-date'
import { getFeedbackTypeLabel } from './feedback-data'
import { FeedbackStatusBadge } from './feedback-status-badge'
import { updateFeedbackReply, useFeedbackRecords } from './feedback-store'

export function FeedbackDetailPage({ feedbackId }: { feedbackId: string }) {
  const records = useFeedbackRecords()
  const record = records.find((candidate) => candidate.id === feedbackId)
  const [reply, setReply] = useState(() => record?.reply ?? record?.agentDraftReply ?? '')
  const [error, setError] = useState<string>()

  if (!record) {
    return (
      <Empty className="min-h-96 border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><MessageSquareReplyIcon /></EmptyMedia>
          <EmptyTitle>未找到该问题反馈</EmptyTitle>
          <EmptyDescription>记录可能已被删除，或当前链接无效。</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link to="/feedback" className={buttonVariants()}>返回问题反馈</Link></EmptyContent>
      </Empty>
    )
  }
  const initialStatus = record.status

  function submit(event: React.FormEvent) {
    event.preventDefault()
    const normalizedReply = reply.trim()
    if (!normalizedReply) {
      setError('请输入回复内容')
      return
    }
    updateFeedbackReply(feedbackId, normalizedReply)
    toast.success(initialStatus === 'replied' ? '回复已更新' : '问题反馈已回复')
  }

  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <Link to="/feedback" className={buttonVariants({ variant: 'ghost', className: 'w-fit' })}>
          <ArrowLeftIcon data-icon="inline-start" />
          返回问题反馈
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">处理问题反馈</h1>
          <Badge variant="outline">{getFeedbackTypeLabel(record.type)}</Badge>
          <FeedbackStatusBadge status={record.status} />
        </div>
        <p className="text-sm text-muted-foreground">{record.subject} · {record.code}</p>
      </header>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>反馈内容</CardTitle>
            <CardDescription>{record.relatedTarget}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-wrap leading-7">{record.content}</p>
            <form className="flex flex-col gap-6 border-t pt-6" onSubmit={submit} noValidate>
              <Field data-invalid={Boolean(error)}>
                <FieldLabel htmlFor="feedback-detail-reply">回复内容 *</FieldLabel>
                <Textarea
                  id="feedback-detail-reply"
                  className="min-h-40"
                  value={reply}
                  onChange={(event) => {
                    setReply(event.target.value)
                    if (error) setError(undefined)
                  }}
                  placeholder="填写处理结果或对用户反馈的回复"
                  aria-invalid={Boolean(error)}
                />
                <FieldDescription>保存后，该记录将标记为已回复。</FieldDescription>
                <FieldError>{error}</FieldError>
              </Field>
              <div className="flex justify-end gap-2 border-t pt-4">
                <Link to="/feedback" className={buttonVariants({ variant: 'outline' })}>取消</Link>
                <Button type="submit">{record.status === 'replied' ? '更新回复' : '确认回复'}</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>提交信息</CardTitle><CardDescription>反馈来源与处理时间。</CardDescription></CardHeader>
          <CardContent>
            <dl className="grid gap-5">
              <DetailItem label="提交用户" value={record.submitterName} />
              <DetailItem label="用户类型" value={record.submitterType} />
              <DetailItem label="联系方式" value={record.contact} />
              <DetailItem label="问题类型" value={getFeedbackTypeLabel(record.type)} />
              <DetailItem label="关联对象" value={record.relatedTarget} />
              <DetailItem label="提交时间" value={formatFeedbackDateTime(record.submittedAt)} />
              <DetailItem label="回复时间" value={formatFeedbackDateTime(record.repliedAt)} />
            </dl>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return <div className="flex flex-col gap-1"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words font-medium">{value}</dd></div>
}
