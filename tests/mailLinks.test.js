import { describe, it, expect } from 'vitest'
import { replyBody, replyLinks, replySubject } from '../src/utils/mailLinks.js'

const m = { name: 'Nadia Rahman', email: 'nadia@example.com', subject: 'Delivery & timing?', message: 'Line one\nLine two' }

describe('reply links', () => {
  it('does not double the "Re:" prefix', () => {
    expect(replySubject('Order question')).toBe('Re: Order question')
    expect(replySubject('Re: Order question')).toBe('Re: Order question')
  })

  it('greets by first name and quotes every line of the message', () => {
    const body = replyBody(m)
    expect(body.startsWith('Hi Nadia,')).toBe(true)
    expect(body).toContain('> Line one\n> Line two')
    expect(replyBody({ ...m, name: '  ' }).startsWith('Hi there,')).toBe(true)
  })

  it('encodes the Gmail and mailto links safely', () => {
    const { gmail, mailto } = replyLinks(m)
    expect(gmail).toContain('to=nadia%40example.com')
    expect(gmail).toContain('%26') // the "&" in the subject is encoded, so it can't cut the subject short
    expect(mailto).toContain('%0D%0A')
    for (const url of [gmail, mailto]) {
      expect(url).not.toMatch(/[\s]/)
    }
  })

  it('shortens long messages so the links stay a usable length', () => {
    const links = replyLinks({ ...m, message: 'word '.repeat(2000), subject: 'S'.repeat(150) })
    expect(links.gmail.length).toBeLessThan(3500)
    expect(links.mailto.length).toBeLessThan(3500)
  })

  it('keeps Bangla names and text intact', () => {
    const { gmail } = replyLinks({ name: 'নাদিয়া', email: 'a@b.co', subject: 'প্রশ্ন', message: 'ধন্যবাদ' })
    expect(decodeURIComponent(gmail)).toContain('Hi নাদিয়া,')
  })
})