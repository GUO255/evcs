import type {
  StoredValuePreset,
  StoredValueSettings,
} from './stored-value-config-types'

export const initialStoredValueSettings: StoredValueSettings = {
  enabled: true,
  allowCustomAmount: true,
  minimumAmountCents: 1_000,
  maximumAmountCents: 200_000,
  balanceValidity: 'permanent',
  refundPolicy: 'principal-only',
  customerNotice: '储值余额可用于平台内充电消费，赠送金额不支持提现或退款。',
}

export const initialStoredValuePresets: readonly StoredValuePreset[] = [
  {
    id: 'stored-value-preset-001',
    imageUrl: '/product-images/stored-value-card.jpg',
    name: '轻享储值',
    rechargeAmountCents: 5_000,
    bonusAmountCents: 0,
    marketingLabel: '灵活补能',
    status: 'enabled',
    sortOrder: 1,
  },
  {
    id: 'stored-value-preset-002',
    imageUrl: '/product-images/stored-value-card.jpg',
    name: '畅充储值',
    rechargeAmountCents: 10_000,
    bonusAmountCents: 500,
    marketingLabel: '推荐',
    status: 'enabled',
    sortOrder: 2,
  },
  {
    id: 'stored-value-preset-003',
    imageUrl: '/product-images/stored-value-card.jpg',
    name: '高频储值',
    rechargeAmountCents: 30_000,
    bonusAmountCents: 3_000,
    marketingLabel: '赠 ¥30',
    status: 'enabled',
    sortOrder: 3,
  },
  {
    id: 'stored-value-preset-004',
    imageUrl: '/product-images/stored-value-card.jpg',
    name: '大额储值',
    rechargeAmountCents: 50_000,
    bonusAmountCents: 6_000,
    marketingLabel: '最高优惠',
    status: 'disabled',
    sortOrder: 4,
  },
]

export const storedValueCurrencyFormatter = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
  minimumFractionDigits: 2,
})

export function formatStoredValueCents(cents: number): string {
  return storedValueCurrencyFormatter.format(cents / 100)
}
