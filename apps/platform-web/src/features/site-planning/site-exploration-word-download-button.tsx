import { useState, type ComponentProps } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'

import {
  downloadSiteExplorationWordReport,
  siteExplorationErrorMessage,
} from './site-exploration-api'

export function SiteExplorationWordDownloadButton({
  siteId,
  size = 'default',
}: {
  siteId: string
  size?: ComponentProps<typeof Button>['size']
}) {
  const [downloading, setDownloading] = useState(false)

  async function download() {
    setDownloading(true)
    try {
      const report = await downloadSiteExplorationWordReport(siteId)
      const url = URL.createObjectURL(report.blob)
      try {
        const anchor = document.createElement('a')
        anchor.href = url
        anchor.download = report.fileName
        document.body.append(anchor)
        anchor.click()
        anchor.remove()
      } finally {
        window.setTimeout(() => URL.revokeObjectURL(url), 0)
      }
      toast.success('Word 报告已生成')
    } catch (error) {
      toast.error(siteExplorationErrorMessage(error) ?? 'Word 报告生成失败，请稍后重试。')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Button variant="outline" size={size} disabled={downloading} onClick={() => void download()}>
      {downloading ? '正在生成 Word…' : '下载Word报告'}
    </Button>
  )
}
