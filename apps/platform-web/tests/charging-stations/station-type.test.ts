import { describe, expect, test } from 'bun:test'

import { getStationType } from '../../src/features/charging-stations/station-data'

describe('charging station type', () => {
  test('classifies a station without an active merchant binding as self-operated', () => {
    expect(getStationType({ merchantBindings: [] })).toBe('self-operated')
    expect(getStationType({
      merchantBindings: [{
        id: 'binding-history',
        merchantCode: 'M000001',
        merchantName: '历史商户',
        boundAt: '2026-01-01',
        status: 'inactive',
      }],
    })).toBe('self-operated')
  })

  test('classifies a station with an active merchant binding as merchant-operated', () => {
    expect(getStationType({
      merchantBindings: [{
        id: 'binding-current',
        merchantCode: 'M000001',
        merchantName: '当前商户',
        boundAt: '2026-01-01',
        status: 'active',
      }],
    })).toBe('merchant-operated')
  })
})
