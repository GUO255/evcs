import { useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { toast } from 'sonner'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from '@/components/ui/attachment'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { CheckIcon, FileTextIcon, LoaderCircleIcon, PlusIcon, RefreshCwIcon, Trash2Icon, UploadIcon, XIcon } from '@/components/ui/icons'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'

import {
  deleteSiteExplorationContractAttachment,
  siteExplorationErrorMessage,
  updateSiteExplorationContractDate,
  type SiteExplorationAttachment,
  type SiteExplorationContractAttachmentField,
  type SiteExplorationRecord,
} from './site-exploration-api'
import { SiteExplorationCompletionBadge } from './site-exploration-completion'
import {
  MAX_SITE_EXPLORATION_FILE_BYTES,
  SITE_EXPLORATION_FILE_LIMIT_LABEL,
} from './site-exploration-file-limits'
import { BasicField } from './site-exploration-form'
import type { SiteExplorationRecordMutation } from './site-exploration-images'
import { runSiteExplorationUploadBatch } from './site-exploration-upload-batch'
import {
  resolveSiteExplorationFileContentType,
  siteExplorationUploadErrorMessage,
  uploadSiteExplorationFileDirect,
} from './site-exploration-upload-client'

const MAX_ATTACHMENTS_PER_FIELD = 9
const ACCEPTED_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
])
const ACCEPT_ATTRIBUTE = `${[...ACCEPTED_TYPES].join(',')},.heic,.heif,.mov`

type PendingAttachment = {
  id: string
  file: File
  progress: number
  state: 'uploading' | 'processing' | 'error'
  errorMessage: string | null
  controller: AbortController
}

const attachmentGroups: readonly {
  field: SiteExplorationContractAttachmentField
  label: string
  description: string
}[] = [
  {
    field: 'landOwnershipDocuments',
    label: '土地权属证明',
    description: '上传土地使用权、不动产权等权属证明文件。',
  },
  {
    field: 'leaseAgreementDocuments',
    label: '租赁协议',
    description: '上传完整的场地租赁协议及相关补充文件。',
  },
  {
    field: 'surveyDeterminationReports',
    label: '测绘勘定报告',
    description: '上传测绘、勘定及场地红线相关报告。',
  },
]

