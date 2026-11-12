import { describe, it, expect } from 'vitest'
import { formatBDT } from '../src/utils/currency.js'

describe('formatBDT', () => {
  it('prefixes the taka sign', () => expect(formatBDT(850)).toBe('৳850'))
  it('returns empty string for invalid input', () => expect(formatBDT('abc')).toBe(''))
})
