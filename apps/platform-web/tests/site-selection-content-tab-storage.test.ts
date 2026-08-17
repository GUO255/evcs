import { describe, expect, test } from 'bun:test'

import {
  readSiteSelectionContentTab,
  writeSiteSelectionContentTab,
} from '../src/features/agent-workspace/site-selection-content-tab-storage'

describe('site selection content tab session storage', () => {
  test('restores only registered content tabs', () => {
    expect(readSiteSelectionContentTab(storageWith('map'))).toBe('map')
    expect(readSiteSelectionContentTab(storageWith('agent-site-selection')))
      .toBe('agent-site-selection')
    expect(readSiteSelectionContentTab(storageWith('removed-tab'))).toBe('map')
    expect(readSiteSelectionContentTab(storageWith(null))).toBe('map')
  })

  test('writes the selected content tab and absorbs storage failures', () => {
    let stored = ''
    writeSiteSelectionContentTab({ setItem: (_key, value) => { stored = value } }, 'agent-site-selection')
    expect(stored).toBe('agent-site-selection')
    expect(() => writeSiteSelectionContentTab({ setItem: () => { throw new Error('denied') } }, 'map'))
      .not.toThrow()
  })
})

function storageWith(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: () => value }
}
