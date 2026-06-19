use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager};
use tauri::{WebviewUrl, WebviewWindow, WebviewWindowBuilder};
use tauri_plugin_aptabase::EventTracker;

mod sentry;
use ::sentry::Level as SentryLevel;

#[cfg(target_os = "windows")]
const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

#[cfg(target_os = "macos")]
const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

struct PreviewState {
    window_label: Option<String>,
}

type SharedPreviewState = Arc<Mutex<PreviewState>>;

#[tauri::command]
async fn open_preview_window(
    video_id: String,
    css: String,
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
    // always_on_top disabled everywhere — it causes window capture issues:
    // - Windows: WebView2 crashes with YouTube chat + OBS capture
    // - macOS: OBS window capture can't find the window in its dropdown
    // (The preview window is captured by OBS and doesn't need to float.)
    .always_on_top(false)
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
                if let Err(e) = inject_css_to_window(&window, &css) {
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
    app: AppHandle,
    state: tauri::State<'_, SharedPreviewState>,
) -> Result<(), String> {
    let state_guard = state
        .lock()
        .map_err(|e| format!("State lock error: {}", e))?;

    if let Some(label) = state_guard.window_label.as_deref() {
        if let Some(window) = app.get_webview_window(label) {
            println!("[Livicat Tauri] Injecting CSS, length: {}", css.len());

            // Add breadcrumb for CSS injection
            sentry::add_breadcrumb(
                "css_injection",
                "Re-injecting CSS to existing preview window",
                SentryLevel::Info,
            );

            inject_css_to_window(&window, &css)?;
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
        }
        state_guard.window_label = None;
        println!("[Livicat Tauri] Preview window closed");
        return Ok(());
    }

    println!("[Livicat Tauri] No preview window to close");
    Ok(())
}

#[tauri::command]
fn get_app_version() -> String {
    // Read version from Cargo.toml at compile time — always matches the binary
    env!("CARGO_PKG_VERSION").to_string()
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

            function __lc_make_wm() {{
                var el = document.createElement('div');
                el.id = 'livicat-watermark';
                el.textContent = 'LIVICAT';
                el.style.cssText = 'position:fixed;bottom:8px;right:10px;z-index:99999;pointer-events:none;font:600 11px/1 -apple-system,BlinkMacSystemFont,sans-serif;color:rgba(255,255,255,0.25);text-shadow:0 0 3px rgba(0,0,0,0.4);letter-spacing:0.5px;';
                document.body.appendChild(el);
                return el;
            }}

            if (!document.getElementById('livicat-watermark')) {{
                __lc_make_wm();
                console.log('[Livicat] Watermark created');
            }}

            if (!window.__livicat_wmobs) {{
                window.__livicat_wmobs = new MutationObserver(function() {{
                    if (!document.getElementById('livicat-watermark')) {{
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
    );

    window
        .eval(&script)
        .map_err(|e| format!("Failed to eval script: {}", e))?;

    println!("[Livicat] CSS injection + punct observer + watermark executed");
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

            // Move Sentry guard into Tauri state so it persists even on crash
            // This ensures Sentry flushes events even if the app crashes hard
            app.manage(sentry_guard);

            // Send test log to verify Sentry is working
            sentry::send_test_log();

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
            get_app_version,
            trigger_crash_test,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");

    // Sentry guard is now managed by Tauri state - lives until app teardown
}
