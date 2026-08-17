import {
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
} from 'react'
import {
  ArrowUpIcon,
  CircleAlertIcon,
  LoaderCircleIcon,
  MicIcon,
  PaperclipIcon,
  XIcon,
} from '@/components/ui/icons'

import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from '@/components/ui/attachment'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Bubble, BubbleContent } from '@/components/ui/bubble'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupTextarea } from '@/components/ui/input-group'
import { Marker, MarkerContent, MarkerIcon } from '@/components/ui/marker'
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader,
} from '@/components/ui/message'
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from '@/components/ui/message-scroller'
import { cn } from '@/lib/utils'

export interface ConversationAttachment {
  id: string
  file: File
  previewUrl: string | null
}

interface ConversationMessage {
  id: string
  role: 'agent' | 'user'
  content: string
  attachments: readonly ConversationAttachment[]
}

export interface AgentConversationProps {
  agentName: string
  agentAvatarSrc: string
  agentFallback: string
  initialMessage: string
  conversationId?: string
  reply?: string
  placeholder: string
  disabled?: boolean
  onSendMessage?: (
    message: string,
    attachments: readonly File[],
  ) => Promise<string>
  className?: string
}

interface AgentConversationDialogProps extends AgentConversationProps {
  description: string
  onClose: () => void
}

