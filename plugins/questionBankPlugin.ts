import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import MarkdownIt from 'markdown-it'
import MiniSearch from 'minisearch'
import { createHighlighter, type Highlighter } from 'shiki'
import type { Plugin, ViteDevServer } from 'vite'
import {
  CategoryMetaSchema,
  DomainConfigSchema,
  QuestionFrontmatterSchema,
  isForbiddenImageUrl,
} from '../src/schemas/content'
import type {
  CategoryNode,
  CompiledQuestion,
  DomainManifest,
  QuestionBlock,
  QuestionManifest,
  QuestionSummary,
  SubcategoryNode,
  TocHeading,
} from '../src/types/interview'
import { getMiniSearchConfig, type SearchDocument } from '../src/utils/tokenizer'

const VIRTUAL_MANIFEST_ID = 'virtual:question-manifest'
const RESOLVED_MANIFEST_ID = '\0' + VIRTUAL_MANIFEST_ID
const VIRTUAL_SEARCH_ID = 'virtual:search-index'
const RESOLVED_SEARCH_ID = '\0' + VIRTUAL_SEARCH_ID

const REQUIRED_H2_TITLES = [
  '面试答题思路',
  '核心原理解析',
  '图解流程',
  '高频追问与关键词',
  '延伸参考',
]

const SHIKI_LANGS = [
  'kotlin',
  'java',
  'xml',
  'groovy',
  'kts',
  'shell',
  'bash',
  'json',
  'yaml',
  'markdown',
  'sql',
  'c',
  'cpp',
  'text',
] as const

const LANG_ALIASES: Record<string, string> = {
  kt: 'kotlin',
  sh: 'shell',
  zsh: 'shell',
  gradle: 'groovy',
  yml: 'yaml',
  md: 'markdown',
  txt: 'text',
  proguard: 'text',
  aidl: 'java',
}

function toPosix(p: string): string {
  return p.split(path.sep).join('/')
}

function normalizeFsKey(p: string): string {
  return toPosix(path.resolve(p)).replace(/^([A-Za-z]):/, (_, d: string) => `${d.toLowerCase()}:`)
}

function parseOrderedDirName(dirName: string): { order: number; slug: string } {
  const match = /^(\d+)-(.+)$/.exec(dirName)
  if (!match) {
    throw new Error(`Expected numeric prefix "NN-slug" on "${dirName}"`)
  }
  return {
    order: Number.parseInt(match[1]!, 10),
    slug: match[2]!,
  }
}

function parseOrderedFileName(fileName: string): { order: number; slug: string } {
  const base = fileName.replace(/\.md$/i, '')
  return parseOrderedDirName(base)
}

function discoverAvailableDiagrams(rootDir: string): Set<string> {
  const diagramsDir = path.join(rootDir, 'src', 'components', 'diagrams')
  const names = new Set<string>()
  if (!fs.existsSync(diagramsDir)) return names

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'primitives') continue
        walk(path.join(dir, entry.name))
      } else if (entry.isFile() && entry.name.endsWith('.vue')) {
        if (entry.name === 'MermaidBlock.vue' || entry.name === 'DiagramLightbox.vue') continue
        names.add(entry.name.replace(/\.vue$/, ''))
      }
    }
  }
  walk(diagramsDir)
  return names
}

type RawSegment =
  | { type: 'markdown'; content: string }
  | { type: 'diagram'; name: string }
  | { type: 'mermaid'; code: string }

