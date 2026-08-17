import { ImageIcon, Trash2Icon, UploadIcon } from '@/components/ui/icons'
import { toast } from 'sonner'

import { Button, buttonVariants } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { cn } from '@/lib/utils'

const acceptedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const maximumImageBytes = 5 * 1024 * 1024

interface SingleCampaignImageFieldProps {
  id: string
  value: string
  error?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function SingleCampaignImageField({
  id,
  value,
  error,
  disabled = false,
  onChange,
}: SingleCampaignImageFieldProps) {
  async function readImage(file: File | undefined) {
    if (!file) return
    if (!acceptedImageTypes.has(file.type)) {
      toast.error('仅支持 JPG、PNG 或 WEBP 图片')
      return
    }
    if (file.size > maximumImageBytes) {
      toast.error('活动图不能超过 5MB')
      return
    }

    let bitmap: ImageBitmap
    try {
      bitmap = await createImageBitmap(file)
    } catch {
      toast.error('活动图无法解析，请重新选择')
      return
    }
    const validRatio = bitmap.width * 12 === bitmap.height * 47
    bitmap.close()
    if (!validRatio) {
      toast.error('活动图长宽比必须为 470:120')
      return
    }

    const reader = new FileReader()
    reader.addEventListener('load', () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }, { once: true })
    reader.addEventListener('error', () => {
      toast.error('活动图读取失败，请重新选择')
    }, { once: true })
    reader.readAsDataURL(file)
  }

  return (
    <Field data-invalid={Boolean(error)}>
      <FieldLabel htmlFor={id}>活动图 *</FieldLabel>
      <div className="flex flex-col items-start gap-3">
        <div className="flex aspect-[47/12] w-full max-w-[470px] items-center justify-center overflow-hidden rounded-lg border bg-muted">
          {value ? (
            <img src={value} alt="活动图预览" className="size-full object-cover" />
          ) : (
            <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <label
            htmlFor={id}
            className={cn(
              buttonVariants({ variant: 'outline' }),
              disabled ? 'pointer-events-none opacity-50' : 'cursor-pointer',
            )}
          >
            <UploadIcon data-icon="inline-start" />
            {value ? '替换图片' : '上传图片'}
          </label>
          <input
            id={id}
            className="sr-only"
            type="file"
            disabled={disabled}
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => {
              void readImage(event.currentTarget.files?.[0])
              event.currentTarget.value = ''
            }}
          />
          {value ? (
            <Button type="button" variant="ghost" disabled={disabled} onClick={() => onChange('')}>
              <Trash2Icon data-icon="inline-start" />
              删除图片
            </Button>
          ) : null}
        </div>
      </div>
      <FieldDescription>仅支持 1 张 JPG、PNG 或 WEBP 图片，长宽比必须为 470:120，大小不超过 5MB。</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
