# Livicat OBS/PRISM Integration Plan

## Goal
Enhance Livicat's streaming integration to support OBS Studio, PRISM Live Studio, and any OBS‑based streaming app with a unified “Send to Stream” flow that works out‑of‑the‑box.

## Current Pain Point (Bad UX)
1. User configures theme in Livicat ✅
2. Clicks **Live Preview** → spawns native Tauri WebView window ✅
3. User manually does 4‑5 OBS steps → Add Source → Window Capture → hunt → position

**Result:** 5+ manual steps mid‑stream, repetitive, error‑prone.

## What We Have
| Area | Current State |
|------|---------------|
| **Live Preview** | Tauri window (all platforms) – uses `open_preview_window`, `inject_css`, `close_preview_window` |
| **Existing CSS Export** | `downloadCSSFile()` – generates `.css` file for manual OBS import |
| **Rust Layer** | `src-tauri/src/lib.rs` – command set for preview control |
| **Frontend** | Tauri‑aware hook (`useElectronPreview`) + PreviewArea UI |
| **Store** | `tauri-plugin-store` – theme and session persistence already used |

## Solution Vision
**Two‑track integration:**
1. **WebSocket path** – live, seamless, idempotent: if OBS or PRISM already speaks `obs‑websocket`, use it to inject the Browser Source (CSS hot‑relookup, single source per session).
2. **Local HTTP server path** – universal fallback: Tauri spawns a tiny Axum server (`http://localhost:<PORT>`); Livicat’s CSS runs in an iframe → any streaming app that supports Browser Sources works (PRISM, Streamlabs, etc.).

**UX Change:** Replace **Live Preview** button with **Send to Stream** button that chooses the right path silently. **Keep the native preview window as a design‑tool** – useful for tweaking CSS, shows what the chat looks like without needing a streaming app.

**Preserved UI:** The existing native WebView preview window stays exactly as it is now – user can still open/close it via the Livicat interface for on‑the‑fly CSS testing. The "Send to Stream" flow is completely separate and optional.

---

## Files to Modify

### 1. Rust Changes (`src-tauri`)
| File | Changes |
|------|----------|
| **`src-tauri/src/lib.rs`** | Add 4 new Tauri commands: <br>• `detect_streaming_app()` – probe `ws://localhost:4455` <br>• `obs_send_browser_source()` – create/update OBS/PRISM Browser Source (WebSocket) <br>• `start_chat_server()` – start Axum server that serves CSS + YouTube chat <br>• `save_obs_settings()` / `load_obs_settings()` – persist connection info |
| **`src-tauri/Cargo.toml`** | Add dependencies: <br>• `tokio-tungstenite = { version = "0.21", features = ["native-tls"] }` <br>• `futures-util = "0.3"` <br>• `axum = "0.7"` <br>• `tower = "0.4"` |
| **`src-tauri/src/main.rs`** (if not auto‑discovered) | Register new commands in `tauri.conf.json` (or `src-tauri/tauri.conf.ts`) under `plugins.immediate_invoke.commands` |

### 2. Frontend Changes (`src/`)
| Category | Files |
|----------|-------|
| **Components** | `src/components/layout/OBSConnectionPanel.tsx` (one‑time setup) <br> `src/components/ui/StreamSender.tsx` (replaces Live Preview button) |
| **Hooks** | `src/hooks/useStreamIntegration.ts` – manages WebSocket detection, HTTP server start, and source injection <br> `src/hooks/useOBSSettings.ts` – read/write `tauri-plugin-store` `obs.json` |
| **Services** | `src/services/StreamService.ts` – orchestrates send‑to‑stream (WebSocket → HTTP fallback) <br> `src/services/OBSSettingsService.ts` – persistence helper |
| **UI Updates** | `src/components/layout/PreviewArea.tsx` – **preserve `PreviewArea.Actions` for native preview** + add **StreamSender** alongside it <br> `src/App.tsx` – add `OBSConnectionPanel` when no settings present (modal or separate tab) |
| **Types** | `src/types/stream.ts` – `StreamingAppType` (`none` | `obs_compatible` | `other`), `OBSSettings`, `ChatServerInfo` |

### 3. Supporting & Constants
| File | Purpose |
|------|---------|
| **`src/constants/stream.ts`** | Port consts (`OBS_WEBSOCKET_PORT = 4455`, `HTTP_CHAT_PORT = 7842`) <br> Source name (`LIVICAT_CHAT_SOURCE = "Livicat Chat"`) |
| **`src/components/ui/Toast.tsx`** | New toast variant for "Stream sent: updated source" vs "Stream sent: created source" |

---

## Step‑by‑Step Implementation

### Phase 1: Core Rust Commands (Week 1)
1. **Add dependencies** to `Cargo.toml`.
2. **Implement** `detect_streaming_app()`: 
   - Connect to `ws://localhost:4455` with 1s timeout (async).
   - Return `Ok("obs_compatible")` on success; `Err(_ )` on connect error.
3. **Implement** `obs_send_browser_source()`:
   - Connect + auth (if password present, handle challenge/response).
   - GET source list → if `LIVICAT_CHAT_SOURCE` exists → `SetInputSettings` <br>   - Else → `CreateInput` (create Browser Source in requested scene).
   - Return `Ok("updated")` or `Ok("created")`.
