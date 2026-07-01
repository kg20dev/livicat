use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_aptabase::EventTracker;

mod obs;
mod processor;
mod renderer;
mod sentry;
mod webview_chat;
use ::sentry::Level as SentryLevel;

#[cfg(target_os = "windows")]
pub(crate) const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

#[cfg(target_os = "macos")]
pub(crate) const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
pub(crate) const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

struct PreviewState {
    window_label: Option<String>,
}

type SharedPreviewState = Arc<Mutex<PreviewState>>;

/// Holds handles for the active chat session.
struct ChatState {
    renderer_handle: Option<renderer::RendererHandle>,
    video_id: Option<String>,
}

impl ChatState {
    fn new() -> Self {
        Self {
            renderer_handle: None,
            video_id: None,
        }
    }
}

type SharedChatState = Arc<Mutex<ChatState>>;

#[tauri::command]
async fn open_preview_window(
    video_id: String,
    css: String,
    always_on_top: bool,
    auto_scroll: bool,
    app: AppHandle,
    state: tauri::State<'_, SharedPreviewState>,
) -> Result<(), String> {
    {
        let state_guard = state
            .lock()
            .map_err(|e| format!("State lock error: {}", e))?;
        if let Some(label) = state_guard.window_label.as_deref() {
            if let Some(win) = app.get_webview_window(label) {
                let _ = win.close();
            }
        }
    }

    let window_label = format!("preview-{}", video_id);
    let chat_url = format!(
        "https://www.youtube.com/live_chat?is_popout=1&v={}",
        video_id
    );

    println!("[Livicat Tauri] Opening preview for video: {}", video_id);

    // Add breadcrumb for tracking
    sentry::add_breadcrumb(
        "preview",
        &format!("Opening preview window (video ID: {})", video_id),
        SentryLevel::Info,
    );

    {
        let mut state_guard = state
            .lock()
            .map_err(|e| format!("State lock error: {}", e))?;
        state_guard.window_label = Some(window_label.clone());
    }

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(
            chat_url
                .parse()
                .map_err(|e| format!("Invalid URL: {}", e))?,
        ),
    )
    .title("Livicat — Live Chat Preview")
    .inner_size(420.0, 700.0)
    .min_inner_size(320.0, 480.0)
    .always_on_top(always_on_top)
    .user_agent(PREVIEW_USER_AGENT)
    .on_page_load(move |window, payload| {
        let url = window.url().ok();
        println!("[Livicat] Page load event: {:?}, url={:?}", payload, url);

        match payload.event() {
            tauri::webview::PageLoadEvent::Started => {
                // Inject Sentry before page scripts run, so it can catch
                // any JS errors during initial page load.
                if let Err(e) = inject_sentry_to_window(&window) {
                    eprintln!("[Livicat] Sentry injection failed: {}", e);
                }
            }
            tauri::webview::PageLoadEvent::Finished => {
                // Report navigation failures to Sentry
                if let Some(url_str) = url.as_ref().map(|u| u.to_string()) {
                    if url_str.contains("error") || url_str.contains("blank") {
                        eprintln!("[Livicat] Preview navigated to error page: {}", url_str);
                        sentry::capture_error(&format!(
                            "Preview navigated to error page (WebView2 crash): {}",
                            url_str
                        ));
                        sentry::add_breadcrumb(
                            "webview_error",
                            &format!("Preview error page: {}", url_str),
                            SentryLevel::Error,
                        );
                        return;
                    }
                }

                // Inject CSS after the page finishes loading.
                // On Windows (WebView2), eval() before NavigationCompleted
                // fires into an uninitialized JS context, causing crashes.
                // On macOS (WKWebView) it's more forgiving but still unsafe.
                // Waiting for Finished guarantees the JS environment is ready.
                if let Err(e) = inject_css_to_window(&window, &css, auto_scroll) {
                    eprintln!("[Livicat] CSS injection via page load failed: {}", e);
                    sentry::capture_error(&format!("CSS injection via page load failed: {}", e));
                    sentry::add_breadcrumb(
                        "css_injection",
                        &format!("CSS injection via page load failed: {}", e),
                        SentryLevel::Error,
                    );
                } else {
                    println!("[Livicat] CSS injected on page load");
                    sentry::add_breadcrumb(
                        "css_injection",
                        &format!("CSS injected on page load ({} bytes)", css.len()),
                        SentryLevel::Info,
                    );
                }
            }
        }
    })
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    window
        .show()
        .map_err(|e| format!("Failed to show window: {}", e))?;

    // Track preview opened for adoption metrics
    let version = env!("CARGO_PKG_VERSION");
    let device_id = sentry::get_device_hash();
    sentry::track_feature("feature.preview_opened", version, &device_id);

    //     // OBS Window Capture workaround: force periodic repaints to refresh DWM thumbnail
    //     // Without this, OBS Window Capture can't see the window (Display Capture works fine)
    //     #[cfg(target_os = "windows")]
    //     {
    //         let window_clone = window.clone();
    //         std::thread::spawn(move || {
    //             loop {
    //                 std::thread::sleep(std::time::Duration::from_millis(500));
    //                 // Trigger a repaint without visual change - forces DWM to refresh the thumbnail
    //                 match window_clone.eval("window.dispatchEvent(new Event('resize'))") {
    //                     Ok(_) => {}
    //                     Err(e) => {
    //                         eprintln!("[Livicat] OBS repaint failed: {:?}", e);
    //                         break;
    //                     }
    //                 }
    //             }
    //         });
    //     }

    Ok(())
}

