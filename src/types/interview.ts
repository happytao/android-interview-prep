export interface DomainAccent {
  light: string
  dark: string
}

export interface DomainConfig {
  id: string
  name: string
  tagline: string
  status: 'active' | 'planned'
  order: number
  icon: string
  accent: DomainAccent
}

export type Priority = 'must-know' | 'core' | 'bonus'
export type Difficulty = 'basic' | 'medium' | 'hard'
export type QuestionStatus = 'draft' | 'published'

export interface ReferenceItem {
  title: string
  url: string
  type: 'official' | 'blog' | 'aosp'
  verifiedAt: string
}

export interface QuestionSummary {
  id: string
  slug: string
  aliases: string[]
  domain: string
  category: string
  categoryName: string
  categoryOrder: number
  subcategory: string
  subcategoryName: string
  subcategoryOrder: number
  order: number
  title: string
  summary: string
  priority: Priority
  difficulty: Difficulty
  frequency: number
  estimatedMinutes: number
  status: QuestionStatus
  keywords: string[]
  diagram?: string
  hasMermaid: boolean
  references: ReferenceItem[]
  updatedAt: string
  sourcePath: string
}

export interface SubcategoryNode {
  id: string
  slug: string
  name: string
  description: string
  order: number
  questions: QuestionSummary[]
}

export interface CategoryNode {
  id: string
  slug: string
  name: string
  description: string
  icon?: string
  order: number
  subcategories: SubcategoryNode[]
}

export interface DomainManifest {
  config: DomainConfig
  categories: CategoryNode[]
  questionCount: number
}

export interface QuestionManifest {
  domains: DomainManifest[]
  questionsById: Record<string, QuestionSummary>
}

export interface TocHeading {
  id: string
  text: string
  level: 2 | 3
}

export type QuestionBlock =
  | { type: 'html'; html: string }
  | { type: 'diagram'; name: string }
  | { type: 'mermaid'; code: string }

export interface CompiledQuestion {
  id: string
  blocks: QuestionBlock[]
  toc: TocHeading[]
  references: ReferenceItem[]
}

export type StudyStatus = 'unlearned' | 'reviewing' | 'mastered'

export interface StudyRecord {
  status: StudyStatus
  updatedAt: string
  nextReviewAt?: string
  reviewCount?: number
}

export interface StudyProgressV1 {
  version: 1
  exportedAt?: string
  lastBackupAt?: string
  records: Record<string, StudyRecord>
  bookmarks: string[]
  notes: Record<string, string>
  selfTestMode: boolean
  revealedIds: string[]
  useCnAndroidDocs: boolean
  lastVisitedId?: string
}
