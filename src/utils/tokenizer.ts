const CJK_RUN_RE = /[\u4e00-\u9fff]+/g
const ASCII_RUN_RE = /[a-zA-Z0-9_+#.-]+/g

export const CJK_STOPWORDS = new Set([
  '的', '了', '在', '是', '和', '与', '中', '对', '及', '或',
  '之', '把', '被', '让', '给', '到', '从', '有', '为', '于',
  '等', '上', '下', '内', '外', '而', '并', '可', '能',
])

function splitAsciiParts(token: string): string[] {
  const cleaned = token.replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9+#]+$/g, '')
  if (!cleaned) return []

  const results = new Set<string>()
  const lowerFull = cleaned.toLowerCase()
  results.add(lowerFull)

  const segmented = cleaned
    .replace(/[_./-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2')

  for (const part of segmented.split(/\s+/)) {
    const p = part.trim().toLowerCase()
    if (p.length > 0) {
      results.add(p)
    }
  }

  return Array.from(results)
}

function tokenizeInternal(input: string, includeUnigramsForMultiCharCjk: boolean): string[] {
  if (!input) return []
  const normalized = input.normalize('NFKC').trim()
  if (!normalized) return []

  const tokens: string[] = []
  const cjkMatches = normalized.match(CJK_RUN_RE) ?? []
  const asciiMatches = normalized.match(ASCII_RUN_RE) ?? []

  for (const raw of asciiMatches) {
    for (const part of splitAsciiParts(raw)) {
      tokens.push(part)
    }
  }

  for (const run of cjkMatches) {
    const chars = Array.from(run)
    if (chars.length === 1) {
      const ch = chars[0]!
      if (!CJK_STOPWORDS.has(ch)) {
        tokens.push(ch)
      }
      continue
    }

    for (let i = 0; i < chars.length - 1; i++) {
      tokens.push(chars[i]! + chars[i + 1]!)
    }

    if (includeUnigramsForMultiCharCjk) {
      for (const ch of chars) {
        if (!CJK_STOPWORDS.has(ch)) {
          tokens.push(ch)
        }
      }
    }
  }

  return tokens
}

/**
 * Indexing tokenizer: emits CJK bigrams + non-stopword unigrams + CamelCase/acronym parts.
 * Shared between Vite build plugin and browser MiniSearch.loadJSON.
 */
export function tokenizeIndex(text: string): string[] {
  return tokenizeInternal(text, true)
}

/**
 * Query tokenizer: emits CJK bigrams for multi-char CJK runs (and unigram only for 1-char runs)
 * so AND-combined Chinese queries stay sharp without single-character flood noise.
 */
export function tokenizeQuery(text: string): string[] {
  return tokenizeInternal(text, false)
}

export function extractHighlightFragments(query: string): string[] {
  const normalized = query.normalize('NFKC').trim()
  if (!normalized) return []
  const parts = new Set<string>()
  for (const seg of normalized.split(/\s+/)) {
    if (seg.length > 0) parts.add(seg)
  }
  const cjkRuns = normalized.match(CJK_RUN_RE) ?? []
  for (const r of cjkRuns) {
    if (r.length >= 2) parts.add(r)
  }
  const asciiRuns = normalized.match(ASCII_RUN_RE) ?? []
  for (const a of asciiRuns) {
    if (a.length >= 2) parts.add(a)
  }
  return Array.from(parts).sort((a, b) => b.length - a.length)
}

export interface SearchDocument {
  id: string
  domain: string
  slug: string
  title: string
  summary: string
  keywordsText: string
  categoryLabel: string
  priority: string
  excerpt: string
}

export function getMiniSearchConfig() {
  return {
    fields: ['title', 'keywordsText', 'categoryLabel', 'summary', 'excerpt'] as (keyof SearchDocument)[],
    storeFields: ['domain', 'priority'] as (keyof SearchDocument)[],
    tokenize: tokenizeIndex,
    processTerm: (term: string) => term.toLowerCase(),
  }
}
