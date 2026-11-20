import fs from 'node:fs'
import path from 'node:path'

const distDir = path.resolve(process.cwd(), 'dist')
const indexFile = path.join(distDir, 'index.html')
const fallbackFile = path.join(distDir, '404.html')

if (fs.existsSync(indexFile)) {
  fs.copyFileSync(indexFile, fallbackFile)
  console.log('[post-build] Copied dist/index.html -> dist/404.html for static SPA fallback')
} else {
  console.warn('[post-build] dist/index.html not found, skipping 404.html creation')
}