export function AgentConversation({
  agentName,
  agentAvatarSrc,
  agentFallback,
  initialMessage,
  conversationId,
  reply,
  placeholder,
  disabled = false,
  onSendMessage,
  className,
}: AgentConversationProps) {
  const messageInputId = useId()
  const attachmentInputId = useId()
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const attachmentUrlsRef = useRef<Set<string>>(new Set())
  const attachmentDragDepthRef = useRef(0)
  const attachmentSequenceRef = useRef(0)
  const messageSequenceRef = useRef(1)
  const requestSequenceRef = useRef(0)
  const [draft, setDraft] = useState('')
  const [isDraggingAttachments, setIsDraggingAttachments] = useState(false)
  const [pendingAttachments, setPendingAttachments] = useState<ConversationAttachment[]>([])
  const [messages, setMessages] = useState<ConversationMessage[]>([
    createInitialMessage(initialMessage),
  ])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    revokeAttachmentUrls(attachmentUrlsRef.current)
    requestSequenceRef.current += 1
    messageSequenceRef.current = 1
    attachmentSequenceRef.current = 0
    setMessages([createInitialMessage(initialMessage)])
    setPendingAttachments([])
    attachmentDragDepthRef.current = 0
    setIsDraggingAttachments(false)
    setDraft('')
    setPending(false)
    setError(null)
  }, [conversationId, initialMessage])

  useEffect(() => () => {
    revokeAttachmentUrls(attachmentUrlsRef.current)
  }, [])

  function addAttachments(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    addFiles(files)
  }

  function addFiles(files: readonly File[]) {
    if (files.length === 0 || disabled || pending) return

    const attachments = files.map((file) => {
      const previewUrl = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
      if (previewUrl) attachmentUrlsRef.current.add(previewUrl)
      attachmentSequenceRef.current += 1
      return {
        id: `attachment-${attachmentSequenceRef.current}`,
        file,
        previewUrl,
      }
    })
    setPendingAttachments((current) => [...current, ...attachments])
  }

  function pasteAttachments(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.items)
      .filter((item) => item.kind === 'file')
      .flatMap((item) => {
        const file = item.getAsFile()
        return file ? [file] : []
      })
    if (files.length === 0) return

    event.preventDefault()
    addFiles(files)
  }

  function beginAttachmentDrag(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    if (disabled || pending) return
    attachmentDragDepthRef.current += 1
    setIsDraggingAttachments(true)
  }

  function continueAttachmentDrag(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled || pending ? 'none' : 'copy'
  }

  function endAttachmentDrag(event: DragEvent<HTMLDivElement>) {
    if (attachmentDragDepthRef.current === 0) return
    event.preventDefault()
    attachmentDragDepthRef.current = Math.max(0, attachmentDragDepthRef.current - 1)
    if (attachmentDragDepthRef.current === 0) setIsDraggingAttachments(false)
  }

  function dropAttachments(event: DragEvent<HTMLDivElement>) {
    if (!hasDraggedFiles(event)) return
    event.preventDefault()
    attachmentDragDepthRef.current = 0
    setIsDraggingAttachments(false)
    addFiles(Array.from(event.dataTransfer.files))
  }

  function removeAttachment(attachment: ConversationAttachment) {
    if (attachment.previewUrl) {
      URL.revokeObjectURL(attachment.previewUrl)
      attachmentUrlsRef.current.delete(attachment.previewUrl)
    }
    setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const content = draft.trim()
    if (!content || pending || disabled) return

    const attachments = pendingAttachments
    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence
    setMessages((current) => [
      ...current,
      {
        id: nextMessageId(messageSequenceRef),
        role: 'user',
        content,
        attachments,
      },
    ])
    setDraft('')
    setPendingAttachments([])
    setPending(true)
    setError(null)
    try {
      const response = onSendMessage
        ? await onSendMessage(content, attachments.map((attachment) => attachment.file))
        : reply
      if (!response) throw new Error('agent_reply_unavailable')
      if (requestSequenceRef.current !== requestSequence) return
      setMessages((current) => [
        ...current,
        {
          id: nextMessageId(messageSequenceRef),
          role: 'agent',
          content: response,
          attachments: [],
        },
      ])
    } catch {
      if (requestSequenceRef.current === requestSequence) {
        setError('本次问答未成功，请稍后重试。')
      }
    } finally {
      if (requestSequenceRef.current === requestSequence) setPending(false)
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-col gap-4', className)}>
      <MessageScrollerProvider>
        <MessageScroller className="rounded-lg bg-muted/40">
          <MessageScrollerViewport>
            <MessageScrollerContent className="p-4">
              <MessageScrollerItem>
                <Marker variant="separator">
                  <MarkerContent>对话开始</MarkerContent>
                </Marker>
              </MessageScrollerItem>
              {messages.map((message) => (
                <MessageScrollerItem
                  key={message.id}
                  messageId={message.id}
                  scrollAnchor={message.role === 'user'}
                >
                  <ConversationMessageView
                    message={message}
                    agentName={agentName}
                    agentAvatarSrc={agentAvatarSrc}
                    agentFallback={agentFallback}
                  />
                </MessageScrollerItem>
              ))}
              {pending ? (
                <MessageScrollerItem>
                  <Marker role="status">
                    <MarkerIcon><LoaderCircleIcon className="animate-spin" /></MarkerIcon>
                    <MarkerContent>{agentName} 正在回复…</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              ) : null}
              {error ? (
                <MessageScrollerItem>
                  <Marker role="alert" variant="border">
                    <MarkerIcon><CircleAlertIcon /></MarkerIcon>
                    <MarkerContent>{error}</MarkerContent>
                  </Marker>
                </MessageScrollerItem>
              ) : null}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton />
        </MessageScroller>
      </MessageScrollerProvider>

      <form onSubmit={(event) => void sendMessage(event)}>
        <FieldGroup>
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor={messageInputId} className="sr-only">输入消息</FieldLabel>
            {pendingAttachments.length > 0 ? (
              <AttachmentGroup className="flex-wrap overflow-visible snap-none">
                {pendingAttachments.map((attachment) => (
                  <ConversationAttachmentView
                    key={attachment.id}
                    attachment={attachment}
                    state="idle"
                    onRemove={() => removeAttachment(attachment)}
                  />
                ))}
              </AttachmentGroup>
            ) : null}
            <input
              ref={attachmentInputRef}
              id={attachmentInputId}
              type="file"
              className="sr-only"
              multiple
              disabled={disabled || pending}
              onChange={addAttachments}
            />
            <InputGroup
              onDragEnter={beginAttachmentDrag}
              onDragOver={continueAttachmentDrag}
              onDragLeave={endAttachmentDrag}
              onDrop={dropAttachments}
            >
              <InputGroupTextarea
                id={messageInputId}
                className="text-foreground"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onPaste={pasteAttachments}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
                    event.preventDefault()
                    event.currentTarget.form?.requestSubmit()
                  }
                }}
                placeholder={placeholder}
                rows={3}
                maxLength={4000}
                aria-invalid={Boolean(error)}
              />
              <InputGroupAddon align="block-end">
                <InputGroupButton
                  type="button"
                  size="icon-sm"
                  variant="outline"
                  disabled={disabled || pending}
                  aria-label="添加附件"
                  onClick={() => attachmentInputRef.current?.click()}
                >
                  <PaperclipIcon aria-hidden="true" />
                </InputGroupButton>
                <InputGroupButton size="icon-sm" variant="outline" disabled aria-label="语音输入，暂未开放">
                  <MicIcon aria-hidden="true" />
                </InputGroupButton>
                <InputGroupButton className="ml-auto" type="submit" size="icon-sm" variant="default" disabled={disabled || pending || !draft.trim()} aria-label="发送消息">
                  {pending ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : <ArrowUpIcon aria-hidden="true" />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {isDraggingAttachments ? (
              <FieldDescription role="status">松开即可添加附件</FieldDescription>
            ) : null}
          </Field>
        </FieldGroup>
      </form>
    </div>
  )
}

