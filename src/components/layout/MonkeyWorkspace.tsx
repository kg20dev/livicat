/**
 * MonkeyWorkspace — Visual editor for .livicat themes using the Monkeywork engine.
 *
 * This is completely separate from the existing theme system (WorkspaceX).
 * It loads .livicat packages from the marketplace, validates them via the
 * Rust engine, and renders the Scene Graph output in a live preview.
 */

import { useState, useCallback, useEffect } from 'react'
import {
  validateScene,
  renderScene,
  getComponentRegistry,
  type ValidationResult,
  type RenderResult,
  type RegistryResult,
} from '../../lib/monkeywork/TemplateEngine'
import { scanMarketplaceDir, type ThemeMarketplaceEntry } from '../../marketplace/theme'
import { readTextFile } from '@tauri-apps/plugin-fs'
import { resolveResource } from '@tauri-apps/api/path'

/* ─── Types ──────────────────────────────────────────────────── */

type EngineStatus = 'idle' | 'loading' | 'valid' | 'error'

interface EngineState {
  status: EngineStatus
  validation: ValidationResult | null
  render: RenderResult | null
  registry: RegistryResult | null
  error: string | null
}

/* ─── Mock data for preview ──────────────────────────────────── */

/** Same demo messages as ThemePreview — consistent with WorkspaceX */
const MOCK_MESSAGES = [
  { username: 'StreamKing', message: 'Hey everyone! 🎉', avatarSeed: 70 },
  { username: 'NeonNights', message: 'Love the stream! 🔥', avatarSeed: 58 },
  { username: 'GamerPro_99', message: 'How do I save this theme?', avatarSeed: 5 },
  { username: 'PixelPanda', message: 'Can we get more animations?', avatarSeed: 33 },
  { username: 'ShadowFox', message: '🌟 Super Chat — Awesome content!', avatarSeed: 89 },
]

/**
 * Build a complete HTML document with mock data embedded.
 *
 * Instead of relying on doc.write() + DOM manipulation (which is unreliable
 * in Tauri WebViews), we post-process the engine HTML string to inject mock
 * data, then pass it as `srcdoc` on the iframe.
 *
 * The engine produces empty leaf divs for Author/Content/Avatar — this fills
 * them with sample data matching ThemePreview's demo messages.
 *
 * SVG skin paths (url(assets/skins/...)) are converted to inline data URIs
 * so they resolve inside the srcdoc iframe.
 */
async function buildPreviewHtml(
  engineHtml: string,
  variables: Record<string, unknown>,
  packagePath: string
): Promise<string> {
  // 1. Convert SVG skin paths to inline data URIs
  let html = engineHtml
  const svgPaths = new Set<string>()
  const svgRegex = /url\((assets\/skins\/[^)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = svgRegex.exec(html)) !== null) {
    svgPaths.add(match[1])
  }

  // Load each SVG and convert to data URI
  const svgDataUris = new Map<string, string>()
  for (const svgPath of svgPaths) {
    try {
      let svgContent: string
      try {
        // Tauri resource path (production build)
        const resourcePath = await resolveResource(`marketplace/theme/${packagePath}/${svgPath}`)
        svgContent = await readTextFile(resourcePath)
      } catch {
        // Fallback: Vite dev server (development)
        const response = await fetch(`/marketplace/theme/${packagePath}/${svgPath}`)
        if (!response.ok) continue
        svgContent = await response.text()
      }
      // Encode SVG as data URI (URL-encoded for safety)
      const encoded = encodeURIComponent(svgContent).replace(/'/g, '%27').replace(/"/g, '%22')
      svgDataUris.set(svgPath, `data:image/svg+xml,${encoded}`)
    } catch {
      // Skip SVGs that can't be loaded
    }
  }

  // Replace all SVG paths with data URIs in both CSS and HTML
  for (const [path, dataUri] of svgDataUris) {
    const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    html = html.replace(new RegExp(`url\\(${escaped}\\)`, 'g'), `url(${dataUri})`)
  }

  // 2. Resolve CSS variable references and fix token-based colors
  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/)
  if (styleMatch) {
    let css = styleMatch[1]
    // Replace var(--key) references with actual values
    for (const [key, value] of Object.entries(variables)) {
      if (typeof value === 'string' && (value.startsWith('#') || value.startsWith('rgb'))) {
        css = css.replace(new RegExp(`var\\(--${key}\\)`, 'g'), value)
      }
    }
    html = html.replace(styleMatch[0], `<style>${css}</style>`)
  }

  // 3. Inject mock data into leaf elements
  let authorIndex = 0
  let contentIndex = 0

  // Replace empty Author spans with username text
  html = html.replace(
    /(<div class="lc-author"[^>]*>[^<]*<span style="[^"]*">)(<\/span>)/g,
    (_match, prefix: string, suffix: string) => {
      const mock = MOCK_MESSAGES[authorIndex % MOCK_MESSAGES.length]
      authorIndex++
      return `${prefix}${mock.username}${suffix}`
    }
  )

  // Replace empty Content spans with message text
  html = html.replace(
    /(<div class="lc-content"[^>]*>[^<]*<span style="[^"]*">)(<\/span>)/g,
    (_match, prefix: string, suffix: string) => {
      const mock = MOCK_MESSAGES[contentIndex % MOCK_MESSAGES.length]
      contentIndex++
      return `${prefix}${mock.message}${suffix}`
    }
  )

  // Replace empty Avatar divs with avatar images
  let avatarIndex = 0
  html = html.replace(
    /(<div class="lc-avatar"[^>]*>)(\s*)(<\/div>)/g,
    (_match, open: string, _ws: string, close: string) => {
      const mock = MOCK_MESSAGES[avatarIndex % MOCK_MESSAGES.length]
      avatarIndex++
      const url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${mock.avatarSeed}`
      return `${open}<img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%">${close}`
    }
  )

  return html
}

