export type CustomerType = 'fleet' | 'enterprise'
export type CustomerStatus = 'active' | 'pending' | 'disabled'

export interface Customer {
  id: string
  customerCode: string
  customerType: CustomerType
  customerName: string
  shortName: string
  unifiedSocialCreditCode: string
  legalRepresentative: string
  contactName: string
  contactPhone: string
  contactEmail: string
  province: string
  city: string
  district: string
  address: string
  vehicleCount: number | null
  discountRate: number
  signedAt: string
  contractStartAt: string
  contractEndAt: string
  status: CustomerStatus
  remark: string
  createdAt: string
  updatedAt: string
}

export type CustomerInput = Omit<Customer, 'id' | 'customerCode' | 'createdAt' | 'updatedAt'>

export type CustomerFormValues = Omit<CustomerInput, 'vehicleCount' | 'discountRate'> & {
  vehicleCount: string
  discountRate: string
}

export type CustomerValidationErrors = Partial<Record<keyof CustomerFormValues, string>>

export const customerTypeOptions = [
  { value: 'fleet', label: '车队' },
  { value: 'enterprise', label: '企业' },
] as const satisfies readonly { value: CustomerType; label: string }[]

export const customerStatusOptions = [
  { value: 'active', label: '合作中' },
  { value: 'pending', label: '待生效' },
  { value: 'disabled', label: '已停用' },
] as const satisfies readonly { value: CustomerStatus; label: string }[]

export const emptyCustomerFormValues: CustomerFormValues = {
  customerType: 'fleet',
  customerName: '',
  shortName: '',
  unifiedSocialCreditCode: '',
  legalRepresentative: '',
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  province: '',
  city: '',
  district: '',
  address: '',
  vehicleCount: '',
  discountRate: '100',
  signedAt: '',
  contractStartAt: '',
  contractEndAt: '',
  status: 'active',
  remark: '',
}

interface CustomerSeed extends CustomerInput {
  id: string
  customerCode: string
  createdAt: string
}

