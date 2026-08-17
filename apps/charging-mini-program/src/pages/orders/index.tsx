import { Button, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useMemo, useState } from 'react'

import BottomTabBar from '../../components/BottomTabBar'
import { listOrders, payOrder, refundOrder } from '../../services/api'
import type { ChargingOrder } from '../../types'
import './index.css'

type OrderFilter = 'all' | 'pending-payment' | 'paid' | 'refunded'

const filters: Array<{ key: OrderFilter; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'pending-payment', label: '待支付' },
  { key: 'paid', label: '已支付' },
  { key: 'refunded', label: '已退款' },
]

export default function OrdersPage() {
  const [orders, setOrders] = useState<ChargingOrder[]>([])
  const [filter, setFilter] = useState<OrderFilter>('all')
  const [actioning, setActioning] = useState('')

  const visibleOrders = useMemo(
    () => (filter === 'all' ? orders : orders.filter((order) => order.status === filter)),
    [filter, orders],
  )

  useLoad(() => {
    void loadOrders()
  })

  async function loadOrders() {
    try {
      setOrders(await listOrders())
    } catch {
      Taro.showToast({ title: '订单加载失败', icon: 'none' })
    }
  }

  async function pay(orderId: string) {
    if (actioning) return
    setActioning(orderId)
    try {
      await payOrder(orderId, 'balance')
      Taro.showToast({ title: '支付成功', icon: 'success' })
      await loadOrders()
    } catch {
      Taro.showToast({ title: '支付失败', icon: 'none' })
    } finally {
      setActioning('')
    }
  }

  async function refund(orderId: string) {
    if (actioning) return
    setActioning(orderId)
    try {
      await refundOrder(orderId)
      Taro.showToast({ title: '退款成功', icon: 'success' })
      await loadOrders()
    } catch {
      Taro.showToast({ title: '退款失败', icon: 'none' })
    } finally {
      setActioning('')
    }
  }

  return (
    <View className='orders-page'>
      <View className='orders-hero'>
        <Text className='orders-hero-title'>充电订单</Text>
        <Text className='orders-hero-sub'>共 {orders.length} 笔 · 累计充电 {totalEnergy(orders).toFixed(1)} kWh</Text>
      </View>

      <View className='filter-tabs'>
        {filters.map((item) => (
          <View
            className={`filter-tab ${filter === item.key ? 'filter-tab-active' : ''}`}
            key={item.key}
            onClick={() => setFilter(item.key)}
          >
            {item.label}
          </View>
        ))}
      </View>

      <View className='order-list'>
        {visibleOrders.length === 0 ? (
          <View className='empty-state'>
            <Text className='empty-icon'>🧾</Text>
            <Text className='empty-text'>暂无相关订单</Text>
          </View>
        ) : visibleOrders.map((order) => (
          <View className='order-card' key={order.id}>
            <View className='order-head'>
              <View>
                <Text className='order-code'>{order.orderCode}</Text>
                <Text className='order-station'>{order.stationName}</Text>
              </View>
              <Text className={`order-status order-status-${order.status}`}>{orderStatusLabel(order.status)}</Text>
            </View>

            <View className='order-meta'>
              <Text className='order-time'>🔌 {order.connectorCode}</Text>
              <Text className='order-energy'>{order.energyKwh.toFixed(2)} kWh</Text>
            </View>

            <View className='order-foot'>
              <Text className='order-amount-label'>实付金额</Text>
              <Text className='order-fee'>¥{order.totalFee.toFixed(2)}</Text>
            </View>

            {order.status === 'pending-payment' && (
              <Button className='pay-button' loading={actioning === order.id} onClick={() => void pay(order.id)}>
                余额支付
              </Button>
            )}
            {order.status === 'paid' && (
              <Button className='refund-button' loading={actioning === order.id} onClick={() => void refund(order.id)}>
                申请退款
              </Button>
            )}
          </View>
        ))}
      </View>

      <BottomTabBar active='orders' />
    </View>
  )
}

function orderStatusLabel(status: ChargingOrder['status']): string {
  if (status === 'pending-payment') return '待支付'
  if (status === 'paid') return '已支付'
  if (status === 'refunded') return '已退款'
  return status
}

function totalEnergy(orders: ChargingOrder[]): number {
  return orders.reduce((total, order) => total + order.energyKwh, 0)
}
