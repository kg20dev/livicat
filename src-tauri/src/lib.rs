use tauri::{Manager, Window, AppHandle, Emitter, State};
use std::sync::{Arc, Mutex};

// Preview window state
struct PreviewState {
    window_label: Option<String>,
    video_id: Option<String>,
}

type SharedPreviewState = Arc<Mutex<PreviewState>>;

#[tauri::command]
fn open_preview_window(
    video_id: String,
    css: String,
    app: AppHandle,
    state: State<SharedPreviewState>,
) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    
    // Check if we should reuse existing preview window
    if let Some(window_label) = &state_guard.window_label {
        if let Some(window) = app.get_window(window_label) {
            if state_guard.video_id.as_ref() == Some(&video_id) {
                // Same video → reuse window, inject CSS, and focus
                inject_css_to_window(&window, &css)?;
                window.set_focus().map_err(|e| format!("Failed to focus window: {}", e))?;
                return Ok(());
            } else {
                // Different video → close and reopen
                let _ = window.close();
            }
        }
    }
    
    // Create new preview window
    let chat_url = format!("https://www.youtube.com/live_chat?is_popout=1&v={}", video_id);
    let window_label = format!("preview-{}", video_id);
    
    // Update state
    state_guard.window_label = Some(window_label.clone());
    state_guard.video_id = Some(video_id.clone());
    
    // Create window
    let window = tauri::WindowBuilder::new(
        &app,
        window_label.clone(),
        tauri::WindowUrl::External(chat_url.parse().map_err(|e| format!("Invalid URL: {}", e))?),
    )
    .title("Livicat — Live Chat Preview")
    .inner_size(420.0, 700.0)
    .min_inner_size(320.0, 480.0)
    .always_on_top(true)
    .visible(false)
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;
    
    // Inject CSS after page loads
    let window_clone = window.clone();
    let css_clone = css.clone();
    window.clone().on_window_event(move |event| {
        if let tauri::WindowEvent::PageLoaded = event {
            println!("[Livicat] Preview loaded");
            if let Err(e) = inject_css_to_window(&window_clone, &css_clone) {
                eprintln!("[Livicat] CSS injection failed: {}", e);
            }
        }
    });
    
    // Show window when ready
    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    
    // Emit cleanup event when window is closed
    let app_handle = app.clone();
    let window_label_clone = window_label.clone();
    window.on_close(move |_| {
        println!("[Livicat] Preview window closed: {}", window_label_clone);
        let _ = app_handle.emit("preview-closed", ());
    });
    
    Ok(())
}

#[tauri::command]
fn inject_css(css: String, app: AppHandle, state: State<SharedPreviewState>) -> Result<(), String> {
    let state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    
    if let Some(window_label) = &state_guard.window_label {
        if let Some(window) = app.get_window(window_label) {
            inject_css_to_window(&window, &css)?;
            return Ok(());
        }
    }
    
    println!("[Livicat] No preview window to inject CSS into");
    Ok(())
}

#[tauri::command]
fn close_preview_window(app: AppHandle, state: State<SharedPreviewState>) -> Result<(), String> {
    let mut state_guard = state.lock().map_err(|e| format!("State lock error: {}", e))?;
    
    if let Some(window_label) = &state_guard.window_label {
        if let Some(window) = app.get_window(window_label) {
            window.close().map_err(|e| format!("Failed to close window: {}", e))?;
        }
        state_guard.window_label = None;
        state_guard.video_id = None;
        println!("[Livicat] Preview window closed: {}", window_label);
        return Ok(());
    }
    
    println!("[Livicat] No preview window to close");
    Ok(())
}

fn inject_css_to_window(window: &Window, css: &str) -> Result<(), String> {
    let script = format!(
        r#"(function() {{
            try {{
                var existing = document.getElementById('livicat-css');
                if (existing) existing.remove();
                var style = document.createElement('style');
                style.id = 'livicat-css';
                style.textContent = {};
                document.head.appendChild(style);
                console.log('[Livicat] CSS injected successfully');
            }} catch(e) {{
                console.error('[Livicat] CSS injection error:', e);
            }}
        }})();"#,
        serde_json::to_string(css).map_err(|e| format!("JSON serialize error: {}", e))?
    );
    
    window.eval(&script)
        .map_err(|e| format!("Failed to eval script: {}", e))?;
    
    println!("[Livicat] CSS injected, length: {}", css.len());
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let preview_state: SharedPreviewState = Arc::new(Mutex::new(PreviewState {
        window_label: None,
        video_id: None,
    }));
    
    tauri::Builder::default()
        .setup(|app| {
            app.manage(preview_state.clone());
            
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
            close_preview_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
