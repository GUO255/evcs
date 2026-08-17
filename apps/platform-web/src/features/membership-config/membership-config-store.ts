import { useSyncExternalStore } from 'react'

import {
  initialMembershipBenefits,
  initialMembershipProducts,
  initialMembershipStationPrices,
} from './membership-config-data'
import type {
  MembershipBenefit,
  MembershipBenefitInput,
  MembershipProduct,
  MembershipProductInput,
  MembershipRecordStatus,
  MembershipStationPrice,
  MembershipStationPriceInput,
} from './membership-config-types'

type MoveDirection = 'up' | 'down'

interface MembershipConfigSnapshot {
  products: readonly MembershipProduct[]
  benefits: readonly MembershipBenefit[]
  stationPrices: readonly MembershipStationPrice[]
}

let snapshot: MembershipConfigSnapshot = {
  products: initialMembershipProducts.map((record) => ({ ...record })),
  benefits: initialMembershipBenefits.map((record) => ({ ...record })),
  stationPrices: initialMembershipStationPrices.map((record) => ({ ...record })),
}
const listeners = new Set<() => void>()

function emitChange(nextSnapshot: MembershipConfigSnapshot) {
  snapshot = nextSnapshot
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function normalizeSortOrder<T extends { sortOrder: number }>(records: readonly T[]) {
  return records.map((record, index) => ({ ...record, sortOrder: index + 1 }))
}

function moveRecord<T extends { id: string; sortOrder: number }>(
  records: readonly T[],
  id: string,
  direction: MoveDirection,
) {
  const currentIndex = records.findIndex((record) => record.id === id)
  const destinationIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (currentIndex < 0 || destinationIndex < 0 || destinationIndex >= records.length) {
    return records
  }

  const nextRecords = [...records]
  const current = nextRecords[currentIndex]
  const destination = nextRecords[destinationIndex]
  if (!current || !destination) return records
  nextRecords[currentIndex] = destination
  nextRecords[destinationIndex] = current
  return normalizeSortOrder(nextRecords)
}

function toggledStatus(status: MembershipRecordStatus): MembershipRecordStatus {
  return status === 'enabled' ? 'disabled' : 'enabled'
}

export function useMembershipConfig() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function createMembershipProduct(input: MembershipProductInput) {
  emitChange({
    ...snapshot,
    products: [
      ...snapshot.products,
      { id: crypto.randomUUID(), ...input, sortOrder: snapshot.products.length + 1 },
    ],
  })
}

export function updateMembershipProduct(id: string, input: MembershipProductInput) {
  emitChange({
    ...snapshot,
    products: snapshot.products.map((record) =>
      record.id === id ? { ...record, ...input } : record),
  })
}

export function toggleMembershipProduct(id: string) {
  emitChange({
    ...snapshot,
    products: snapshot.products.map((record) =>
      record.id === id ? { ...record, status: toggledStatus(record.status) } : record),
  })
}

export function moveMembershipProduct(id: string, direction: MoveDirection) {
  emitChange({ ...snapshot, products: moveRecord(snapshot.products, id, direction) })
}

export function deleteMembershipProduct(id: string) {
  emitChange({
    ...snapshot,
    products: normalizeSortOrder(snapshot.products.filter((record) => record.id !== id)),
  })
}

export function createMembershipBenefit(input: MembershipBenefitInput) {
  emitChange({
    ...snapshot,
    benefits: [
      ...snapshot.benefits,
      { id: crypto.randomUUID(), ...input, sortOrder: snapshot.benefits.length + 1 },
    ],
  })
}

export function updateMembershipBenefit(id: string, input: MembershipBenefitInput) {
  emitChange({
    ...snapshot,
    benefits: snapshot.benefits.map((record) =>
      record.id === id ? { ...record, ...input } : record),
  })
}

export function toggleMembershipBenefit(id: string) {
  emitChange({
    ...snapshot,
    benefits: snapshot.benefits.map((record) =>
      record.id === id ? { ...record, status: toggledStatus(record.status) } : record),
  })
}

export function moveMembershipBenefit(id: string, direction: MoveDirection) {
  emitChange({ ...snapshot, benefits: moveRecord(snapshot.benefits, id, direction) })
}

export function deleteMembershipBenefit(id: string) {
  emitChange({
    ...snapshot,
    benefits: normalizeSortOrder(snapshot.benefits.filter((record) => record.id !== id)),
  })
}

export function createMembershipStationPrice(input: MembershipStationPriceInput) {
  emitChange({
    ...snapshot,
    stationPrices: [
      ...snapshot.stationPrices,
      { id: crypto.randomUUID(), ...input, sortOrder: snapshot.stationPrices.length + 1 },
    ],
  })
}

export function updateMembershipStationPrice(
  id: string,
  input: MembershipStationPriceInput,
) {
  emitChange({
    ...snapshot,
    stationPrices: snapshot.stationPrices.map((record) =>
      record.id === id ? { ...record, ...input } : record),
  })
}

export function toggleMembershipStationPrice(id: string) {
  emitChange({
    ...snapshot,
    stationPrices: snapshot.stationPrices.map((record) =>
      record.id === id ? { ...record, status: toggledStatus(record.status) } : record),
  })
}

export function moveMembershipStationPrice(id: string, direction: MoveDirection) {
  emitChange({
    ...snapshot,
    stationPrices: moveRecord(snapshot.stationPrices, id, direction),
  })
}

export function deleteMembershipStationPrice(id: string) {
  emitChange({
    ...snapshot,
    stationPrices: normalizeSortOrder(
      snapshot.stationPrices.filter((record) => record.id !== id),
    ),
  })
}
