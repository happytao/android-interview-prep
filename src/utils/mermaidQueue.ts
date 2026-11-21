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
            background: '#16181D',
            primaryColor: '#17253B',
            primaryTextColor: '#F5F5F7',
            primaryBorderColor: '#3B82F6',
            secondaryColor: '#1E2430',
            secondaryTextColor: '#E2E8F0',
            secondaryBorderColor: '#334155',
            tertiaryColor: '#1E2128',
            tertiaryTextColor: '#C7C7CC',
            tertiaryBorderColor: '#334155',
            lineColor: '#64748B',
            textColor: '#CBD5E1',
            mainBkg: '#17253B',
            nodeBorder: '#3B82F6',
            clusterBkg: '#1A1E27',
            clusterBorder: '#334155',
            edgeLabelBackground: '#16181D',
            noteBkgColor: '#17253B',
            noteBorderColor: '#2997FF',
            noteTextColor: '#E2E8F0',
            actorBkg: '#17253B',
            actorBorder: '#2997FF',
            actorTextColor: '#F5F5F7',
            signalColor: '#94A3B8',
            signalTextColor: '#CBD5E1',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
            fontSize: '13px',
          }
        : {
            darkMode: false,
            background: '#FFFFFF',
            primaryColor: '#EFF6FF',
            primaryTextColor: '#0F172A',
            primaryBorderColor: '#93C5FD',
            secondaryColor: '#F8FAFC',
            secondaryTextColor: '#1E293B',
            secondaryBorderColor: '#CBD5E1',
            tertiaryColor: '#F1F5F9',
            tertiaryTextColor: '#334155',
            tertiaryBorderColor: '#CBD5E1',
            lineColor: '#64748B',
            textColor: '#475569',
            mainBkg: '#EFF6FF',
            nodeBorder: '#93C5FD',
            clusterBkg: '#F8FAFC',
            clusterBorder: '#CBD5E1',
            edgeLabelBackground: '#FFFFFF',
            noteBkgColor: '#EFF6FF',
            noteBorderColor: '#93C5FD',
            noteTextColor: '#0F172A',
            actorBkg: '#EFF6FF',
            actorBorder: '#0071E3',
            actorTextColor: '#0F172A',
            signalColor: '#475569',
            signalTextColor: '#475569',
            fontFamily:
              '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "PingFang SC", "Microsoft YaHei", sans-serif',
            fontSize: '13px',
          },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis',
        padding: 16,
        nodeSpacing: 42,
        rankSpacing: 50,
      },
      sequence: {
        useMaxWidth: true,
        boxMargin: 10,
        messageMargin: 36,
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
