export const MAP_LAYER_VISIBILITY_STORAGE_KEY = 'evcs.site-selection.layer-visibility.v1'

export type VisibilityRecord = Record<string, boolean>

export type MapLayerVisibilitySnapshot = {
  groupExpansion: VisibilityRecord
  basicLayers: VisibilityRecord
  inventoryLayers: VisibilityRecord
  explorationStatuses: VisibilityRecord
  customDrawings: VisibilityRecord
}

type LayerVisibilityStorage = Pick<Storage, 'getItem' | 'setItem'>

export function readMapLayerVisibility(
  storage: LayerVisibilityStorage,
  defaults: MapLayerVisibilitySnapshot,
): MapLayerVisibilitySnapshot {
  try {
    const raw = storage.getItem(MAP_LAYER_VISIBILITY_STORAGE_KEY)
    if (raw === null) return cloneSnapshot(defaults)
    const value: unknown = JSON.parse(raw)
    if (!isRecord(value)) return cloneSnapshot(defaults)

    return {
      groupExpansion: normalizeFixedRecord(value.groupExpansion, defaults.groupExpansion),
      basicLayers: normalizeFixedRecord(value.basicLayers, defaults.basicLayers),
      inventoryLayers: normalizeFixedRecord(value.inventoryLayers, defaults.inventoryLayers),
      explorationStatuses: normalizeFixedRecord(
        value.explorationStatuses,
        defaults.explorationStatuses,
      ),
      customDrawings: normalizeDynamicRecord(value.customDrawings),
    }
  } catch {
    return cloneSnapshot(defaults)
  }
}

export function writeMapLayerVisibility(
  storage: LayerVisibilityStorage,
  snapshot: MapLayerVisibilitySnapshot,
): void {
  try {
    storage.setItem(MAP_LAYER_VISIBILITY_STORAGE_KEY, JSON.stringify(snapshot))
  } catch {
    // Browser privacy settings and quota failures must not break the map.
  }
}

export function restoreVisibilityRecord(
  keys: readonly string[],
  stored: VisibilityRecord,
): VisibilityRecord {
  return Object.fromEntries(keys.map((key) => [key, stored[key] ?? true]))
}

function normalizeFixedRecord(
  value: unknown,
  defaults: VisibilityRecord,
): VisibilityRecord {
  if (!isRecord(value)) return { ...defaults }
  return Object.fromEntries(Object.entries(defaults).map(([key, defaultValue]) => [
    key,
    typeof value[key] === 'boolean' ? value[key] : defaultValue,
  ]))
}

function normalizeDynamicRecord(value: unknown): VisibilityRecord {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, boolean] => (
      typeof entry[1] === 'boolean'
    )),
  )
}

function cloneSnapshot(snapshot: MapLayerVisibilitySnapshot): MapLayerVisibilitySnapshot {
  return {
    groupExpansion: { ...snapshot.groupExpansion },
    basicLayers: { ...snapshot.basicLayers },
    inventoryLayers: { ...snapshot.inventoryLayers },
    explorationStatuses: { ...snapshot.explorationStatuses },
    customDrawings: { ...snapshot.customDrawings },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
