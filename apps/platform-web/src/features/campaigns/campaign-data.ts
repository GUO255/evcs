export type CampaignType = 'stored-value' | 'coupon'
export type CampaignStatus = 'draft' | 'published' | 'offline'
export type CampaignDisplayStatus = CampaignStatus | 'ended'

export interface Campaign {
  id: string
  campaignCode: string
  imageUrl: string
  type: CampaignType
  name: string
  ruleDescription: string
  targetAudience: string
  startDate: string
  endDate: string
  budget: number
  participantCount: number
  description: string
  status: CampaignStatus
  createdAt: string
  updatedAt: string
}

export type CampaignInput = Pick<
  Campaign,
  'imageUrl' | 'type' | 'name' | 'ruleDescription' | 'targetAudience' | 'startDate' | 'endDate' | 'description'
> & {
  budget: string
}

export type CampaignValidationErrors = Partial<Record<keyof CampaignInput, string>>

export const campaignTypeOptions = [
  { value: 'stored-value', label: '储值活动' },
  { value: 'coupon', label: '优惠券活动' },
] as const satisfies readonly { value: CampaignType; label: string }[]

export const campaignStatusOptions = [
  { value: 'draft', label: '草稿' },
  { value: 'published', label: '已上架' },
  { value: 'offline', label: '已下架' },
  { value: 'ended', label: '已结束' },
] as const satisfies readonly { value: CampaignDisplayStatus; label: string }[]

export function createEmptyCampaignInput(type: CampaignType): CampaignInput {
  return {
    imageUrl: '',
    type,
    name: '',
    ruleDescription: '',
    targetAudience: '全部注册用户',
    startDate: '',
    endDate: '',
    budget: '',
    description: '',
  }
}

