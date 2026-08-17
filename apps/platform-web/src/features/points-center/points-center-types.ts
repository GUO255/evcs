export type PointsProductType = 'physical' | 'virtual'
export type PointsProductStatus = 'enabled' | 'disabled'

export interface PointsProduct {
  id: string
  imageUrl: string
  name: string
  type: PointsProductType
  pointsCost: number
  referenceValueCents: number
  stock: number
  perUserLimit: number
  description: string
  status: PointsProductStatus
  sortOrder: number
}

export type PointsProductInput = Omit<PointsProduct, 'id' | 'sortOrder'>
