export type MerchantStatus = 'active' | 'pending' | 'disabled'

export interface Merchant {
  id: string
  merchantCode: string
  companyName: string
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
  signedAt: string
  contractStartAt: string
  contractEndAt: string
  status: MerchantStatus
  remark: string
  createdAt: string
  updatedAt: string
}

export type MerchantInput = Omit<Merchant, 'id' | 'merchantCode' | 'createdAt' | 'updatedAt'>

export type MerchantValidationErrors = Partial<Record<keyof MerchantInput, string>>

export const merchantStatusOptions = [
  { value: 'active', label: '合作中' },
  { value: 'pending', label: '待生效' },
  { value: 'disabled', label: '已停用' },
] as const satisfies readonly { value: MerchantStatus; label: string }[]

export const emptyMerchantInput: MerchantInput = {
  companyName: '',
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
  signedAt: '',
  contractStartAt: '',
  contractEndAt: '',
  status: 'active',
  remark: '',
}

interface MerchantSeed extends MerchantInput {
  id: string
  merchantCode: string
  createdAt: string
}

const seeds: readonly MerchantSeed[] = [
  { id: 'merchant-001', merchantCode: 'M000001', companyName: '上海星链充电科技有限公司', shortName: '星链充电', unifiedSocialCreditCode: '91310000MA1FL8XQ2P', legalRepresentative: '周启明', contactName: '陈静', contactPhone: '13800138001', contactEmail: 'chenjing@xinglian.example', province: '上海市', city: '上海市', district: '浦东新区', address: '张江路 88 号', signedAt: '2025-01-08', contractStartAt: '2025-02-01', contractEndAt: '2028-01-31', status: 'active', remark: '华东区域重点合作商户。', createdAt: '2025-01-08T02:30:00.000Z' },
  { id: 'merchant-002', merchantCode: 'M000002', companyName: '北京北辰新能源服务有限公司', shortName: '北辰能源', unifiedSocialCreditCode: '91110105MA01K7RT6C', legalRepresentative: '韩松', contactName: '赵琳', contactPhone: '010-87654321', contactEmail: 'zhaolin@beichen.example', province: '北京市', city: '北京市', district: '朝阳区', address: '望京东路 9 号', signedAt: '2025-02-12', contractStartAt: '2025-03-01', contractEndAt: '2027-02-28', status: 'active', remark: '', createdAt: '2025-02-12T06:20:00.000Z' },
  { id: 'merchant-003', merchantCode: 'M000003', companyName: '深圳前海绿能交通有限公司', shortName: '前海绿能', unifiedSocialCreditCode: '91440300MA5F2YLM7J', legalRepresentative: '许卓', contactName: '方敏', contactPhone: '13900139003', contactEmail: 'fangmin@qhln.example', province: '广东省', city: '深圳市', district: '南山区', address: '前海大道 108 号', signedAt: '2025-03-06', contractStartAt: '2025-04-01', contractEndAt: '2028-03-31', status: 'active', remark: '', createdAt: '2025-03-06T03:15:00.000Z' },
  { id: 'merchant-004', merchantCode: 'M000004', companyName: '杭州云栖智慧能源有限公司', shortName: '云栖能源', unifiedSocialCreditCode: '91330108MA2B0QKP4E', legalRepresentative: '沈一帆', contactName: '吴晓', contactPhone: '13700137004', contactEmail: '', province: '浙江省', city: '杭州市', district: '滨江区', address: '江南大道 588 号', signedAt: '2025-04-18', contractStartAt: '2025-05-01', contractEndAt: '2027-04-30', status: 'pending', remark: '等待首批场站验收。', createdAt: '2025-04-18T08:10:00.000Z' },
  { id: 'merchant-005', merchantCode: 'M000005', companyName: '南京金陵电动出行有限公司', shortName: '金陵出行', unifiedSocialCreditCode: '91320115MA1W4K8D3H', legalRepresentative: '叶晨', contactName: '郭颖', contactPhone: '025-86543210', contactEmail: 'guoying@jlcx.example', province: '江苏省', city: '南京市', district: '江宁区', address: '双龙大道 1698 号', signedAt: '2024-11-22', contractStartAt: '2025-01-01', contractEndAt: '2026-12-31', status: 'active', remark: '', createdAt: '2024-11-22T04:40:00.000Z' },
  { id: 'merchant-006', merchantCode: 'M000006', companyName: '成都蓉城充换电服务有限公司', shortName: '蓉城充换电', unifiedSocialCreditCode: '91510100MA6C7V9T5N', legalRepresentative: '罗安', contactName: '蒋涛', contactPhone: '13600136006', contactEmail: 'jiangtao@rongcheng.example', province: '四川省', city: '成都市', district: '高新区', address: '天府四街 66 号', signedAt: '2024-09-15', contractStartAt: '2024-10-01', contractEndAt: '2027-09-30', status: 'active', remark: '', createdAt: '2024-09-15T09:00:00.000Z' },
  { id: 'merchant-007', merchantCode: 'M000007', companyName: '武汉江城绿色交通科技有限公司', shortName: '江城绿交', unifiedSocialCreditCode: '91420100MA4L0P6B8R', legalRepresentative: '唐越', contactName: '何清', contactPhone: '13500135007', contactEmail: '', province: '湖北省', city: '武汉市', district: '洪山区', address: '关山大道 355 号', signedAt: '2024-08-09', contractStartAt: '2024-09-01', contractEndAt: '2026-08-31', status: 'disabled', remark: '合作暂停，保留历史资料。', createdAt: '2024-08-09T01:50:00.000Z' },
  { id: 'merchant-008', merchantCode: 'M000008', companyName: '西安长安低碳科技有限公司', shortName: '长安低碳', unifiedSocialCreditCode: '91610131MA6W2D7C9K', legalRepresentative: '高磊', contactName: '马雪', contactPhone: '13400134008', contactEmail: 'maxue@caditan.example', province: '陕西省', city: '西安市', district: '雁塔区', address: '科技二路 72 号', signedAt: '2025-05-20', contractStartAt: '2025-06-01', contractEndAt: '2028-05-31', status: 'pending', remark: '', createdAt: '2025-05-20T07:25:00.000Z' },
  { id: 'merchant-009', merchantCode: 'M000009', companyName: '重庆山城能源管理有限公司', shortName: '山城能源', unifiedSocialCreditCode: '91500107MA60J5UQ8A', legalRepresentative: '邓峰', contactName: '熊倩', contactPhone: '023-65432109', contactEmail: 'xiongqian@scny.example', province: '重庆市', city: '重庆市', district: '九龙坡区', address: '科园一路 200 号', signedAt: '2024-12-03', contractStartAt: '2025-01-01', contractEndAt: '2027-12-31', status: 'active', remark: '', createdAt: '2024-12-03T05:35:00.000Z' },
  { id: 'merchant-010', merchantCode: 'M000010', companyName: '苏州园区智慧停车有限公司', shortName: '园区智停', unifiedSocialCreditCode: '91320594MA1N3C6F2W', legalRepresentative: '林芮', contactName: '陶俊', contactPhone: '13300133010', contactEmail: 'taojun@yqzt.example', province: '江苏省', city: '苏州市', district: '工业园区', address: '星湖街 328 号', signedAt: '2025-06-11', contractStartAt: '2025-07-01', contractEndAt: '2028-06-30', status: 'active', remark: '', createdAt: '2025-06-11T02:45:00.000Z' },
  { id: 'merchant-011', merchantCode: 'M000011', companyName: '青岛海湾新能源有限公司', shortName: '海湾新能源', unifiedSocialCreditCode: '91370212MA3D5T8H7Q', legalRepresentative: '白海', contactName: '宋雨', contactPhone: '13200132011', contactEmail: 'songyu@haiwan.example', province: '山东省', city: '青岛市', district: '崂山区', address: '海尔路 182 号', signedAt: '2025-07-02', contractStartAt: '2025-08-01', contractEndAt: '2027-07-31', status: 'pending', remark: '', createdAt: '2025-07-02T06:00:00.000Z' },
  { id: 'merchant-012', merchantCode: 'M000012', companyName: '厦门鹭岛电力服务有限公司', shortName: '鹭岛电力', unifiedSocialCreditCode: '91350203MA31Q9XK5D', legalRepresentative: '范川', contactName: '卢洁', contactPhone: '13100131012', contactEmail: 'lujie@lddl.example', province: '福建省', city: '厦门市', district: '思明区', address: '软件园二期观日路 16 号', signedAt: '2024-06-28', contractStartAt: '2024-07-01', contractEndAt: '2026-06-30', status: 'disabled', remark: '', createdAt: '2024-06-28T03:20:00.000Z' },
]