const seeds: readonly Campaign[] = [
  { id: 'campaign-001', campaignCode: 'A20260001', imageUrl: '/campaign-images/summer-recharge.jpg', type: 'stored-value', name: '夏日畅充储值礼', ruleDescription: '单笔储值满 500 元赠 50 元', targetAudience: '全部注册用户', startDate: '2026-07-01', endDate: '2026-08-31', budget: 200000, participantCount: 1836, description: '暑期出行储值促销活动。', status: 'published', createdAt: '2026-06-15T02:30:00.000Z', updatedAt: '2026-06-28T06:20:00.000Z' },
  { id: 'campaign-002', campaignCode: 'A20260002', imageUrl: '/campaign-images/summer-recharge.jpg', type: 'stored-value', name: '车队客户月度返充', ruleDescription: '当月累计储值满 5000 元返 300 元', targetAudience: '签约车队客户', startDate: '2026-08-01', endDate: '2026-10-31', budget: 500000, participantCount: 0, description: '面向车队客户的阶梯储值活动。', status: 'draft', createdAt: '2026-07-05T03:10:00.000Z', updatedAt: '2026-07-05T03:10:00.000Z' },
  { id: 'campaign-003', campaignCode: 'A20260003', imageUrl: '/campaign-images/new-user-recharge.jpg', type: 'stored-value', name: '新用户首储加赠', ruleDescription: '首次储值满 100 元赠 20 元', targetAudience: '注册 30 天内且未储值用户', startDate: '2026-05-01', endDate: '2026-06-30', budget: 120000, participantCount: 4268, description: '提升新用户首储转化。', status: 'published', createdAt: '2026-04-18T08:00:00.000Z', updatedAt: '2026-04-25T09:15:00.000Z' },
  { id: 'campaign-004', campaignCode: 'A20260004', imageUrl: '/campaign-images/summer-recharge.jpg', type: 'stored-value', name: '周末储值翻倍礼', ruleDescription: '周末储值满 300 元赠 30 元', targetAudience: '近 90 天有充电记录用户', startDate: '2026-06-01', endDate: '2026-07-31', budget: 180000, participantCount: 956, description: '周末短周期储值激励。', status: 'offline', createdAt: '2026-05-22T01:40:00.000Z', updatedAt: '2026-07-08T04:35:00.000Z' },
  { id: 'campaign-005', campaignCode: 'A20260005', imageUrl: '/campaign-images/summer-recharge.jpg', type: 'stored-value', name: '企业客户季度储值礼', ruleDescription: '季度累计储值满 20000 元赠 1500 元', targetAudience: '签约企业客户', startDate: '2026-07-01', endDate: '2026-09-30', budget: 800000, participantCount: 62, description: '企业客户季度专项活动。', status: 'published', createdAt: '2026-06-20T05:25:00.000Z', updatedAt: '2026-06-29T07:45:00.000Z' },
  { id: 'campaign-006', campaignCode: 'A20260006', imageUrl: '/campaign-images/summer-recharge.jpg', type: 'stored-value', name: '国庆储值预热', ruleDescription: '储值满 1000 元赠 120 元', targetAudience: '全部注册用户', startDate: '2026-09-20', endDate: '2026-10-10', budget: 350000, participantCount: 0, description: '国庆出行储值活动预案。', status: 'draft', createdAt: '2026-07-12T02:00:00.000Z', updatedAt: '2026-07-12T02:00:00.000Z' },
  { id: 'campaign-007', campaignCode: 'A20260007', imageUrl: '/campaign-images/summer-night-coupon.jpg', type: 'coupon', name: '夏夜充电立减券', ruleDescription: '满 30 元减 8 元，每人限领 2 张', targetAudience: '全部注册用户', startDate: '2026-07-01', endDate: '2026-08-15', budget: 160000, participantCount: 7280, description: '晚间充电时段引流券。', status: 'published', createdAt: '2026-06-18T03:30:00.000Z', updatedAt: '2026-06-27T02:10:00.000Z' },
  { id: 'campaign-008', campaignCode: 'A20260008', imageUrl: '/campaign-images/member-coupon.jpg', type: 'coupon', name: '沉默用户唤醒券', ruleDescription: '满 20 元减 10 元，领取后 7 天有效', targetAudience: '连续 60 天未充电用户', startDate: '2026-08-01', endDate: '2026-09-30', budget: 100000, participantCount: 0, description: '定向召回沉默用户。', status: 'draft', createdAt: '2026-07-09T06:40:00.000Z', updatedAt: '2026-07-09T06:40:00.000Z' },
  { id: 'campaign-009', campaignCode: 'A20260009', imageUrl: '/campaign-images/summer-night-coupon.jpg', type: 'coupon', name: '端午出行券', ruleDescription: '满 50 元减 12 元，每人限领 1 张', targetAudience: '全部注册用户', startDate: '2026-06-10', endDate: '2026-06-25', budget: 90000, participantCount: 5326, description: '端午假期充电优惠。', status: 'published', createdAt: '2026-05-25T08:15:00.000Z', updatedAt: '2026-06-05T01:50:00.000Z' },
  { id: 'campaign-010', campaignCode: 'A20260010', imageUrl: '/campaign-images/member-coupon.jpg', type: 'coupon', name: '会员专享满减券', ruleDescription: '满 80 元减 20 元，每月限领 1 张', targetAudience: '有效会员', startDate: '2026-07-01', endDate: '2026-12-31', budget: 360000, participantCount: 2450, description: '会员长期权益券。', status: 'published', createdAt: '2026-06-12T02:25:00.000Z', updatedAt: '2026-06-26T03:05:00.000Z' },
  { id: 'campaign-011', campaignCode: 'A20260011', imageUrl: '/campaign-images/new-user-recharge.jpg', type: 'coupon', name: '新用户首充券', ruleDescription: '首笔充电满 20 元减 15 元', targetAudience: '注册 7 天内未首充用户', startDate: '2026-05-01', endDate: '2026-07-31', budget: 200000, participantCount: 3812, description: '降低新用户首充门槛。', status: 'offline', createdAt: '2026-04-20T07:35:00.000Z', updatedAt: '2026-07-02T06:55:00.000Z' },
  { id: 'campaign-012', campaignCode: 'A20260012', imageUrl: '/campaign-images/summer-night-coupon.jpg', type: 'coupon', name: '国庆高速沿线券', ruleDescription: '指定场站满 60 元减 15 元', targetAudience: '全部注册用户', startDate: '2026-09-25', endDate: '2026-10-08', budget: 280000, participantCount: 0, description: '国庆高速沿线重点场站引流。', status: 'draft', createdAt: '2026-07-13T04:20:00.000Z', updatedAt: '2026-07-13T04:20:00.000Z' },
]

