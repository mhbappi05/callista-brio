import { describe, it, expect } from 'vitest'
import { SLUG_RE, fromLocalInput, slugify, toLocalInput } from '../src/utils/slug.js'
import { NEXT_STATUSES } from '../src/utils/orderLabels.js'

describe('slugify', () => {
    it('makes URL-safe slugs', () => {
        expect(slugify('Hand-Painted Floral Jhumka')).toBe('hand-painted-floral-jhumka')
        expect(slugify("  Pearl  Drop's  Earrings!! ")).toBe('pearl-drops-earrings')
        expect(slugify('Café Noir')).toBe('cafe-noir')
    })
    it('returns empty for names with no latin letters', () => expect(slugify('৳৳৳')).toBe(''))
    it('output passes the slug rule', () => expect(SLUG_RE.test(slugify('Moon Phase Hoops'))).toBe(true))
})

describe('datetime-local helpers', () => {
    it('round-trips', () => {
        const iso = '2026-12-01T10:30:00.000Z'
        expect(fromLocalInput(toLocalInput(iso))).toBe(iso)
        expect(fromLocalInput('')).toBeNull()
    })
})

describe('order status table', () => {
    it('only allows forward steps and cancellation, matching the database', () => {
        expect(NEXT_STATUSES.shipped).toEqual(['delivered'])
        expect(NEXT_STATUSES.delivered).toEqual([])
        expect(NEXT_STATUSES.cancelled).toEqual([])
        expect(NEXT_STATUSES.pending).toContain('cancelled')
    })
})