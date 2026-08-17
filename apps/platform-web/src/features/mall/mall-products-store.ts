import { useSyncExternalStore } from 'react'

import { initialMallProducts } from './mall-data'
import type {
  MallProduct,
  MallProductInput,
  MallProductStatus,
} from './mall-types'

type MoveDirection = 'up' | 'down'

let products: readonly MallProduct[] = initialMallProducts.map((product, index) => ({
  ...product,
  sortOrder: index + 1,
}))
const listeners = new Set<() => void>()

function emitChange(nextProducts: readonly MallProduct[]) {
  products = nextProducts
  listeners.forEach((listener) => listener())
}

function normalizeSortOrder(records: readonly MallProduct[]) {
  return records.map((record, index) => ({ ...record, sortOrder: index + 1 }))
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMallProducts(): readonly MallProduct[] {
  return useSyncExternalStore(subscribe, () => products, () => products)
}

export function createMallProduct(input: MallProductInput) {
  emitChange([
    ...products,
    {
      id: crypto.randomUUID(),
      ...input,
      salesCount: 0,
      sortOrder: products.length + 1,
    },
  ])
}

export function updateMallProduct(id: string, input: MallProductInput) {
  emitChange(products.map((product) =>
    product.id === id
      ? {
          id: product.id,
          ...input,
          salesCount: product.salesCount,
          sortOrder: product.sortOrder,
        }
      : product,
  ))
}

export function toggleMallProduct(id: string) {
  const toggledStatus = (status: MallProductStatus): MallProductStatus =>
    status === 'enabled' ? 'disabled' : 'enabled'

  emitChange(products.map((product) =>
    product.id === id ? { ...product, status: toggledStatus(product.status) } : product,
  ))
}

export function moveMallProduct(id: string, direction: MoveDirection) {
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

export function setMallProductSortOrder(id: string, sortOrder: number) {
  const currentIndex = products.findIndex((product) => product.id === id)
  const destinationIndex = sortOrder - 1
  if (
    currentIndex < 0
    || destinationIndex < 0
    || destinationIndex >= products.length
    || destinationIndex === currentIndex
  ) return

  const nextProducts = [...products]
  const [current] = nextProducts.splice(currentIndex, 1)
  if (!current) return
  nextProducts.splice(destinationIndex, 0, current)
  emitChange(normalizeSortOrder(nextProducts))
}

export function deleteMallProduct(id: string) {
  emitChange(normalizeSortOrder(products.filter((product) => product.id !== id)))
}
