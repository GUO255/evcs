import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad, useRouter } from '@tarojs/taro'
import { useState } from 'react'

import { getStation, startCharge } from '../../services/api'
import type { ChargingStationDetail } from '../../types'
import './index.css'

export default function StationDetailPage() {
  const router = useRouter()
  const stationId = typeof router.params.id === 'string' ? router.params.id : ''
  const [station, setStation] = useState<ChargingStationDetail | null>(null)
  const [startingId, setStartingId] = useState('')

  useLoad(() => {
    if (!stationId) return
    void loadStation(stationId)
  })

  async function loadStation(id: string) {
    try {
      setStation(await getStation(id))
    } catch {
      Taro.showToast({ title: '场站详情加载失败', icon: 'none' })
    }
  }

  async function beginCharge(connectorId: string) {
    if (startingId) return
    setStartingId(connectorId)
    try {
      const session = await startCharge(connectorId)
      void Taro.redirectTo({ url: `/pages/charging/index?sessionId=${session.id}` })
    } catch {
      Taro.showToast({ title: '启动充电失败', icon: 'none' })
    } finally {
      setStartingId('')
    }
  }

  if (!station) return <View className='page muted'>正在加载场站详情…</View>

  return (
    <View className='station-page'>
      <View className='station-hero'>
        <View className='station-hero-top'>
          <View className='station-hero-name-wrap'>
            <Text className='station-hero-name'>{station.name}</Text>
            <Text className='station-operator'>{station.operatorName}</Text>
          </View>
          <Text className='station-distance-badge'>{station.distanceKm} km</Text>
        </View>

        <View className='station-address-row'>
          <Text className='station-address'>📍 {station.address}</Text>
          <Text className='station-arrow'>›</Text>
        </View>

        <View className='station-info-grid'>
          <View className='info-cell'>
            <Text className='info-label'>营业时间</Text>
            <Text className='info-value'>{station.businessHours}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>停车收费</Text>
            <Text className='info-value'>{station.parkFee}</Text>
          </View>
          <View className='info-cell'>
            <Text className='info-label'>服务费</Text>
            <Text className='info-value'>按枪计价</Text>
          </View>
        </View>
      </View>

      <View className='price-banner'>
        <View>
          <Text className='price-banner-label'>当前最低电价</Text>
          <Text className='price-banner-value'>{station.priceDesc}</Text>
        </View>
        <Text className='price-banner-tip'>电量 × 单价，费用透明</Text>
      </View>

      <View className='section-head'>
        <Text className='section-title'>选择充电枪</Text>
        <Text className='section-sub'>空闲 {station.connectors.filter((item) => item.status === 'idle').length} 个</Text>
      </View>

      <View className='connector-list'>
        {station.connectors.map((connector) => {
          const isIdle = connector.status === 'idle'
          return (
            <View className='connector-card' key={connector.id}>
              <View className='connector-code-wrap'>
                <Text className='connector-code'>{connector.code}</Text>
                <Text className={`connector-status ${isIdle ? 'status-idle' : 'status-busy'}`}>
                  {isIdle ? '空闲' : connector.status === 'charging' ? '充电中' : '离线'}
                </Text>
              </View>

              <View className='connector-meta'>
                <Text className='connector-type'>{connector.type === 'dc' ? '直流快充' : '交流慢充'}</Text>
                <Text className='connector-power'>{connector.powerKw} kW</Text>
              </View>

              <View className='connector-price'>
                <Text className='connector-price-label'>电费 ¥{connector.electricityFeePerKwh}</Text>
                <Text className='connector-price-label'>服务费 ¥{connector.serviceFeePerKwh}</Text>
              </View>

              {isIdle ? (
                <Button
                  className='start-button'
                  loading={startingId === connector.id}
                  onClick={() => void beginCharge(connector.id)}
                >
                  立即充电
                </Button>
              ) : (
                <View className='disabled-button'>{connector.status === 'charging' ? '充电中' : '暂不可用'}</View>
              )}
            </View>
          )
        })}
      </View>
    </View>
  )
}