function ConversationMessageView({
  message,
  agentName,
  agentAvatarSrc,
  agentFallback,
}: {
  message: ConversationMessage
  agentName: string
  agentAvatarSrc: string
  agentFallback: string
}) {
  const isUser = message.role === 'user'
  return (
    <Message align={isUser ? 'end' : 'start'}>
      {!isUser ? (
        <MessageAvatar className="self-start">
          <Avatar size="sm">
            <AvatarImage src={agentAvatarSrc} alt={agentName} />
            <AvatarFallback>{agentFallback}</AvatarFallback>
          </Avatar>
        </MessageAvatar>
      ) : null}
      <MessageContent>
        {!isUser ? <MessageHeader>{agentName}</MessageHeader> : null}
        <Bubble variant={isUser ? 'default' : 'muted'}>
          <BubbleContent className="whitespace-pre-wrap">{message.content}</BubbleContent>
        </Bubble>
        {message.attachments.length > 0 ? (
          <AttachmentGroup className={cn(
            'flex-wrap overflow-visible snap-none',
            isUser && 'justify-end',
          )}>
            {message.attachments.map((attachment) => (
              <ConversationAttachmentView
                key={attachment.id}
                attachment={attachment}
                state="done"
              />
            ))}
          </AttachmentGroup>
        ) : null}
      </MessageContent>
    </Message>
  )
}

function ConversationAttachmentView({
  attachment,
  state,
  onRemove,
}: {
  attachment: ConversationAttachment
  state: 'idle' | 'done'
  onRemove?: () => void
}) {
  return (
    <Attachment size="sm" state={state} className="max-w-72">
      <AttachmentMedia variant={attachment.previewUrl ? 'image' : 'icon'}>
        {attachment.previewUrl
          ? <img src={attachment.previewUrl} alt={attachment.file.name} />
          : <PaperclipIcon />}
      </AttachmentMedia>
      <AttachmentContent>
        <AttachmentTitle title={attachment.file.name}>{attachment.file.name}</AttachmentTitle>
        <AttachmentDescription>{formatFileSize(attachment.file.size)}</AttachmentDescription>
      </AttachmentContent>
      {onRemove ? (
        <AttachmentActions>
          <AttachmentAction type="button" aria-label={`移除附件 ${attachment.file.name}`} onClick={onRemove}>
            <XIcon />
          </AttachmentAction>
        </AttachmentActions>
      ) : null}
    </Attachment>
  )
}

function createInitialMessage(content: string): ConversationMessage {
  return {
    id: 'message-1',
    role: 'agent',
    content,
    attachments: [],
  }
}

function nextMessageId(sequenceRef: { current: number }): string {
  sequenceRef.current += 1
  return `message-${sequenceRef.current}`
}

function revokeAttachmentUrls(urls: Set<string>) {
  urls.forEach((url) => URL.revokeObjectURL(url))
  urls.clear()
}

function hasDraggedFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function AgentConversationDialog({
  description,
  onClose,
  ...conversationProps
}: AgentConversationDialogProps) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[90vh] w-[50vw] min-w-[700px] grid-rows-[auto_minmax(0,1fr)] gap-4 sm:!max-w-none">
        <DialogHeader>
          <DialogTitle>与数字分身对话</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <AgentConversation {...conversationProps} className="h-full" />
      </DialogContent>
    </Dialog>
  )
}
