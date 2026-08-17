import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

import type { SiteExplorationRecord } from './site-exploration-api'

export function SiteExplorationSourceAttachments({ record }: { record: SiteExplorationRecord }) {
  const groups = [
    ['场站位置卫星附件', record.sourceSatelliteAttachments],
    ['进出便利性附件', record.sourceAccessConvenienceAttachments],
    ['现场土地情况附件', record.sourceLandSceneAttachments],
    ['其他附属物附件', record.sourceOtherStructureAttachments],
  ] as const
  const populated = groups.filter(([, attachments]) => attachments.length > 0)
  if (populated.length === 0) return null

  return (
    <Card>
      <CardHeader><CardTitle>来源附件</CardTitle></CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        {populated.map(([name, attachments]) => (
          <section key={name}>
            <h3 className="mb-3 text-sm font-medium">{name}（{attachments.length}）</h3>
            <div className="flex flex-col gap-2">
              {attachments.map((attachment) => (
                <a
                  key={attachment.objectKey}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-muted"
                >
                  <span className="block break-all font-medium">{attachment.originalName}</span>
                  <span className="text-xs text-muted-foreground">
                    {attachment.contentType} · {formatFileSize(attachment.size)}
                  </span>
                </a>
              ))}
            </div>
          </section>
        ))}
      </CardContent>
    </Card>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} MB`
  }
  return `${(bytes / 1024).toLocaleString('zh-CN', { maximumFractionDigits: 1 })} KB`
}
