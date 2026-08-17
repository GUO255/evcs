export type StationStatus = 'operating' | 'maintenance' | 'planned'
export type StationType = 'self-operated' | 'merchant-operated'
export type DeviceType = 'photovoltaic' | 'storage' | 'charger' | 'connector'
export type DeviceStatus = 'online' | 'offline' | 'fault'
export type FacilityType = 'restaurant' | 'convenience-store' | 'vending-machine' | 'restroom' | 'shower'
export type StaffRole = 'manager' | 'operations' | 'service' | 'security'
export type CameraStatus = 'online' | 'offline'

export interface StationDevice {
  id: string
  code: string
  type: DeviceType
  name: string
  image: string
  model: string
  manufacturer: string
  ratedPower: string
  location: string
  status: DeviceStatus
}

export interface StationFacility {
  id: string
  type: FacilityType
  name: string
  images: readonly string[]
  location: string
  serviceHours: string
  status: 'available' | 'unavailable'
}

export interface StationStaff {
  id: string
  name: string
  role: StaffRole
  mobile: string
  workShift: string
  status: 'on-duty' | 'off-duty'
}

export interface StationMerchantBinding {
  id: string
  merchantCode: string
  merchantName: string
  boundAt: string
  status: 'active' | 'inactive'
}

export interface StationCamera {
  id: string
  code: string
  name: string
  zone: string
  location: string
  status: CameraStatus
  snapshot: string
  lastSeen: string
}

export interface ChargingStation {
  id: string
  code: string
  name: string
  status: StationStatus
  province: string
  city: string
  district: string
  address: string
  longitude: number
  latitude: number
  serviceHours: string
  openedAt: string
  parkingSpaces: number
  dcChargerCount: number
  acChargerCount: number
  connectorCount: number
  solarCapacityKw: number
  storageCapacityKwh: number
  operatorName: string
  servicePhone: string
  images: readonly string[]
  devices: readonly StationDevice[]
  facilities: readonly StationFacility[]
  staff: readonly StationStaff[]
  merchantBindings: readonly StationMerchantBinding[]
  cameras: readonly StationCamera[]
}

export const stationStatusOptions = [
  { value: 'operating', label: '运营中' },
  { value: 'maintenance', label: '维护中' },
  { value: 'planned', label: '筹建中' },
] as const satisfies readonly { value: StationStatus; label: string }[]

export const stationTypeOptions = [
  { value: 'self-operated', label: '自营' },
  { value: 'merchant-operated', label: '商户' },
] as const satisfies readonly { value: StationType; label: string }[]

export const deviceTypeOptions = [
  { value: 'photovoltaic', label: '光伏设备' },
  { value: 'storage', label: '储能设备' },
  { value: 'charger', label: '充电桩' },
  { value: 'connector', label: '充电枪' },
] as const satisfies readonly { value: DeviceType; label: string }[]

export const facilityTypeOptions = [
  { value: 'restaurant', label: '餐饮' },
  { value: 'convenience-store', label: '便利店零售' },
  { value: 'vending-machine', label: '自动售货机' },
  { value: 'restroom', label: '厕所' },
  { value: 'shower', label: '淋浴' },
] as const satisfies readonly { value: FacilityType; label: string }[]

const stationImages = [
  'https://images.unsplash.com/photo-1741513116594-f4e108dfbf3c?auto=format&fit=crop&w=1600&q=80',
  'https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?auto=format&fit=crop&w=1200&q=80',
  'https://images.unsplash.com/photo-1592833159155-c62df1b65634?auto=format&fit=crop&w=1200&q=80',
] as const

const deviceImages: Record<DeviceType, string> = {
  photovoltaic: stationImages[2],
  storage: stationImages[0],
  charger: stationImages[1],
  connector: stationImages[1],
}

const facilityImages: Record<FacilityType, readonly string[]> = {
  restaurant: [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?auto=format&fit=crop&w=900&q=80',
  ],
  'convenience-store': [
    'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1534723452862-4c874018d66d?auto=format&fit=crop&w=900&q=80',
  ],
  'vending-machine': [
    'https://images.unsplash.com/photo-1575224526797-5730d09d781d?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1625650484478-113df4bfc370?auto=format&fit=crop&w=900&q=80',
  ],
  restroom: [
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1564540574859-0dfb63985953?auto=format&fit=crop&w=900&q=80',
  ],
  shower: [
    'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?auto=format&fit=crop&w=900&q=80',
    'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=900&q=80',
  ],
}

