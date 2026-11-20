import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/domains/registry', () => ({
  validQuestionIds: new Set(['android.handler-epoll', 'android.binder-mmap-onecopy']),
  aliasToIdMap: new Map<string, string>(),
}))

import { useStudyStore } from '@/stores/studyStore'

describe('useStudyStore', () => {
  beforeEach(() => {
    localStorage.clear()
    setActivePinia(createPinia())
  })

  it('tracks study status, bookmarks, notes, and Leitner review queue', () => {
    const store = useStudyStore()
    store.setStatus('android.handler-epoll', 'reviewing')
    expect(store.getStatus('android.handler-epoll')).toBe('reviewing')
    expect(store.dueReviewIds).toContain('android.handler-epoll')

    store.setStatus('android.handler-epoll', 'mastered')
    expect(store.getStatus('android.handler-epoll')).toBe('mastered')
    expect(store.dueReviewIds).not.toContain('android.handler-epoll')

    store.toggleBookmark('android.binder-mmap-onecopy')
    expect(store.isBookmarked('android.binder-mmap-onecopy')).toBe(true)

    store.setNote('android.handler-epoll', 'Android 6.0 切到 eventfd')
    expect(store.getNote('android.handler-epoll')).toBe('Android 6.0 切到 eventfd')

    expect(store.stats.mastered).toBe(1)
    expect(store.stats.bookmarks).toBe(1)
    expect(store.stats.notes).toBe(1)
  })

  it('exports and merges imported progress safely', () => {
    const store = useStudyStore()
    store.setStatus('android.handler-epoll', 'reviewing')
    const exported = store.exportPayload()

    store.resetProgress()
    expect(store.stats.reviewing).toBe(0)

    const preview = store.previewImport(exported)
    expect(preview.validRecordCount).toBe(1)
    store.applyImport(preview, 'merge')
    expect(store.getStatus('android.handler-epoll')).toBe('reviewing')
  })
})
