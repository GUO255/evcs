import { Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'

import './index.css'

type TabKey = 'home' | 'orders' | 'wallet' | 'profile'

const tabs: Array<{ key: TabKey; label: string; icon: string; url: string }> = [
  { key: 'home', label: '找桩', icon: '⚡', url: '/pages/index/index' },
  { key: 'orders', label: '订单', icon: '📋', url: '/pages/orders/index' },
  { key: 'wallet', label: '钱包', icon: '👛', url: '/pages/wallet/index' },
  { key: 'profile', label: '我的', icon: '👤', url: '/pages/profile/index' },
]

const pathKey: Record<string, TabKey> = {
  'pages/index/index': 'home',
  'pages/orders/index': 'orders',
  'pages/wallet/index': 'wallet',
  'pages/profile/index': 'profile',
}

export default function BottomTabBar({ active }: { active: TabKey }) {
  function switchTo(url: string) {
    void Taro.redirectTo({ url })
  }

  return (
    <View className='bottom-tab-bar'>
      {tabs.map((tab) => (
        <View
          className={`tab-item ${active === tab.key ? 'tab-item-active' : ''}`}
          key={tab.key}
          onClick={() => switchTo(tab.url)}
        >
          <Text className='tab-icon'>{tab.icon}</Text>
          <Text className='tab-label'>{tab.label}</Text>
        </View>
      ))}
    </View>
  )
}
