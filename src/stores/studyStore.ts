import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { aliasToIdMap, validQuestionIds } from '@/domains/registry'
import { parseStudyProgressImport, type ImportParseResult } from '@/schemas/content'
import type { StudyProgressV1, StudyRecord, StudyStatus } from '@/types/interview'

const STORAGE_KEY = 'interview-study-v1'
const DAY_MS = 86_400_000
const LEITNER_DAYS = [1, 3, 7, 14, 30]

let persistRequested = false
function requestDurableStorage() {
  if (persistRequested || typeof navigator === 'undefined') return
  persistRequested = true
  try {
    void navigator.storage?.persist?.()
  } catch {
    // Ignore unsupported environments
  }
}

function defaultState(): StudyProgressV1 {
  return {
    version: 1,
    records: {},
    bookmarks: [],
    notes: {},
    selfTestMode: false,
    revealedIds: [],
    useCnAndroidDocs: false,
  }
}

function loadFromStorage(): StudyProgressV1 {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState()
    const parsed = parseStudyProgressImport(raw, validQuestionIds, aliasToIdMap)
    return parsed.progress
  } catch {
    if (raw) {
      try {
        localStorage.setItem(`${STORAGE_KEY}-corrupt-backup`, raw)
      } catch {
        // Ignore storage quota issues when quarantining unrecognized state
      }
    }
    return defaultState()
  }
}

