import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import isMobile from 'is-mobile'
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
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ChevronLeftIcon, ChevronRightIcon, LoaderCircleIcon, PlusIcon, Trash2Icon } from '@/components/ui/icons'

import {
  deleteSiteExplorationImage,
  siteExplorationErrorMessage,
  type SiteExplorationImage,
  type SiteExplorationImageField,
  type SiteExplorationRecord,
} from './site-exploration-api'
import {
  MAX_SITE_EXPLORATION_FILE_BYTES,
  SITE_EXPLORATION_FILE_LIMIT_LABEL,
} from './site-exploration-file-limits'
import { runSiteExplorationUploadBatch } from './site-exploration-upload-batch'
import {
  resolveSiteExplorationFileContentType,
  siteExplorationUploadErrorMessage,
  uploadSiteExplorationFileDirect,
} from './site-exploration-upload-client'

type ImageGroup = { field: SiteExplorationImageField; label: string; description: string }

export type SiteExplorationRecordMutation = (
  operation: (record: SiteExplorationRecord) => Promise<SiteExplorationRecord>,
) => Promise<SiteExplorationRecord>

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])

const accessConvenienceGroup: ImageGroup = {
  field: 'accessConvenienceImages',
  label: '进出便利性现场图',
  description: '记录出入口、道路宽度、转弯和通行条件。',
}

const landSceneGroup: ImageGroup = {
  field: 'landSceneImages',
  label: '现场土地情况',
  description: '记录土地现状、硬化、排水和地势。',
}

export function SiteExplorationLandSceneImagesField({
  record,
  mutateRecord,
}: {
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
}) {
  return <SiteExplorationImageGroup group={landSceneGroup} record={record} mutateRecord={mutateRecord} compact />
}

export function SiteExplorationAccessConvenienceImagesField({
  record,
  mutateRecord,
}: {
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
}) {
  return <SiteExplorationImageGroup group={accessConvenienceGroup} record={record} mutateRecord={mutateRecord} compact />
}

