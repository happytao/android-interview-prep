import type { QuestionBlock } from '@/types/interview'

export interface QuestionStages {
  stage1: QuestionBlock[]
  stage2: QuestionBlock[]
  stage3: QuestionBlock[]
}

type StageKey = keyof QuestionStages

const H2_BOUNDARY_RE = /<h2\b[^>]*>([\s\S]*?)<\/h2>/gi
const LEITNER_INTERVAL_DAYS = [1, 3, 7, 14, 30] as const

function decodeBasicEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
}

function extractHeadingText(rawInnerHtml: string): string {
  const withoutTags = rawInnerHtml.replace(/<[^>]+>/g, '')
  return decodeBasicEntities(withoutTags).replace(/\s+/g, ' ').trim()
}

function classifyHeading(
  headingText: string,
  currentStage: StageKey,
  seenDiagramSection: boolean,
): { stage: StageKey; seenDiagramSection: boolean } {
  if (headingText.includes('面试答题思路')) {
    return { stage: 'stage1', seenDiagramSection }
  }
  if (headingText.includes('核心原理解析')) {
    return { stage: 'stage2', seenDiagramSection }
  }
  if (headingText.includes('图解流程')) {
    return { stage: 'stage2', seenDiagramSection: true }
  }
  if (headingText.includes('高频追问') || headingText.includes('延伸参考')) {
    return { stage: 'stage3', seenDiagramSection }
  }

  // Non-standard / trailing headings preserve existing stage, except headings after 图解流程 route to stage3
  if (currentStage === 'stage3' || seenDiagramSection) {
    return { stage: 'stage3', seenDiagramSection }
  }
  return { stage: currentStage, seenDiagramSection }
}

/**
 * Splits compiled question blocks into three progressive drill stages:
 * - stage1: 面试答题思路 (plus any preamble before the first H2)
 * - stage2: 核心原理解析 & 图解流程 (including interactive SVG / Mermaid blocks)
 * - stage3: 高频追问与关键词, 延伸参考, and any trailing sections
 */
export function splitCompiledIntoStages(blocks: QuestionBlock[]): QuestionStages {
  const stages: QuestionStages = {
    stage1: [],
    stage2: [],
    stage3: [],
  }

  let currentStage: StageKey = 'stage1'
  let seenDiagramSection = false

  for (const block of blocks) {
    if (block.type !== 'html') {
      stages[currentStage].push(block)
      continue
    }

    const html = block.html
    const matches = Array.from(html.matchAll(H2_BOUNDARY_RE))

    if (matches.length === 0) {
      if (html.trim().length > 0) {
        stages[currentStage].push(block)
      }
      continue
    }

    const firstIndex = matches[0]!.index ?? 0
    if (firstIndex > 0) {
      const preamble = html.slice(0, firstIndex)
      if (preamble.trim().length > 0) {
        stages[currentStage].push({ type: 'html', html: preamble })
      }
    }

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]!
      const start = match.index ?? 0
      const end = i + 1 < matches.length ? (matches[i + 1]!.index ?? html.length) : html.length
      const segmentHtml = html.slice(start, end)
      const headingText = extractHeadingText(match[1] ?? '')

      const next = classifyHeading(headingText, currentStage, seenDiagramSection)
      currentStage = next.stage
      seenDiagramSection = next.seenDiagramSection

      if (segmentHtml.trim().length > 0) {
        stages[currentStage].push({ type: 'html', html: segmentHtml })
      }
    }
  }

  return stages
}

/**
 * Mirrors studyStore's Leitner spacing schedule ([1, 3, 7, 14, 30] days) for UI interval previews.
 */
export function getNextLeitnerIntervalDays(prevReviewCount = 0): number {
  const nextCount = Math.max(0, prevReviewCount) + 1
  return LEITNER_INTERVAL_DAYS[Math.min(nextCount - 1, LEITNER_INTERVAL_DAYS.length - 1)]!
}