#[tauri::command]
async fn inject_css(
    css: String,
    always_on_top: bool,
    auto_scroll: bool,
    app: AppHandle,
    state: tauri::State<'_, SharedPreviewState>,
) -> Result<(), String> {
    let state_guard = state
        .lock()
        .map_err(|e| format!("State lock error: {}", e))?;

    if let Some(label) = state_guard.window_label.as_deref() {
        if let Some(window) = app.get_webview_window(label) {
            println!("[Livicat Tauri] Injecting CSS, length: {}", css.len());

            // Always on top — apply dynamically to already-open window
            let _ = window.set_always_on_top(always_on_top);

            // Add breadcrumb for CSS injection
            sentry::add_breadcrumb(
                "css_injection",
                "Re-injecting CSS to existing preview window",
                SentryLevel::Info,
            );

            inject_css_to_window(&window, &css, auto_scroll)?;
            return Ok(());
        }
    }

    println!("[Livicat Tauri] No preview window to inject CSS into");
    Ok(())
}

#[tauri::command]
async fn close_preview_window(
    app: AppHandle,
    state: tauri::State<'_, SharedPreviewState>,
) -> Result<(), String> {
    let mut state_guard = state
        .lock()
        .map_err(|e| format!("State lock error: {}", e))?;

    if let Some(label) = state_guard.window_label.as_deref() {
        if let Some(window) = app.get_webview_window(label) {
            // Add breadcrumb for window close
            sentry::add_breadcrumb("preview", "Closing preview window", SentryLevel::Info);

            let _ = window.close();

            // Track preview closed for adoption metrics
            let version = env!("CARGO_PKG_VERSION");
            let device_id = sentry::get_device_hash();
            sentry::track_feature("feature.preview_closed", version, &device_id);
        }
        state_guard.window_label = None;
        println!("[Livicat Tauri] Preview window closed");
        return Ok(());
    }

    println!("[Livicat Tauri] No preview window to close");
    Ok(())
}

