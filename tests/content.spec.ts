/// <reference types="node" />
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { describe, expect, it } from 'vitest'
import {
  CategoryMetaSchema,
  DomainConfigSchema,
  QuestionFrontmatterSchema,
  isForbiddenImageUrl,
} from '@/schemas/content'

const ROOT_DIR = process.cwd()
const CONTENT_DIR = path.join(ROOT_DIR, 'content')
const ANDROID_DIR = path.join(CONTENT_DIR, 'android')
const DIAGRAMS_DIR = path.join(ROOT_DIR, 'src', 'components', 'diagrams', 'android')
const SYLLABUS_PATH = path.join(ROOT_DIR, 'docs', 'ANDROID_SYLLABUS.md')

const REQUIRED_H2_TITLES = [
  '面试答题思路',
  '核心原理解析',
  '图解流程',
  '高频追问与关键词',
  '延伸参考',
] as const

const SUPPORTED_MERMAID_HEADERS = [
  /^flowchart\s+(TD|TB|BT|RL|LR)\b/,
  /^graph\s+(TD|TB|BT|RL|LR)\b/,
  /^sequenceDiagram\b/,
  /^stateDiagram-v2\b/,
  /^stateDiagram\b/,
  /^classDiagram\b/,
  /^erDiagram\b/,
]

function stripOrderedPrefix(name: string): string {
  const match = /^\d+-(.+)$/.exec(name)
  return match ? match[1]! : name
}

