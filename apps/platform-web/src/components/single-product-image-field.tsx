import { useState } from 'react'
import { ImageIcon, Trash2Icon, UploadIcon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maximumImageBytes = 5 * 1024 * 1024

interface SingleProductImageFieldProps {
  id: string
  value: string
  error?: string
  previewTitle?: string
  onChange: (value: string) => void
}

export function SingleProductImageField({
  id,
  value,
  error,
  previewTitle = '商品图片',
  onChange,
}: SingleProductImageFieldProps) {
  const [previewOpen, setPreviewOpen] = useState(false)

  function readImage(file: File | undefined) {
    if (!file) return
    if (!acceptedImageTypes.has(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WEBP 图片')
      return
    }
    if (file.size > maximumImageBytes) {
      toast.error('商品图片不能超过 5MB')
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }, { once: true })
    reader.addEventListener('error', () => {
      toast.error('商品图片读取失败，请重新选择')
    }, { once: true })
    reader.readAsDataURL(file)
  }

  return (
    <>
      <Field data-invalid={Boolean(error)}>
        <FieldLabel htmlFor={id}>商品图片 *</FieldLabel>
        <div className="flex flex-wrap items-center gap-4">
          {value ? (
            <button
              type="button"
              className="size-28 shrink-0 overflow-hidden rounded-lg border bg-muted outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={`查看${previewTitle}大图`}
              onClick={() => setPreviewOpen(true)}
            >
              <img
                src={value}
                alt=""
                className="size-full object-cover transition-transform hover:scale-105"
              />
            </button>
          ) : (
            <div className="flex size-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted">
              <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-col items-start gap-2">
            <label
              htmlFor={id}
              className={cn(buttonVariants({ variant: 'outline' }), 'cursor-pointer')}
            >
              <UploadIcon data-icon="inline-start" />
              {value ? '替换图片' : '上传图片'}
            </label>
            <input
              id={id}
              className="sr-only"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                readImage(event.currentTarget.files?.[0])
                event.currentTarget.value = ''
              }}
            />
            {value ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
                <Trash2Icon data-icon="inline-start" />
                删除图片
              </Button>
            ) : null}
          </div>
        </div>
        <FieldDescription>仅支持 1 张 JPG、PNG 或 WEBP 图片，大小不超过 5MB。</FieldDescription>
        <FieldError>{error}</FieldError>
      </Field>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{previewTitle}</DialogTitle>
          </DialogHeader>
          {value ? (
            <div className="flex max-h-[75dvh] items-center justify-center overflow-hidden rounded-lg bg-muted">
              <img
                src={value}
                alt={previewTitle}
                className="max-h-[75dvh] max-w-full object-contain"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