/// Start the chat system for a given video.
///
/// Launches:
///   1. Renderer (HTTP server on random port)
///   2. Hidden Tauri WebView (navigates to YouTube live chat, captures DOM)
///
/// The WebView injects CSS + a MutationObserver that sends captured
/// messages to the renderer via `fetch POST /ingest`. The renderer
/// serves the styled chat page to OBS via browser source.
///
/// Returns `renderer_port` — the port the renderer is listening on.
#[tauri::command]
async fn start_chat(
    app: AppHandle,
    video_id: String,
    css: String,
    hide_atsign: bool,
    state: tauri::State<'_, SharedChatState>,
    preview_state: tauri::State<'_, SharedPreviewState>,
) -> Result<u16, String> {
    // ── 0. Tear down any existing session ──────────────────────
    let old_renderer = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.renderer_handle.take()
    };
    if let Some(handle) = old_renderer {
        handle.shutdown().await;
    }
    // Close any lingering chat WebView
    if let Some(window) = app.get_webview_window("livicat-chat") {
        let _ = window.close();
        // Brief pause to let Tauri release the window label before
        // we create a new one with the same label below.
        tokio::time::sleep(Duration::from_millis(300)).await;
    }

    // Close the preview window (if open) — streaming replaces the preview
    if let Ok(mut ps) = preview_state.lock() {
        if let Some(label) = ps.window_label.as_deref() {
            if let Some(win) = app.get_webview_window(label) {
                let _ = win.close();
            }
            ps.window_label = None;
        }
    }

    // ── 1. Create shared store ─────────────────────────────────
    let store = processor::MessageStore::new();

    // ── 2. Start renderer ──────────────────────────────────────
    let css_clone = css.clone();
    let store_for_webview = store.clone(); // clone before store is moved into renderer
    let renderer_handle = renderer::start_renderer(store, css_clone)
        .await
        .map_err(|e| format!("Failed to start renderer: {e}"))?;
    let port = renderer_handle.port;
    log::info!("[chat] Renderer started on port {port}");

    // ── 4. Start hidden WebView chat ───────────────────────────
    // The WebView's observer writes captured messages to
    // `location.hash`. A Rust poll loop reads the hash, decodes
    // messages, and pushes to the MessageStore → SSE broadcast.
    webview_chat::start_webview_chat(
        &app,
        &video_id,
        &css,
        hide_atsign,
        store_for_webview,
    )
    .await?;

    // ── 5. Store handles ───────────────────────────────────────
    {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.renderer_handle = Some(renderer_handle);
        s.video_id = Some(video_id);
    }

    log::info!("[chat] All components started");
    Ok(port)
}

/// Stop the chat system and clean up all resources.
/// Live-update the renderer's CSS without restarting the stream.
///
/// Proxies the CSS to the renderer's HTTP endpoint from Rust, bypassing
/// the WebView's Content-Security-Policy which blocks fetch to localhost.
#[tauri::command]
async fn update_renderer_css(
    css: String,
    state: tauri::State<'_, SharedChatState>,
) -> Result<(), String> {
    let port = {
        let s = state.lock().map_err(|e| format!("State lock error: {e}"))?;
        s.renderer_handle.as_ref().map(|h| h.port)
    };
    match port {
        Some(port) => {
            let client = reqwest::Client::new();
            client
                .post(&format!("http://127.0.0.1:{port}/update-css"))
                .body(css)
                .send()
                .await
                .map_err(|e| format!("Failed to send CSS to renderer: {e}"))?;
            Ok(())
        }
        None => Err("No active renderer session".to_string()),
    }
}