const seeds: readonly CustomerSeed[] = [
  { id: 'customer-001', customerCode: 'C000001', customerType: 'fleet', customerName: '上海申城绿色物流车队有限公司', shortName: '申城绿运', unifiedSocialCreditCode: '91310115MA1K4T8X2D', legalRepresentative: '顾伟', contactName: '陆欣', contactPhone: '13800138101', contactEmail: 'luxin@scly.example', province: '上海市', city: '上海市', district: '浦东新区', address: '申江路 800 号', vehicleCount: 168, discountRate: 88, signedAt: '2025-01-10', contractStartAt: '2025-02-01', contractEndAt: '2028-01-31', status: 'active', remark: '重点物流车队客户。', createdAt: '2025-01-10T02:20:00.000Z' },
  { id: 'customer-002', customerCode: 'C000002', customerType: 'enterprise', customerName: '北京国科产业发展有限公司', shortName: '国科产业', unifiedSocialCreditCode: '91110108MA01H6QP7R', legalRepresentative: '宋岩', contactName: '何静', contactPhone: '010-87651234', contactEmail: 'hejing@gkcy.example', province: '北京市', city: '北京市', district: '海淀区', address: '中关村东路 66 号', vehicleCount: 42, discountRate: 95, signedAt: '2025-02-18', contractStartAt: '2025-03-01', contractEndAt: '2027-02-28', status: 'active', remark: '', createdAt: '2025-02-18T06:10:00.000Z' },
  { id: 'customer-003', customerCode: 'C000003', customerType: 'fleet', customerName: '深圳湾区城配运输有限公司', shortName: '湾区城配', unifiedSocialCreditCode: '91440300MA5G8Y2L6N', legalRepresentative: '梁峻', contactName: '郑琳', contactPhone: '13900139103', contactEmail: 'zhenglin@wqcp.example', province: '广东省', city: '深圳市', district: '宝安区', address: '航城大道 108 号', vehicleCount: 235, discountRate: 85, signedAt: '2025-03-08', contractStartAt: '2025-04-01', contractEndAt: '2028-03-31', status: 'active', remark: '', createdAt: '2025-03-08T03:40:00.000Z' },
  { id: 'customer-004', customerCode: 'C000004', customerType: 'enterprise', customerName: '杭州云创科技园管理有限公司', shortName: '云创科技园', unifiedSocialCreditCode: '91330108MA2C1R7K5P', legalRepresentative: '褚航', contactName: '叶青', contactPhone: '13700137104', contactEmail: '', province: '浙江省', city: '杭州市', district: '滨江区', address: '滨盛路 1777 号', vehicleCount: null, discountRate: 92.5, signedAt: '2025-04-21', contractStartAt: '2025-05-01', contractEndAt: '2027-04-30', status: 'pending', remark: '等待企业停车场改造完成。', createdAt: '2025-04-21T08:05:00.000Z' },
  { id: 'customer-005', customerCode: 'C000005', customerType: 'fleet', customerName: '南京金陵出租汽车服务有限公司', shortName: '金陵出租', unifiedSocialCreditCode: '91320104MA1Y5D9W3H', legalRepresentative: '杜晨', contactName: '陶颖', contactPhone: '025-86541230', contactEmail: 'taoying@jlcz.example', province: '江苏省', city: '南京市', district: '秦淮区', address: '大明路 168 号', vehicleCount: 520, discountRate: 82, signedAt: '2024-11-25', contractStartAt: '2025-01-01', contractEndAt: '2026-12-31', status: 'active', remark: '', createdAt: '2024-11-25T04:30:00.000Z' },
  { id: 'customer-006', customerCode: 'C000006', customerType: 'enterprise', customerName: '成都天府商务服务有限公司', shortName: '天府商务', unifiedSocialCreditCode: '91510100MA6D2V8T4M', legalRepresentative: '秦安', contactName: '潘涛', contactPhone: '13600136106', contactEmail: 'pantao@tfsw.example', province: '四川省', city: '成都市', district: '高新区', address: '天府五街 88 号', vehicleCount: 18, discountRate: 96, signedAt: '2024-09-20', contractStartAt: '2024-10-01', contractEndAt: '2027-09-30', status: 'active', remark: '', createdAt: '2024-09-20T09:10:00.000Z' },
  { id: 'customer-007', customerCode: 'C000007', customerType: 'fleet', customerName: '武汉江城环卫运输有限公司', shortName: '江城环运', unifiedSocialCreditCode: '91420100MA4M1P7B9Q', legalRepresentative: '胡越', contactName: '谢清', contactPhone: '13500135107', contactEmail: '', province: '湖北省', city: '武汉市', district: '洪山区', address: '珞喻路 355 号', vehicleCount: 96, discountRate: 90, signedAt: '2024-08-12', contractStartAt: '2024-09-01', contractEndAt: '2026-08-31', status: 'disabled', remark: '合同暂停，保留历史资料。', createdAt: '2024-08-12T01:45:00.000Z' },
  { id: 'customer-008', customerCode: 'C000008', customerType: 'enterprise', customerName: '西安长安智造产业有限公司', shortName: '长安智造', unifiedSocialCreditCode: '91610131MA6X3D8C7K', legalRepresentative: '贺磊', contactName: '方雪', contactPhone: '13400134108', contactEmail: 'fangxue@cazz.example', province: '陕西省', city: '西安市', district: '雁塔区', address: '锦业二路 72 号', vehicleCount: null, discountRate: 93, signedAt: '2025-05-23', contractStartAt: '2025-06-01', contractEndAt: '2028-05-31', status: 'pending', remark: '', createdAt: '2025-05-23T07:35:00.000Z' },
  { id: 'customer-009', customerCode: 'C000009', customerType: 'fleet', customerName: '重庆山城冷链运输有限公司', shortName: '山城冷链', unifiedSocialCreditCode: '91500107MA61J6UQ9A', legalRepresentative: '伍峰', contactName: '邱倩', contactPhone: '023-65431209', contactEmail: 'qiuqian@scll.example', province: '重庆市', city: '重庆市', district: '九龙坡区', address: '科城路 200 号', vehicleCount: 76, discountRate: 89, signedAt: '2024-12-06', contractStartAt: '2025-01-01', contractEndAt: '2027-12-31', status: 'active', remark: '', createdAt: '2024-12-06T05:25:00.000Z' },
  { id: 'customer-010', customerCode: 'C000010', customerType: 'enterprise', customerName: '苏州工业园区物业管理有限公司', shortName: '园区物业', unifiedSocialCreditCode: '91320594MA1P4C7F3W', legalRepresentative: '裴芮', contactName: '温俊', contactPhone: '13300133110', contactEmail: 'wenjun@yqwy.example', province: '江苏省', city: '苏州市', district: '工业园区', address: '星湖街 328 号', vehicleCount: 31, discountRate: 94, signedAt: '2025-06-14', contractStartAt: '2025-07-01', contractEndAt: '2028-06-30', status: 'active', remark: '', createdAt: '2025-06-14T02:55:00.000Z' },
  { id: 'customer-011', customerCode: 'C000011', customerType: 'fleet', customerName: '青岛海湾港口运输有限公司', shortName: '海湾港运', unifiedSocialCreditCode: '91370212MA3E6T9H8Q', legalRepresentative: '常海', contactName: '莫雨', contactPhone: '13200132111', contactEmail: 'moyu@hwgy.example', province: '山东省', city: '青岛市', district: '黄岛区', address: '港兴大道 182 号', vehicleCount: 142, discountRate: 87.5, signedAt: '2025-07-05', contractStartAt: '2025-08-01', contractEndAt: '2027-07-31', status: 'pending', remark: '', createdAt: '2025-07-05T06:15:00.000Z' },
  { id: 'customer-012', customerCode: 'C000012', customerType: 'enterprise', customerName: '厦门鹭岛商业运营有限公司', shortName: '鹭岛商运', unifiedSocialCreditCode: '91350203MA32Q8XK6D', legalRepresentative: '纪川', contactName: '罗洁', contactPhone: '13100131112', contactEmail: 'luojie@ldsy.example', province: '福建省', city: '厦门市', district: '思明区', address: '环岛东路 16 号', vehicleCount: 12, discountRate: 97, signedAt: '2024-06-30', contractStartAt: '2024-07-01', contractEndAt: '2026-06-30', status: 'disabled', remark: '', createdAt: '2024-06-30T03:25:00.000Z' },
]

