import { z } from 'zod'
import type { StudyProgressV1, StudyRecord } from '../types/interview'

export const ALLOWED_REFERENCE_DOMAINS = [
  'developer.android.com',
  'developer.android.google.cn',
  'source.android.com',
  'cs.android.com',
  'kotlinlang.org',
  'gityuan.com',
  'hencoder.com',
  'rengwuxian.com',
  'tech.meituan.com',
  'tech.bytedance.com',
  'guolin.tech',
  'square.github.io',
  'bumptech.github.io',
  'coil-kt.github.io',
  'juejin.cn',
  'perfetto.dev',
  'sqlite.org',
  'gradle.org',
  'developer.mozilla.org',
] as const

export const FORBIDDEN_IMAGE_DOMAINS = [
  'mmbiz.qpic.cn',
  'csdnimg.cn',
  'zhimg.com',
  'juejin.byteimg.com',
  'jianshu.io',
  'cnblogs.com',
] as const

export function isAllowlistedUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    if (parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return ALLOWED_REFERENCE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

export function isForbiddenImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl)
    const host = parsed.hostname.toLowerCase()
    return FORBIDDEN_IMAGE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`))
  } catch {
    return false
  }
}

const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected 6-digit hex color')

export const DomainConfigSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  name: z.string().min(1).max(40),
  tagline: z.string().min(1).max(160),
  status: z.enum(['active', 'planned']),
  order: z.number().int().min(1),
  icon: z.string().min(1),
  accent: z.object({
    light: HexColorSchema,
    dark: HexColorSchema,
  }),
})

export const CategoryMetaSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  icon: z.string().min(1).optional(),
})

export const ReferenceSchema = z.object({
  title: z.string().min(1).max(160),
  url: z
    .string()
    .url()
    .refine((u) => isAllowlistedUrl(u), {
      message: 'Reference URL must use https:// and belong to the curated domain allowlist',
    }),
  type: z.enum(['official', 'blog', 'aosp']),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD date'),
})

export const QuestionFrontmatterSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+\.[a-z0-9-]+$/, 'Expected immutable semantic ID like android.handler-epoll'),
  aliases: z.array(z.string().min(1)).default([]),
  title: z.string().min(2).max(160),
  summary: z.string().min(4).max(240),
  priority: z.enum(['must-know', 'core', 'bonus']),
  difficulty: z.enum(['basic', 'medium', 'hard']),
  frequency: z.number().int().min(1).max(5),
  estimatedMinutes: z.number().int().min(1).max(60),
  status: z.enum(['draft', 'published']),
  keywords: z.array(z.string().min(1)).min(1).max(12),
  diagram: z.string().min(1).optional(),
  references: z.array(ReferenceSchema).min(1),
  updatedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const MAX_IMPORT_BYTES = 2 * 1024 * 1024
const MAX_NOTE_LENGTH = 5000

const StudyRecordSchema = z.object({
  status: z.enum(['unlearned', 'reviewing', 'mastered']),
  updatedAt: z.string().min(1),
  nextReviewAt: z.string().optional(),
  reviewCount: z.number().int().min(0).optional(),
})

const RawStudyProgressImportSchema = z.object({
  version: z.literal(1),
  exportedAt: z.string().optional(),
  lastBackupAt: z.string().optional(),
  records: z.record(z.string(), StudyRecordSchema).default({}),
  bookmarks: z.array(z.string()).default([]),
  notes: z.record(z.string(), z.string().max(MAX_NOTE_LENGTH)).default({}),
  selfTestMode: z.boolean().optional(),
  revealedIds: z.array(z.string()).optional(),
  useCnAndroidDocs: z.boolean().optional(),
  lastVisitedId: z.string().optional(),
})

export interface ImportParseResult {
  progress: StudyProgressV1
  validRecordCount: number
  validNoteCount: number
  validBookmarkCount: number
  orphanedIds: string[]
  remappedAliases: Array<{ from: string; to: string }>
}

function assertNoPrototypePollution(value: unknown): void {
  if (typeof value !== 'object' || value === null) return
  if (Array.isArray(value)) {
    for (const item of value) assertNoPrototypePollution(item)
    return
  }
  for (const key of Object.getOwnPropertyNames(value)) {
    if (DANGEROUS_KEYS.has(key)) {
      throw new Error(`Forbidden key "${key}" detected in imported JSON`)
    }
    assertNoPrototypePollution((value as Record<string, unknown>)[key])
  }
}

export function parseStudyProgressImport(
  rawText: string,
  validIds: Set<string>,
  aliasMap: Map<string, string> = new Map(),
): ImportParseResult {
  if (new TextEncoder().encode(rawText).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('导入 JSON 体积超过 2MB 上限')
  }

  const parsedRaw: unknown = JSON.parse(rawText)
  assertNoPrototypePollution(parsedRaw)

  const data = RawStudyProgressImportSchema.parse(parsedRaw)
  const orphanedSet = new Set<string>()
  const remappedAliasMap = new Map<string, string>()

  const resolveId = (rawId: string): string | null => {
    if (DANGEROUS_KEYS.has(rawId)) return null
    if (validIds.has(rawId)) return rawId
    const mapped = aliasMap.get(rawId)
    if (mapped && validIds.has(mapped)) {
      remappedAliasMap.set(rawId, mapped)
      return mapped
    }
    orphanedSet.add(rawId)
    return null
  }

  const cleanRecords: Record<string, StudyRecord> = Object.create(null)
  for (const [key, record] of Object.entries(data.records)) {
    const resolved = resolveId(key)
    if (resolved) {
      cleanRecords[resolved] = {
        status: record.status,
        updatedAt: record.updatedAt,
        nextReviewAt: record.nextReviewAt,
        reviewCount: record.reviewCount,
      }
    }
  }

  const cleanNotes: Record<string, string> = Object.create(null)
  for (const [key, note] of Object.entries(data.notes)) {
    const resolved = resolveId(key)
    if (resolved && note.trim().length > 0) {
      cleanNotes[resolved] = note.slice(0, MAX_NOTE_LENGTH)
    }
  }

  const cleanBookmarks = new Set<string>()
  for (const rawId of data.bookmarks) {
    const resolved = resolveId(rawId)
    if (resolved) cleanBookmarks.add(resolved)
  }

  const cleanRevealed = new Set<string>()
  for (const rawId of data.revealedIds ?? []) {
    const resolved = resolveId(rawId)
    if (resolved) cleanRevealed.add(resolved)
  }

  const lastVisitedResolved = data.lastVisitedId ? resolveId(data.lastVisitedId) ?? undefined : undefined

  return {
    progress: {
      version: 1,
      exportedAt: data.exportedAt,
      lastBackupAt: data.lastBackupAt,
      records: { ...cleanRecords },
      bookmarks: Array.from(cleanBookmarks),
      notes: { ...cleanNotes },
      selfTestMode: data.selfTestMode ?? false,
      revealedIds: Array.from(cleanRevealed),
      useCnAndroidDocs: data.useCnAndroidDocs ?? false,
      lastVisitedId: lastVisitedResolved,
    },
    validRecordCount: Object.keys(cleanRecords).length,
    validNoteCount: Object.keys(cleanNotes).length,
    validBookmarkCount: cleanBookmarks.size,
    orphanedIds: Array.from(orphanedSet),
    remappedAliases: Array.from(remappedAliasMap, ([from, to]) => ({ from, to })),
  }
}