#[tauri::command]
async fn stop_chat(
    app: AppHandle,
    state: tauri::State<'_, SharedChatState>,
) -> Result<(), String> {
    // Close the WebView chat window first
    if let Some(window) = app.get_webview_window("livicat-chat") {
        let _ = window.close();
    }
    // Then shut down the renderer
    let renderer_handle = {
        let mut s = state.lock().map_err(|e| e.to_string())?;
        s.renderer_handle.take()
    };
    if let Some(handle) = renderer_handle {
        handle.shutdown().await;
    }
    log::info!("[chat] All components stopped");
    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    // Read version from Cargo.toml at compile time — always matches the binary
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn track_feature_event(name: String) {
    let version = env!("CARGO_PKG_VERSION");
    let device_id = sentry::get_device_hash();
    sentry::track_feature(&name, version, &device_id);
}

#[tauri::command]
async fn trigger_crash_test(crash_type: String) -> Result<(), String> {
    match crash_type.as_str() {
        "panic" => {
            println!("[Livicat] Triggering test panic for Sentry verification");
            sentry::trigger_test_panic();
            Ok(())
        }
        "fake_crash" => {
            println!("[Livicat] Sending fake crash event to Sentry");
            sentry::send_fake_crash_event();
            Ok(())
        }
        "fake_error" => {
            println!("[Livicat] Sending fake error with stack trace");
            sentry::send_fake_error_with_stacktrace();
            Ok(())
        }
        "scenario" => {
            println!("[Livicat] Sending complete test scenario");
            sentry::send_test_scenario();
            Ok(())
        }
        _ => Err(format!(
            "Unknown crash type: {}. Use: panic, fake_crash, fake_error, scenario",
            crash_type
        )),
    }
}

fn inject_css_to_window(
    window: &WebviewWindow,
    css: &str,
    auto_scroll: bool,
) -> Result<(), String> {
    println!("[Livicat] Attempting CSS injection ({} bytes)", css.len());

    let script = format!(
        r#"(function() {{
            try {{
                var existing = document.getElementById('livicat-css');
                if (existing) {{
                    existing.remove();
                }}
                var style = document.createElement('style');
                style.id = 'livicat-css';
                style.textContent = {};
                document.head.appendChild(style);
            }} catch(e) {{
                console.error('[Livicat] CSS injection error:', e);
            }}

            function __lc_scroll() {{
                var s = document.querySelector('#item-scroller') || document.querySelector('yt-live-chat-item-list-renderer #item-scroller');
                if (s) {{ s.scrollTop = s.scrollHeight; }}
            }}
            [0, 300, 1000, 2500].forEach(function(t) {{ setTimeout(__lc_scroll, t); }});
            console.log('[Livicat] Scroll-to-bottom scheduled');

            window.__lc_auto_scroll = {};
            function __lc_click_show_more() {{
                if (!window.__lc_auto_scroll) return;
                var btn = document.querySelector('yt-icon-button#show-more button#button');
                if (btn) {{
                    btn.click();
                    console.log('[Livicat] Auto-clicked show-more button');
                }}
            }}
            if (window.__lc_auto_scroll && !window.__livicat_show_more_obs) {{
                window.__livicat_show_more_obs = new MutationObserver(function() {{
                    __lc_click_show_more();
                }});
                window.__livicat_show_more_obs.observe(document.documentElement, {{ childList: true, subtree: true }});
                console.log('[Livicat] Show-more auto-click observer active');
            }}
            __lc_click_show_more();

            function __lc_wm_cycle(el) {{
                setTimeout(function() {{
                    el.style.animation = '__lc_exit 0.9s cubic-bezier(0.6, -0.28, 0.735, 0.045) forwards';
                    setTimeout(function() {{
                        el.style.display = 'none';
                        window.__lc_wm_hidden = true;
                        setTimeout(function() {{
                            window.__lc_wm_hidden = false;
                            el.style.display = 'flex';
                            el.style.animation = '__lc_enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards, __lc_bounce 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite, __lc_curious 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite';
                            __lc_wm_cycle(el);
                        }}, 1800000);
                    }}, 900);
                }}, 15000);
            }}
            
            function __lc_make_wm() {{
                if (!document.getElementById('livicat-wm-anim')) {{
                    var s = document.createElement('style');
                    s.id = 'livicat-wm-anim';
                    s.textContent = 
                        '@keyframes __lc_bounce {{0%,100%{{transform:translateY(0)rotate(0deg)}}20%{{transform:translateY(-8px)rotate(-5deg)}}40%{{transform:translateY(2px)rotate(2deg)}}60%{{transform:translateY(-4px)rotate(-2deg)}}80%{{transform:translateY(1px)rotate(1deg)}}}}' +
                        '@keyframes __lc_fadein {{0%{{opacity:0;transform:translateX(12px)scale(0.9)}}60%{{opacity:1;transform:translateX(-2px)scale(1.02)}}100%{{opacity:0.7;transform:translateX(0)scale(1)}}}}' +
                        '@keyframes __lc_curious {{0%,100%{{transform:rotate(0deg)}}25%{{transform:rotate(-4deg)}}50%{{transform:rotate(1deg)}}75%{{transform:rotate(3deg)}}}}' +
                        '@keyframes __lc_enter {{0%{{opacity:0;transform:translateX(50px)scale(0.7)}}60%{{opacity:1;transform:translateX(-6px)scale(1.12)}}80%{{transform:translateX(2px)scale(0.98)}}100%{{transform:translateX(0)scale(1)}}}}' +
                        '@keyframes __lc_exit {{0%{{opacity:1;transform:translateX(0)scale(1)}}30%{{opacity:1;transform:translateX(-5px)scale(1.15)}}100%{{opacity:0;transform:translateX(60px)scale(0.75)}}}}';
                    document.head.appendChild(s);
                }}
                
                var container = document.createElement('div');
                container.id = 'livicat-watermark';
                container.style.cssText = 'position:fixed;top:10px;right:10px;z-index:99999;pointer-events:none;display:flex;align-items:center;gap:6px;animation:__lc_enter 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,__lc_bounce 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,__lc_curious 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;';
                
                var icon = document.createElement('div');
                icon.style.cssText = 'width:28px;height:28px;animation:__lc_bounce 3s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite,__lc_curious 4s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite;opacity:0.6;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAD7ElEQVR42u1WS2xbRRS9d2aeP8lz2hjbcahDShMa1EJi0rKgIOKofCSkIrFoRAWs2CBYIFV8BBFysmWTBSuEWjaoi7gVbEqVCGQMFJCqtJSGFtFPElKaJk7rpMH2e/Z7c5lnO2qFIHUSQiUUS9b7zcw599xzZ66AO/wT6wTWCdxpAmylEyUAJlUAtEoCuEJwxkqXm2TUM/0nCgwC8EXwiUDz/sng5nNjocgDi8TW1AOVyO3RYHPYR3gsLETUIoKrZN0akFwTBSoyy7girUv4IsR4NGPbRpYk1KL26eVgc1R9t5arQtWDU0p65/qSv+m1EOfbM9IylYE8KvHFBi5aBGKv8/0k7OBrQiAG21hlwpPFkt2QU9nCIm3bkgHGphqatu+EkeJyVGDVSC+hSyCcLXwO4FZe78yTLM+lUhmhT2UnyHkAid1XKS38VwhUTEcMUtZI/d2PtNRHvvUgaywQSQfbQSEiYx7to7NcvhCenvhMxuNMvbdXTWCx1lXZuU5v3HTQD+K7WuQ7DaCKH8uFr9A8LNr+XnDy4iFKDOoQizEpZUkBh8zt0iGWcvwQNNQG6vjxIPKOOSK7qCA1RF6CRoakyLgJWAGwU72ZzrW1qXvIbhgYMGQyWWTd3dbtNqq/JXC4zNqu8/GPAox3zErb4IgeUq4jJbyzkiwWgQnBsuqxvvetHUpz9EYiV7x+/3lsb7+EiPbcqy+35lInOtjPPx356+75jylQdc56FHiyLtiqSO9Lq3RLQLeTdAdcmibwtlbgW1vAmp0B1zNPkfuxXS8qWfrQ7+9b+OTQ21f9TQeu7X5iiHHtVygU7y0t3NXFqlIgpgj0K6bSpk6vYGAapq0iFdztLkeuSBQujIP+/HNgnTkL+jtvOAv7Rg587Mtnrm966MjRh/WsAa4bedAmrsC1xuBxOH8ODodCtKyt2CL02ipsfc/TZH7zAxTSsyCFAJeugxZpBE/34+Te1kbZgQ+kYRZwiiyev3ARoo/ugj9OjUJh/He1T+Z6t5w59b2EOGOJfrsqAl2VPFm6+2QukwWaTovA668U8cYCck0D5lJ/w4SFDw9y9uMoE9Npltdr4f539499mfz62KVn/UP1jeG5zNRvk9H0+JgjG8N+uazjeNEww3Xh9/05401eUwOecBiEbQFenwOYnwdDpcL2eseY1zMsc9nEg9mZFCN1KuHNJWnvXo6JhL2qfmD4rnt2a3lzD5lGA0Nmay7XDNR4f5EaH7G2Rk53p1Llo1CdinFE0Tc4SNDT4wROrIqTcUkC8YohlxrjdEWxEjzIlTQlWE0DElTjHJCvbhlf8QqttBNaVUu23pavE/hfEfgTIu+Rt8XJr2kAAAAASUVORK5CYII=);background-size:contain;background-repeat:no-repeat;background-position:center;';
                
                var text = document.createElement('span');
                text.textContent = 'LIVICAT';
                text.style.cssText = 'font:600 9px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:0.8px;color:rgba(255,255,255,0.7);animation:__lc_fadein 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s backwards;';
                
                container.appendChild(icon);
                container.appendChild(text);
                document.body.appendChild(container);
                __lc_wm_cycle(container);
                return container;
            }}

            if (!document.getElementById('livicat-watermark')) {{
                __lc_make_wm();
                console.log('[Livicat] Watermark created');
            }}

            if (!window.__livicat_wmobs) {{
                window.__livicat_wmobs = new MutationObserver(function() {{
                    if (!window.__lc_wm_hidden && !document.getElementById('livicat-watermark')) {{
                        __lc_make_wm();
                        console.log('[Livicat] Watermark re-created by observer');
                    }}
                }});
                window.__livicat_wmobs.observe(document.documentElement, {{ childList: true, subtree: true }});
                console.log('[Livicat] Watermark observer ready');
            }}

            if (!window.__livicat_punct) {{
                window.__livicat_punct = true;
                function __livicat_set_punct(el) {{
                    var text = el.textContent || '';
                    if (/[?!]$/.test(text)) {{
                        el.setAttribute('data-punct', text.slice(-1));
                    }} else {{
                        el.removeAttribute('data-punct');
                    }}
                }}
                var __livicat_obs = new MutationObserver(function(muts) {{
                    for (var i = 0; i < muts.length; i++) {{
                        var nodes = muts[i].addedNodes;
                        for (var j = 0; j < nodes.length; j++) {{
                            var n = nodes[j];
                            if (n.nodeType === 1) {{
                                if (n.matches && n.matches('yt-live-chat-text-message-renderer')) {{
                                    var m = n.querySelector('#message');
                                    if (m) __livicat_set_punct(m);
                                }}
                                if (n.id === 'message' || n.querySelector && n.querySelector('#message')) {{
                                    var m = n.id === 'message' ? n : n.querySelector('#message');
                                    if (m) __livicat_set_punct(m);
                                }}
                            }}
                        }}
                    }}
                }});
                __livicat_obs.observe(document.documentElement, {{ childList: true, subtree: true }});
                document.querySelectorAll('yt-live-chat-text-message-renderer #message').forEach(__livicat_set_punct);
                console.log('[Livicat] Punct observer ready');
            }}
        }})();"#,
        serde_json::to_string(css).map_err(|e| format!("JSON serialize error: {}", e))?,
        auto_scroll,
    );

    window
        .eval(&script)
        .map_err(|e| format!("Failed to eval script: {}", e))?;

    println!(
        "[Livicat] CSS injection + show-more auto-click + watermark + punct observer executed"
    );
    Ok(())
}

