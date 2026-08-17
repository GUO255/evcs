import { useSyncExternalStore } from 'react'

import { initialPointsProducts } from './points-center-data'
import type {
  PointsProduct,
  PointsProductInput,
  PointsProductStatus,
} from './points-center-types'

type MoveDirection = 'up' | 'down'

let products: readonly PointsProduct[] = initialPointsProducts.map((product) => ({ ...product }))
const listeners = new Set<() => void>()

function emitChange(nextProducts: readonly PointsProduct[]) {
  products = nextProducts
  listeners.forEach((listener) => listener())
}

function normalizeSortOrder(records: readonly PointsProduct[]) {
  return records.map((record, index) => ({ ...record, sortOrder: index + 1 }))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function usePointsProducts(): readonly PointsProduct[] {
  return useSyncExternalStore(subscribe, () => products, () => products)
}

export function createPointsProduct(input: PointsProductInput) {
  emitChange([
    ...products,
    { id: crypto.randomUUID(), ...input, sortOrder: products.length + 1 },
  ])
}

export function updatePointsProduct(id: string, input: PointsProductInput) {
  emitChange(products.map((product) =>
    product.id === id ? { ...product, ...input } : product,
  ))
}

export function togglePointsProduct(id: string) {
  const toggledStatus = (status: PointsProductStatus): PointsProductStatus =>
    status === 'enabled' ? 'disabled' : 'enabled'

  emitChange(products.map((product) =>
    product.id === id ? { ...product, status: toggledStatus(product.status) } : product,
  ))
}

export function movePointsProduct(id: string, direction: MoveDirection) {
  const currentIndex = products.findIndex((product) => product.id === id)
  const destinationIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= products.length) return

  const nextProducts = [...products]
  const current = nextProducts[currentIndex]
  const destination = nextProducts[destinationIndex]
  if (!current || !destination) return
  nextProducts[currentIndex] = destination
  nextProducts[destinationIndex] = current
  emitChange(normalizeSortOrder(nextProducts))
}

export function deletePointsProduct(id: string) {
  emitChange(normalizeSortOrder(products.filter((product) => product.id !== id)))
}