export const useStudyStore = defineStore('study', () => {
  const state = ref<StudyProgressV1>(typeof window !== 'undefined' ? loadFromStorage() : defaultState())

  const save = () => {
    if (typeof window === 'undefined') return
    requestDurableStorage()
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch {
      // Ignore quota errors in private mode
    }
  }

  const syncFromStorageEvent = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      state.value = loadFromStorage()
    }
  }

  const getStatus = (id: string): StudyStatus => state.value.records[id]?.status ?? 'unlearned'

  const getRecord = (id: string): StudyRecord | undefined => state.value.records[id]

  const setStatus = (id: string, status: StudyStatus) => {
    const now = new Date()
    const prevCount = state.value.records[id]?.reviewCount ?? 0
    if (status === 'unlearned') {
      delete state.value.records[id]
    } else if (status === 'reviewing') {
      state.value.records[id] = {
        status,
        updatedAt: now.toISOString(),
        nextReviewAt: now.toISOString(),
        reviewCount: prevCount,
      }
    } else {
      const nextCount = prevCount + 1
      const days = LEITNER_DAYS[Math.min(nextCount - 1, LEITNER_DAYS.length - 1)]!
      state.value.records[id] = {
        status,
        updatedAt: now.toISOString(),
        nextReviewAt: new Date(now.getTime() + days * DAY_MS).toISOString(),
        reviewCount: nextCount,
      }
    }
    save()
  }

  const isBookmarked = (id: string): boolean => state.value.bookmarks.includes(id)

  const toggleBookmark = (id: string) => {
    const idx = state.value.bookmarks.indexOf(id)
    if (idx === -1) {
      state.value.bookmarks.push(id)
    } else {
      state.value.bookmarks.splice(idx, 1)
    }
    save()
  }

  const getNote = (id: string): string => state.value.notes[id] ?? ''

  const setNote = (id: string, text: string) => {
    const trimmed = text.slice(0, 5000)
    if (trimmed.trim().length === 0) {
      delete state.value.notes[id]
    } else {
      state.value.notes[id] = trimmed
    }
    save()
  }

  const setSelfTestMode = (enabled: boolean) => {
    state.value.selfTestMode = enabled
    save()
  }

  const isRevealed = (id: string): boolean => state.value.revealedIds.includes(id)

  const setRevealed = (id: string, revealed: boolean) => {
    const idx = state.value.revealedIds.indexOf(id)
    if (revealed && idx === -1) {
      state.value.revealedIds.push(id)
      save()
    } else if (!revealed && idx !== -1) {
      state.value.revealedIds.splice(idx, 1)
      save()
    }
  }

  const setLastVisited = (id: string) => {
    state.value.lastVisitedId = id
    save()
  }

  const setUseCnAndroidDocs = (useCn: boolean) => {
    state.value.useCnAndroidDocs = useCn
    save()
  }

  const dueReviewIds = computed(() => {
    const nowMs = Date.now()
    const due: string[] = []
    for (const [id, rec] of Object.entries(state.value.records)) {
      if (rec.status === 'reviewing') {
        due.push(id)
      } else if (rec.status === 'mastered' && rec.nextReviewAt) {
        if (Date.parse(rec.nextReviewAt) <= nowMs) {
          due.push(id)
        }
      }
    }
    return due
  })

  const stats = computed(() => {
    let mastered = 0
    let reviewing = 0
    for (const rec of Object.values(state.value.records)) {
      if (rec.status === 'mastered') mastered += 1
      else if (rec.status === 'reviewing') reviewing += 1
    }
    return {
      mastered,
      reviewing,
      bookmarks: state.value.bookmarks.length,
      notes: Object.keys(state.value.notes).length,
      dueCount: dueReviewIds.value.length,
    }
  })

  const hasProgress = computed(
    () =>
      Object.keys(state.value.records).length > 0 ||
      state.value.bookmarks.length > 0 ||
      Object.keys(state.value.notes).length > 0,
  )

  const daysSinceBackup = computed<number | null>(() => {
    if (!state.value.lastBackupAt) return null
    const diff = Date.now() - Date.parse(state.value.lastBackupAt)
    if (Number.isNaN(diff)) return null
    return Math.max(0, Math.floor(diff / DAY_MS))
  })

  const exportPayload = (): string => {
    const nowIso = new Date().toISOString()
    state.value.lastBackupAt = nowIso
    save()
    const payload: StudyProgressV1 = {
      ...state.value,
      exportedAt: nowIso,
    }
    return JSON.stringify(payload, null, 2)
  }

  const previewImport = (rawJson: string): ImportParseResult => {
    return parseStudyProgressImport(rawJson, validQuestionIds, aliasToIdMap)
  }

  const applyImport = (parsed: ImportParseResult, strategy: 'merge' | 'overwrite') => {
    if (strategy === 'overwrite') {
      state.value = {
        ...parsed.progress,
        lastBackupAt: new Date().toISOString(),
      }
      save()
      return
    }

    const nextRecords: Record<string, StudyRecord> = { ...state.value.records }
    for (const [id, rec] of Object.entries(parsed.progress.records)) {
      const existing = nextRecords[id]
      const recMs = Date.parse(rec.updatedAt)
      const existingMs = existing ? Date.parse(existing.updatedAt) : Number.NaN
      if (!existing || Number.isNaN(existingMs) || (!Number.isNaN(recMs) && recMs >= existingMs)) {
        nextRecords[id] = rec
      }
    }

    const nextBookmarks = Array.from(new Set([...state.value.bookmarks, ...parsed.progress.bookmarks]))
    const nextNotes = { ...state.value.notes }
    for (const [id, note] of Object.entries(parsed.progress.notes)) {
      if (!nextNotes[id]) {
        nextNotes[id] = note
      } else if (nextNotes[id] !== note) {
        nextNotes[id] = `${nextNotes[id]}\n---\n${note}`.slice(0, 5000)
      }
    }

    state.value = {
      ...state.value,
      records: nextRecords,
      bookmarks: nextBookmarks,
      notes: nextNotes,
      lastBackupAt: new Date().toISOString(),
    }
    save()
  }

  const resetProgress = () => {
    state.value = defaultState()
    save()
  }

  return {
    state,
    stats,
    dueReviewIds,
    hasProgress,
    daysSinceBackup,
    syncFromStorageEvent,
    getStatus,
    getRecord,
    setStatus,
    isBookmarked,
    toggleBookmark,
    getNote,
    setNote,
    setSelfTestMode,
    isRevealed,
    setRevealed,
    setLastVisited,
    setUseCnAndroidDocs,
    exportPayload,
    previewImport,
    applyImport,
    resetProgress,
  }
})