function getDirs(parent: string): fs.Dirent[] {
  return fs
    .readdirSync(parent, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
}

describe('full question bank content integrity', () => {
  it('validates all 5 domains under content/*/_domain.json', () => {
    const domainDirs = getDirs(CONTENT_DIR)
    expect(domainDirs.map((d) => d.name).sort()).toEqual([
      'android',
      'backend',
      'devops',
      'frontend',
      'security',
    ])

    for (const dir of domainDirs) {
      const cfgPath = path.join(CONTENT_DIR, dir.name, '_domain.json')
      expect(fs.existsSync(cfgPath), `Missing ${cfgPath}`).toBe(true)
      const parsed = DomainConfigSchema.parse(JSON.parse(fs.readFileSync(cfgPath, 'utf8')))
      expect(parsed.id).toBe(dir.name)
      expect(parsed.status).toBe(dir.name === 'android' ? 'active' : 'planned')
    }
  })

  it('validates 10 L1 categories, 34 L2 categories, and 111 published Android questions matching syllabus 1-to-1', () => {
    const l1Dirs = getDirs(ANDROID_DIR)
    expect(l1Dirs.length).toBe(10)

    const l2CountByDir: string[] = []
    const authoredIds = new Set<string>()
    const authoredSlugs = new Set<string>()
    const diagramQuestions: string[] = []

    const availableDiagrams = new Set(
      fs
        .readdirSync(DIAGRAMS_DIR)
        .filter((f) => f.endsWith('.vue'))
        .map((f) => f.replace(/\.vue$/, '')),
    )

    for (const l1 of l1Dirs) {
      const l1Dir = path.join(ANDROID_DIR, l1.name)
      const l1MetaPath = path.join(l1Dir, '_category.json')
      expect(fs.existsSync(l1MetaPath), `Missing ${l1MetaPath}`).toBe(true)
      CategoryMetaSchema.parse(JSON.parse(fs.readFileSync(l1MetaPath, 'utf8')))

      const l2Dirs = getDirs(l1Dir)
      for (const l2 of l2Dirs) {
        l2CountByDir.push(`${l1.name}/${l2.name}`)
        const l2Dir = path.join(l1Dir, l2.name)
        const l2MetaPath = path.join(l2Dir, '_category.json')
        expect(fs.existsSync(l2MetaPath), `Missing ${l2MetaPath}`).toBe(true)
        CategoryMetaSchema.parse(JSON.parse(fs.readFileSync(l2MetaPath, 'utf8')))

        const mdFiles = fs
          .readdirSync(l2Dir, { withFileTypes: true })
          .filter(
            (e) =>
              e.isFile() &&
              e.name.endsWith('.md') &&
              !e.name.startsWith('_') &&
              e.name.toLowerCase() !== 'readme.md',
          )
          .sort((a, b) => a.name.localeCompare(b.name))

        expect(mdFiles.length, `Empty L2 directory ${l1.name}/${l2.name}`).toBeGreaterThan(0)

        for (const mdFile of mdFiles) {
          const fullPath = path.join(l2Dir, mdFile.name)
          const raw = fs.readFileSync(fullPath, 'utf8')
          const { data, content } = matter(raw)
          const fm = QuestionFrontmatterSchema.parse(data)

          expect(fm.status, `Question not published: ${fullPath}`).toBe('published')
          expect(authoredIds.has(fm.id), `Duplicate ID ${fm.id} in ${fullPath}`).toBe(false)
          authoredIds.add(fm.id)

          const slug = stripOrderedPrefix(mdFile.name.replace(/\.md$/i, ''))
          expect(authoredSlugs.has(slug), `Duplicate slug ${slug} in ${fullPath}`).toBe(false)
          authoredSlugs.add(slug)

          const normalizedBody = content.replace(/\r\n/g, '\n')
          const lines = normalizedBody.split('\n')

          // 1. Validate balanced fences & extract mermaid / :::diagram blocks
          let inFence: { marker: string; isMermaid: boolean; lines: string[] } | null = null
          let inDiagram: string | null = null
          const nonCodeLines: string[] = []
          const directiveDiagrams: string[] = []
          const mermaidBlocks: string[] = []
          const h2Headings: string[] = []

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i]!
            const trimmed = line.trim()

            if (inDiagram !== null) {
              expect(
                trimmed,
                `Expected immediate closing ::: for :::diagram ${inDiagram} in ${fullPath}:${i + 1}`,
              ).toBe(':::')
              directiveDiagrams.push(inDiagram)
              inDiagram = null
              continue
            }

            if (inFence !== null) {
              if (
                trimmed.startsWith(inFence.marker) &&
                trimmed.replaceAll(inFence.marker[0]!, '').trim() === ''
              ) {
                if (inFence.isMermaid) {
                  mermaidBlocks.push(inFence.lines.join('\n').trim())
                }
                inFence = null
              } else if (inFence.isMermaid) {
                inFence.lines.push(line)
              }
              continue
            }

            const fenceMatch = /^(```+|~~~+)(.*)$/.exec(trimmed)
            if (fenceMatch) {
              const marker = fenceMatch[1]!.slice(0, 3)
              const info = fenceMatch[2]!.trim().toLowerCase()
              inFence = { marker, isMermaid: info === 'mermaid', lines: [] }
              continue
            }

            const diagramMatch = /^:::diagram\s+([A-Za-z0-9_-]+)\s*$/.exec(trimmed)
            if (diagramMatch) {
              inDiagram = diagramMatch[1]!
              continue
            }

            if (line.startsWith('## ')) {
              h2Headings.push(line.slice(3).trim())
            }
            nonCodeLines.push(line)
          }

          expect(inDiagram, `Unclosed :::diagram in ${fullPath}`).toBeNull()
          expect(inFence, `Unclosed code fence in ${fullPath}`).toBeNull()

          // 2. Validate mandatory 5 H2 headings
          for (const reqTitle of REQUIRED_H2_TITLES) {
            expect(h2Headings, `Missing "## ${reqTitle}" in ${fullPath}`).toContain(reqTitle)
          }

          // 3. Validate diagrams match frontmatter & existing Vue components
          if (fm.diagram) {
            expect(
              availableDiagrams.has(fm.diagram),
              `Missing diagram component ${fm.diagram}.vue referenced by ${fullPath}`,
            ).toBe(true)
            expect(
              directiveDiagrams,
              `Frontmatter diagram ${fm.diagram} must have matching :::diagram directive in ${fullPath}`,
            ).toContain(fm.diagram)
            diagramQuestions.push(fm.diagram)
          }
          expect(
            directiveDiagrams.length,
            `Unexpected :::diagram without matching frontmatter.diagram in ${fullPath}`,
          ).toBe(fm.diagram ? 1 : 0)

          // 4. Validate Mermaid blocks have supported diagram headers
          for (const block of mermaidBlocks) {
            const firstLine = block
              .split('\n')
              .map((l) => l.trim())
              .find((l) => l.length > 0 && !l.startsWith('%%'))
            expect(firstLine, `Empty mermaid block in ${fullPath}`).toBeTruthy()
            const matchesHeader = SUPPORTED_MERMAID_HEADERS.some((re) => re.test(firstLine!))
            expect(
              matchesHeader,
              `Unsupported Mermaid header "${firstLine}" in ${fullPath}`,
            ).toBe(true)
          }

          // 5. Reject hotlinked third-party images outside backticks
          const strippedInline = nonCodeLines.join('\n').replace(/`[^`\n]+`/g, '')
          const imgMatch = /!\[[^\]]*\]\((https?:\/\/[^)]+)\)|<img\s+[^>]*src\s*=\s*["']?(https?:\/\/[^"'\s>]+)/i.exec(
            strippedInline,
          )
          expect(imgMatch, `Forbidden external image hotlink found in ${fullPath}`).toBeNull()

          for (const ref of fm.references) {
            expect(isForbiddenImageUrl(ref.url), `Forbidden image domain in ${fullPath}`).toBe(false)
          }
        }
      }
    }

    expect(l2CountByDir.length).toBe(34)
    expect(authoredIds.size).toBe(111)
    expect(diagramQuestions.sort()).toEqual([
      'BinderMmapSvg',
      'HandlerLooperSvg',
      'OkHttpChainSvg',
      'TouchDispatchSvg',
      'VsyncPipelineSvg',
    ])

    // Cross-check every ID in docs/ANDROID_SYLLABUS.md 1-to-1
    const syllabusRaw = fs.readFileSync(SYLLABUS_PATH, 'utf8')
    const syllabusIds = new Set<string>()
    const idRegex = /^\d+\.\s+`(android\.[a-z0-9-]+)`\s+·/gm
    let match: RegExpExecArray | null
    while ((match = idRegex.exec(syllabusRaw)) !== null) {
      syllabusIds.add(match[1]!)
    }

    expect(syllabusIds.size).toBe(111)
    const missingFromContent = [...syllabusIds].filter((id) => !authoredIds.has(id))
    const extraInContent = [...authoredIds].filter((id) => !syllabusIds.has(id))
    expect(missingFromContent, `Syllabus IDs missing markdown files`).toEqual([])
    expect(extraInContent, `Markdown files not listed in syllabus`).toEqual([])
  })
})