/* ─── Component ──────────────────────────────────────────────── */

export function MonkeyWorkspace() {
  const [engineState, setEngineState] = useState<EngineState>({
    status: 'idle',
    validation: null,
    render: null,
    registry: null,
    error: null,
  })

  const [selectedPackage, setSelectedPackage] = useState<ThemeMarketplaceEntry | null>(null)
  const [sceneJson, setSceneJson] = useState('')
  const [activePackagePath, setActivePackagePath] = useState('')
  const [showRegistry, setShowRegistry] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  // Load component registry on mount
  useEffect(() => {
    getComponentRegistry()
      .then((reg) => setEngineState((prev) => ({ ...prev, registry: reg })))
      .catch(console.error)
  }, [])

  // Render and build preview HTML
  const renderAndPreview = useCallback(async (json: string, pkgPath: string) => {
    setEngineState((prev) => ({ ...prev, status: 'loading', error: null }))

    const validation = await validateScene(json)
    if (!validation.valid) {
      setEngineState((prev) => ({
        ...prev,
        status: 'error',
        validation,
        error: validation.errors.join('\n'),
      }))
      return null
    }

    const render = await renderScene(json)
    setEngineState((prev) => ({
      ...prev,
      status: 'valid',
      validation,
      render,
    }))

    // Resolve variables and build preview (with SVG data URI conversion)
    const variables = (() => {
      try {
        return JSON.parse(json).variables || {}
      } catch {
        return {}
      }
    })()
    return buildPreviewHtml(render.html, variables, pkgPath)
  }, [])

  // Load a .livicat package from the marketplace
  const handleLoadPackage = useCallback(
    async (entry: ThemeMarketplaceEntry) => {
      setSelectedPackage(entry)
      setActivePackagePath(entry.packagePath)
      setEngineState({
        status: 'loading',
        validation: null,
        render: null,
        registry: null,
        error: null,
      })

      try {
        // Load project.livi from the .livicat package
        // Try Tauri resource path first, fall back to Vite dev server
        let json: string

        try {
          // Tauri resource path (production build)
          const resourcePath = await resolveResource(
            `marketplace/theme/${entry.packagePath}/project.livi`
          )
          json = await readTextFile(resourcePath)
        } catch {
          // Fallback: Vite dev server (development)
          const url = `/marketplace/theme/${entry.packagePath}/project.livi`
          const response = await fetch(url)
          if (!response.ok) {
            throw new Error(
              `Failed to load ${url}\nStatus: ${response.status}\n` +
                `Make sure the file exists in public/marketplace/theme/`
            )
          }
          json = await response.text()
        }
        setSceneJson(json)

        const html = await renderAndPreview(json, entry.packagePath)
        if (html) setPreviewHtml(html)
      } catch (err) {
        setEngineState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : String(err),
        }))
      }
    },
    [renderAndPreview]
  )

  // Re-render when scene JSON changes
  const handleReRender = useCallback(async () => {
    if (!sceneJson.trim() || !activePackagePath) return

    try {
      const html = await renderAndPreview(sceneJson, activePackagePath)
      if (html) setPreviewHtml(html)
    } catch (err) {
      setEngineState((prev) => ({
        ...prev,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      }))
    }
  }, [sceneJson, activePackagePath, renderAndPreview])

  // Get available packages
  const packages = scanMarketplaceDir()

  return (
    <div className="flex h-full w-full">
      {/* Left panel — Package list + Editor */}
      <div className="w-1/2 flex flex-col border-r border-outline-variant">
        {/* Header */}
        <div className="px-6 py-4 border-b border-outline-variant">
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-primary">code</span>
            <h2 className="font-headline-md text-headline-md font-bold text-on-surface">
              Monkey Workspace
            </h2>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Scene Graph editor powered by the Monkeywork engine
          </p>
        </div>

        {/* Package selector */}
        <div className="px-6 py-4 border-b border-outline-variant">
          <h3 className="text-label-md font-semibold text-on-surface mb-3">
            Installed .livicat Packages
          </h3>
          <div className="space-y-2">
            {packages.map((pkg) => (
              <button
                key={pkg.id}
                onClick={() => handleLoadPackage(pkg)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  selectedPackage?.id === pkg.id
                    ? 'glass-accent text-on-surface font-bold'
                    : 'glass-light text-on-surface-variant hover:glass-medium'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-label-md font-semibold">{pkg.name}</p>
                    <p className="text-body-xs text-on-surface-variant">{pkg.description}</p>
                  </div>
                  <span className="material-symbols-outlined text-sm">
                    {selectedPackage?.id === pkg.id ? 'check_circle' : 'play_arrow'}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Scene JSON editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="px-6 py-3 flex items-center justify-between border-b border-outline-variant">
            <h3 className="text-label-md font-semibold text-on-surface">project.livi</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={handleReRender}
                disabled={!sceneJson.trim() || engineState.status === 'loading'}
                className="px-3 py-1.5 bg-primary text-on-primary rounded-lg text-label-sm font-medium hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                {engineState.status === 'loading' ? 'Rendering...' : 'Render'}
              </button>
              <button
                onClick={() => setShowRegistry(!showRegistry)}
                className="px-3 py-1.5 glass-light text-on-surface-variant rounded-lg text-label-sm font-medium hover:glass-medium transition-all"
              >
                {showRegistry ? 'Hide' : 'Show'} Registry
              </button>
            </div>
          </div>

          <textarea
            value={sceneJson}
            onChange={(e) => setSceneJson(e.target.value)}
            className="flex-1 w-full p-4 bg-transparent text-body-sm font-mono text-on-surface resize-none focus:outline-none custom-scrollbar"
            placeholder="Select a .livicat package above, or paste Scene Graph JSON here..."
            spellCheck={false}
          />
        </div>

        {/* Validation status */}
        {engineState.validation && (
          <div className="px-6 py-3 border-t border-outline-variant">
            <div className="flex items-center gap-2">
              <span
                className={`material-symbols-outlined ${
                  engineState.status === 'valid' ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {engineState.status === 'valid' ? 'check_circle' : 'error'}
              </span>
              <span className="text-label-sm font-medium text-on-surface">
                {engineState.status === 'valid'
                  ? `Valid — ${engineState.render?.html.length ?? 0} chars HTML, ${engineState.render?.css.length ?? 0} chars CSS`
                  : `${engineState.validation.errors.length} validation error(s)`}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Right panel — Preview + Registry */}
      <div className="w-1/2 flex flex-col">
        {/* Preview header */}
        <div className="px-6 py-4 border-b border-outline-variant flex items-center justify-between">
          <h3 className="text-label-md font-semibold text-on-surface">Live Preview</h3>
          <div className="flex items-center gap-2 text-body-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">monitor</span>
            400×600
          </div>
        </div>

        {/* Preview area */}
        <div className="flex-1 flex items-center justify-center p-6 bg-surface-container">
          {engineState.status === 'idle' ? (
            <div className="text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl mb-4 block">preview</span>
              <p className="text-body-md font-medium">Select a .livicat package to preview</p>
              <p className="text-body-sm mt-1">Choose from the installed packages on the left</p>
            </div>
          ) : engineState.status === 'loading' ? (
            <div className="text-center text-on-surface-variant">
              <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-body-md font-medium">Rendering Scene Graph...</p>
            </div>
          ) : (
            <iframe
              srcDoc={previewHtml ?? undefined}
              className="w-[400px] h-[600px] bg-black border border-outline-variant rounded-lg shadow-lg"
              title="Monkeywork Preview"
              sandbox="allow-scripts"
            />
          )}
        </div>

        {/* Error display */}
        {engineState.error && (
          <div className="px-6 py-4 border-t border-outline-variant bg-red-500/10">
            <p className="text-body-sm text-red-500 font-mono whitespace-pre-wrap">
              {engineState.error}
            </p>
          </div>
        )}

        {/* Component Registry */}
        {showRegistry && engineState.registry && (
          <div className="px-6 py-4 border-t border-outline-variant max-h-64 overflow-y-auto custom-scrollbar">
            <h3 className="text-label-md font-semibold text-on-surface mb-3">
              Component Registry ({Object.keys(engineState.registry.components).length} components)
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(engineState.registry.components).map(([name, comp]) => (
                <div key={name} className="px-3 py-2 glass-light rounded-lg text-body-xs">
                  <p className="font-semibold text-on-surface">{name}</p>
                  <p className="text-on-surface-variant">
                    Slots: {comp.slots.length > 0 ? comp.slots.join(', ') : 'none'}
                  </p>
                  <p className="text-on-surface-variant">
                    Children:{' '}
                    {comp.allowedChildren.length > 0 ? comp.allowedChildren.join(', ') : 'none'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
