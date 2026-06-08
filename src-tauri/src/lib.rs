use tauri::{Manager, AppHandle};
use tauri::{WebviewUrl, WebviewWindowBuilder, WebviewWindow};
use std::sync::{Arc, Mutex};
use tauri_plugin_aptabase::EventTracker;

#[cfg(target_os = "windows")]
const PREVIEW_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
        let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
        if let Some(label) = state_guard.window_label.as_deref() {
            if let Some(win) = app.get_webview_window(label) {
                let _ = win.close();
            }
        }
    }

    let window_label = format!("preview-{}", video_id);
    let chat_url = format!("https://www.youtube.com/live_chat?is_popout=1&v={}", video_id);

    println!("[Livicat Tauri] Opening preview for video: {}", video_id);

    {
        let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
        state_guard.window_label = Some(window_label.clone());
    }

    let window = WebviewWindowBuilder::new(
        &app,
        &window_label,
        WebviewUrl::External(chat_url.parse().map_err(|e| format!("Invalid URL: {}", e))?),
    )
    .title("Livicat — Live Chat Preview")
    .inner_size(420.0, 700.0)
    .min_inner_size(320.0, 480.0)
    .always_on_top(true)
    .user_agent(PREVIEW_USER_AGENT)
    .on_page_load(|window, payload| {
        println!("[Livicat] Page loaded: payload={:?}, url={:?}", payload, window.url());
    })
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    window.show().map_err(|e| format!("Failed to show window: {}", e))?;

    let window_clone = window;
    let css_clone = css;
    std::thread::spawn(move || {
        // WebView2 on Windows needs more time to initialize
        #[cfg(target_os = "windows")]
        let delay = std::time::Duration::from_secs(5);

        #[cfg(not(target_os = "windows"))]
        let delay = std::time::Duration::from_secs(2);

        println!("[Livicat] Waiting {} seconds before CSS injection (platform: {})", delay.as_secs(), std::env::consts::OS);
        std::thread::sleep(delay);

        if let Err(e) = inject_css_to_window(&window_clone, &css_clone) {
            eprintln!("[Livicat] CSS injection failed: {}", e);
        } else {
            println!("[Livicat] CSS injected successfully");
        }
    });

    Ok(())
}

#[tauri::command]
async fn inject_css(css: String, app: AppHandle, state: tauri::State<'_, SharedPreviewState>) -> Result<(), String> {
    let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;

    if let Some(label) = state_guard.window_label.as_deref() {
        if let Some(window) = app.get_webview_window(label) {
            println!("[Livicat Tauri] Injecting CSS, length: {}", css.len());
            inject_css_to_window(&window, &css)?;
            return Ok(());
        }
    }

    println!("[Livicat Tauri] No preview window to inject CSS into");
    Ok(())
}

#[tauri::command]
async fn close_preview_window(app: AppHandle, state: tauri::State<'_, SharedPreviewState>) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;

    if let Some(label) = state_guard.window_label.as_deref() {
        if let Some(window) = app.get_webview_window(label) {
            let _ = window.close();
        }
        state_guard.window_label = None;
        println!("[Livicat Tauri] Preview window closed");
        return Ok(());
    }

    println!("[Livicat Tauri] No preview window to close");
    Ok(())
}

fn inject_css_to_window(window: &WebviewWindow, css: &str) -> Result<(), String> {
    println!("[Livicat] Attempting CSS injection ({} bytes)", css.len());

    let script = format!(
        r#"(function() {{
            try {{
                var existing = document.getElementById('livicat-css');
                if (existing) {{
                    console.log('[Livicat] Removing existing CSS');
                    existing.remove();
                }}
                var style = document.createElement('style');
                style.id = 'livicat-css';
                style.textContent = {};
                document.head.appendChild(style);
                console.log('[Livicat] CSS injected successfully');
                return true;
            }} catch(e) {{
                console.error('[Livicat] CSS injection error:', e);
                return false;
            }}
        }})();"#,
        serde_json::to_string(css).map_err(|e| format!("JSON serialize error: {}", e))?
    );

    window.eval(&script)
        .map_err(|e| format!("Failed to eval script: {}", e))?;

    println!("[Livicat] CSS injection script executed");
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let preview_state: SharedPreviewState = Arc::new(Mutex::new(PreviewState {
        window_label: None,
    }));

    // Load .env file if present (for local development)
    dotenvy::dotenv().ok();

    let app_key = std::env::var("APTABASE_APP_KEY").unwrap_or_else(|_| {
        println!("[Livicat] APTABASE_APP_KEY not set, analytics disabled");
        "".to_string()
    });

    if !app_key.is_empty() {
        println!("[Livicat] Aptabase App Key loaded: {}...", &app_key[..app_key.len().min(10)]);
    }

    // Create and enter Tokio runtime for plugin setup
    // The Aptabase plugin calls tokio::spawn() during .plugin() registration,
    // which requires a Tokio runtime to be entered in the current thread.
    // We keep the runtime guard alive until Builder::run() takes over.
    let runtime = tokio::runtime::Runtime::new()
        .expect("failed to create Tokio runtime");
    let _runtime_guard = runtime.enter();

    tauri::Builder::default()
        // Register log plugin FIRST so we can see analytics debug logs
        .plugin(tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Debug)
            .build())
        .plugin(tauri_plugin_aptabase::Builder::new(&app_key).build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(move |app| {
            app.manage(preview_state);

            // Track app launch event via the official plugin
            if !app_key.is_empty() {
                println!("[Analytics] Rust: Enqueuing app_launched event");
                let result = app.track_event("app_launched", None);
                match result {
                    Ok(_) => println!("[Analytics] Rust: app_launched enqueued successfully"),
                    Err(e) => eprintln!("[Analytics] Rust: Failed to enqueue app_launched: {}", e),
                }
                println!("[Livicat] Analytics initialized via tauri-plugin-aptabase");
                println!("[Livicat] Build mode: {}", if cfg!(debug_assertions) { "DEBUG" } else { "RELEASE" });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_preview_window,
            inject_css,
            close_preview_window,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
