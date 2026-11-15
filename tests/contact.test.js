import { describe, it, expect } from 'vitest'
import { cleanHandle, countLinks, phoneLinks, socialUrl, validateContactForm } from '../src/utils/contact.js'

describe('phoneLinks', () => {
  it('builds tel and WhatsApp links from Bangladesh numbers in any format', () => {
    const expected = { tel: 'tel:+8801737477731', wa: 'https://wa.me/8801737477731' }
    expect(phoneLinks('01737-477731')).toEqual(expected)
    expect(phoneLinks('+880 1737 477731')).toEqual(expected)
  })
  it('accepts international numbers and refuses ones it cannot link', () => {
    expect(phoneLinks('+44 20 7946 0958').wa).toBe('https://wa.me/442079460958')
    expect(phoneLinks('02-9876543')).toBeNull()
    expect(phoneLinks('')).toBeNull()
  })
})

describe('social handles', () => {
  it('accepts names and profile links for the right network', () => {
    expect(cleanHandle('instagram', '@callista.brio')).toBe('callista.brio')
    expect(cleanHandle('instagram', 'https://www.instagram.com/callista.brio/?hl=en')).toBe('callista.brio')
    expect(cleanHandle('facebook', 'https://m.facebook.com/callistabrio')).toBe('callistabrio')
    expect(socialUrl('instagram', '@callista.brio')).toBe('https://instagram.com/callista.brio')
  })
  it('rejects other sites, scripts and bad characters', () => {
    expect(cleanHandle('instagram', 'https://facebook.com/x')).toBeNull()
    expect(cleanHandle('instagram', 'https://evil.com/x')).toBeNull()
    expect(cleanHandle('instagram', 'javascript:alert(1)')).toBeNull()
    expect(cleanHandle('instagram', 'bad handle!')).toBeNull()
  })
  it('treats empty as empty', () => expect(cleanHandle('instagram', '  ')).toBe(''))
})

describe('validateContactForm', () => {
  const ok = { name: 'A', email: 'a@b.co', subject: 'Hi', message: 'Hello there' }
  it('passes a good message', () => expect(validateContactForm(ok)).toEqual({}))
  it('flags every missing field', () => {
    expect(Object.keys(validateContactForm({ name: ' ', email: 'x', subject: '', message: '' })).sort())
      .toEqual(['email', 'message', 'name', 'subject'])
  })
  it('limits length and links', () => {
    expect(validateContactForm({ ...ok, message: 'x'.repeat(3001) }).message).toBeTruthy()
    expect(countLinks('a https://a.com b www.c.com')).toBe(2)
    expect(validateContactForm({ ...ok, message: 'http://a.co http://b.co http://c.co http://d.co' }).message).toBeTruthy()
  })
})