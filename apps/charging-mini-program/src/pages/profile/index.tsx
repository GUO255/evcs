import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'

import BottomTabBar from '../../components/BottomTabBar'
import { getMe } from '../../services/api'
import type { MiniProgramUser } from '../../types'
import './index.css'

export default function ProfilePage() {
  const [user, setUser] = useState<MiniProgramUser | null>(null)

  useLoad(() => {
    void loadProfile()
  })

  async function loadProfile() {
    try {
      setUser(await getMe())
    } catch {
      Taro.showToast({ title: '用户信息加载失败', icon: 'none' })
    }
  }

  function go(url: string) {
    void Taro.navigateTo({ url })
  }

  return (
    <View className='profile-page'>
      <View className='profile-hero'>
        <View className='avatar'>👤</View>
        <View className='profile-info'>
          <Text className='nickname'>{user?.nickname ?? '极充车主'}</Text>
          <Text className='phone'>{user?.phone ?? '未绑定手机号'}</Text>
        </View>
        <Text className='level'>Lv.1</Text>
      </View>

      <View className='balance-card'>
        <View>
          <Text className='balance-label'>储值余额</Text>
          <Text className='balance-value'>¥{user?.balance.toFixed(2) ?? '0.00'}</Text>
        </View>
        <Button className='balance-button' onClick={() => go('/pages/wallet/index')}>去充值</Button>
      </View>

      <View className='service-grid'>
        <View className='service-item' onClick={() => go('/pages/wallet/index')}>
          <Text className='service-icon'>👛</Text>
          <Text className='service-label'>储值钱包</Text>
        </View>
        <View className='service-item' onClick={() => go('/pages/vehicles/index')}>
          <Text className='service-icon'>🚗</Text>
          <Text className='service-label'>车辆管理</Text>
        </View>
        <View className='service-item' onClick={() => go('/pages/orders/index')}>
          <Text className='service-icon'>🧾</Text>
          <Text className='service-label'>充电订单</Text>
        </View>
        <View className='service-item' onClick={() => Taro.showToast({ title: '会员中心即将上线', icon: 'none' })}>
          <Text className='service-icon'>👑</Text>
          <Text className='service-label'>会员中心</Text>
        </View>
      </View>

      <View className='menu-card'>
        <View className='menu-row'>
          <Text className='menu-text'>优惠券</Text>
          <Text className='menu-value'>0 张 ›</Text>
        </View>
        <View className='menu-row'>
          <Text className='menu-text'>积分</Text>
          <Text className='menu-value'>0 分 ›</Text>
        </View>
        <View className='menu-row'>
          <Text className='menu-text'>联系客服</Text>
          <Text className='menu-value'>400-000-0000 ›</Text>
        </View>
      </View>

      <BottomTabBar active='profile' />
    </View>
  )
}
