let mermaidModulePromise: Promise<typeof import('mermaid').default> | null = null
let renderQueue: Promise<unknown> = Promise.resolve()
let uniqueIdCounter = 0

async function getMermaid() {
  if (!mermaidModulePromise) {
    mermaidModulePromise = import('mermaid').then((m) => m.default)
  }
  return mermaidModulePromise
}

export function renderMermaidSerialized(
  code: string,
  theme: 'light' | 'dark',
): Promise<string> {
  const task = renderQueue.then(async () => {
    const mermaid = await getMermaid()
    const isDark = theme === 'dark'

    mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: 'base',
      themeVariables: isDark
        ? {
            darkMode: true,
            background: '#121820',
            primaryColor: '#1E293B',
            primaryTextColor: '#E7EDF4',
            primaryBorderColor: '#34D399',
            lineColor: '#94A3B8',
            secondaryColor: '#18222E',
            tertiaryColor: '#0F172A',
            noteBkgColor: '#1E293B',
            noteTextColor: '#E7EDF4',
            fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
            fontSize: '14px',
          }
        : {
            darkMode: false,
            background: '#FFFFFF',
            primaryColor: '#ECFDF5',
            primaryTextColor: '#18201B',
            primaryBorderColor: '#0F9D58',
            lineColor: '#475569',
            secondaryColor: '#F2F5F1',
            tertiaryColor: '#F8FAFC',
            noteBkgColor: '#F8FAFC',
            noteTextColor: '#18201B',
            fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
            fontSize: '14px',
          },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
      },
      sequence: {
        useMaxWidth: true,
      },
    })

    uniqueIdCounter += 1
    const renderId = `mermaid-svg-${uniqueIdCounter}`
    const { svg } = await mermaid.render(renderId, code)
    return svg
  })

  renderQueue = task.catch(() => undefined)
  return task
}
