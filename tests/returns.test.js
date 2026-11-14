import { describe, it, expect } from 'vitest'
import { buildReturnItems, returnDeadline, returnWindowOpen } from '../src/utils/returns.js'

const now = Date.parse('2026-12-10T12:00:00Z')
const on = { enabled: true, window_days: 7 }

describe('returnWindowOpen', () => {
    it('is open inside the window, including the last moment', () => {
        expect(returnWindowOpen('2026-12-05T12:00:00Z', on, now)).toBe(true)
        expect(returnWindowOpen('2026-12-03T12:00:00Z', on, now)).toBe(true)
    })
    it('is closed after the window', () => expect(returnWindowOpen('2026-12-03T11:59:59Z', on, now)).toBe(false))
    it('is closed when the policy is off or incomplete', () => {
        expect(returnWindowOpen('2026-12-09T12:00:00Z', { enabled: false, window_days: 7 }, now)).toBe(false)
        expect(returnWindowOpen('2026-12-09T12:00:00Z', { enabled: true, window_days: null }, now)).toBe(false)
        expect(returnWindowOpen(null, on, now)).toBe(false)
    })
})

describe('returns helpers', () => {
    it('computes the deadline', () => {
        expect(returnDeadline('2026-12-03T12:00:00Z', on).toISOString()).toBe('2026-12-10T12:00:00.000Z')
    })
    it('builds the item payload from a selection', () => {
        expect(buildReturnItems({ a: 2, b: 0, c: '1' })).toEqual([
            { order_item_id: 'a', quantity: 2 }, { order_item_id: 'c', quantity: 1 },
        ])
    })
})