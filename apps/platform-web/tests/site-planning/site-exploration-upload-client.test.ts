import { expect, test } from 'bun:test'

import {
  createSiteExplorationOssClientOptions,
  siteExplorationUploadErrorMessage,
} from '../../src/features/site-planning/site-exploration-upload-client'

test('uses the Fetch transport with bounded retries for browser uploads', () => {
  const options = createSiteExplorationOssClientOptions({
    ticket: 'ticket',
    objectKey: 'site-exploration/uploads/42/photo.jpg',
    region: 'cn-hangzhou',
    endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
    bucket: 'electric-oss',
    credentials: {
      accessKeyId: 'temporary-id',
      accessKeySecret: 'temporary-secret',
      securityToken: 'temporary-token',
      expiresAt: '2026-08-10T04:00:00.000Z',
    },
  })

  expect(options).toEqual({
    region: 'cn-hangzhou',
    endpoint: 'https://oss-cn-hangzhou.aliyuncs.com',
    bucket: 'electric-oss',
    accessKeyId: 'temporary-id',
    accessKeySecret: 'temporary-secret',
    stsToken: 'temporary-token',
    secure: true,
    authorizationV4: true,
    useFetch: true,
    retryMax: 2,
  })
})

test('shows safe OSS diagnostics instead of a generic data-format error', () => {
  const error = Object.assign(new Error('Failed to fetch'), {
    name: 'RequestError',
    code: 'RequestError',
    status: -1,
    requestId: '6A7943EB3DC78E3331CF85A7',
    hostId: 'electric-oss.oss-cn-hangzhou.aliyuncs.com',
    accessKeySecret: 'must-not-be-rendered',
  })

  const message = siteExplorationUploadErrorMessage(error)

  expect(message).toBe(
    '文件上传失败：RequestError: Failed to fetch；code=RequestError；status=-1；requestId=6A7943EB3DC78E3331CF85A7；hostId=electric-oss.oss-cn-hangzhou.aliyuncs.com',
  )
  expect(message).not.toContain('must-not-be-rendered')
})
