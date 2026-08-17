export type StoredValuePresetStatus = 'enabled' | 'disabled'
export type StoredValueBalanceValidity = 'permanent' | 'one-year' | 'two-years'
export type StoredValueRefundPolicy = 'principal-only' | 'unused-balance'

export interface StoredValuePreset {
  id: string
  imageUrl: string
  name: string
  rechargeAmountCents: number
  bonusAmountCents: number
  marketingLabel: string
  status: StoredValuePresetStatus
  sortOrder: number
}

export type StoredValuePresetInput = Omit<StoredValuePreset, 'id' | 'sortOrder'>

export interface StoredValueSettings {
  enabled: boolean
  allowCustomAmount: boolean
  minimumAmountCents: number
  maximumAmountCents: number
  balanceValidity: StoredValueBalanceValidity
  refundPolicy: StoredValueRefundPolicy
  customerNotice: string
}