4. **Implement** `start_chat_server()`:
   - Axum router: `GET /` → return HTML with `<style>` + `<iframe src="https://www.youtube.com/live_chat?v=VIDEO_ID">`.
   - Bind to `127.0.0.1:<HTTP_CHAT_PORT>`.
   - Spawn as background task (dropped when app exits).
5. **Implement** `save_obs_settings()` / `load_obs_settings()` using `tauri-plugin-store`.

### Phase 2: Settings Persistence & Connection Panel (Week 2)
1. **Add store schema** to `src/hooks/useOBSSettings.ts`:
   ```ts
   export interface OBSSettings {
     obsUrl?: string;           // e.g. ws://localhost:4455
     obsPassword?: string;
     sourceName?: string;       // default "Livicat Chat"
     defaultScene?: string;
   }
   ```
2. **Build `OBSConnectionPanel`** component:
   - Input `obsUrl` (prefilled from settings)
   - Optional password field (show only if URL requires auth)
   - Save button → calls `invoke('save_obs_settings', settings)`
   - Validation: if URL provided, probe `ws://localhost:4455` (soft‑fail on error)
3. **Add to App** (conditional render when `!hasStoredOBSSettings`).

### Phase 3: Stream Sender Button (Week 3)
1. **Add `StreamSender` UI** in `PreviewArea.Actions`:
   - One button labeled “Send to Stream”.
   - On click:
     - Load stored OBS settings.
     - If no settings OR URL missing → show `OBSConnectionPanel` modal.
     - Else → call `invoke('detect_streaming_app')`.
2. **Implement `useStreamIntegration`** logic:
   - On detection success → call `obs_send_browser_source()` with CSS, videoId, sourceName, scene.
   - On detection failure → call `start_chat_server()` (spawn if not running) → show toast with manual instructions:
     ```
     Add this URL as Browser Source in your streaming app:
     http://localhost:7842
     ```
3. **Scene fetching** (optional, nice‑to‑have):
   - Add `get_obs_scenes()` command to Rust (WebSocket `GetSceneList`).
   - Populate dropdown in connection panel.

### Phase 4: CSS Hot‑Reload (Obs WebSocket Path)
1. **Listen to theme changes** (`injectedCSS` updates) in the StreamSender component.
2. **Debounce rapid updates** (300ms).
3. **When stream is live (WebSocket path)** → call `obs_send_browser_source()` with just the CSS fields, keeping sourceName constant → OBS will auto‑refresh the Browser Source.

### Phase 5: Tests (Week 4)
1. **Rust unit tests**: mock tungstenite connections, verify auth flow, SetInputSettings vs CreateInput logic.
2. **Frontend tests** (`src/services/StreamService.test.ts`):
   - Mock `detect_streaming_app` → success path.
   - Mock `obs_send_browser_source` → verify request payload.
   - Mock `start_chat_server` → ensure server spawns.
3. **Integration test** (if time): real OBS WebSocket test (skipped if not running).

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| **PRISM WebSocket not enabled** | Medium | Fallback HTTP server; clear instructions to enable via PRISM UI |
| **Password auth fails** | Medium | Graceful error handling; users can retry with correct password |
| **Port conflicts** (`4455` or `7842`) | Low | Use `localhost:port` for server; WebSocket connection can be made configurable in future |
| **User stuck without connection** | Low | Keep native preview window as a fallback; hide “Send to Stream” if no settings provided |

---

## Metrics & Validation

| Metric | Definition | Target |
|--------|------------|--------|
| **Setup time** | Time from clicking “Send to Stream” to source live in OBS | <5 seconds when WebSocket works |
| **Manual fallback rate** | % of users needing HTTP server fallback | <20 % (most have OBS enabled) |
| **Source updates** | Number of CSS/hot‑reload calls without duplicates | 0 duplicate sources after first click |
| **Retention** | Repeat usage of “Send to Stream” over weekly streams | >80 % of active streamers |

---

## Immediate Next Steps (This Sprint)

1. **Add Rust commands** (`detect_streaming_app`, `obs_send_browser_source`, `start_chat_server`).
2. **Add store integration** for OBS settings.
3. **Build connection panel** and show it when no stored settings.
4. **Replace preview button** with StreamSender (conditional UI).

**Return in 2 weeks for Phase 2–4.**

---

## Quality Gates

- **No breaking changes** to existing preview flow – keep it as design tool.
- **All new features** are opt‑in (require explicit user to enable WebSocket path via stored URL).
- **Error handling** with clear user feedback (toast for success/failure).
- **Tests** cover both success and failure paths.
- **Documentation** – update README with step‑by‑step guide for PRISM users.

---

## Timeline (Approximate)

```
Week 1: Core Rust commands
Week 2: Settings persistence + connection panel
Week 3: Stream Sender UI + integration logic
Week 4: Hot‑reload + tests + polish
```

**Goal**: End of Week 3 we have a stable “Send to Stream” that works for both OBS and PRISM/Streamlabs out‑of‑the‑box.