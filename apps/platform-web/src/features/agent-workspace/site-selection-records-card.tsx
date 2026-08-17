import { useState } from 'react'
import { FileTextIcon, MapPinnedIcon } from '@/components/ui/icons'

import { TablePagination, useTablePagination } from '@/components/table-pagination'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { AgentAnalysisSummary, type AgentAnalysisSummaryProps } from './agent-analysis-summary'
import { SiteSelectionDateFilter } from './site-selection-date-filter'
import { siteSelectionRecords, type SiteSelectionRecord } from './site-selection-record-data'

export function SiteSelectionRecordsCard({ analysis }: { analysis: AgentAnalysisSummaryProps }) {
  const [selectedRecord, setSelectedRecord] = useState<SiteSelectionRecord | null>(null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const availableDates = [...new Set(siteSelectionRecords.map((record) => getRecordDate(record)))].sort()
  const visibleRecords = selectedDate
    ? siteSelectionRecords.filter((record) => getRecordDate(record) === selectedDate)
    : siteSelectionRecords
  const pagination = useTablePagination(visibleRecords, selectedDate ?? 'all', 10)
  const visibleAnalysis = selectedDate
    ? { ...analysis, title: '当日勘探与选址分析', content: createFilteredRecordsAnalysis(visibleRecords, selectedDate) }
    : analysis

  return (
    <>
      <Card className="border ring-0">
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPinnedIcon className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>勘探和选址列表</CardTitle>
          </div>
          <CardDescription>展示勘探站点的各维度评分、综合得分和选址报告。</CardDescription>
          <CardAction>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <SiteSelectionDateFilter
                availableDates={availableDates}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
                label="勘探与选址列表"
              />
              <Badge variant="secondary">{visibleRecords.length} 个站点</Badge>
            </div>
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-0">
          <Table containerClassName="rounded-lg border scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-64">站点名称</TableHead>
                <TableHead className="text-center">权属合规得分</TableHead>
                <TableHead className="text-center">地理环境</TableHead>
                <TableHead className="text-center">电力得分</TableHead>
                <TableHead className="text-center">场地条件</TableHead>
                <TableHead className="text-center">合作车队得分</TableHead>
                <TableHead className="text-center">综合得分</TableHead>
                <TableHead className="min-w-36">勘探时间</TableHead>
                <TableHead className="text-right">报告</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagination.pageItems.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <span className="block max-w-64 truncate font-medium" title={record.siteName}>{record.siteName}</span>
                  </TableCell>
                  <ScoreCell value={record.ownershipComplianceScore} />
                  <ScoreCell value={record.geographicEnvironmentScore} />
                  <ScoreCell value={record.powerScore} />
                  <ScoreCell value={record.siteConditionScore} />
                  <ScoreCell value={record.fleetCooperationScore} />
                  <TableCell className="text-center">
                    <Badge variant="secondary" className="tabular-nums">{record.overallScore}</Badge>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">{record.exploredAt}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="outline" size="sm" type="button" onClick={() => setSelectedRecord(record)}>
                      <FileTextIcon data-icon="inline-start" aria-hidden="true" />
                      查看
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            total={visibleRecords.length}
            unit="条记录"
            pageIndex={pagination.pageIndex}
            pageCount={pagination.pageCount}
            onPageChange={pagination.changePage}
          />
          <AgentAnalysisSummary {...visibleAnalysis} />
        </CardContent>
      </Card>

      <Dialog
        open={Boolean(selectedRecord)}
        onOpenChange={(open) => {
          if (!open) setSelectedRecord(null)
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRecord ? `${selectedRecord.siteName}选址报告` : '选址报告'}</DialogTitle>
            <DialogDescription>
              {selectedRecord ? `勘探时间：${selectedRecord.exploredAt}` : '查看站点选址评估结果。'}
            </DialogDescription>
          </DialogHeader>
          {selectedRecord ? (
            <div className="flex flex-col gap-4">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <ScoreSummary label="权属合规得分" value={selectedRecord.ownershipComplianceScore} />
                <ScoreSummary label="地理环境" value={selectedRecord.geographicEnvironmentScore} />
                <ScoreSummary label="电力得分" value={selectedRecord.powerScore} />
                <ScoreSummary label="场地条件" value={selectedRecord.siteConditionScore} />
                <ScoreSummary label="合作车队得分" value={selectedRecord.fleetCooperationScore} />
                <ScoreSummary label="综合得分" value={selectedRecord.overallScore} />
              </dl>
              <div className="rounded-lg border bg-muted/50 p-4">
                <p className="text-sm leading-7">{selectedRecord.report}</p>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function ScoreCell({ value }: { value: number }) {
  return <TableCell className="text-center tabular-nums text-muted-foreground">{value}</TableCell>
}

function ScoreSummary({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

export function getSiteSelectionRecordsCardData() {
  return siteSelectionRecords
}

function getRecordDate(record: SiteSelectionRecord): string {
  return record.exploredAt.slice(0, 10)
}

function createFilteredRecordsAnalysis(records: readonly SiteSelectionRecord[], date: string): string {
  const highScoreCount = records.filter((record) => record.overallScore >= 90).length
  const recommendedCount = records.filter((record) => record.overallScore >= 80).length
  return `${date} 共完成 ${records.length} 个站点勘探与选址评估，其中 90 分以上 ${highScoreCount} 个、80 分以上 ${recommendedCount} 个。建议优先查看当日高分站点报告，并复核权属合规、电力接入和场地条件。`
}
