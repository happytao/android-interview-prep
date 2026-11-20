import { manifest } from 'virtual:question-manifest'
import type { DomainManifest, QuestionSummary } from '@/types/interview'

export const questionManifest = manifest

export const allDomains: DomainManifest[] = manifest.domains

export const validQuestionIds = new Set<string>(Object.keys(manifest.questionsById))

export const aliasToIdMap = new Map<string, string>()
for (const q of Object.values(manifest.questionsById)) {
  for (const alias of q.aliases) {
    aliasToIdMap.set(alias, q.id)
    aliasToIdMap.set(`${q.domain}.${alias}`, q.id)
  }
}

export function getDomainManifest(domainId: string): DomainManifest | undefined {
  return allDomains.find((d) => d.config.id === domainId)
}

export function getDomainFlatQuestions(domainId: string): QuestionSummary[] {
  const domain = getDomainManifest(domainId)
  if (!domain) return []
  const list: QuestionSummary[] = []
  for (const cat of domain.categories) {
    for (const sub of cat.subcategories) {
      for (const q of sub.questions) {
        list.push(q)
      }
    }
  }
  return list
}

export function getQuestionById(id: string): QuestionSummary | undefined {
  return manifest.questionsById[id]
}

export function findQuestionBySlugOrAlias(
  domainId: string,
  slugOrAlias: string,
): { question: QuestionSummary; isAliasRedirect: boolean } | undefined {
  const list = getDomainFlatQuestions(domainId)
  const exact = list.find((q) => q.slug === slugOrAlias)
  if (exact) return { question: exact, isAliasRedirect: false }

  const viaAlias = list.find((q) => q.aliases.includes(slugOrAlias))
  if (viaAlias) return { question: viaAlias, isAliasRedirect: true }
  return undefined
}

export function getAdjacentQuestions(
  domainId: string,
  questionId: string,
): { prev: QuestionSummary | null; next: QuestionSummary | null; index: number; total: number } {
  const list = getDomainFlatQuestions(domainId)
  const idx = list.findIndex((q) => q.id === questionId)
  if (idx === -1) {
    return { prev: null, next: null, index: -1, total: list.length }
  }
  return {
    prev: idx > 0 ? list[idx - 1]! : null,
    next: idx < list.length - 1 ? list[idx + 1]! : null,
    index: idx,
    total: list.length,
  }
}
