import { describe, expect, it } from 'vitest'
import {
  isAllowlistedUrl,
  isForbiddenImageUrl,
  parseStudyProgressImport,
} from '@/schemas/content'

describe('content & security schemas', () => {
  it('validates https allowlisted URLs and rejects unsafe protocols/hosts', () => {
    expect(isAllowlistedUrl('https://developer.android.com/guide/components/activities/activity-lifecycle')).toBe(true)
    expect(isAllowlistedUrl('https://developer.android.google.cn/kotlin/coroutines')).toBe(true)
    expect(isAllowlistedUrl('https://gityuan.com/2015/12/26/handler-message-framework/')).toBe(true)
    expect(isAllowlistedUrl('http://developer.android.com/guide')).toBe(false)
    expect(isAllowlistedUrl('javascript:alert(1)')).toBe(false)
    expect(isAllowlistedUrl('https://evil.example.com/phish')).toBe(false)
  })

  it('detects forbidden anti-leech image hosts', () => {
    expect(isForbiddenImageUrl('https://mmbiz.qpic.cn/mmbiz_png/abc/0')).toBe(true)
    expect(isForbiddenImageUrl('https://img-blog.csdnimg.cn/123.png')).toBe(true)
    expect(isForbiddenImageUrl('https://developer.android.com/images/lifecycle.png')).toBe(false)
  })

  it('blocks prototype pollution keys on JSON import', () => {
    const validIds = new Set(['android.handler-epoll'])
    const malicious = '{"version":1,"records":{},"__proto__":{"polluted":true}}'
    expect(() => parseStudyProgressImport(malicious, validIds)).toThrow(/Forbidden key/)
  })

  it('remaps aliases and reports orphaned IDs during JSON import', () => {
    const validIds = new Set(['android.handler-epoll'])
    const aliasMap = new Map([['old-handler', 'android.handler-epoll']])
    const raw = JSON.stringify({
      version: 1,
      records: {
        'old-handler': { status: 'mastered', updatedAt: '2026-11-20T00:00:00.000Z' },
        'android.deleted-topic': { status: 'reviewing', updatedAt: '2026-11-20T00:00:00.000Z' },
      },
      bookmarks: ['old-handler'],
      notes: { 'android.handler-epoll': '重点看 epoll_wait' },
    })

    const res = parseStudyProgressImport(raw, validIds, aliasMap)
    expect(res.validRecordCount).toBe(1)
    expect(res.progress.records['android.handler-epoll']?.status).toBe('mastered')
    expect(res.orphanedIds).toEqual(['android.deleted-topic'])
    expect(res.remappedAliases).toEqual([{ from: 'old-handler', to: 'android.handler-epoll' }])
    expect(res.validNoteCount).toBe(1)
  })
})
