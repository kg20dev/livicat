import { useState, useEffect, useCallback } from 'react'
import { TauriService } from '../../services/TauriService'
import { useOBSSettings } from '../../hooks/useOBSSettings'
import type { OBSSettings } from '../../hooks/useOBSSettings'

interface OBSConnectionPanelProps {
  onConnected?: (newSettings: OBSSettings) => void
  onCancel?: () => void
}

type PanelState = 'form' | 'connecting' | 'connected' | 'error'

export function OBSConnectionPanel({ onConnected, onCancel }: OBSConnectionPanelProps) {
  const { settings, saveSettings } = useOBSSettings()

  const [url, setUrl] = useState(settings.obsUrl || 'ws://localhost:4455')
  const [password, setPassword] = useState(settings.obsPassword || '')
  const [sourceName, setSourceName] = useState(settings.sourceName || 'Livicat Chat')
  const [selectedScene, setSelectedScene] = useState(settings.defaultScene || '')

  const [state, setState] = useState<PanelState>('form')
  const [errorMsg, setErrorMsg] = useState('')
  const [scenes, setScenes] = useState<string[]>([])

  const isConfigured = settings.obsUrl?.startsWith('ws://') || settings.obsUrl?.startsWith('wss://')
  const isFormValid = url.trim().startsWith('ws://') || url.trim().startsWith('wss://')

  // Auto-connect on mount if already configured
  useEffect(() => {
    if (isConfigured && settings.obsUrl) {
      doConnect(settings.obsUrl, settings.obsPassword)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const doConnect = useCallback(
    async (wsUrl: string, wsPassword?: string) => {
      setState('connecting')
      setErrorMsg('')

      try {
        const sceneList = await TauriService.getScenes(wsUrl, wsPassword)

        if (sceneList) {
          // Pre-select saved scene if it exists in list, otherwise first scene
          const savedScene = settings.defaultScene
          const match =
            savedScene && sceneList.includes(savedScene) ? savedScene : sceneList[0] || ''
          setScenes(sceneList)
          setSelectedScene(match || selectedScene)
          setState('connected')
        } else {
          setState('error')
          setErrorMsg('Connected but no scene data returned.')
        }
      } catch (err) {
        setState('error')
        setErrorMsg(err instanceof Error ? err.message : String(err))
      }
    },
    [settings.defaultScene, selectedScene]
  )

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    await doConnect(url, password || undefined)
  }

  const handleApply = async () => {
    const newSettings = {
      obsUrl: url,
      obsPassword: password,
      sourceName,
      defaultScene: selectedScene,
    }
    await saveSettings(newSettings)
    onConnected?.(newSettings)
  }

  const handleSkip = async () => {
    const newSettings = {
      obsUrl: 'http-fallback',
      obsPassword: password,
      sourceName,
      defaultScene: selectedScene,
    }
    await saveSettings(newSettings)
    onConnected?.(newSettings)
  }

  const handleBackToForm = () => {
    setState('form')
  }

  // ── Shared section: scene selector + source name ────────────

  const sceneSourceFields = (
    <>
      {/* Scene selector */}
      {scenes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-label-sm font-bold text-on-surface">Target Scene</label>
          <select
            value={selectedScene}
            onChange={(e) => setSelectedScene(e.target.value)}
            className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          >
            {scenes.map((scene) => (
              <option key={scene} value={scene}>
                {scene}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-on-surface-variant">
            The browser source will be placed in this scene.
          </p>
        </div>
      )}

      {/* Source name */}
      <div className="flex flex-col gap-1.5">
        <label className="text-label-sm font-bold text-on-surface">Browser Source Name</label>
        <input
          type="text"
          value={sourceName}
          onChange={(e) => setSourceName(e.target.value)}
          placeholder="Livicat Chat"
          className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
        />
        <p className="text-[10px] text-on-surface-variant">
          Idempotent name. The source will be updated, not duplicated.
        </p>
      </div>
    </>
  )

  // ── Render: Connecting ──────────────────────────────────────

  if (state === 'connecting') {
    return (
      <div className="glass-panel w-[400px] p-6 rounded-xl flex flex-col items-center gap-4">
        <span className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-body-sm text-on-surface-variant">Connecting to OBS WebSocket...</p>
        <button
          onClick={onCancel}
          className="text-label-sm text-on-surface-variant hover:text-on-surface underline mt-2"
        >
          Cancel
        </button>
      </div>
    )
  }

  // ── Render: Connected ───────────────────────────────────────

  if (state === 'connected') {
    return (
      <div className="glass-panel w-[400px] p-6 rounded-xl flex flex-col">
        <div className="flex items-center gap-3 mb-6">
          <span className="material-symbols-outlined text-[32px] text-success">check_circle</span>
          <div>
            <h2 className="text-body-lg font-bold text-on-surface">Stream Integration</h2>
            <p className="text-label-sm text-on-surface-variant">
              Connected to <span className="font-mono text-primary">{url}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          {sceneSourceFields}

          <div className="flex items-center gap-3 mt-2">
            <button
              onClick={handleBackToForm}
              className="flex-1 h-10 rounded-lg text-label-md font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Change Connection
            </button>
            <button
              onClick={handleApply}
              className="flex-[1.5] h-10 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:bg-primary-hover active:bg-primary-active transition-colors"
            >
              Apply & Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── Render: Error ───────────────────────────────────────────

  if (state === 'error') {
    return (
      <div className="glass-panel w-[380px] p-5 rounded-xl flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-[28px] text-error shrink-0 mt-0.5">
            error_outline
          </span>
          <div className="min-w-0">
            <h2 className="text-body-lg font-bold text-on-surface">Connection Failed</h2>
            <p className="text-label-sm text-on-surface-variant truncate">{url}</p>
          </div>
        </div>

        {/* Backend error */}
        <div className="p-2.5 bg-error/10 border border-error/20 rounded-lg">
          <p className="text-label-sm text-error font-mono leading-snug break-words">{errorMsg}</p>
        </div>

        {/* Compact troubleshooting */}
        <div className="flex flex-col gap-1.5 p-3 bg-surface-container-high rounded-lg">
          <p className="text-label-xs font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[12px]">construction</span>
            Enable WebSocket in OBS
          </p>
          <p className="text-label-xs text-on-surface-variant leading-snug">
            <strong className="text-on-surface">Tools</strong> →{' '}
            <strong className="text-on-surface">WebSocket Server Settings</strong> → check{' '}
            <strong className="text-on-surface">Enable WebSocket Server</strong>
          </p>
          <p className="text-label-xs text-on-surface-variant/60">
            PRISM: Settings → Broadcast → OBS WebSocket → Enable
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-9 rounded-lg text-label-sm font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Dismiss
            </button>
          )}
          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 h-9 rounded-lg text-label-sm font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
          >
            Use HTTP
          </button>
          <button
            type="button"
            onClick={handleBackToForm}
            className="flex-[1.5] h-9 rounded-lg bg-primary text-on-primary text-label-sm font-bold hover:bg-primary-hover active:bg-primary-active transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  // ── Render: Form (idle) ─────────────────────────────────────

  return (
    <div className="glass-panel w-[400px] p-6 rounded-xl flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <span className="material-symbols-outlined text-[32px] text-primary">sensors</span>
        <div>
          <h2 className="text-body-lg font-bold text-on-surface">Stream Integration</h2>
          <p className="text-label-sm text-on-surface-variant">Connect OBS or PRISM</p>
        </div>
      </div>

      <form onSubmit={handleConnect} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-label-sm font-bold text-on-surface">WebSocket URL</label>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="ws://localhost:4455"
            className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-label-sm font-bold text-on-surface">
            Password{' '}
            <span className="font-normal text-on-surface-variant opacity-70">(Optional)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank if disabled"
            className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>

        {sceneSourceFields}

        <div className="flex items-center gap-3 mt-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 h-10 rounded-lg text-label-md font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={handleSkip}
            className="flex-1 h-10 rounded-lg text-label-md font-bold text-on-surface-variant hover:text-on-surface hover:bg-surface-variant transition-colors"
            title="Use the local HTTP server fallback instead of WebSocket"
          >
            Skip & use Fallback
          </button>

          <button
            type="submit"
            disabled={!isFormValid}
            className="flex-[1.5] h-10 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            Connect
          </button>
        </div>
      </form>
    </div>
  )
}