export function createInitialCustomers(): Customer[] {
  return seeds.map((seed) => ({ ...seed, updatedAt: seed.createdAt }))
}

export function customerToFormValues(customer: Customer): CustomerFormValues {
  const {
    id: _id,
    customerCode: _customerCode,
    createdAt: _createdAt,
    updatedAt: _updatedAt,
    vehicleCount,
    discountRate,
    ...values
  } = customer
  return {
    ...values,
    vehicleCount: vehicleCount === null ? '' : String(vehicleCount),
    discountRate: String(discountRate),
  }
}

export function normalizeCustomerFormValues(values: CustomerFormValues): CustomerFormValues {
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, value.trim()]),
  ) as CustomerFormValues
}

export function customerFormValuesToInput(values: CustomerFormValues): CustomerInput {
  return {
    ...values,
    unifiedSocialCreditCode: values.unifiedSocialCreditCode.toUpperCase(),
    vehicleCount: values.vehicleCount === '' ? null : Number(values.vehicleCount),
    discountRate: Number(values.discountRate),
  }
}

export function validateCustomerFormValues(
  values: CustomerFormValues,
  customers: readonly Customer[],
  currentCustomerId?: string,
): CustomerValidationErrors {
  const errors: CustomerValidationErrors = {}
  const requiredFields: readonly (keyof CustomerFormValues)[] = [
    'customerType', 'customerName', 'shortName', 'unifiedSocialCreditCode',
    'legalRepresentative', 'contactName', 'contactPhone', 'address', 'signedAt',
    'contractStartAt', 'contractEndAt', 'discountRate', 'status',
  ]

  for (const field of requiredFields) {
    if (!values[field]) errors[field] = '此项为必填项'
  }

  if (values.contactPhone && !/^(?:1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/.test(values.contactPhone)) {
    errors.contactPhone = '请输入大陆手机号或带区号的固定电话'
  }
  if (values.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail)) {
    errors.contactEmail = '请输入有效的邮箱地址'
  }
  if (values.vehicleCount) {
    const vehicleCount = Number(values.vehicleCount)
    if (!Number.isFinite(vehicleCount) || !Number.isInteger(vehicleCount) || vehicleCount < 0) {
      errors.vehicleCount = '车辆数必须是非负整数'
    }
  }
  if (values.discountRate) {
    const discountRate = Number(values.discountRate)
    if (!Number.isFinite(discountRate) || discountRate < 0 || discountRate > 100) {
      errors.discountRate = '折扣率必须在 0% 到 100% 之间'
    }
  }
  for (const field of ['signedAt', 'contractStartAt', 'contractEndAt'] as const) {
    if (values[field] && !/^\d{4}-\d{2}-\d{2}$/.test(values[field])) {
      errors[field] = '日期格式必须为 YYYY-MM-DD'
    }
  }
  if (values.contractStartAt && values.contractEndAt && values.contractEndAt < values.contractStartAt) {
    errors.contractEndAt = '合同结束日期不能早于开始日期'
  }

  const creditCode = values.unifiedSocialCreditCode.toUpperCase()
  if (
    creditCode
    && customers.some((customer) => (
      customer.id !== currentCustomerId
      && customer.unifiedSocialCreditCode.toUpperCase() === creditCode
    ))
  ) {
    errors.unifiedSocialCreditCode = '统一社会信用代码已存在'
  }

  return errors
}

export function generateCustomerCode(customers: readonly Customer[]): string {
  const usedCodes = new Set(customers.map((customer) => customer.customerCode))
  const maxSuffix = customers.reduce((maximum, customer) => {
    const match = /^C(\d{6})$/.exec(customer.customerCode)
    return match ? Math.max(maximum, Number(match[1])) : maximum
  }, 0)
  let suffix = maxSuffix + 1
  let code = `C${String(suffix).padStart(6, '0')}`
  while (usedCodes.has(code)) {
    suffix += 1
    code = `C${String(suffix).padStart(6, '0')}`
  }
  return code
}

export function getCustomerTypeLabel(type: CustomerType): string {
  return customerTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getCustomerStatusLabel(status: CustomerStatus): string {
  return customerStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatDiscountRate(discountRate: number): string {
  return `${discountRate.toLocaleString('zh-CN', { maximumFractionDigits: 2 })}%`
}
