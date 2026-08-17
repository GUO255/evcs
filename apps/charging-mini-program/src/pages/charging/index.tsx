import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter, useUnload } from '@tarojs/taro'
import { useEffect, useState } from 'react'

import { getSession, stopCharge } from '../../services/api'
import type { ChargingSession } from '../../types'
import './index.css'

export default function ChargingPage() {
  const router = useRouter()
  const sessionId = typeof router.params.sessionId === 'string' ? router.params.sessionId : ''
  const [session, setSession] = useState<ChargingSession | null>(null)
  const [stopping, setStopping] = useState(false)

  useLoad(() => {
    if (sessionId) void refresh()
  })

  useEffect(() => {
    if (!sessionId) return
    const timer = setInterval(() => {
      void refresh()
    }, 3000)
    return () => clearInterval(timer)
  }, [sessionId])

  useUnload(() => {
    // 页面卸载时停止轮询。
  })

  async function refresh() {
    try {
      setSession(await getSession(sessionId))
    } catch {
      Taro.showToast({ title: '会话状态获取失败', icon: 'none' })
    }
  }

  async function stop() {
    if (!session || stopping) return
    setStopping(true)
    try {
      await stopCharge(session.id)
      void Taro.redirectTo({ url: '/pages/orders/index' })
    } catch {
      Taro.showToast({ title: '停止充电失败', icon: 'none' })
    } finally {
      setStopping(false)
    }
  }

  if (!session) return <View className='page muted'>正在连接充电设备…</View>

  const soc = Math.max(0, Math.min(100, Math.round(session.currentSoc)))

  return (
    <View className='charging-page'>
      <View className='charging-top'>
        <View>
          <Text className='charging-label'>当前充电枪</Text>
          <Text className='charging-connector'>{session.connectorCode}</Text>
        </View>
        <Text className='charging-status'>充电中</Text>
      </View>

      <View className='soc-ring' style={{ background: `conic-gradient(#0aa679 ${soc * 3.6}deg, #e8f5f1 ${soc * 3.6}deg)` }}>
        <View className='soc-ring-inner'>
          <Text className='soc-value'>{soc}%</Text>
          <Text className='soc-label'>当前 SOC</Text>
        </View>
      </View>

      <View className='charge-stats'>
        <View className='stat-item stat-highlight'>
          <Text className='stat-label'>已充电量</Text>
          <Text className='stat-value'>{session.energyKwh.toFixed(2)}</Text>
          <Text className='stat-unit'>kWh</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-label'>实时功率</Text>
          <Text className='stat-value'>{session.powerKw}</Text>
          <Text className='stat-unit'>kW</Text>
        </View>
        <View className='stat-item'>
          <Text className='stat-label'>预计费用</Text>
          <Text className='stat-value'>¥{session.totalFee.toFixed(2)}</Text>
          <Text className='stat-unit'>透明计费</Text>
        </View>
      </View>

      <View className='charge-tip'>
        <Text className='charge-tip-icon'>🛡️</Text>
        <Text className='charge-tip-text'>充电过程中请勿拔枪，结束充电后自动生成账单</Text>
      </View>

      <Button className='stop-button' loading={stopping} onClick={() => void stop()}>
        结束充电
      </Button>
    </View>
  )
}
