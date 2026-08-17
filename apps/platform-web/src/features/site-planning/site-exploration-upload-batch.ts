import Uppy from '@uppy/core'

import { MAX_SITE_EXPLORATION_FILE_BYTES } from './site-exploration-file-limits'

export async function runSiteExplorationUploadBatch(input: {
  files: Array<{ id: string; file: File; signal?: AbortSignal }>
  execute(
    item: { id: string; file: File; signal?: AbortSignal },
    onProgress: (progress: number) => void,
  ): Promise<void>
  onProgress(id: string, progress: number): void
  onError(id: string, error: unknown): void
}): Promise<{ uploaded: number; failed: number }> {
  const uppy = new Uppy({
    autoProceed: false,
    restrictions: {
      maxFileSize: MAX_SITE_EXPLORATION_FILE_BYTES,
      maxNumberOfFiles: input.files.length,
      minNumberOfFiles: 1,
    },
  })
  try {
    const itemsByQueueId = new Map<string, (typeof input.files)[number]>()
    input.files.forEach((item) => {
      const queueId = uppy.addFile({
        name: item.file.name,
        type: item.file.type || 'application/octet-stream',
        data: item.file,
        source: 'site-exploration-form',
      })
      itemsByQueueId.set(queueId, item)
    })
    let uploaded = 0
    let failed = 0
    for (const queued of uppy.getFiles()) {
      const item = itemsByQueueId.get(queued.id)
      if (!item) continue
      try {
        if (item.signal?.aborted) throw new DOMException('Upload cancelled', 'AbortError')
        await input.execute(item, (progress) => input.onProgress(item.id, progress))
        uploaded += 1
      } catch (error) {
        failed += 1
        input.onError(item.id, error)
      }
    }
    return { uploaded, failed }
  } finally {
    uppy.destroy()
  }
}
