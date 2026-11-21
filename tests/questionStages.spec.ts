import { describe, expect, it } from 'vitest'
import type { QuestionBlock } from '@/types/interview'
import { getNextLeitnerIntervalDays, splitCompiledIntoStages } from '@/utils/questionStages'

describe('splitCompiledIntoStages', () => {
  it('splits a single HTML block containing all 5 standard H2 sections cleanly', () => {
    const singleHtml = [
      '<h2 id="sec-1">面试答题思路</h2><p>结论先行</p>',
      '<h2 id="sec-2">核心原理解析</h2><h3>1. 细节</h3><p>内部机制</p>',
      '<h2 id="sec-4">图解流程</h2><div class="table-scroll-wrapper"><table><tr><th>A</th></tr></table></div>',
      '<h2 id="sec-5">高频追问与关键词</h2><ul><li>追问1</li></ul>',
      '<h2 id="sec-6">延伸参考</h2><p>官方文档</p>',
    ].join('')

    const res = splitCompiledIntoStages([{ type: 'html', html: singleHtml }])

    expect(res.stage1).toHaveLength(1)
    expect(res.stage1[0]).toEqual({
      type: 'html',
      html: '<h2 id="sec-1">面试答题思路</h2><p>结论先行</p>',
    })

    expect(res.stage2).toHaveLength(2)
    expect(res.stage2[0]).toEqual({
      type: 'html',
      html: '<h2 id="sec-2">核心原理解析</h2><h3>1. 细节</h3><p>内部机制</p>',
    })
    expect(res.stage2[1]).toEqual({
      type: 'html',
      html: '<h2 id="sec-4">图解流程</h2><div class="table-scroll-wrapper"><table><tr><th>A</th></tr></table></div>',
    })

    expect(res.stage3).toHaveLength(2)
    expect(res.stage3[0]).toEqual({
      type: 'html',
      html: '<h2 id="sec-5">高频追问与关键词</h2><ul><li>追问1</li></ul>',
    })
    expect(res.stage3[1]).toEqual({
      type: 'html',
      html: '<h2 id="sec-6">延伸参考</h2><p>官方文档</p>',
    })
  })

  it('keeps diagram and mermaid blocks plus continuation prose inside stage2', () => {
    const blocks: QuestionBlock[] = [
      {
        type: 'html',
        html: '<h2 id="sec-1">面试答题思路</h2><p>骨架</p><h2 id="sec-2">核心原理解析</h2><p>原理</p><h2 id="sec-3">图解流程</h2>\n',
      },
      { type: 'diagram', name: 'HandlerLooperSvg' },
      { type: 'html', html: '<p>图解补充说明</p>' },
      { type: 'mermaid', code: 'flowchart TD\n  A-->B' },
      {
        type: 'html',
        html: '<h2 id="sec-4">高频追问与关键词</h2><p>追问</p><h2 id="sec-5">延伸参考</h2><p>参考</p>',
      },
    ]

    const res = splitCompiledIntoStages(blocks)

    expect(res.stage1).toHaveLength(1)
    expect(res.stage1[0]).toMatchObject({ type: 'html' })

    expect(res.stage2).toHaveLength(5)
    expect(res.stage2[0]).toEqual({
      type: 'html',
      html: '<h2 id="sec-2">核心原理解析</h2><p>原理</p>',
    })
    expect(res.stage2[1]).toEqual({
      type: 'html',
      html: '<h2 id="sec-3">图解流程</h2>\n',
    })
    expect(res.stage2[2]).toEqual({ type: 'diagram', name: 'HandlerLooperSvg' })
    expect(res.stage2[3]).toEqual({ type: 'html', html: '<p>图解补充说明</p>' })
    expect(res.stage2[4]).toEqual({ type: 'mermaid', code: 'flowchart TD\n  A-->B' })

    expect(res.stage3).toHaveLength(2)
    expect(res.stage3[0]).toEqual({
      type: 'html',
      html: '<h2 id="sec-4">高频追问与关键词</h2><p>追问</p>',
    })
    expect(res.stage3[1]).toEqual({
      type: 'html',
      html: '<h2 id="sec-5">延伸参考</h2><p>参考</p>',
    })
  })

  it('handles preamble before first H2, inline tags inside H2, and unknown headings cleanly', () => {
    const blocks: QuestionBlock[] = [
      {
        type: 'html',
        html: [
          '<p>导语内容</p>',
          '<h2 id="sec-1"><span>面试答题思路</span></h2><p>要点</p>',
          '<h2 id="sec-2">补充思考</h2><p>仍在阶段一</p>',
          '<h2 id="sec-3">核心原理解析与 <code>Binder</code></h2><p>机制</p>',
          '<h2 id="sec-4">常见误区</h2><p>仍在阶段二</p>',
          '<h2 id="sec-5">图解流程</h2><p>见下图</p>',
          '<h2 id="sec-6">实战踩坑复盘</h2><p>图解后的未知标题进入阶段三</p>',
          '<h2 id="sec-7">延伸参考</h2><p>资料</p>',
        ].join(''),
      },
    ]

    const res = splitCompiledIntoStages(blocks)

    expect(res.stage1.map((b) => (b.type === 'html' ? b.html : ''))).toEqual([
      '<p>导语内容</p>',
      '<h2 id="sec-1"><span>面试答题思路</span></h2><p>要点</p>',
      '<h2 id="sec-2">补充思考</h2><p>仍在阶段一</p>',
    ])

    expect(res.stage2.map((b) => (b.type === 'html' ? b.html : ''))).toEqual([
      '<h2 id="sec-3">核心原理解析与 <code>Binder</code></h2><p>机制</p>',
      '<h2 id="sec-4">常见误区</h2><p>仍在阶段二</p>',
      '<h2 id="sec-5">图解流程</h2><p>见下图</p>',
    ])

    expect(res.stage3.map((b) => (b.type === 'html' ? b.html : ''))).toEqual([
      '<h2 id="sec-6">实战踩坑复盘</h2><p>图解后的未知标题进入阶段三</p>',
      '<h2 id="sec-7">延伸参考</h2><p>资料</p>',
    ])
  })

  it('handles missing sections, headingless HTML, and empty blocks without losing content', () => {
    expect(splitCompiledIntoStages([])).toEqual({
      stage1: [],
      stage2: [],
      stage3: [],
    })

    const headingless = splitCompiledIntoStages([
      { type: 'html', html: '   ' },
      { type: 'html', html: '<p>纯正文内容</p>' },
    ])
    expect(headingless.stage1).toEqual([{ type: 'html', html: '<p>纯正文内容</p>' }])
    expect(headingless.stage2).toEqual([])
    expect(headingless.stage3).toEqual([])

    const missingStage1 = splitCompiledIntoStages([
      {
        type: 'html',
        html: '<h2 id="sec-1">核心原理解析</h2><p>直接原理</p><h2 id="sec-2">延伸参考</h2><p>链接</p>',
      },
    ])
    expect(missingStage1.stage1).toEqual([])
    expect(missingStage1.stage2).toHaveLength(1)
    expect(missingStage1.stage3).toHaveLength(1)
  })
})

describe('getNextLeitnerIntervalDays', () => {
  it('matches studyStore Leitner schedule across review counts', () => {
    expect(getNextLeitnerIntervalDays(0)).toBe(1)
    expect(getNextLeitnerIntervalDays(1)).toBe(3)
    expect(getNextLeitnerIntervalDays(2)).toBe(7)
    expect(getNextLeitnerIntervalDays(3)).toBe(14)
    expect(getNextLeitnerIntervalDays(4)).toBe(30)
    expect(getNextLeitnerIntervalDays(12)).toBe(30)
  })
})
