import { expect, test } from 'bun:test'

import { runSiteExplorationUploadBatch } from '../../src/features/site-planning/site-exploration-upload-batch'

test('executes every original file after Uppy assigns its queue id', async () => {
  const file = new File(['image'], 'site.jpg', { type: 'image/jpeg' })
  const executed: File[] = []

  const result = await runSiteExplorationUploadBatch({
    files: [{ id: 'client-file-id', file }],
    execute: async (item) => {
      executed.push(item.file)
    },
    onProgress: () => {},
    onError: () => {},
  })

  expect(executed).toEqual([file])
  expect(result).toEqual({ uploaded: 1, failed: 0 })
})
