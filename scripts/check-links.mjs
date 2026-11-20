import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'

const contentDir = path.resolve(process.cwd(), 'content')
const mdFiles = []

function walk(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (
      entry.isFile() &&
      entry.name.endsWith('.md') &&
      !entry.name.startsWith('_') &&
      entry.name.toLowerCase() !== 'readme.md'
    ) {
      mdFiles.push(full)
    }
  }
}

walk(contentDir)

const urlMap = new Map()
for (const file of mdFiles) {
  const parsed = matter(fs.readFileSync(file, 'utf-8'))
  const refs = Array.isArray(parsed.data?.references) ? parsed.data.references : []
  for (const r of refs) {
    if (r?.url) {
      const list = urlMap.get(r.url) ?? []
      list.push(path.relative(process.cwd(), file))
      urlMap.set(r.url, list)
    }
  }
}

const urls = Array.from(urlMap.keys())
console.log(`[check-links] Found ${urls.length} unique reference URLs across ${mdFiles.length} questions.`)

const failures = []
const concurrency = 6
let idx = 0

async function checkOne(url) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 10000)
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'TechInterviewPrepLinkChecker/1.0' },
    })
    if (res.status === 405 || res.status === 403 || res.status === 400 || res.status === 404 || res.status >= 500) {
      res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'TechInterviewPrepLinkChecker/1.0' },
      })
    }
    if (!res.ok && res.status >= 400) {
      failures.push({ url, status: res.status, files: urlMap.get(url) })
    }
  } catch (err) {
    failures.push({
      url,
      status: err instanceof Error ? err.message : 'Network error',
      files: urlMap.get(url),
    })
  } finally {
    clearTimeout(timer)
  }
}

async function worker() {
  while (idx < urls.length) {
    const current = urls[idx++]
    await checkOne(current)
  }
}

await Promise.all(Array.from({ length: Math.min(concurrency, Math.max(1, urls.length)) }, worker))

if (failures.length > 0) {
  console.warn(`[check-links] ${failures.length} URLs failed or timed out:`)
  for (const f of failures) {
    console.warn(`  - ${f.url} -> ${f.status} (used in: ${f.files.join(', ')})`)
  }
  if (process.argv.includes('--strict')) {
    process.exit(1)
  }
} else {
  console.log('[check-links] All reference URLs verified OK!')
}
