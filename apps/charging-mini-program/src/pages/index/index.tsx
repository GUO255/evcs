import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'

import BottomTabBar from '../../components/BottomTabBar'
import { listStations } from '../../services/api'
import type { ChargingStationSummary } from '../../types'
import './index.css'

const MAP_ORIGIN = { lat: 34.7964, lng: 113.5385 }
const MAP_SPREAD = { lat: 0.6, lng: 0.6 }

export default function StationListPage() {
  const [stations, setStations] = useState<ChargingStationSummary[]>([])
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(true)

  const markers = useMemo(() => stations.slice(0, 5).map((station) => ({
    ...station,
    left: `${Math.min(88, Math.max(8, 50 + (station.longitude - MAP_ORIGIN.lng) / MAP_SPREAD.lng * 42))}%`,
    top: `${Math.min(74, Math.max(16, 48 - (station.latitude - MAP_ORIGIN.lat) / MAP_SPREAD.lat * 30))}%`,
  })), [stations])

  useLoad(() => {
    void loadStations()
  })

  async function loadStations() {
    setLoading(true)
    try {
      setStations(await listStations(keyword))
    } catch (error) {
      Taro.showToast({ title: '场站加载失败', icon: 'none' })
    } finally {
      setLoading(false)
    }
  }

  function openStation(stationId: string) {
    void Taro.navigateTo({ url: `/pages/station/index?id=${stationId}` })
  }

  function scanCharge() {
    Taro.showToast({ title: '扫码入口待接入相机', icon: 'none' })
  }

  return (
    <View className='home-page'>
      <View className='home-hero'>
        <View className='hero-top'>
          <View>
            <Text className='hero-kicker'>极充智联 · 绿色出行</Text>
            <Text className='hero-title'>附近充电站</Text>
          </View>
          <Text className='hero-slogan'>扫码充电，满电出发</Text>
        </View>

        <View className='search-row'>
          <View className='search-input-wrap'>
            <Text className='search-icon'>⌕</Text>
            <Input
              className='search-input'
              value={keyword}
              placeholder='搜索场站、地址或商圈'
              onInput={(event) => setKeyword(event.detail.value)}
              confirmType='search'
              onConfirm={() => void loadStations()}
            />
          </View>
          <Button className='scan-button' onClick={scanCharge}>
            <Text className='scan-icon'>⌗</Text>
            <Text className='scan-text'>扫码</Text>
          </Button>
        </View>

        <View className='quick-actions'>
          <View className='quick-item'>
            <Text className='quick-icon'>⚡</Text>
            <Text className='quick-label'>快充优先</Text>
          </View>
          <View className='quick-item'>
            <Text className='quick-icon'>🅿️</Text>
            <Text className='quick-label'>免费停车</Text>
          </View>
          <View className='quick-item'>
            <Text className='quick-icon'>🕐</Text>
            <Text className='quick-label'>24 小时</Text>
          </View>
          <View className='quick-item'>
            <Text className='quick-icon'>💰</Text>
            <Text className='quick-label'>低价排序</Text>
          </View>
        </View>
      </View>

      <View className='map-preview'>
        <View className='map-grid' />
        {markers.map((marker, index) => (
          <View className='map-pin' key={marker.id} style={{ left: marker.left, top: marker.top }}>
            <Text className='pin-dot'>{index === 0 ? '⚡' : ''}</Text>
          </View>
        ))}
        <View className='map-center-pin'>📍</View>
        <View className='map-hint'>地图预览 · 当前为演示定位</View>
      </View>

      <View className='section-head'>
        <Text className='section-title'>为你推荐</Text>
        <Text className='section-count'>{stations.length} 个场站</Text>
      </View>

      {loading ? <View className='loading-tip'>正在定位附近场站…</View> : stations.map((station) => (
        <View className='station-card' key={station.id} onClick={() => openStation(station.id)}>
          <View className='station-card-top'>
            <View className='station-name-wrap'>
              <Text className='station-name'>{station.name}</Text>
              <View className='operator-tag'>{station.operatorName}</View>
            </View>
            <Text className='station-distance'>{station.distanceKm} km</Text>
          </View>

          <View className='station-address-row'>
            <Text className='station-address'>{station.address}</Text>
            <Text className='station-arrow'>›</Text>
          </View>

          <View className='station-tags'>
            {station.tags.slice(0, 3).map((tag) => (
              <Text className='tag-pill' key={tag}>{tag}</Text>
            ))}
          </View>

          <View className='station-bottom'>
            <View className='availability'>
              <View className='availability-item'>
                <Text className='dot dot-fast' />
                <Text className='availability-label'>快充空闲</Text>
                <Text className='availability-value'>{station.fastAvailable}</Text>
              </View>
              <View className='availability-item'>
                <Text className='dot dot-slow' />
                <Text className='availability-label'>慢充空闲</Text>
                <Text className='availability-value'>{station.slowAvailable}</Text>
              </View>
            </View>
            <Text className='station-price'>{station.priceDesc}</Text>
          </View>
        </View>
      ))}

      <BottomTabBar active='home' />
    </View>
  )
}
