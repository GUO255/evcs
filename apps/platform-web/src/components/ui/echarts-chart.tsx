import { useEffect, useRef } from 'react'
import { BarChart, FunnelChart, LineChart, PieChart } from 'echarts/charts'
import { GridComponent, LegendComponent, TooltipComponent } from 'echarts/components'
import * as echarts from 'echarts/core'
import type { EChartsCoreOption } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'

import { cn } from '@/lib/utils'

echarts.use([
  BarChart,
  FunnelChart,
  LineChart,
  PieChart,
  GridComponent,
  LegendComponent,
  TooltipComponent,
  CanvasRenderer,
])

export interface EChartsThemeTokens {
  foreground: string
  mutedForeground: string
  border: string
  chart1: string
  chart2: string
  chart3: string
  chart4: string
  chart5: string
}

export type EChartsOptionFactory = (theme: EChartsThemeTokens) => EChartsCoreOption

interface EChartsChartProps {
  option: EChartsOptionFactory
  ariaLabel: string
  className?: string
}

export function EChartsChart({ option, ariaLabel, className }: EChartsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const styles = getComputedStyle(container)
    const colorCanvas = document.createElement('canvas')
    colorCanvas.width = 1
    colorCanvas.height = 1
    const colorContext = colorCanvas.getContext('2d', { willReadFrequently: true })

    if (!colorContext) throw new Error('ECharts requires a canvas color context')

    const theme: EChartsThemeTokens = {
      foreground: resolveEChartsColor(styles, '--foreground', colorContext),
      mutedForeground: resolveEChartsColor(styles, '--muted-foreground', colorContext),
      border: resolveEChartsColor(styles, '--border', colorContext),
      chart1: resolveEChartsColor(styles, '--chart-1', colorContext),
      chart2: resolveEChartsColor(styles, '--chart-2', colorContext),
      chart3: resolveEChartsColor(styles, '--chart-3', colorContext),
      chart4: resolveEChartsColor(styles, '--chart-4', colorContext),
      chart5: resolveEChartsColor(styles, '--chart-5', colorContext),
    }
    const chart = echarts.init(container, null, { renderer: 'canvas' })
    chart.setOption(option(theme))

    const resizeObserver = new ResizeObserver(() => chart.resize())
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
      chart.dispose()
    }
  }, [option])

  return (
    <div
      ref={containerRef}
      className={cn('w-full', className)}
      role="img"
      aria-label={ariaLabel}
    />
  )
}

function resolveEChartsColor(
  styles: CSSStyleDeclaration,
  property: string,
  context: CanvasRenderingContext2D,
): string {
  const color = styles.getPropertyValue(property).trim()

  if (!CSS.supports('color', color)) {
    throw new Error(`Invalid ECharts theme color: ${property}`)
  }

  context.clearRect(0, 0, 1, 1)
  context.fillStyle = color
  context.fillRect(0, 0, 1, 1)

  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data

  if (red === undefined || green === undefined || blue === undefined || alpha === undefined) {
    throw new Error(`Unable to resolve ECharts theme color: ${property}`)
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`
}
