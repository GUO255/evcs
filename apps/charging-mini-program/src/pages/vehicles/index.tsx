import { Button, Input, Text, View } from '@tarojs/components'
import Taro, { useLoad } from '@tarojs/taro'
import { useState } from 'react'

import { createVehicle, deleteVehicle, listVehicles } from '../../services/api'
import type { Vehicle } from '../../types'
import './index.css'

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [plate, setPlate] = useState('')
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')

  useLoad(() => {
    void loadVehicles()
  })

  async function loadVehicles() {
    try {
      setVehicles(await listVehicles())
    } catch {
      Taro.showToast({ title: '车辆加载失败', icon: 'none' })
    }
  }

  async function addVehicle() {
    if (!plate || !brand || !model) {
      Taro.showToast({ title: '请填写完整车辆信息', icon: 'none' })
      return
    }
    try {
      await createVehicle({ plate, brand, model })
      setPlate('')
      setBrand('')
      setModel('')
      Taro.showToast({ title: '车辆已添加', icon: 'success' })
      await loadVehicles()
    } catch {
      Taro.showToast({ title: '添加失败', icon: 'none' })
    }
  }

  async function removeVehicle(vehicleId: string) {
    try {
      await deleteVehicle(vehicleId)
      Taro.showToast({ title: '车辆已删除', icon: 'success' })
      await loadVehicles()
    } catch {
      Taro.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  return (
    <View className='vehicles-page'>
      <View className='vehicles-hero'>
        <Text className='vehicles-hero-title'>我的车辆</Text>
        <Text className='vehicles-hero-sub'>已绑定 {vehicles.length} 辆车，充电前可快速选择</Text>
      </View>

      <View className='vehicle-list'>
        {vehicles.length === 0 ? (
          <View className='vehicle-empty'>还没有添加车辆，先添加一辆开始充电吧</View>
        ) : vehicles.map((vehicle) => (
          <View className='vehicle-card' key={vehicle.id}>
            <View className='vehicle-avatar'>🚗</View>
            <View className='vehicle-info'>
              <Text className='plate'>{vehicle.plate}</Text>
              <Text className='vehicle-desc'>{vehicle.brand} · {vehicle.model}</Text>
            </View>
            <Button className='remove-button' onClick={() => void removeVehicle(vehicle.id)}>删除</Button>
          </View>
        ))}
      </View>

      <View className='form-card'>
        <Text className='form-title'>添加车辆</Text>
        <Text className='form-label'>车牌号</Text>
        <Input className='form-input' value={plate} placeholder='如 豫A·D12345' onInput={(event) => setPlate(event.detail.value)} />
        <Text className='form-label'>品牌</Text>
        <Input className='form-input' value={brand} placeholder='如 比亚迪' onInput={(event) => setBrand(event.detail.value)} />
        <Text className='form-label'>车型</Text>
        <Input className='form-input' value={model} placeholder='如 汉 EV' onInput={(event) => setModel(event.detail.value)} />
        <Button className='save-button' onClick={() => void addVehicle()}>保存车辆</Button>
      </View>
    </View>
  )
}