export function createInitialMerchants(): Merchant[] {
  return seeds.map((seed) => ({ ...seed, updatedAt: seed.createdAt }))
}

export function normalizeMerchantInput(input: MerchantInput): MerchantInput {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, typeof value === 'string' ? value.trim() : value]),
  ) as MerchantInput
}

export function validateMerchantInput(
  input: MerchantInput,
  merchants: readonly Merchant[],
  currentMerchantId?: string,
): MerchantValidationErrors {
  const errors: MerchantValidationErrors = {}
  const requiredFields: readonly (keyof MerchantInput)[] = [
    'companyName', 'shortName', 'unifiedSocialCreditCode', 'legalRepresentative',
    'contactName', 'contactPhone', 'address', 'signedAt', 'contractStartAt',
    'contractEndAt', 'status',
  ]

  for (const field of requiredFields) {
    if (!input[field]) errors[field] = '此项为必填项'
  }

  if (input.contactPhone && !/^(?:1[3-9]\d{9}|0\d{2,3}-?\d{7,8})$/.test(input.contactPhone)) {
    errors.contactPhone = '请输入大陆手机号或带区号的固定电话'
  }
  if (input.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.contactEmail)) {
    errors.contactEmail = '请输入有效的邮箱地址'
  }
  if (input.contractStartAt && input.contractEndAt && input.contractEndAt < input.contractStartAt) {
    errors.contractEndAt = '合同结束日期不能早于开始日期'
  }
  const creditCode = input.unifiedSocialCreditCode.toUpperCase()
  if (
    creditCode
    && merchants.some((merchant) => (
      merchant.id !== currentMerchantId
      && merchant.unifiedSocialCreditCode.toUpperCase() === creditCode
    ))
  ) {
    errors.unifiedSocialCreditCode = '统一社会信用代码已存在'
  }

  return errors
}

export function generateMerchantCode(merchants: readonly Merchant[]): string {
  const usedCodes = new Set(merchants.map((merchant) => merchant.merchantCode))
  const maxSuffix = merchants.reduce((maximum, merchant) => {
    const match = /^M(\d{6})$/.exec(merchant.merchantCode)
    return match ? Math.max(maximum, Number(match[1])) : maximum
  }, 0)
  let suffix = maxSuffix + 1
  let code = `M${String(suffix).padStart(6, '0')}`
  while (usedCodes.has(code)) {
    suffix += 1
    code = `M${String(suffix).padStart(6, '0')}`
  }
  return code
}

export function getMerchantStatusLabel(status: MerchantStatus): string {
  return merchantStatusOptions.find((option) => option.value === status)?.label ?? status
}