export function SiteExplorationContractForm({
  record,
  mutateRecord,
}: {
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
}) {
  const [contractStatusBusy, setContractStatusBusy] = useState(false)
  const completionItems = [Boolean(record.contractDate)]
  const contractStatus = record.contractDate ? 'mutually-signed' : 'unsigned'

  async function updateContractStatus(status: 'unsigned' | 'mutually-signed') {
    const contractDate = status === 'mutually-signed'
      ? record.contractDate || formatCalendarDate(new Date())
      : ''
    if (contractDate === record.contractDate) return
    setContractStatusBusy(true)
    try {
      await mutateRecord((current) => updateSiteExplorationContractDate(
        current.id,
        contractDate,
        current.updatedAt,
      ))
      toast.success(status === 'mutually-signed' ? '签约状态已更新为双方已完成签约' : '签约状态已更新为未签约')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '签约状态保存失败，请重试。')
    } finally {
      setContractStatusBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>签约信息</CardTitle>
            <CardDescription className="mt-1">设置双方签约状态，相关附件均为选填。</CardDescription>
          </div>
          <SiteExplorationCompletionBadge items={completionItems} />
        </div>
      </CardHeader>
      <CardContent className="px-6 py-0">
        <BasicField
          number={1}
          title="签约状态"
          description="设置为双方已完成签约后，项目状态将更新为已签约。"
          completed={Boolean(record.contractDate)}
        >
          <ToggleGroup
            value={[contractStatus]}
            variant="primary"
            spacing={2}
            aria-label="设置签约状态"
            onValueChange={(next) => {
              const selected = next[0]
              if (selected === 'unsigned' || selected === 'mutually-signed') {
                void updateContractStatus(selected)
              }
            }}
          >
            <ToggleGroupItem value="unsigned" disabled={contractStatusBusy}>
              {contractStatus === 'unsigned' ? <CheckIcon data-icon="inline-start" /> : null}
              未签约
            </ToggleGroupItem>
            <ToggleGroupItem value="mutually-signed" disabled={contractStatusBusy}>
              {contractStatus === 'mutually-signed' ? <CheckIcon data-icon="inline-start" /> : null}
              双方已完成签约
            </ToggleGroupItem>
          </ToggleGroup>
        </BasicField>
        {attachmentGroups.map((group, index) => (
          <ContractAttachmentField
            key={group.field}
            number={index + 2}
            group={group}
            record={record}
            mutateRecord={mutateRecord}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function formatCalendarDate(value: Date): string {
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${value.getFullYear()}-${month}-${day}`
}

function ContractAttachmentField({
  number,
  group,
  record,
  mutateRecord,
}: {
  number: number
  group: (typeof attachmentGroups)[number]
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const photoInputRef = useRef<HTMLInputElement | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([])
  const attachments = record[group.field]

  async function uploadFiles(files: File[]) {
    if (!files.length) return
    const unsupported = files.find((file) => {
      const contentType = resolveSiteExplorationFileContentType(file)
      return !contentType || !ACCEPTED_TYPES.has(contentType)
    })
    if (unsupported) {
      toast.error(`${unsupported.name} 的文件格式不受支持。`)
      return
    }
    const empty = files.find((file) => file.size < 1)
    if (empty) {
      toast.error(`${empty.name} 是空文件，无法上传。`)
      return
    }
    const oversized = files.find((file) => file.size > MAX_SITE_EXPLORATION_FILE_BYTES)
    if (oversized) {
      toast.error(`${oversized.name} 超过 ${SITE_EXPLORATION_FILE_LIMIT_LABEL}，请压缩后重新上传。`)
      return
    }
    if (attachments.length + files.length > MAX_ATTACHMENTS_PER_FIELD) {
      toast.error('每项最多上传 9 个文件。')
      return
    }

    const queued = files.map((file): PendingAttachment => ({
      id: crypto.randomUUID(),
      file,
      progress: 0,
      state: 'uploading',
      errorMessage: null,
      controller: new AbortController(),
    }))
    setPendingAttachments((current) => [...current.filter((item) => item.state !== 'error'), ...queued])
    setBusy(true)
    const result = await runSiteExplorationUploadBatch({
      files: queued.map(({ id, file, controller }) => ({
        id,
        file,
        signal: controller.signal,
      })),
      execute: async (pending, onProgress) => {
        const contentType = resolveSiteExplorationFileContentType(pending.file)
        if (!contentType) throw new Error('unsupported_exploration_file_type')
        await mutateRecord((current) => uploadSiteExplorationFileDirect({
          id: current.id,
          kind: 'attachment',
          field: group.field,
          file: pending.file,
          contentType,
          updatedAt: current.updatedAt,
          signal: pending.signal,
          onProgress,
        }))
        setPendingAttachments((items) => items.filter((item) => item.id !== pending.id))
      },
      onProgress: (id, progress) => {
        setPendingAttachments((items) => items.map((item) => item.id === id
          ? { ...item, progress, state: progress >= 100 ? 'processing' : 'uploading' }
          : item))
      },
      onError: (id, error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          setPendingAttachments((items) => items.filter((item) => item.id !== id))
          return
        }
        const errorMessage = siteExplorationUploadErrorMessage(error)
        setPendingAttachments((items) => items.map((item) => item.id === id
          ? { ...item, state: 'error', errorMessage }
          : item))
        toast.error(errorMessage)
      },
    })
    if (result.uploaded > 0) toast.success(`${result.uploaded} 个附件已上传`)
    setBusy(false)
    if (result.failed === 0) setDialogOpen(false)
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    void uploadFiles(files)
  }

  function enterDropZone(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    if (busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD) return
    setDragActive(true)
  }

  function leaveDropZone(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
    setDragActive(false)
  }

  function dropFiles(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault()
    setDragActive(false)
    if (busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD) return
    void uploadFiles([...event.dataTransfer.files])
  }

  function changeDialogOpen(nextOpen: boolean) {
    if (!nextOpen && busy) return
    setDialogOpen(nextOpen)
    if (!nextOpen) {
      setDragActive(false)
      setPendingAttachments([])
    }
  }

  async function remove(attachment: SiteExplorationAttachment) {
    setBusy(true)
    try {
      await mutateRecord((current) => deleteSiteExplorationContractAttachment(
        current.id,
        group.field,
        attachment.objectKey,
        current.updatedAt,
      ))
      toast.success('附件已删除')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex gap-3 border-b py-5 last:border-b-0">
      <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-muted px-1.5 text-sm font-medium text-muted-foreground">
        {number}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold">{group.label}（选填）</h3>
        <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
        <div className="mt-3 flex flex-col gap-2">
        {attachments.map((attachment) => (
          <Attachment key={attachment.objectKey} className="w-full" size="default">
            <AttachmentMedia><FileTextIcon aria-hidden="true" /></AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachment.originalName}</AttachmentTitle>
              <AttachmentDescription>{formatAttachmentDescription(attachment)}</AttachmentDescription>
            </AttachmentContent>
            <AttachmentTrigger
              render={<a href={attachment.url} target="_blank" rel="noreferrer" />}
              aria-label={`打开${attachment.originalName}`}
            />
            <AttachmentActions>
              <AlertDialog>
                <AlertDialogTrigger render={<AttachmentAction disabled={busy} aria-label={`删除${attachment.originalName}`} />}>
                  <Trash2Icon aria-hidden="true" />
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>删除此附件？</AlertDialogTitle>
                    <AlertDialogDescription>{attachment.originalName} 将从签约资料和存储中删除，此操作无法撤销。</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" disabled={busy} onClick={() => void remove(attachment)}>确认删除</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </AttachmentActions>
          </Attachment>
        ))}

        <Dialog open={dialogOpen} onOpenChange={changeDialogOpen}>
          <Attachment className="w-full" size="default" state="idle">
            <AttachmentMedia><PlusIcon aria-hidden="true" /></AttachmentMedia>
            <AttachmentContent>
              <AttachmentTitle>{attachments.length >= MAX_ATTACHMENTS_PER_FIELD ? '附件已达上限' : '添加附件'}</AttachmentTitle>
              <AttachmentDescription>
                {attachments.length >= MAX_ATTACHMENTS_PER_FIELD
                  ? '每项最多上传 9 个附件'
                  : `点击上传文件，还可添加 ${MAX_ATTACHMENTS_PER_FIELD - attachments.length} 个`}
              </AttachmentDescription>
            </AttachmentContent>
            <DialogTrigger
              render={(
                <AttachmentTrigger
                  disabled={busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD}
                  aria-label={`为${group.label}添加附件`}
                />
              )}
            />
          </Attachment>

          <DialogContent className="sm:max-w-xl" showCloseButton={!busy}>
            <DialogHeader>
              <DialogTitle>上传{group.label}</DialogTitle>
              <DialogDescription>支持拖拽、点击选择和多文件批量上传，上传完成后自动添加到附件列表。</DialogDescription>
            </DialogHeader>
            <Input
              ref={inputRef}
              type="file"
              className="hidden"
              accept={ACCEPT_ATTRIBUTE}
              multiple
              disabled={busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD}
              onChange={selectFiles}
            />
            <Input
              ref={photoInputRef}
              type="file"
              className="hidden"
              accept="image/*"
              capture="environment"
              disabled={busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD}
              onChange={selectFiles}
            />
            <Input
              ref={videoInputRef}
              type="file"
              className="hidden"
              accept="video/*"
              capture="environment"
              disabled={busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD}
              onChange={selectFiles}
            />
            <button
              type="button"
              className={cn(
                'flex min-h-40 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/20 px-6 py-6 text-center transition-colors hover:border-primary/60 hover:bg-muted/40 focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-60',
                dragActive && 'border-primary bg-primary/5',
              )}
              disabled={busy || attachments.length >= MAX_ATTACHMENTS_PER_FIELD}
              onClick={() => inputRef.current?.click()}
              onDragEnter={enterDropZone}
              onDragOver={enterDropZone}
              onDragLeave={leaveDropZone}
              onDrop={dropFiles}
            >
              {busy ? <LoaderCircleIcon className="size-7 animate-spin text-muted-foreground" aria-hidden="true" /> : <UploadIcon className="size-7 text-muted-foreground" aria-hidden="true" />}
              <span className="font-medium">
                {busy ? '正在上传附件…' : '拖拽文件到此处，或点击选择文件'}
              </span>
              <span className="text-sm text-muted-foreground">
                支持批量上传 PDF、Word、Excel、JPEG、PNG、WebP，单个不超过 {SITE_EXPLORATION_FILE_LIMIT_LABEL}，最多 9 个
              </span>
            </button>
            <div className="grid grid-cols-3 gap-2">
              <Button type="button" variant="outline" disabled={busy} onClick={() => inputRef.current?.click()}>
                选择文件
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => photoInputRef.current?.click()}>
                拍照
              </Button>
              <Button type="button" variant="outline" disabled={busy} onClick={() => videoInputRef.current?.click()}>
                录像
              </Button>
            </div>

            {pendingAttachments.length ? (
              <div className="flex max-h-64 flex-col gap-2 overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                {pendingAttachments.map((pending) => (
                  <Attachment key={pending.id} className="w-full" size="default" state={pending.state}>
                    <AttachmentMedia><FileTextIcon aria-hidden="true" /></AttachmentMedia>
                    <AttachmentContent>
                      <AttachmentTitle>{pending.file.name}</AttachmentTitle>
                      <AttachmentDescription>
                        {pending.state === 'error'
                          ? pending.errorMessage
                          : pending.state === 'processing'
                            ? '上传完成，正在保存…'
                            : `上传中 · ${pending.progress}%`}
                      </AttachmentDescription>
                    </AttachmentContent>
                    <AttachmentActions>
                      {pending.state === 'error' ? (
                        <AttachmentAction
                          aria-label={`重试${pending.file.name}`}
                          onClick={() => void uploadFiles([pending.file])}
                        >
                          <RefreshCwIcon aria-hidden="true" />
                        </AttachmentAction>
                      ) : (
                        <AttachmentAction
                          aria-label={`取消上传${pending.file.name}`}
                          onClick={() => pending.controller.abort()}
                        >
                          <XIcon aria-hidden="true" />
                        </AttachmentAction>
                      )}
                      {pending.state === 'error' ? (
                        <AttachmentAction
                          aria-label={`移除${pending.file.name}`}
                          onClick={() => setPendingAttachments((items) => items.filter((item) => item.id !== pending.id))}
                        >
                          <XIcon aria-hidden="true" />
                        </AttachmentAction>
                      ) : null}
                    </AttachmentActions>
                  </Attachment>
                ))}
              </div>
            ) : null}

            <DialogFooter>
              <DialogClose render={<Button variant="outline" disabled={busy} />}>关闭</DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </section>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatAttachmentDescription(attachment: SiteExplorationAttachment): string {
  const extension = attachment.originalName.split('.').pop()?.toUpperCase() || '文件'
  return `${extension} · ${formatFileSize(attachment.size)}`
}
