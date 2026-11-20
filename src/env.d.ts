/// <reference types="vite/client" />

declare module 'virtual:question-manifest' {
  import type { QuestionManifest } from '@/types/interview'
  export const manifest: QuestionManifest
}

declare module 'virtual:search-index' {
  export const searchIndexJson: string
}

declare module '*.md?compiled' {
  import type { CompiledQuestion } from '@/types/interview'
  const compiled: CompiledQuestion
  export default compiled
}
