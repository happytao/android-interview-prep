import type { CompiledQuestion } from '@/types/interview'

const compiledModules = import.meta.glob<{ default: CompiledQuestion }>('/content/**/*.md', {
  query: '?compiled',
})

const cache = new Map<string, Promise<CompiledQuestion>>()

export function loadCompiledQuestion(sourcePath: string): Promise<CompiledQuestion> {
  const existing = cache.get(sourcePath)
  if (existing) return existing

  const loader = compiledModules[sourcePath]
  if (!loader) {
    return Promise.reject(new Error(`Compiled question loader not found for "${sourcePath}"`))
  }

  const promise = loader()
    .then((mod) => mod.default)
    .catch((err) => {
      cache.delete(sourcePath)
      throw err
    })
  cache.set(sourcePath, promise)
  return promise
}
