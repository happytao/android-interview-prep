import MiniSearch from 'minisearch'
import { describe, expect, it } from 'vitest'
import {
  extractHighlightFragments,
  getMiniSearchConfig,
  tokenizeIndex,
  tokenizeQuery,
  type SearchDocument,
} from '@/utils/tokenizer'

describe('tokenizer', () => {
  it('splits CamelCase, acronyms, and numeric boundaries', () => {
    const tokens = tokenizeIndex('OkHttp HTTP2 XMLParser RecyclerView')
    expect(tokens).toContain('okhttp')
    expect(tokens).toContain('ok')
    expect(tokens).toContain('http')
    expect(tokens).toContain('http2')
    expect(tokens).toContain('2')
    expect(tokens).toContain('xmlparser')
    expect(tokens).toContain('xml')
    expect(tokens).toContain('parser')
    expect(tokens).toContain('recyclerview')
    expect(tokens).toContain('recycler')
    expect(tokens).toContain('view')
  })

  it('handles mixed CJK/ASCII boundaries and NFKC full-width text', () => {
    const tokens = tokenizeQuery('Ｈａｎｄｌｅｒ内存泄漏')
    expect(tokens).toContain('handler')
    expect(tokens).toContain('内存')
    expect(tokens).toContain('存泄')
    expect(tokens).toContain('泄漏')
    // Multi-char query should NOT emit standalone unigrams that cause OR-flooding
    expect(tokens).not.toContain('内')
  })

  it('supports single-character non-stopword queries and ignores stopwords', () => {
    expect(tokenizeQuery('锁')).toEqual(['锁'])
    expect(tokenizeQuery('的')).toEqual([])
  })

  it('prevents single-char flooding in MiniSearch AND queries', () => {
    const ms = new MiniSearch<SearchDocument>(getMiniSearchConfig())
    ms.addAll([
      {
        id: 'android.leak',
        domain: 'android',
        slug: 'leak',
        title: 'Handler 内存泄漏治理方案',
        summary: '静态内部类与弱引用',
        keywordsText: 'Handler 内存泄漏',
        categoryLabel: 'Framework / Handler',
        priority: 'must-know',
        excerpt: 'Handler 持有 Activity 引用导致内存泄漏',
      },
      {
        id: 'android.other',
        domain: 'android',
        slug: 'other',
        title: '内容提供者 ContentProvider 原理',
        summary: '跨进程共享内容',
        keywordsText: 'ContentProvider',
        categoryLabel: '组件 / ContentProvider',
        priority: 'core',
        excerpt: '共享内容数据',
      },
    ])

    const hits = ms.search('内存泄漏', {
      tokenize: tokenizeQuery,
      combineWith: 'AND',
      prefix: true,
    })
    expect(hits.map((h) => h.id)).toEqual(['android.leak'])
  })

  it('extracts sorted highlight fragments', () => {
    const frags = extractHighlightFragments('Handler 内存泄漏')
    expect(frags).toContain('Handler')
    expect(frags).toContain('内存泄漏')
  })
})
