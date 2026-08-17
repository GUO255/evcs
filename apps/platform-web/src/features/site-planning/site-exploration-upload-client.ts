import OSS from 'ali-oss'

import {
  completeSiteExplorationUpload,
  createSiteExplorationUploadSession,
  type SiteExplorationContractAttachmentField,
  type SiteExplorationImageField,
  type SiteExplorationRecord,
  type SiteExplorationUploadSession,
} from './site-exploration-api'

const MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024
const MULTIPART_PART_BYTES = 5 * 1024 * 1024

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
}

type BrowserOssOptions = OSS.Options & {
  useFetch: boolean
  retryMax: number
}

export function createSiteExplorationOssClientOptions(
  session: SiteExplorationUploadSession,
): BrowserOssOptions {
  return {
    region: session.region,
    endpoint: session.endpoint,
    bucket: session.bucket,
    accessKeyId: session.credentials.accessKeyId,
    accessKeySecret: session.credentials.accessKeySecret,
    stsToken: session.credentials.securityToken,
    secure: session.endpoint.startsWith('https://'),
    authorizationV4: true,
    useFetch: true,
    retryMax: 2,
  }
}

export function resolveSiteExplorationFileContentType(file: File): string | null {
  const declared = file.type.trim().toLowerCase().split(';', 1)[0]!
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  const inferred = MIME_BY_EXTENSION[extension]
  if (!declared || declared === 'application/octet-stream') return inferred ?? null
  if (!Object.values(MIME_BY_EXTENSION).includes(declared)) return null
  return inferred && inferred !== declared ? null : declared
}

export function siteExplorationUploadErrorMessage(error: unknown): string {
  const value = isErrorRecord(error) ? error : {}
  const name = diagnosticString(value.name, 128) ?? (error instanceof Error ? error.name : 'UnknownError')
  const message = diagnosticString(value.message, 512)
    ?? (typeof error === 'string' ? diagnosticString(error, 512) : null)
    ?? '未提供错误信息'
  const details = (['code', 'status', 'requestId', 'hostId'] as const)
    .flatMap((field) => {
      const fieldValue = diagnosticString(value[field], field === 'status' ? 32 : 256)
      return fieldValue === null ? [] : [`${field}=${fieldValue}`]
    })
  return `文件上传失败：${name}: ${message}${details.length ? `；${details.join('；')}` : ''}`
}

function isErrorRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function diagnosticString(value: unknown, maxLength: number): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value !== 'string') return null
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) return null
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}…`
}

export async function uploadSiteExplorationFileDirect(input: {
  id: string
  kind: 'image' | 'attachment'
  field: SiteExplorationImageField | SiteExplorationContractAttachmentField
  file: File
  contentType: string
  updatedAt: number
  signal?: AbortSignal
  onProgress?: (progress: number) => void
}): Promise<SiteExplorationRecord> {
  const session = await createSiteExplorationUploadSession(input)
  const client = new OSS(createSiteExplorationOssClientOptions(session))
  let checkpoint: OSS.Checkpoint | undefined
  const abort = () => {
    if (checkpoint) {
      client.cancel({ name: session.objectKey, uploadId: checkpoint.uploadId })
    } else {
      client.cancel()
    }
  }
  input.signal?.addEventListener('abort', abort, { once: true })
  try {
    if (input.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    input.onProgress?.(0)
    if (input.file.size >= MULTIPART_THRESHOLD_BYTES) {
      await client.multipartUpload(session.objectKey, input.file, {
        parallel: 3,
        partSize: MULTIPART_PART_BYTES,
        mime: input.contentType,
        headers: { 'Content-Type': input.contentType },
        timeout: 15 * 60 * 1000,
        progress: (ratio: number, nextCheckpoint: OSS.Checkpoint) => {
          checkpoint = nextCheckpoint
          input.onProgress?.(Math.min(99, Math.round(ratio * 100)))
        },
      })
    } else {
      await client.put(session.objectKey, input.file, {
        mime: input.contentType,
        headers: { 'Content-Type': input.contentType },
        timeout: 15 * 60 * 1000,
      })
    }
    if (input.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    input.onProgress?.(100)
    return await completeSiteExplorationUpload(input.id, session.ticket)
  } catch (error) {
    if (input.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
    throw error
  } finally {
    input.signal?.removeEventListener('abort', abort)
  }
}
