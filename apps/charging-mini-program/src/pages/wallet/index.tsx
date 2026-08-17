import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'

import BottomTabBar from '../../components/BottomTabBar'
import { createStoredValueOrder, getWallet, payStoredValueOrder } from '../../services/api'
import type { Wallet } from '../../types'
import './index.css'

const presets = [50, 100, 200, 500]

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null)
  const [amount, setAmount] = useState('100')
  const [paying, setPaying] = useState(false)

  useLoad(() => {
    void loadWallet()
  })

  async function loadWallet() {
    try {
      setWallet(await getWallet())
    } catch {
      Taro.showToast({ title: '钱包加载失败', icon: 'none' })
    }
  }

  async function recharge(value: number) {
    if (paying || value <= 0) return
    setPaying(true)
    try {
      const order = await createStoredValueOrder(value)
      await payStoredValueOrder(order.id)
      Taro.showToast({ title: '充值成功', icon: 'success' })
      await loadWallet()
    } catch {
      Taro.showToast({ title: '充值失败', icon: 'none' })
    } finally {
      setPaying(false)
    }
  }

  return (
    <View className='wallet-page'>
      <View className='wallet-hero'>
        <View className='wallet-hero-top'>
          <Text className='wallet-label'>储值余额（元）</Text>
          <Text className='wallet-badge'>极充钱包</Text>
        </View>
        <Text className='wallet-balance'>¥{wallet?.balance.toFixed(2) ?? '0.00'}</Text>
        <Text className='wallet-sub'>累计充值 ¥{wallet?.totalRecharged.toFixed(2) ?? '0.00'}</Text>
      </View>

      <View className='wallet-section'>
        <Text className='wallet-section-title'>选择充值金额</Text>
        <View className='preset-grid'>
          {presets.map((preset) => (
            <Button className='preset-button' key={preset} onClick={() => void recharge(preset)} loading={paying}>
              <Text className='preset-amount'>¥{preset}</Text>
              <Text className='preset-tip'>{preset === 500 ? '推荐' : '到账余额'}</Text>
            </Button>
          ))}
        </View>

        <View className='custom-row'>
          <Input
            className='custom-input'
            type='number'
            value={amount}
            placeholder='输入其他金额'
            onInput={(event) => setAmount(event.detail.value)}
          />
          <Button className='custom-button' onClick={() => void recharge(Number(amount))} loading={paying}>
            立即充值
          </Button>
        </View>
      </View>

      <View className='wallet-section'>
        <Text className='wallet-section-title'>最近储值记录</Text>
        {(wallet?.storedValueOrders.length ?? 0) === 0 ? (
          <View className='record-empty'>暂无充值记录</View>
        ) : wallet?.storedValueOrders.map((order) => (
          <View className='record-card' key={order.id}>
            <View>
              <Text className='record-code'>{order.orderCode}</Text>
              <Text className={`record-status ${order.status === 'paid' ? 'record-paid' : ''}`}>
                {order.status === 'paid' ? '已到账' : order.status}
              </Text>
            </View>
            <Text className='record-amount'>+¥{order.amount.toFixed(2)}</Text>
          </View>
        ))}
      </View>

      <BottomTabBar active='wallet' />
    </View>
  )
}
