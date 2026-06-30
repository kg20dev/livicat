import React, { useState } from 'react'
import { TauriService } from '../../services/TauriService'
import { useOBSSettings } from '../../hooks/useOBSSettings'

interface OBSConnectionPanelProps {
  onConnected?: () => void
  onCancel?: () => void
}

export function OBSConnectionPanel({ onConnected, onCancel }: OBSConnectionPanelProps) {
  const { settings, saveSettings } = useOBSSettings()
  
  const [url, setUrl] = useState(settings.obsUrl || 'ws://localhost:4455')
  const [password, setPassword] = useState(settings.obsPassword || '')
  const [sourceName, setSourceName] = useState(settings.sourceName || 'Livicat Chat')
  
  const [status, setStatus] = useState<'idle' | 'probing' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('probing')
    setErrorMsg('')
    
    // Attempt detection via Tauri service
    const res = await TauriService.detectStreamingApp()
    
    if (res && res.detected === 'obs_compatible') {
      setStatus('success')
      await saveSettings({
        obsUrl: url,
        obsPassword: password,
        sourceName,
      })
      setTimeout(() => {
        onConnected?.()
      }, 1000)
    } else {
      setStatus('error')
      setErrorMsg('Could not detect OBS WebSocket. Is OBS running and WebSocket enabled?')
    }
  }

  const handleSkip = async () => {
    // Save empty connection to force fallback mode
    await saveSettings({ obsUrl: '' })
    onConnected?.()
  }

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
            Password <span className="font-normal text-on-surface-variant opacity-70">(Optional)</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank if disabled"
            className="w-full h-10 px-3 bg-surface border border-outline rounded-lg text-body-sm text-on-surface outline-none focus:border-primary transition-colors"
          />
        </div>
        
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
        
        {status === 'error' && (
          <div className="flex items-start gap-2 p-3 bg-error/10 text-error rounded-lg border border-error/20 mt-2">
            <span className="material-symbols-outlined text-[16px]">error</span>
            <span className="text-label-sm leading-tight">{errorMsg}</span>
          </div>
        )}
        
        {status === 'success' && (
          <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-lg border border-success/20 mt-2">
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span className="text-label-sm font-bold">Connected successfully!</span>
          </div>
        )}
        
        <div className="flex items-center gap-3 mt-4">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={status === 'probing' || status === 'success'}
              className="flex-1 h-10 rounded-lg text-label-md font-bold text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
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
            disabled={status === 'probing' || status === 'success' || !url}
            className="flex-[1.5] h-10 rounded-lg bg-primary text-on-primary text-label-md font-bold hover:bg-primary-hover active:bg-primary-active transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {status === 'probing' ? (
              <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
            ) : (
              'Connect'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}