fn inject_sentry_to_window(window: &WebviewWindow) -> Result<(), String> {
    println!("[Livicat] Injecting Sentry into preview webview");

    // Inject Sentry browser SDK to capture JavaScript errors in preview webview
    let script = r#"(function() {
        try {
            // Check if Sentry is already loaded
            if (window.Sentry) {
                console.log('[Livicat] Sentry already loaded in preview webview');
                return;
            }

            // Load Sentry from CDN
            var script = document.createElement('script');
            script.src = 'https://browser.sentry-cdn.com/8.29.0/bundle.min.js';
            script.crossOrigin = 'anonymous';
            script.onload = function() {
                console.log('[Livicat] Sentry SDK loaded, initializing...');
                
                // Initialize Sentry
                Sentry.init({
                    dsn: 'https://a152e9a3e9de46c5b099336088514b7d@o4504026331295744.ingest.us.sentry.io/4507986409615360',
                    environment: 'production',
                    release: 'livicat@0.7.7',
                    integrations: [new Sentry.BrowserTracing()],
                    tracesSampleRate: 1.0,
                    beforeSend: function(event, hint) {
                        console.log('[Livicat] Sending event to Sentry:', event);
                        return event;
                    }
                });

                console.log('[Livicat] Sentry initialized in preview webview');
                
                // Capture initial message
                Sentry.captureMessage('Preview webview initialized', 'info');
            };
            script.onerror = function() {
                console.error('[Livicat] Failed to load Sentry SDK');
            };
            document.head.appendChild(script);
        } catch(e) {
            console.error('[Livicat] Sentry injection error:', e);
        }
    })();"#;

    window
        .eval(script)
        .map_err(|e| format!("Failed to inject Sentry: {}", e))?;

    println!("[Livicat] Sentry injection script executed");
    Ok(())
}

