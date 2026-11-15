import { describe, it, expect } from 'vitest'
import { moveBy, moveItem, moveToFront } from '../src/utils/reorder.js'
import { filterImageFiles, fitToLimit } from '../src/lib/imageUpload.js'

describe('reorder', () => {
  const list = ['a', 'b', 'c', 'd']
  it('moves items without changing the original', () => {
    expect(moveItem(list, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
    expect(list).toEqual(['a', 'b', 'c', 'd'])
  })
  it('returns the same array when nothing would change', () => {
    expect(moveItem(list, 1, 1)).toBe(list)
    expect(moveToFront(list, 'a')).toBe(list)
    expect(moveToFront(list, 'unknown')).toBe(list)
    expect(moveBy(list, 'a', -1)).toBe(list)
    expect(moveBy(list, 'd', 1)).toBe(list)
  })
  it('moves a photo to the front or by one step', () => {
    expect(moveToFront(list, 'c')).toEqual(['c', 'a', 'b', 'd'])
    expect(moveBy(list, 'b', -1)).toEqual(['b', 'a', 'c', 'd'])
    expect(moveBy(list, 'b', 1)).toEqual(['a', 'c', 'b', 'd'])
  })
})

describe('upload helpers', () => {
  const f = (name, type) => ({ name, type })
  it('accepts image types and rejects the rest', () => {
    const { accepted, rejected } = filterImageFiles([
      f('a.jpg', 'image/jpeg'), f('b.gif', 'image/gif'), f('c.pdf', 'application/pdf'), f('d.webp', 'image/webp'),
    ])
    expect(accepted.map((x) => x.name)).toEqual(['a.jpg', 'd.webp'])
    expect(rejected.map((x) => x.name)).toEqual(['b.gif', 'c.pdf'])
    expect(filterImageFiles(null)).toEqual({ accepted: [], rejected: [] })
  })
  it('limits how many files are taken', () => {
    expect(fitToLimit([1, 2, 3, 4], 8, 10)).toEqual({ take: [1, 2], skipped: 2 })
    expect(fitToLimit([1], 12, 10)).toEqual({ take: [], skipped: 1 })
  })
})