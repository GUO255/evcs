import type {
  ChargingConnector,
  ChargingOrder,
  ChargingStationDetail,
  MiniProgramUser,
  Vehicle,
} from '../types'

export const mockUser: MiniProgramUser = {
  id: 'mini-user-001',
  nickname: '极充车主',
  phone: '138****2101',
  balance: 268.5,
}

export const mockVehicles: Vehicle[] = [
  { id: 'vehicle-001', plate: '豫A·D12345', brand: '比亚迪', model: '汉 EV' },
  { id: 'vehicle-002', plate: '豫A·F67890', brand: '特斯拉', model: 'Model Y' },
]

export const mockStations: ChargingStationDetail[] = [
  {
    id: 'station-001',
    name: '郑州高新区极充超充站',
    address: '河南省郑州市高新区科学大道与西四环交叉口',
    latitude: 34.7964,
    longitude: 113.5385,
    distanceKm: 1.8,
    fastAvailable: 5,
    slowAvailable: 2,
    priceDesc: '1.28 元/度起',
    operatorName: '极充智联自营',
    tags: ['自营', '24 小时', '免费停车'],
    images: ['https://images.unsplash.com/photo-1593941707882-a5bba14938c7?w=800&q=80'],
    businessHours: '00:00-24:00',
    parkFee: '免费',
    connectors: [
      { id: 'connector-001', stationId: 'station-001', code: 'A-01', type: 'dc', powerKw: 120, status: 'idle', electricityFeePerKwh: 0.78, serviceFeePerKwh: 0.5 },
      { id: 'connector-002', stationId: 'station-001', code: 'A-02', type: 'dc', powerKw: 120, status: 'charging', electricityFeePerKwh: 0.78, serviceFeePerKwh: 0.5 },
      { id: 'connector-003', stationId: 'station-001', code: 'B-01', type: 'ac', powerKw: 7, status: 'idle', electricityFeePerKwh: 0.62, serviceFeePerKwh: 0.3 },
    ],
  },
  {
    id: 'station-002',
    name: '许昌东环路超级充电站',
    address: '河南省许昌市魏都区东环路与许由路交叉口',
    latitude: 34.0207,
    longitude: 113.8785,
    distanceKm: 5.6,
    fastAvailable: 8,
    slowAvailable: 0,
    priceDesc: '1.36 元/度起',
    operatorName: '许昌超充能源',
    tags: ['对外开放', '大功率', '重卡可充'],
    images: ['https://images.unsplash.com/photo-1605518216938-7c31b7b14ad0?w=800&q=80'],
    businessHours: '00:00-24:00',
    parkFee: '充电车辆免费 2 小时',
    connectors: [
      { id: 'connector-101', stationId: 'station-002', code: 'A-01', type: 'dc', powerKw: 320, status: 'idle', electricityFeePerKwh: 0.86, serviceFeePerKwh: 0.5 },
      { id: 'connector-102', stationId: 'station-002', code: 'A-02', type: 'dc', powerKw: 320, status: 'offline', electricityFeePerKwh: 0.86, serviceFeePerKwh: 0.5 },
      { id: 'connector-103', stationId: 'station-002', code: 'B-01', type: 'ac', powerKw: 7, status: 'idle', electricityFeePerKwh: 0.62, serviceFeePerKwh: 0.3 },
    ],
  },
  {
    id: 'station-003',
    name: '郑州航空港智慧能源站',
    address: '河南省郑州市航空港区华夏大道与太湖路交叉口',
    latitude: 34.5196,
    longitude: 113.8232,
    distanceKm: 9.2,
    fastAvailable: 4,
    slowAvailable: 6,
    priceDesc: '1.42 元/度起',
    operatorName: '河南港能智慧能源',
    tags: ['光储充', '休息室', '对外开放'],
    images: ['https://images.unsplash.com/photo-1593941707874-ef25b8b4a92b?w=800&q=80'],
    businessHours: '06:00-24:00',
    parkFee: '充电车辆免费 2 小时',
    connectors: [
      { id: 'connector-201', stationId: 'station-003', code: 'A-01', type: 'dc', powerKw: 160, status: 'idle', electricityFeePerKwh: 0.92, serviceFeePerKwh: 0.5 },
      { id: 'connector-202', stationId: 'station-003', code: 'A-02', type: 'dc', powerKw: 160, status: 'idle', electricityFeePerKwh: 0.92, serviceFeePerKwh: 0.5 },
      { id: 'connector-203', stationId: 'station-003', code: 'B-01', type: 'ac', powerKw: 7, status: 'idle', electricityFeePerKwh: 0.62, serviceFeePerKwh: 0.3 },
    ],
  },
]

export const mockOrders: ChargingOrder[] = [
  {
    id: 'order-001',
    orderCode: 'CD202608170001',
    stationName: '郑州高新区极充超充站',
    connectorCode: 'A-01',
    startedAt: '2026-08-17T08:10:00+08:00',
    endedAt: '2026-08-17T08:58:00+08:00',
    energyKwh: 31.86,
    totalFee: 40.81,
    status: 'paid',
    paymentMethod: 'wechat',
    paidAt: '2026-08-17T08:59:00+08:00',
  },
  {
    id: 'order-002',
    orderCode: 'CD202608160018',
    stationName: '许昌东环路超级充电站',
    connectorCode: 'A-02',
    startedAt: '2026-08-16T12:26:00+08:00',
    endedAt: '2026-08-16T13:45:00+08:00',
    energyKwh: 65.64,
    totalFee: 73.07,
    status: 'paid',
    paymentMethod: 'balance',
    paidAt: '2026-08-16T13:46:00+08:00',
  },
]

export function getStationConnectorMap(): Map<string, ChargingConnector[]> {
  return new Map(mockStations.map((station) => [station.id, station.connectors]))
}