#[cfg(test)]
mod windows_webview_tests;

#[cfg(test)]
mod tests {
    use serde_json::json;

    #[test]
    fn test_track_event_serialization() {
        // Test that the track_event command serializes correctly
        let event_name = "test_event";
        let props = json!({
            "key": "value",
            "number": 42
        });

        // Verify JSON serialization works
        let serialized = serde_json::to_string(&(event_name, props)).unwrap();
        assert!(serialized.contains("test_event"));
        assert!(serialized.contains("key"));
        assert!(serialized.contains("value"));

        println!("Track event serialization test passed: {}", serialized);
    }

    #[test]
    fn test_track_event_command_args() {
        // Test the exact structure that Tauri expects for track_event
        // The plugin expects: { name: string, props: object }
        let args = json!({
            "name": "test_event",
            "props": {
                "key": "value"
            }
        });

        assert_eq!(args["name"], "test_event");
        assert!(args["props"].is_object());
        assert_eq!(args["props"]["key"], "value");

        println!("Track event command args test passed");
    }

    #[test]
    fn test_app_launch_event_format() {
        // Test the app_launched event format
        let event_name = "app_launched";
        let props: Option<serde_json::Value> = None;

        // Verify it doesn't panic when serializing
        let serialized = serde_json::to_string(&(event_name, props)).unwrap();
        assert!(serialized.contains("app_launched"));

        println!("App launch event format test passed: {}", serialized);
    }
}

