import { useState } from 'react'
import { CheckIcon, WrenchIcon } from '@/components/ui/icons'

import { Button } from '@/components/ui/button'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const deviceFaults = [
  {
    station: 'S327 国道禹州美之源站点',
    fault: '3 号充电桩离线 32 分钟',
    analysis: '站点网络链路正常，初步判断桩端通信模块异常，建议现场重启设备并检查通信模块供电。',
  },
  {
    station: '许昌市东环路充电站',
    fault: '2 号充电枪绝缘检测失败',
    analysis: '连续两次检测结果异常，建议检查充电枪线缆及绝缘检测回路，确认无破损后重新测试。',
  },
  {
    station: '禹州市产业集聚区站点',
    fault: '视频监控画面中断',
    analysis: '摄像机供电正常但视频流不可用，建议检查交换机端口和摄像机编码服务。',
  },
] as const

export function DeviceFaultAnalysis() {
  const [dispatchedFaults, setDispatchedFaults] = useState<ReadonlySet<string>>(() => new Set())
  const allDispatched = deviceFaults.every((fault) => dispatchedFaults.has(fault.fault))

  function dispatchFault(fault: string) {
    setDispatchedFaults((current) => new Set(current).add(fault))
  }

  function dispatchAllFaults() {
    setDispatchedFaults(new Set(deviceFaults.map((fault) => fault.fault)))
  }

  return (
    <Card className="border ring-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <WrenchIcon className="size-4 text-primary" aria-hidden="true" />
          <CardTitle>当前故障设备</CardTitle>
        </div>
        <CardDescription>巡检发现 {deviceFaults.length} 个需要处理的设备故障。</CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" type="button" disabled={allDispatched} onClick={dispatchAllFaults}>
            全部派发
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="pt-0">
        <ul>
          {deviceFaults.map((fault, index) => {
            const dispatched = dispatchedFaults.has(fault.fault)

            return (
              <li key={`${fault.station}-${fault.fault}`}>
                <div className="min-w-0 py-3">
                  <p className="text-sm font-medium">{fault.station}</p>
                  <p className="mt-1 text-sm">故障内容：{fault.fault}</p>
                  <div className="mt-3 rounded-lg bg-muted px-3 py-2.5">
                    <p className="text-xs font-medium text-muted-foreground">智能体分析</p>
                    <p className="mt-1 text-sm leading-6">{fault.analysis}</p>
                    <div className="mt-3 flex justify-end">
                      <Button
                        variant={dispatched ? 'secondary' : 'outline'}
                        size="sm"
                        type="button"
                        disabled={dispatched}
                        onClick={() => dispatchFault(fault.fault)}
                      >
                        {dispatched ? <CheckIcon data-icon="inline-start" aria-hidden="true" /> : null}
                        {dispatched ? '已派发' : '派发工单'}
                      </Button>
                    </div>
                  </div>
                </div>
                {index < deviceFaults.length - 1 ? <Separator /> : null}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
