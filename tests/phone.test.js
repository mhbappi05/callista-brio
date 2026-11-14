import { describe, it, expect } from 'vitest'
import { normalizeBDPhone } from '../src/utils/phone.js'

describe('normalizeBDPhone', () => {
  it('normalizes common formats', () => {
    expect(normalizeBDPhone('01712345678')).toBe('+8801712345678')
    expect(normalizeBDPhone('+880 1712-345678')).toBe('+8801712345678')
    expect(normalizeBDPhone('8801712345678')).toBe('+8801712345678')
  })
  it('rejects invalid numbers', () => {
    expect(normalizeBDPhone('0121234567')).toBeNull()
    expect(normalizeBDPhone('01212345678')).toBeNull() // 012 is not a mobile prefix
    expect(normalizeBDPhone('abc')).toBeNull()
    expect(normalizeBDPhone(null)).toBeNull()
  })
})