mod sentry_integration_test;

mod sentry_live_test;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let preview_state: SharedPreviewState =
        Arc::new(Mutex::new(PreviewState { window_label: None }));

    // Load .env file if present (for local development)
    dotenvy::dotenv().ok();

    // WebView2 browser flags for Windows OBS Window Capture compatibility
    //
    // Flags:
    //   --disable-gpu
    //     Disables GPU hardware acceleration. Forces software rendering path
    //     that OBS Window Capture can reliably hook into via BitBlt/DWM.
    //
    //   --disable-software-rasterizer
    //     Prevents fallback to SwiftShader software rasterizer, ensuring
    //     OBS capture can access the composited output.
    //
    //   --in-process-gpu
    //     Runs GPU rendering in the browser process rather than a separate
    //     GPU process. Avoids cross-process capture issues with OBS.
    //
    //   --disable-frame-rate-limit
    //     Removes Chromium's frame rate cap so rendering stays responsive
    //     even when the window is not in focus.
    //
    //   --disable-backgrounding-occluded-windows
    //     Prevents WebView2 from throttling rendering when the window is
    //     partly or fully occluded (covered by other windows). OBS Window
    //     Capture reads the window's pixels even when it's behind other windows.
    //
    //   --disable-background-timer-throttling
    //     Prevents Chromium from throttling JS timers in background tabs.
    //     Without this, chat updates may stall when the window is occluded.
    //
    // OBS Capture Method: Must be set to "Windows 10 (1903 and up)" not
    // "Automatic" for WebView2 windows to capture reliably.
    #[cfg(target_os = "windows")]
    {
        std::env::set_var(
            "WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS",
            "--disable-gpu \
             --disable-software-rasterizer \
             --in-process-gpu \
             --disable-frame-rate-limit \
             --disable-backgrounding-occluded-windows \
             --disable-background-timer-throttling",
        );
        println!("[Livicat] Set WebView2 browser flags: --disable-gpu --disable-software-rasterizer --in-process-gpu --disable-frame-rate-limit --disable-backgrounding-occluded-windows --disable-background-timer-throttling");
    }

    // Initialize Sentry for error reporting - keep guard alive to ensure events are sent
    let sentry_guard = sentry::init_sentry();
    println!("[Livicat] Sentry error reporting initialized");

    let app_key = std::env::var("APTABASE_APP_KEY").unwrap_or_else(|_| {
        println!("[Livicat] APTABASE_APP_KEY not set, analytics disabled");
        "".to_string()
    });

    if !app_key.is_empty() {
        println!(
            "[Livicat] Aptabase App Key loaded: {}...",
            &app_key[..app_key.len().min(10)]
        );
    }

    // Create and enter Tokio runtime for plugin setup
    // The Aptabase plugin calls tokio::spawn() during .plugin() registration,
    // which requires a Tokio runtime to be entered in the current thread.
    // We keep the runtime guard alive until Builder::run() takes over.
    let runtime = tokio::runtime::Runtime::new().expect("failed to create Tokio runtime");
    let _runtime_guard = runtime.enter();

    tauri::Builder::default()
        // Register log plugin FIRST so we can see analytics debug logs
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Debug)
                .build(),
        )
        .plugin(tauri_plugin_aptabase::Builder::new(&app_key).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            app.manage(preview_state);
            app.manage::<SharedChatState>(Arc::new(Mutex::new(ChatState::new())));

            // Move Sentry guard into Tauri state so it persists even on crash
            // This ensures Sentry flushes events even if the app crashes hard
            app.manage(sentry_guard);

            // Send test log to verify Sentry is working
            sentry::send_test_log();

            // Track app launch for adoption metrics
            let version = env!("CARGO_PKG_VERSION");
            let device_id = sentry::get_device_hash();
            sentry::track_feature("app.launched", version, &device_id);

            // Register a Sentry-compatible panic hook
            // We preserve any existing hook (Sentry's own) and add ours on top
            let previous_hook = std::panic::take_hook();
            std::panic::set_hook(Box::new(move |panic_info| {
                // Call the previous hook first (Sentry's panic handler)
                previous_hook(panic_info);

                // Also log to stderr for local debugging
                let panic_message = panic_info.to_string();
                eprintln!("[Livicat] Panic captured: {}", panic_message);
            }));

            // Track app launch event via the official plugin
            if !app_key.is_empty() {
                println!("[Analytics] Rust: Enqueuing app_launched event");
                let result = app.track_event("app_launched", None);
                match result {
                    Ok(_) => println!("[Analytics] Rust: app_launched enqueued successfully"),
                    Err(e) => eprintln!("[Analytics] Rust: Failed to enqueue app_launched: {}", e),
                }
                println!("[Livicat] Analytics initialized via tauri-plugin-aptabase");
                println!(
                    "[Livicat] Build mode: {}",
                    if cfg!(debug_assertions) {
                        "DEBUG"
                    } else {
                        "RELEASE"
                    }
                );
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_preview_window,
            inject_css,
            close_preview_window,
            start_chat,
            stop_chat,
            update_renderer_css,
            get_app_version,
            trigger_crash_test,
            track_feature_event,
            obs::detect_streaming_app,
            obs::obs_get_scenes,
            obs::obs_send_browser_source,
            obs::obs_remove_browser_source,
            obs::start_chat_server,
            obs::stop_chat_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Sentry guard is now managed by Tauri state - lives until app teardown
}
