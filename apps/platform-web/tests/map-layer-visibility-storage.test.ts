import { describe, expect, test } from 'bun:test'

import {
  MAP_LAYER_VISIBILITY_STORAGE_KEY,
  readMapLayerVisibility,
  restoreVisibilityRecord,
  writeMapLayerVisibility,
  type MapLayerVisibilitySnapshot,
} from '../src/features/agent-workspace/map-layer-visibility-storage'

const defaults: MapLayerVisibilitySnapshot = {
  groupExpansion: { basic: true, inventory: true },
  basicLayers: { traffic: true },
  inventoryLayers: { planned: true, supplemental: true },
  explorationStatuses: { draft: true },
  customDrawings: {},
}

describe('map layer visibility storage', () => {
  test('restores booleans and defaults missing or invalid fixed keys', () => {
    const storage = {
      getItem: () => JSON.stringify({
        groupExpansion: { basic: false, inventory: 'no' },
        basicLayers: { traffic: false, main: false, removed: false },
        inventoryLayers: { planned: 'no' },
        explorationStatuses: {},
        referenceImage: false,
        customDrawings: { '41': false },
      }),
      setItem: () => {},
    }

    expect(readMapLayerVisibility(storage, defaults)).toEqual({
      groupExpansion: { basic: false, inventory: true },
      basicLayers: { traffic: false },
      inventoryLayers: { planned: true, supplemental: true },
      explorationStatuses: { draft: true },
      customDrawings: { '41': false },
    })
  })

  test('returns defaults when JSON is damaged or storage throws', () => {
    expect(readMapLayerVisibility({ getItem: () => '{', setItem: () => {} }, defaults))
      .toEqual(defaults)
    expect(readMapLayerVisibility({
      getItem: () => { throw new Error('blocked') },
      setItem: () => {},
    }, defaults)).toEqual(defaults)
  })

  test('writes one complete versioned snapshot and absorbs quota errors', () => {
    let savedKey = ''
    let savedValue = ''
    writeMapLayerVisibility({
      getItem: () => null,
      setItem: (key, value) => {
        savedKey = key
        savedValue = value
      },
    }, defaults)

    expect(savedKey).toBe(MAP_LAYER_VISIBILITY_STORAGE_KEY)
    expect(JSON.parse(savedValue)).toEqual(defaults)
    expect(() => writeMapLayerVisibility({
      getItem: () => null,
      setItem: () => { throw new Error('quota') },
    }, defaults)).not.toThrow()
  })

  test('restores known drawing ids and defaults new drawings to visible', () => {
    expect(restoreVisibilityRecord(['41', '42'], { '41': false, old: false }))
      .toEqual({ '41': false, '42': true })
  })
})
