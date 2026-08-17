import { useSyncExternalStore } from 'react'

import {
  initialStoredValuePresets,
  initialStoredValueSettings,
} from './stored-value-config-data'
import type {
  StoredValuePreset,
  StoredValuePresetInput,
  StoredValueSettings,
} from './stored-value-config-types'

type MoveDirection = 'up' | 'down'

interface StoredValueConfigSnapshot {
  settings: StoredValueSettings
  presets: readonly StoredValuePreset[]
}

let snapshot: StoredValueConfigSnapshot = {
  settings: { ...initialStoredValueSettings },
  presets: initialStoredValuePresets.map((record) => ({ ...record })),
}
const listeners = new Set<() => void>()

function emitChange(nextSnapshot: StoredValueConfigSnapshot) {
  snapshot = nextSnapshot
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function normalizeSortOrder(records: readonly StoredValuePreset[]) {
  return records.map((record, index) => ({ ...record, sortOrder: index + 1 }))
}

export function useStoredValueConfig() {
  return useSyncExternalStore(subscribe, () => snapshot, () => snapshot)
}

export function updateStoredValueSettings(settings: StoredValueSettings) {
  emitChange({ ...snapshot, settings })
}

export function createStoredValuePreset(input: StoredValuePresetInput) {
  emitChange({
    ...snapshot,
    presets: [
      ...snapshot.presets,
      { id: crypto.randomUUID(), ...input, sortOrder: snapshot.presets.length + 1 },
    ],
  })
}

export function updateStoredValuePreset(id: string, input: StoredValuePresetInput) {
  emitChange({
    ...snapshot,
    presets: snapshot.presets.map((record) =>
      record.id === id ? { ...record, ...input } : record),
  })
}

export function toggleStoredValuePreset(id: string) {
  emitChange({
    ...snapshot,
    presets: snapshot.presets.map((record) =>
      record.id === id
        ? { ...record, status: record.status === 'enabled' ? 'disabled' : 'enabled' }
        : record),
  })
}

export function moveStoredValuePreset(id: string, direction: MoveDirection) {
  const currentIndex = snapshot.presets.findIndex((record) => record.id === id)
  const destinationIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
  if (
    currentIndex < 0
    || destinationIndex < 0
    || destinationIndex >= snapshot.presets.length
  ) {
    return
  }

  const nextPresets = [...snapshot.presets]
  const current = nextPresets[currentIndex]
  const destination = nextPresets[destinationIndex]
  if (!current || !destination) return
  nextPresets[currentIndex] = destination
  nextPresets[destinationIndex] = current
  emitChange({ ...snapshot, presets: normalizeSortOrder(nextPresets) })
}

export function deleteStoredValuePreset(id: string) {
  emitChange({
    ...snapshot,
    presets: normalizeSortOrder(snapshot.presets.filter((record) => record.id !== id)),
  })
}
