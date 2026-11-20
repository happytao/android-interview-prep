import MiniSearch, { type SearchResult } from 'minisearch'
import { ref } from 'vue'
import { getQuestionById } from '@/domains/registry'
import type { Priority, QuestionSummary } from '@/types/interview'
import { getMiniSearchConfig, tokenizeQuery, type SearchDocument } from '@/utils/tokenizer'

let indexPromise: Promise<MiniSearch<SearchDocument>> | null = null

async function ensureSearchIndex(): Promise<MiniSearch<SearchDocument>> {
  if (!indexPromise) {
    indexPromise = import('virtual:search-index').then((mod) => {
      return MiniSearch.loadJSON<SearchDocument>(mod.searchIndexJson, getMiniSearchConfig())
    })
  }
  return indexPromise
}

export interface SearchHit {
  question: QuestionSummary
  score: number
  isRelaxedFallback: boolean
}

export function useSearch() {
  const isReady = ref(false)
  const isLoading = ref(false)

  const warmup = async () => {
    if (isReady.value) return
    isLoading.value = true
    try {
      await ensureSearchIndex()
      isReady.value = true
    } finally {
      isLoading.value = false
    }
  }

  const searchQuestions = async (
    rawQuery: string,
    filters?: { domain?: string | 'all'; priority?: Priority | 'all' },
  ): Promise<SearchHit[]> => {
    const trimmed = rawQuery.trim()
    if (!trimmed) return []

    const ms = await ensureSearchIndex()
    isReady.value = true

    const filterFn = (result: SearchResult) => {
      if (filters?.domain && filters.domain !== 'all' && result['domain'] !== filters.domain) {
        return false
      }
      if (filters?.priority && filters.priority !== 'all' && result['priority'] !== filters.priority) {
        return false
      }
      return true
    }

    const baseOpts = {
      tokenize: tokenizeQuery,
      boost: { title: 3, keywordsText: 2.5, categoryLabel: 1.5, summary: 1.2, excerpt: 1 },
      prefix: true,
      fuzzy: 0.15,
      filter: filterFn,
    }

    let rawHits: SearchResult[] = ms.search(trimmed, {
      ...baseOpts,
      combineWith: 'AND',
    })

    let isRelaxedFallback = false
    if (rawHits.length === 0) {
      rawHits = ms.search(trimmed, {
        ...baseOpts,
        combineWith: 'OR',
      })
      isRelaxedFallback = rawHits.length > 0
    }

    const hits: SearchHit[] = []
    for (const r of rawHits.slice(0, 30)) {
      const q = getQuestionById(String(r.id))
      if (q) {
        hits.push({
          question: q,
          score: r.score,
          isRelaxedFallback,
        })
      }
    }
    return hits
  }

  return {
    isReady,
    isLoading,
    warmup,
    searchQuestions,
  }
}