function SiteExplorationImageGroup({
  group,
  record,
  mutateRecord,
  compact = false,
}: {
  group: ImageGroup
  record: SiteExplorationRecord
  mutateRecord: SiteExplorationRecordMutation
  compact?: boolean
}) {
  const { field, label, description } = group
  const inputRef = useRef<HTMLInputElement | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const uploadAbortRef = useRef<AbortController | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [previewObjectKey, setPreviewObjectKey] = useState<string | null>(null)
  const isMobilePhone = isMobile({ tablet: false })
  const images = record[field]
  const previewIndex = previewObjectKey === null
    ? -1
    : images.findIndex((image) => image.objectKey === previewObjectKey)
  const previewImage = previewIndex >= 0 ? images[previewIndex] ?? null : null
  const canShowPrevious = previewIndex > 0
  const canShowNext = previewIndex >= 0 && previewIndex < images.length - 1

  useEffect(() => () => uploadAbortRef.current?.abort(), [])

  function showPrevious() {
    if (!canShowPrevious) return
    setPreviewObjectKey(images[previewIndex - 1]!.objectKey)
  }

  function showNext() {
    if (!canShowNext) return
    setPreviewObjectKey(images[previewIndex + 1]!.objectKey)
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const files = [...(event.target.files ?? [])]
    event.target.value = ''
    if (!files.length) return
    const unsupportedFile = files.find((file) => {
      const contentType = resolveSiteExplorationFileContentType(file)
      return !contentType || !allowedImageTypes.has(contentType)
    })
    if (unsupportedFile) {
      toast.error(`${unsupportedFile.name} 不是支持的图片格式，请选择 JPEG、PNG、WebP、HEIC 或 HEIF。`)
      return
    }
    const emptyFile = files.find((file) => file.size < 1)
    if (emptyFile) {
      toast.error(`${emptyFile.name} 是空文件，无法上传。`)
      return
    }
    const oversizedFile = files.find((file) => file.size > MAX_SITE_EXPLORATION_FILE_BYTES)
    if (oversizedFile) {
      toast.error(`${oversizedFile.name} 超过 ${SITE_EXPLORATION_FILE_LIMIT_LABEL}，请压缩后重新上传。`)
      return
    }
    if (record[field].length + files.length > 9) {
      toast.error('每类图片最多 9 张。')
      return
    }
    setBusy(true)
    setUploadProgress(0)
    const controller = new AbortController()
    uploadAbortRef.current = controller
    const queued = files.map((file) => ({ id: crypto.randomUUID(), file, signal: controller.signal }))
    const result = await runSiteExplorationUploadBatch({
      files: queued,
      execute: async ({ file, signal }, onProgress) => {
        const contentType = resolveSiteExplorationFileContentType(file)
        if (!contentType) throw new Error('unsupported_exploration_image_type')
        await mutateRecord((current) => uploadSiteExplorationFileDirect({
          id: current.id,
          kind: 'image',
          field,
          file,
          contentType,
          updatedAt: current.updatedAt,
          signal,
          onProgress,
        }))
      },
      onProgress: (_id, progress) => setUploadProgress(progress),
      onError: (_id, error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        toast.error(siteExplorationUploadErrorMessage(error))
      },
    })
    if (result.uploaded > 0) toast.success(`${result.uploaded} 张图片已上传`)
    if (uploadAbortRef.current === controller) uploadAbortRef.current = null
    setUploadProgress(null)
    setBusy(false)
  }

  async function remove(objectKey: string) {
    const removedIndex = images.findIndex((image) => image.objectKey === objectKey)
    setBusy(true)
    try {
      const updatedRecord = await mutateRecord((current) => deleteSiteExplorationImage(
        current.id,
        field,
        objectKey,
        current.updatedAt,
      ))
      if (previewObjectKey === objectKey) {
        const updatedImages = updatedRecord[field]
        const nextIndex = Math.min(Math.max(removedIndex, 0), updatedImages.length - 1)
        setPreviewObjectKey(updatedImages[nextIndex]?.objectKey ?? null)
      }
      toast.success('图片已删除')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? '登录状态已失效，正在重新认证。')
    } finally {
      setBusy(false)
    }
  }

  if (compact) {
    return (
      <div className="flex flex-col gap-3">
        <Input
          ref={inputRef}
          className="hidden"
          type="file"
          accept="image/jpeg,image/png,image/webp,.heic,.heif"
          multiple
          disabled={busy || record[field].length >= 9}
          onChange={(event) => void upload(event)}
        />
        {isMobilePhone ? (
          <Input
            ref={cameraInputRef}
            className="hidden"
            type="file"
            accept="image/*"
            capture="environment"
            disabled={busy || record[field].length >= 9}
            onChange={(event) => void upload(event)}
          />
        ) : null}
        <div className="flex flex-wrap gap-3">
          {record[field].map((image) => (
            <Button
              key={image.objectKey}
              type="button"
              variant="outline"
              className="size-20 overflow-hidden p-0"
              aria-label={`查看${image.originalName}大图`}
              onClick={() => setPreviewObjectKey(image.objectKey)}
            >
                <img src={image.url} alt={image.originalName} className="size-full object-cover" />
            </Button>
          ))}
          {record[field].length < 9 ? (
            <Button
              type="button"
              variant="outline"
              className="size-20 flex-col gap-1 text-muted-foreground"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              <PlusIcon aria-hidden="true" />
              <span className="text-xs">添加图片</span>
            </Button>
          ) : null}
          {isMobilePhone && record[field].length < 9 ? (
            <Button
              type="button"
              variant="outline"
              className="size-20 flex-col gap-1 text-muted-foreground"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
            >
              <PlusIcon aria-hidden="true" />
              <span className="text-xs">拍照</span>
            </Button>
          ) : null}
        </div>
        {uploadProgress !== null ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <span>图片上传中 · {uploadProgress}%</span>
            <Button type="button" size="sm" variant="outline" onClick={() => uploadAbortRef.current?.abort()}>
              取消上传
            </Button>
          </div>
        ) : null}
        <p className="text-xs text-muted-foreground">
          {description} JPEG、PNG、WebP、HEIC、HEIF，单张不超过 {SITE_EXPLORATION_FILE_LIMIT_LABEL}，最多 9 张。
        </p>
        <Dialog
          open={previewImage !== null}
          onOpenChange={(open) => {
            if (!open && !busy) setPreviewObjectKey(null)
          }}
        >
          <DialogContent
            className="max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden sm:!max-w-[calc(100vw-2rem)] sm:gap-4 md:max-h-[calc(100dvh-2rem)] xl:!max-w-[90rem]"
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft' && canShowPrevious) {
                event.preventDefault()
                showPrevious()
              }
              if (event.key === 'ArrowRight' && canShowNext) {
                event.preventDefault()
                showNext()
              }
            }}
          >
            <DialogHeader>
              <DialogTitle className="pr-8">
                {previewImage?.originalName ?? label}
                {previewImage && images.length > 1 ? (
                  <span className="ml-2 text-sm font-normal text-muted-foreground">
                    {previewIndex + 1}/{images.length}
                  </span>
                ) : null}
              </DialogTitle>
            </DialogHeader>
            {previewImage ? (
              <div className="relative flex min-h-0 items-center justify-center overflow-hidden rounded-lg bg-muted/30">
                <img
                  src={previewImage.url}
                  alt={previewImage.originalName}
                  className="max-h-[calc(100dvh-6rem)] w-full object-contain"
                />
                {images.length > 1 ? (
                  <>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full shadow-md"
                      disabled={!canShowPrevious}
                      aria-label="上一张图片"
                      onClick={showPrevious}
                    >
                      <ChevronLeftIcon className="size-5" aria-hidden="true" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="icon-lg"
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full shadow-md"
                      disabled={!canShowNext}
                      aria-label="下一张图片"
                      onClick={showNext}
                    >
                      <ChevronRightIcon className="size-5" aria-hidden="true" />
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
            <DialogFooter className="border-t border-border pt-4 sm:justify-between">
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {previewImage?.originalName}
              </p>
              {previewImage ? (
                <AlertDialog>
                  <AlertDialogTrigger render={<Button type="button" size="sm" variant="destructive" disabled={busy} />}>
                    {busy ? <LoaderCircleIcon className="animate-spin" aria-hidden="true" /> : <Trash2Icon aria-hidden="true" />}
                    删除图片
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>删除这张图片？</AlertDialogTitle>
                      <AlertDialogDescription>图片将从勘探站点和存储中删除，此操作无法撤销。</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={busy}>取消</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        disabled={busy}
                        onClick={() => void remove(previewImage.objectKey)}
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : null}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>{label}</CardTitle><CardDescription>{description} JPEG、PNG、WebP、HEIC、HEIF，单张不超过 {SITE_EXPLORATION_FILE_LIMIT_LABEL}，最多 9 张。</CardDescription></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Input type="file" accept="image/jpeg,image/png,image/webp,.heic,.heif" multiple disabled={busy || record[field].length >= 9} onChange={(event) => void upload(event)} />
        {isMobilePhone ? (
          <Input ref={cameraInputRef} className="hidden" type="file" accept="image/*" capture="environment" disabled={busy || record[field].length >= 9} onChange={(event) => void upload(event)} />
        ) : null}
        {isMobilePhone ? (
          <Button type="button" variant="outline" disabled={busy || record[field].length >= 9} onClick={() => cameraInputRef.current?.click()}>拍照</Button>
        ) : null}
        {uploadProgress !== null ? (
          <Button type="button" variant="outline" onClick={() => uploadAbortRef.current?.abort()}>
            取消上传（{uploadProgress}%）
          </Button>
        ) : null}
        {record[field].length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{record[field].map((image) => (
          <figure key={image.objectKey} className="overflow-hidden rounded-lg border bg-muted/30">
            <a href={image.url} target="_blank" rel="noreferrer"><img src={image.url} alt={image.originalName} className="aspect-square w-full object-cover" /></a>
            <figcaption className="flex flex-col gap-2 p-2">
              <span className="truncate text-xs" title={image.originalName}>{image.originalName}</span>
              <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void remove(image.objectKey)}>删除</Button>
            </figcaption>
          </figure>
        ))}</div> : <p className="text-sm text-muted-foreground">尚未上传图片</p>}
      </CardContent>
    </Card>
  )
}