function splitMarkdownSegments(body: string, fileLabel: string): RawSegment[] {
  const lines = body.replace(/\r\n/g, '\n').split('\n')
  const segments: RawSegment[] = []
  let mdBuffer: string[] = []
  let inFence: { marker: string; isMermaid: boolean; lines: string[] } | null = null
  let inDiagram: string | null = null

  const flushMarkdown = () => {
    const joined = mdBuffer.join('\n')
    if (joined.trim().length > 0) {
      segments.push({ type: 'markdown', content: joined })
    }
    mdBuffer = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!
    const trimmed = line.trim()

    if (inDiagram !== null) {
      if (trimmed === ':::') {
        segments.push({ type: 'diagram', name: inDiagram })
        inDiagram = null
        continue
      }
      throw new Error(
        `Unexpected content inside :::diagram ${inDiagram} in ${fileLabel} at line ${i + 1}. Keep :::diagram blocks empty and close immediately with :::`,
      )
    }

    if (inFence !== null) {
      if (trimmed.startsWith(inFence.marker) && trimmed.replaceAll(inFence.marker[0]!, '').trim() === '') {
        if (inFence.isMermaid) {
          segments.push({ type: 'mermaid', code: inFence.lines.join('\n').trim() })
        } else {
          mdBuffer.push(line)
        }
        inFence = null
      } else if (inFence.isMermaid) {
        inFence.lines.push(line)
      } else {
        mdBuffer.push(line)
      }
      continue
    }

    const fenceMatch = /^(```+|~~~+)(.*)$/.exec(trimmed)
    if (fenceMatch) {
      const marker = fenceMatch[1]!.slice(0, 3)
      const info = fenceMatch[2]!.trim().toLowerCase()
      if (info === 'mermaid') {
        flushMarkdown()
        inFence = { marker, isMermaid: true, lines: [] }
      } else {
        mdBuffer.push(line)
        inFence = { marker, isMermaid: false, lines: [] }
      }
      continue
    }

    const diagramMatch = /^:::diagram\s+([A-Za-z0-9_-]+)\s*$/.exec(trimmed)
    if (diagramMatch) {
      flushMarkdown()
      inDiagram = diagramMatch[1]!
      continue
    }

    mdBuffer.push(line)
  }

  if (inDiagram !== null) {
    throw new Error(`Unclosed :::diagram ${inDiagram} block in ${fileLabel}`)
  }
  if (inFence !== null) {
    throw new Error(`Unclosed fenced code block in ${fileLabel}`)
  }

  flushMarkdown()
  return segments
}

function stripMarkdownToPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/:::diagram\s+[A-Za-z0-9_-]+[\s\S]*?:::/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/[*_~>|#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function questionBankPlugin(): Plugin {
  let rootDir = process.cwd()
  let highlighterPromise: Promise<Highlighter> | null = null
  let compiledCache = new Map<string, CompiledQuestion>()
  let cachedManifest: QuestionManifest | null = null
  let cachedSearchIndexJson: string | null = null
  let cachedSources = new Set<string>()

  const getHighlighter = () => {
    if (!highlighterPromise) {
      highlighterPromise = createHighlighter({
        themes: ['github-light', 'github-dark'],
        langs: [...SHIKI_LANGS],
      })
    }
    return highlighterPromise
  }

  const createMdRenderer = (highlighter: Highlighter, fileLabel: string) => {
    const md = new MarkdownIt({
      html: false,
      linkify: true,
      typographer: false,
      highlight(code: string, lang: string): string {
        const rawLang = (lang || 'text').trim().toLowerCase()
        const mapped = LANG_ALIASES[rawLang] ?? rawLang
        const supported = (SHIKI_LANGS as readonly string[]).includes(mapped) ? mapped : 'text'
        return highlighter.codeToHtml(code, {
          lang: supported,
          themes: {
            light: 'github-light',
            dark: 'github-dark',
          },
          defaultColor: false,
        })
      },
    })

    const defaultLinkOpen =
      md.renderer.rules.link_open ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

    md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx]!
      const href = token.attrGet('href') ?? ''
      if (href && !href.startsWith('#') && !href.startsWith('https://') && !href.startsWith('http://')) {
        token.attrSet('href', '#blocked-unsafe-link')
      }
      if (href.startsWith('https://') || href.startsWith('http://')) {
        token.attrSet('target', '_blank')
        token.attrSet('rel', 'noopener noreferrer')
      }
      return defaultLinkOpen(tokens, idx, options, env, self)
    }

    const defaultImage =
      md.renderer.rules.image ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

    md.renderer.rules.image = (tokens, idx, options, env, self) => {
      const token = tokens[idx]!
      const src = token.attrGet('src') ?? ''
      if (isForbiddenImageUrl(src) || /^https?:\/\//i.test(src)) {
        throw new Error(
          `Forbidden external hotlinked image "${src}" in ${fileLabel}. Use local SVG, Mermaid, or self-hosted CC BY 4.0 official figures instead.`,
        )
      }
      return defaultImage(tokens, idx, options, env, self)
    }

    md.renderer.rules.table_open = () =>
      '<div class="table-scroll-wrapper" tabindex="0" role="region" aria-label="对比表格"><table>\n'
    md.renderer.rules.table_close = () => '</table></div>\n'

    return md
  }

  const compileQuestion = async (
    absPath: string,
    id: string,
    status: 'draft' | 'published',
    references: QuestionSummary['references'],
    body: string,
    availableDiagrams: Set<string>,
  ): Promise<{ compiled: CompiledQuestion; hasMermaid: boolean; diagramRefs: string[] }> => {
    const highlighter = await getHighlighter()
    const relLabel = toPosix(path.relative(rootDir, absPath))
    const md = createMdRenderer(highlighter, relLabel)
    const segments = splitMarkdownSegments(body, relLabel)

    const blocks: QuestionBlock[] = []
    const toc: TocHeading[] = []
    const foundH2 = new Set<string>()
    const diagramRefs: string[] = []
    let hasMermaid = false
    let headingCounter = 0

    const defaultHeadingOpen =
      md.renderer.rules.heading_open ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))

    md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx]!
      if (token.tag === 'h2' || token.tag === 'h3') {
        const inlineToken = tokens[idx + 1]
        const text = inlineToken?.content?.trim() ?? ''
        headingCounter += 1
        const headingId = `sec-${headingCounter}`
        token.attrSet('id', headingId)
        const level = token.tag === 'h2' ? 2 : 3
        toc.push({ id: headingId, text, level })
        if (level === 2) {
          foundH2.add(text)
        }
      }
      return defaultHeadingOpen(tokens, idx, options, env, self)
    }

    for (const seg of segments) {
      if (seg.type === 'markdown') {
        const html = md.render(seg.content)
        blocks.push({ type: 'html', html })
      } else if (seg.type === 'diagram') {
        if (!availableDiagrams.has(seg.name)) {
          throw new Error(
            `Unknown interactive diagram "${seg.name}" referenced in ${relLabel}. Expected Vue component under src/components/diagrams/**/${seg.name}.vue`,
          )
        }
        diagramRefs.push(seg.name)
        blocks.push({ type: 'diagram', name: seg.name })
      } else {
        hasMermaid = true
        blocks.push({ type: 'mermaid', code: seg.code })
      }
    }

    if (status === 'published') {
      const missingH2 = REQUIRED_H2_TITLES.filter((title) => !foundH2.has(title))
      if (missingH2.length > 0) {
        throw new Error(
          `Published question "${id}" (${relLabel}) is missing required H2 sections: ${missingH2.join(', ')}`,
        )
      }
    }

    return {
      compiled: {
        id,
        blocks,
        toc,
        references,
      },
      hasMermaid,
      diagramRefs,
    }
  }

  const buildAll = async () => {
    const contentRoot = path.join(rootDir, 'content')
    if (!fs.existsSync(contentRoot)) {
      throw new Error(`Content directory not found at ${contentRoot}`)
    }

    const availableDiagrams = discoverAvailableDiagrams(rootDir)
    const nextCache = new Map<string, CompiledQuestion>()
    const nextSources = new Set<string>()
    const questionsById: Record<string, QuestionSummary> = Object.create(null)
    const domains: DomainManifest[] = []

    const miniSearch = new MiniSearch<SearchDocument>(getMiniSearchConfig())

    const domainEntries = fs
      .readdirSync(contentRoot, { withFileTypes: true })
      .filter((e) => e.isDirectory())

    for (const domainEntry of domainEntries) {
      const domainDir = path.join(contentRoot, domainEntry.name)
      const domainMetaPath = path.join(domainDir, '_domain.json')
      if (!fs.existsSync(domainMetaPath)) continue

      const rawDomain = JSON.parse(fs.readFileSync(domainMetaPath, 'utf-8'))
      const domainConfig = DomainConfigSchema.parse(rawDomain)
      if (domainConfig.id !== domainEntry.name) {
        throw new Error(
          `Domain id "${domainConfig.id}" in ${toPosix(domainMetaPath)} must match folder name "${domainEntry.name}"`,
        )
      }

      const usedIdsInDomain = new Set<string>()
      const usedSlugsInDomain = new Set<string>()
      const categories: CategoryNode[] = []

      const l1Entries = fs
        .readdirSync(domainDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())

      for (const l1Entry of l1Entries) {
        const { order: l1Order, slug: l1Slug } = parseOrderedDirName(l1Entry.name)
        const l1Dir = path.join(domainDir, l1Entry.name)
        const l1MetaPath = path.join(l1Dir, '_category.json')
        if (!fs.existsSync(l1MetaPath)) {
          throw new Error(`Missing _category.json in L1 directory ${toPosix(l1Dir)}`)
        }
        const l1Meta = CategoryMetaSchema.parse(JSON.parse(fs.readFileSync(l1MetaPath, 'utf-8')))

        const subcategories: SubcategoryNode[] = []
        const l2Entries = fs
          .readdirSync(l1Dir, { withFileTypes: true })
          .filter((e) => e.isDirectory())

        for (const l2Entry of l2Entries) {
          const { order: l2Order, slug: l2Slug } = parseOrderedDirName(l2Entry.name)
          const l2Dir = path.join(l1Dir, l2Entry.name)
          const l2MetaPath = path.join(l2Dir, '_category.json')
          if (!fs.existsSync(l2MetaPath)) {
            throw new Error(`Missing _category.json in L2 directory ${toPosix(l2Dir)}`)
          }
          const l2Meta = CategoryMetaSchema.parse(JSON.parse(fs.readFileSync(l2MetaPath, 'utf-8')))

          const questions: QuestionSummary[] = []
          const mdFiles = fs
            .readdirSync(l2Dir, { withFileTypes: true })
            .filter(
              (e) =>
                e.isFile() &&
                e.name.endsWith('.md') &&
                !e.name.startsWith('_') &&
                e.name.toLowerCase() !== 'readme.md',
            )

          for (const mdFile of mdFiles) {
            const absMdPath = toPosix(path.join(l2Dir, mdFile.name))
            const { order: qOrder, slug: qSlug } = parseOrderedFileName(mdFile.name)
            const rawMd = fs.readFileSync(absMdPath, 'utf-8')
            const parsed = matter(rawMd)
            const fm = QuestionFrontmatterSchema.parse(parsed.data)

            if (usedIdsInDomain.has(fm.id)) {
              throw new Error(`Duplicate question id "${fm.id}" in domain "${domainConfig.id}"`)
            }
            if (usedSlugsInDomain.has(qSlug)) {
              throw new Error(`Duplicate question slug "${qSlug}" in domain "${domainConfig.id}"`)
            }
            usedIdsInDomain.add(fm.id)
            usedSlugsInDomain.add(qSlug)

            if (fm.diagram && !availableDiagrams.has(fm.diagram)) {
              throw new Error(
                `Frontmatter diagram "${fm.diagram}" in ${absMdPath} has no matching component in src/components/diagrams/`,
              )
            }

            const { compiled, hasMermaid } = await compileQuestion(
              absMdPath,
              fm.id,
              fm.status,
              fm.references,
              parsed.content,
              availableDiagrams,
            )

            const sourcePath = '/' + toPosix(path.relative(rootDir, absMdPath))
            const fsKey = normalizeFsKey(absMdPath)
            nextCache.set(fsKey, compiled)
            nextSources.add(absMdPath)

            const summary: QuestionSummary = {
              id: fm.id,
              slug: qSlug,
              aliases: fm.aliases,
              domain: domainConfig.id,
              category: l1Slug,
              categoryName: l1Meta.name,
              categoryOrder: l1Order,
              subcategory: l2Slug,
              subcategoryName: l2Meta.name,
              subcategoryOrder: l2Order,
              order: qOrder,
              title: fm.title,
              summary: fm.summary,
              priority: fm.priority,
              difficulty: fm.difficulty,
              frequency: fm.frequency,
              estimatedMinutes: fm.estimatedMinutes,
              status: fm.status,
              keywords: fm.keywords,
              diagram: fm.diagram,
              hasMermaid,
              references: fm.references,
              updatedAt: fm.updatedAt,
              sourcePath,
            }

            questions.push(summary)
            questionsById[fm.id] = summary

            const plainExcerpt = stripMarkdownToPlainText(parsed.content).slice(0, 420)
            miniSearch.add({
              id: fm.id,
              domain: domainConfig.id,
              slug: qSlug,
              title: fm.title,
              summary: fm.summary,
              keywordsText: fm.keywords.join(' '),
              categoryLabel: `${l1Meta.name} / ${l2Meta.name}`,
              priority: fm.priority,
              excerpt: plainExcerpt,
            })
          }

          questions.sort((a, b) => a.order - b.order)
          subcategories.push({
            id: `${domainConfig.id}.${l1Slug}.${l2Slug}`,
            slug: l2Slug,
            name: l2Meta.name,
            description: l2Meta.description,
            order: l2Order,
            questions,
          })
        }

        subcategories.sort((a, b) => a.order - b.order)
        categories.push({
          id: `${domainConfig.id}.${l1Slug}`,
          slug: l1Slug,
          name: l1Meta.name,
          description: l1Meta.description,
          icon: l1Meta.icon,
          order: l1Order,
          subcategories,
        })
      }

      categories.sort((a, b) => a.order - b.order)
      const questionCount = categories.reduce(
        (sum, c) => sum + c.subcategories.reduce((s2, sub) => s2 + sub.questions.length, 0),
        0,
      )

      domains.push({
        config: domainConfig,
        categories,
        questionCount,
      })
    }

    domains.sort((a, b) => a.config.order - b.config.order)

    compiledCache = nextCache
    cachedSources = nextSources
    cachedManifest = { domains, questionsById }
    cachedSearchIndexJson = JSON.stringify(miniSearch.toJSON())
  }

  const invalidateAll = (server?: ViteDevServer) => {
    cachedManifest = null
    cachedSearchIndexJson = null
    compiledCache.clear()
    if (server) {
      for (const vid of [RESOLVED_MANIFEST_ID, RESOLVED_SEARCH_ID]) {
        const mod = server.moduleGraph.getModuleById(vid)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      for (const src of cachedSources) {
        const mod = server.moduleGraph.getModuleById(`${src}?compiled`)
        if (mod) server.moduleGraph.invalidateModule(mod)
      }
      server.ws.send({ type: 'full-reload', path: '*' })
    }
  }

  return {
    name: 'question-bank-plugin',
    configResolved(config) {
      rootDir = config.root
    },
    configureServer(server) {
      const contentGlob = normalizeFsKey(path.join(rootDir, 'content'))
      const diagramsGlob = normalizeFsKey(path.join(rootDir, 'src', 'components', 'diagrams'))
      server.watcher.add([path.join(rootDir, 'content'), path.join(rootDir, 'src', 'components', 'diagrams')])

      const onFsChange = (filePath: string) => {
        const normalizedPath = normalizeFsKey(filePath)
        if (normalizedPath.startsWith(contentGlob) || normalizedPath.startsWith(diagramsGlob)) {
          invalidateAll(server)
        }
      }

      server.watcher.on('add', onFsChange)
      server.watcher.on('unlink', onFsChange)
      server.watcher.on('change', onFsChange)
    },
    resolveId(id) {
      if (id === VIRTUAL_MANIFEST_ID) return RESOLVED_MANIFEST_ID
      if (id === VIRTUAL_SEARCH_ID) return RESOLVED_SEARCH_ID
      return null
    },
    async load(id) {
      if (id === RESOLVED_MANIFEST_ID) {
        if (!cachedManifest) await buildAll()
        return `export const manifest = ${JSON.stringify(cachedManifest)};`
      }
      if (id === RESOLVED_SEARCH_ID) {
        if (!cachedSearchIndexJson) await buildAll()
        return `export const searchIndexJson = ${JSON.stringify(cachedSearchIndexJson)};`
      }

      const [rawPath, query] = id.split('?')
      if (rawPath && query && rawPath.endsWith('.md') && new URLSearchParams(query).has('compiled')) {
        const fsKey = normalizeFsKey(rawPath)
        if (!cachedManifest) await buildAll()
        const compiled = compiledCache.get(fsKey)
        if (!compiled) {
          throw new Error(`Compiled question not found for ${fsKey}. Check filename and Zod validation.`)
        }
        this.addWatchFile(rawPath)
        return `export default ${JSON.stringify(compiled)};`
      }
      return null
    },
  }
}