export function createInitialCampaigns(): Campaign[] {
  return seeds.map((campaign) => ({ ...campaign }))
}

export function campaignToInput(campaign: Campaign): CampaignInput {
  return {
    imageUrl: campaign.imageUrl,
    type: campaign.type,
    name: campaign.name,
    ruleDescription: campaign.ruleDescription,
    targetAudience: campaign.targetAudience,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    budget: String(campaign.budget),
    description: campaign.description,
  }
}

export function normalizeCampaignInput(input: CampaignInput): CampaignInput {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [key, value.trim()]),
  ) as CampaignInput
}

export function validateCampaignInput(input: CampaignInput): CampaignValidationErrors {
  const errors: CampaignValidationErrors = {}
  const requiredFields: readonly (keyof CampaignInput)[] = [
    'imageUrl', 'type', 'name', 'ruleDescription', 'targetAudience', 'startDate', 'endDate', 'budget',
  ]
  for (const field of requiredFields) {
    if (!input[field]) errors[field] = '此项为必填项'
  }

  const budget = Number(input.budget)
  if (input.budget && (!Number.isFinite(budget) || budget < 0)) {
    errors.budget = '活动预算必须是不小于 0 的金额'
  }
  for (const field of ['startDate', 'endDate'] as const) {
    if (input[field] && !/^\d{4}-\d{2}-\d{2}$/.test(input[field])) {
      errors[field] = '日期格式必须为 YYYY-MM-DD'
    }
  }
  if (input.startDate && input.endDate && input.endDate < input.startDate) {
    errors.endDate = '结束日期不能早于开始日期'
  }
  return errors
}

export function generateCampaignCode(campaigns: readonly Campaign[]): string {
  const year = new Date().getFullYear()
  const prefix = `A${year}`
  const maximum = campaigns.reduce((currentMaximum, campaign) => {
    const match = new RegExp(`^${prefix}(\\d{4})$`).exec(campaign.campaignCode)
    return match ? Math.max(currentMaximum, Number(match[1])) : currentMaximum
  }, 0)
  return `${prefix}${String(maximum + 1).padStart(4, '0')}`
}

export function getCampaignDisplayStatus(campaign: Campaign, today = getTodayCalendarDate()): CampaignDisplayStatus {
  return campaign.endDate < today ? 'ended' : campaign.status
}

export function canEditCampaign(campaign: Campaign): boolean {
  const status = getCampaignDisplayStatus(campaign)
  return status === 'draft' || status === 'offline'
}

export function canPublishCampaign(campaign: Campaign): boolean {
  const status = getCampaignDisplayStatus(campaign)
  return status === 'draft' || status === 'offline'
}

export function canTakeCampaignOffline(campaign: Campaign): boolean {
  return getCampaignDisplayStatus(campaign) === 'published'
}

export function canDeleteCampaign(campaign: Campaign): boolean {
  return getCampaignDisplayStatus(campaign) !== 'published'
}

export function getCampaignTypeLabel(type: CampaignType): string {
  return campaignTypeOptions.find((option) => option.value === type)?.label ?? type
}

export function getCampaignStatusLabel(status: CampaignDisplayStatus): string {
  return campaignStatusOptions.find((option) => option.value === status)?.label ?? status
}

export function formatCampaignBudget(value: number): string {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(value)
}

function getTodayCalendarDate(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
