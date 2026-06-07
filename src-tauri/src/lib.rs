use tauri::{Manager, AppHandle, State};
use tauri::{WebviewUrl, WebviewWindowBuilder, WebviewWindow};
use std::sync::{Arc, Mutex};
use serde_json::json;

#[cfg(test)]
mod analytics_tests;

mod analytics;

const PREVIEW_USER_AGENT: &str =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

struct PreviewState {
    window_label: Option<String>,
}

struct AnalyticsState {
    client: Option<analytics::AnalyticsClient>,
}

type SharedPreviewState = Arc<Mutex<PreviewState>>;
type SharedAnalyticsState = Arc<Mutex<AnalyticsState>>;

#[tauri::command]
fn open_preview_window(
    video_id: String,
    css: String,
    app: AppHandle,
    state: State<SharedPreviewState>,
) -> Result<(), String> {
    // Close existing preview window if any
    {
        let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
        if let Some(ref label) = state_guard.window_label {
            if let Some(win) = app.get_webview_window(label) {
                let _ = win.close();
            }
        }
    }

    let window_label = format!("preview-{}", video_id);
    let chat_url = format!("https://www.youtube.com/live_chat?is_popout=1&v={}", video_id);

    println!("[Livicat Tauri] Opening preview for video: {}", video_id);

    // Store label in state
    {
        let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
        state_guard.window_label = Some(window_label.clone());
    }

    // Create window
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
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;

    window.show().map_err(|e| format!("Failed to show window: {}", e))?;

    // Inject CSS after a delay
    let window_clone = window;
    let css_clone = css;
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(2));
        if let Err(e) = inject_css_to_window(&window_clone, &css_clone) {
            eprintln!("[Livicat] CSS injection failed: {}", e);
        }
    });

    Ok(())
}

#[tauri::command]
fn set_analytics_enabled(enabled: bool, app: AppHandle, state: State<SharedAnalyticsState>) -> Result<(), String> {
    analytics::set_analytics_consent(&app, enabled)
        .map_err(|e| format!("Failed to set consent: {}", e))?;

    let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    if let Some(ref mut client) = state_guard.client {
        client.set_enabled(enabled);
        println!("[Livicat Analytics] Analytics {}", if enabled { "enabled" } else { "disabled" });
    }

    Ok(())
}

#[tauri::command]
fn is_analytics_enabled(state: State<SharedAnalyticsState>) -> Result<bool, String> {
    let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    Ok(state_guard.client.as_ref().map_or(false, |c: &analytics::AnalyticsClient| c.is_enabled()))
}

#[tauri::command]
fn track_event(name: String, props: Option<serde_json::Value>, state: State<SharedAnalyticsState>) -> Result<(), String> {
    let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    if let Some(ref client) = state_guard.client {
        client.track_event(&name, props);
        println!("[Livicat Analytics] Event: {}", name);
    }
    Ok(())
}

#[tauri::command]
fn inject_css(css: String, app: AppHandle, state: State<SharedPreviewState>) -> Result<(), String> {
    let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;

    if let Some(ref label) = state_guard.window_label {
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
fn close_preview_window(app: AppHandle, state: State<SharedPreviewState>) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;

    if let Some(ref label) = state_guard.window_label {
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
    let script = format!(
        r#"(function() {{
            try {{
                var existing = document.getElementById('livicat-css');
                if (existing) existing.remove();
                var style = document.createElement('style');
                style.id = 'livicat-css';
                style.textContent = {};
                document.head.appendChild(style);
            }} catch(e) {{
                console.error('[Livicat] CSS injection error:', e);
            }}
        }})();"#,
        serde_json::to_string(css).map_err(|e| format!("JSON serialize error: {}", e))?
    );

    window.eval(&script)
        .map_err(|e| format!("Failed to eval script: {}", e))?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let preview_state: SharedPreviewState = Arc::new(Mutex::new(PreviewState {
        window_label: None,
    }));

    let analytics_state: SharedAnalyticsState = Arc::new(Mutex::new(AnalyticsState {
        client: None,
    }));

    // Load .env file if present (for local development)
    dotenvy::dotenv().ok();

    let app_key = std::env::var("APTABASE_APP_KEY").unwrap_or_else(|_| {
        println!("[Livicat] APTABASE_APP_KEY not set, analytics disabled");
        "".to_string()
    });

    tauri::Builder::default()
        .setup(move |app| {
            app.manage(preview_state);
            app.manage(analytics_state.clone());

            // Initialize analytics if App Key is present
            if !app_key.is_empty() {
                let client = analytics::init_analytics(app.handle(), &app_key);
                println!("[Livicat] Analytics initialized");
                
                // Track app launch event
                client.track_event("app_launched", Some(json!({
                    "platform": std::env::consts::OS,
                    "version": env!("CARGO_PKG_VERSION")
                })));
                
                // Update state with initialized client
                let mut state_guard = analytics_state.lock().unwrap();
                state_guard.client = Some(client);
            }

            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            open_preview_window,
            inject_css,
            close_preview_window,
            set_analytics_enabled,
            is_analytics_enabled,
            track_event
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
