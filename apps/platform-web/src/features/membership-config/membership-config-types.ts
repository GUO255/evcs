export type MembershipRecordStatus = 'enabled' | 'disabled'

export type MembershipProductType = 'auto-renew' | 'one-time'

export type MembershipBenefitIcon = 'wallet' | 'ticket' | 'clock' | 'headset'

export interface MembershipProduct {
  id: string
  imageUrl: string
  name: string
  type: MembershipProductType
  salePrice: number
  originalPrice: number
  renewalPrice: number
  durationDays: number
  marketingLabel: string
  status: MembershipRecordStatus
  sortOrder: number
}

export type MembershipProductInput = Omit<MembershipProduct, 'id' | 'sortOrder'>

export interface MembershipBenefit {
  id: string
  name: string
  icon: MembershipBenefitIcon
  summary: string
  description: string
  status: MembershipRecordStatus
  sortOrder: number
}

export type MembershipBenefitInput = Omit<MembershipBenefit, 'id' | 'sortOrder'>

export interface MembershipStationPrice {
  id: string
  city: string
  stationName: string
  originalPrice: number
  memberPrice: number
  status: MembershipRecordStatus
  sortOrder: number
}

export type MembershipStationPriceInput = Omit<
  MembershipStationPrice,
  'id' | 'sortOrder'
>