export const chargingStations: readonly ChargingStation[] = [
  {
    id: 'station-001',
    code: 'S327001',
    name: 'S327 国道禹州美之源站',
    status: 'operating',
    province: '河南省',
    city: '禹州市',
    district: '褚河街道',
    address: 'S327 国道美之源物流园东区',
    longitude: 113.5261,
    latitude: 34.1405,
    serviceHours: '24 小时',
    openedAt: '2025-08-18',
    parkingSpaces: 36,
    dcChargerCount: 12,
    acChargerCount: 4,
    connectorCount: 28,
    solarCapacityKw: 320,
    storageCapacityKwh: 860,
    operatorName: '禹州美之源新能源有限公司',
    servicePhone: '0374-6852001',
    images: stationImages,
    devices: [
      { id: 'device-001', code: 'PV-S327-01', type: 'photovoltaic', name: '光伏逆变器 1 号', image: deviceImages.photovoltaic, model: 'SUN2000-100KTL', manufacturer: '华为数字能源', ratedPower: '100 kW', location: '光伏车棚 A 区', status: 'online' },
      { id: 'device-002', code: 'ESS-S327-01', type: 'storage', name: '液冷储能柜 1 号', image: deviceImages.storage, model: 'LUNA2000-215', manufacturer: '华为数字能源', ratedPower: '215 kWh', location: '配电房北侧', status: 'online' },
      { id: 'device-003', code: 'DC-S327-01', type: 'charger', name: '双枪直流桩 1 号', image: deviceImages.charger, model: 'DCH-240', manufacturer: '盛弘电气', ratedPower: '240 kW', location: '充电区 01 号车位', status: 'online' },
      { id: 'device-004', code: 'DC-S327-02', type: 'charger', name: '双枪直流桩 2 号', image: deviceImages.charger, model: 'DCH-240', manufacturer: '盛弘电气', ratedPower: '240 kW', location: '充电区 02 号车位', status: 'fault' },
      { id: 'device-005', code: 'AC-S327-01', type: 'charger', name: '交流桩 1 号', image: deviceImages.charger, model: 'AC-7K', manufacturer: '特来电', ratedPower: '7 kW', location: '慢充区 01 号车位', status: 'online' },
      { id: 'device-006', code: 'GUN-S327-01A', type: 'connector', name: '1 号桩 A 枪', image: deviceImages.connector, model: 'GB/T 20234', manufacturer: '永贵电器', ratedPower: '250 A', location: '充电区 01 号车位', status: 'online' },
      { id: 'device-007', code: 'GUN-S327-02B', type: 'connector', name: '2 号桩 B 枪', image: deviceImages.connector, model: 'GB/T 20234', manufacturer: '永贵电器', ratedPower: '250 A', location: '充电区 02 号车位', status: 'offline' },
    ],
    facilities: [
      { id: 'facility-001', type: 'restaurant', name: '美之源司机餐厅', images: facilityImages.restaurant, location: '综合服务楼 1 层', serviceHours: '06:30–22:00', status: 'available' },
      { id: 'facility-002', type: 'convenience-store', name: '美宜佳便利店', images: facilityImages['convenience-store'], location: '综合服务楼 1 层', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-003', type: 'vending-machine', name: '饮料自动售货机', images: facilityImages['vending-machine'], location: '充电休息区', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-004', type: 'restroom', name: '公共卫生间', images: facilityImages.restroom, location: '综合服务楼东侧', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-005', type: 'shower', name: '司机淋浴间', images: facilityImages.shower, location: '综合服务楼 2 层', serviceHours: '06:00–23:00', status: 'available' },
    ],
    staff: [
      { id: 'staff-001', name: '李建国', role: 'manager', mobile: '138****1201', workShift: '周一至周五 08:30–17:30', status: 'on-duty' },
      { id: 'staff-002', name: '张海峰', role: 'operations', mobile: '139****3182', workShift: '白班 08:00–20:00', status: 'on-duty' },
      { id: 'staff-003', name: '刘志鹏', role: 'operations', mobile: '136****5723', workShift: '夜班 20:00–08:00', status: 'off-duty' },
      { id: 'staff-004', name: '王晓敏', role: 'service', mobile: '137****4464', workShift: '09:00–18:00', status: 'on-duty' },
      { id: 'staff-005', name: '赵刚', role: 'security', mobile: '135****8905', workShift: '夜班 20:00–08:00', status: 'off-duty' },
    ],
    merchantBindings: [
      { id: 'binding-001', merchantCode: 'M000001', merchantName: '禹州美之源新能源有限公司', boundAt: '2025-07-20', status: 'active' },
      { id: 'binding-002', merchantCode: 'M000006', merchantName: '许昌美宜商业管理有限公司', boundAt: '2025-08-01', status: 'inactive' },
    ],
    cameras: [
      { id: 'camera-001', code: 'CAM-S327-01', name: '充电区全景', zone: '充电区', location: '充电车棚东侧立柱', status: 'online', snapshot: stationImages[0], lastSeen: '刚刚' },
      { id: 'camera-002', code: 'CAM-S327-02', name: '直流快充区', zone: '充电区', location: '直流桩区域西侧', status: 'online', snapshot: stationImages[1], lastSeen: '刚刚' },
      { id: 'camera-003', code: 'CAM-S327-03', name: '园区入口', zone: '出入口', location: '物流园东门', status: 'online', snapshot: stationImages[2], lastSeen: '1 分钟前' },
      { id: 'camera-004', code: 'CAM-S327-04', name: '综合服务楼', zone: '服务区', location: '服务楼一层入口', status: 'offline', snapshot: stationImages[0], lastSeen: '18 分钟前' },
    ],
  },
  {
    id: 'station-002', code: 'S411001', name: '许昌东环路超级充电站', status: 'operating', province: '河南省', city: '许昌市', district: '魏都区', address: '东环路与许由路交叉口北 200 米', longitude: 113.8785, latitude: 34.0207, serviceHours: '24 小时', openedAt: '2025-11-06', parkingSpaces: 28, dcChargerCount: 10, acChargerCount: 2, connectorCount: 22, solarCapacityKw: 180, storageCapacityKwh: 430, operatorName: '许昌超充能源服务有限公司', servicePhone: '0374-5529002', images: [stationImages[0], stationImages[1]],
    devices: [
      { id: 'device-101', code: 'PV-XC-01', type: 'photovoltaic', name: '光伏逆变器', image: deviceImages.photovoltaic, model: 'SG110CX', manufacturer: '阳光电源', ratedPower: '110 kW', location: '光伏车棚', status: 'online' },
      { id: 'device-102', code: 'ESS-XC-01', type: 'storage', name: '储能一体柜', image: deviceImages.storage, model: 'PowerStack 200CS', manufacturer: '阳光电源', ratedPower: '200 kWh', location: '配电区', status: 'online' },
      { id: 'device-103', code: 'DC-XC-01', type: 'charger', name: '液冷超充终端 1 号', image: deviceImages.charger, model: 'HYC-600', manufacturer: '华为数字能源', ratedPower: '600 kW', location: '超充区 01 号车位', status: 'online' },
      { id: 'device-104', code: 'GUN-XC-01', type: 'connector', name: '1 号液冷枪', image: deviceImages.connector, model: 'GB/T 20234', manufacturer: '沃尔核材', ratedPower: '600 A', location: '超充区 01 号车位', status: 'online' },
    ],
    facilities: [
      { id: 'facility-101', type: 'convenience-store', name: '东环便利店', images: facilityImages['convenience-store'], location: '服务区 1 层', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-102', type: 'vending-machine', name: '咖啡自动售货机', images: facilityImages['vending-machine'], location: '休息区', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-103', type: 'restroom', name: '公共卫生间', images: facilityImages.restroom, location: '服务区东侧', serviceHours: '24 小时', status: 'available' },
    ],
    staff: [
      { id: 'staff-101', name: '陈伟', role: 'manager', mobile: '138****6101', workShift: '08:30–17:30', status: 'on-duty' },
      { id: 'staff-102', name: '郭强', role: 'operations', mobile: '139****6102', workShift: '08:00–20:00', status: 'on-duty' },
    ],
    merchantBindings: [{ id: 'binding-101', merchantCode: 'M000002', merchantName: '许昌超充能源服务有限公司', boundAt: '2025-10-15', status: 'active' }],
    cameras: [
      { id: 'camera-101', code: 'CAM-XC-01', name: '超充区全景', zone: '充电区', location: '超充车棚中央立柱', status: 'online', snapshot: stationImages[0], lastSeen: '刚刚' },
      { id: 'camera-102', code: 'CAM-XC-02', name: '车辆入口', zone: '出入口', location: '站点南门', status: 'online', snapshot: stationImages[1], lastSeen: '刚刚' },
      { id: 'camera-103', code: 'CAM-XC-03', name: '配电区', zone: '设备区', location: '配电房外墙', status: 'online', snapshot: stationImages[2], lastSeen: '2 分钟前' },
    ],
  },
  {
    id: 'station-003', code: 'S410001', name: '郑州航空港智慧能源站', status: 'maintenance', province: '河南省', city: '郑州市', district: '航空港区', address: '华夏大道与太湖路交叉口西南角', longitude: 113.8232, latitude: 34.5196, serviceHours: '06:00–24:00', openedAt: '2025-05-12', parkingSpaces: 48, dcChargerCount: 16, acChargerCount: 8, connectorCount: 40, solarCapacityKw: 480, storageCapacityKwh: 1290, operatorName: '河南港能智慧能源有限公司', servicePhone: '0371-55662003', images: [stationImages[2], stationImages[0]],
    devices: [
      { id: 'device-201', code: 'PV-ZZ-01', type: 'photovoltaic', name: '光伏逆变器 A', image: deviceImages.photovoltaic, model: 'SUN2000-100KTL', manufacturer: '华为数字能源', ratedPower: '100 kW', location: '车棚 A 区', status: 'online' },
      { id: 'device-202', code: 'ESS-ZZ-01', type: 'storage', name: '储能柜 A', image: deviceImages.storage, model: 'LUNA2000-215', manufacturer: '华为数字能源', ratedPower: '215 kWh', location: '储能区', status: 'offline' },
      { id: 'device-203', code: 'DC-ZZ-01', type: 'charger', name: '双枪直流桩 1 号', image: deviceImages.charger, model: 'DCH-320', manufacturer: '盛弘电气', ratedPower: '320 kW', location: '充电区 01 号车位', status: 'offline' },
      { id: 'device-204', code: 'GUN-ZZ-01A', type: 'connector', name: '1 号桩 A 枪', image: deviceImages.connector, model: 'GB/T 20234', manufacturer: '永贵电器', ratedPower: '300 A', location: '充电区 01 号车位', status: 'offline' },
    ],
    facilities: [
      { id: 'facility-201', type: 'restaurant', name: '港区能量餐厅', images: facilityImages.restaurant, location: '服务中心 1 层', serviceHours: '07:00–21:00', status: 'available' },
      { id: 'facility-202', type: 'convenience-store', name: '港能便利店', images: facilityImages['convenience-store'], location: '服务中心 1 层', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-203', type: 'restroom', name: '公共卫生间', images: facilityImages.restroom, location: '服务中心西侧', serviceHours: '24 小时', status: 'available' },
      { id: 'facility-204', type: 'shower', name: '司机淋浴间', images: facilityImages.shower, location: '服务中心 2 层', serviceHours: '07:00–22:00', status: 'unavailable' },
    ],
    staff: [
      { id: 'staff-201', name: '马骁', role: 'manager', mobile: '138****7201', workShift: '08:30–17:30', status: 'on-duty' },
      { id: 'staff-202', name: '冯超', role: 'operations', mobile: '139****7202', workShift: '08:00–20:00', status: 'on-duty' },
      { id: 'staff-203', name: '董雪', role: 'service', mobile: '136****7203', workShift: '09:00–18:00', status: 'off-duty' },
    ],
    merchantBindings: [],
    cameras: [
      { id: 'camera-201', code: 'CAM-ZZ-01', name: '能源站全景', zone: '充电区', location: '车棚 A 区东侧', status: 'online', snapshot: stationImages[2], lastSeen: '刚刚' },
      { id: 'camera-202', code: 'CAM-ZZ-02', name: '储能设备区', zone: '设备区', location: '储能区北侧围栏', status: 'offline', snapshot: stationImages[0], lastSeen: '42 分钟前' },
      { id: 'camera-203', code: 'CAM-ZZ-03', name: '服务中心入口', zone: '服务区', location: '服务中心南门', status: 'online', snapshot: stationImages[1], lastSeen: '1 分钟前' },
    ],
  },
  {
    id: 'station-004', code: 'S412001', name: '漯河临港物流园充电站', status: 'planned', province: '河南省', city: '漯河市', district: '召陵区', address: '人民东路临港物流园 3 号门', longitude: 114.1088, latitude: 33.5847, serviceHours: '筹建中', openedAt: '2026-10-01', parkingSpaces: 32, dcChargerCount: 12, acChargerCount: 4, connectorCount: 28, solarCapacityKw: 300, storageCapacityKwh: 645, operatorName: '漯河临港绿色能源有限公司', servicePhone: '0395-3366004', images: [stationImages[1], stationImages[2]], devices: [], facilities: [], staff: [{ id: 'staff-301', name: '周立', role: 'manager', mobile: '138****8301', workShift: '项目筹建期', status: 'on-duty' }], merchantBindings: [{ id: 'binding-301', merchantCode: 'M000004', merchantName: '漯河临港绿色能源有限公司', boundAt: '2026-05-10', status: 'active' }], cameras: [],
  },
]

export function getChargingStation(stationId: string): ChargingStation | undefined {
  return chargingStations.find((station) => station.id === stationId)
}

export function getStationStatusLabel(status: StationStatus): string {
  return stationStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function getStationType(
  station: Pick<ChargingStation, 'merchantBindings'>,
): StationType {
  return station.merchantBindings.some((binding) => binding.status === 'active')
    ? 'merchant-operated'
    : 'self-operated'
}

export function getStationTypeLabel(type: StationType): string {
  return stationTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getDeviceTypeLabel(type: DeviceType): string {
  return deviceTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getFacilityTypeLabel(type: FacilityType): string {
  return facilityTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getStaffRoleLabel(role: StaffRole): string {
  return {
    manager: '站长',
    operations: '运维人员',
    service: '客服人员',
    security: '安保人员',
  }[role]
}
