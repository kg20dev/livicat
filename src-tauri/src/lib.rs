use tauri::{AppHandle};
use tauri::{WebviewUrl, WebviewWindowBuilder, WebviewWindow};

#[tauri::command]
fn open_preview_window(
    video_id: String,
    css: String,
    app: AppHandle,
) -> Result<(), String> {
    // Create new preview window
    let chat_url = format!("https://www.youtube.com/live_chat?is_popout=1&v={}", video_id);
    let window_label = format!("preview-{}", video_id);
    
    println!("[Livicat Tauri] Opening preview for video: {}", video_id);
    
    // Create window
    let window = WebviewWindowBuilder::new(
        &app,
        window_label,
        WebviewUrl::External(chat_url.parse().map_err(|e| format!("Invalid URL: {}", e))?),
    )
    .title("Livicat — Live Chat Preview")
    .inner_size(420.0, 700.0)
    .min_inner_size(320.0, 480.0)
    .always_on_top(true)
    .build()
    .map_err(|e| format!("Failed to create window: {}", e))?;
    
    // Show window
    window.show().map_err(|e| format!("Failed to show window: {}", e))?;
    
    // Inject CSS after a delay
    let window_clone = window.clone();
    let css_clone = css.clone();
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_secs(2));
        if let Err(e) = inject_css_to_window(&window_clone, &css_clone) {
            eprintln!("[Livicat] CSS injection failed: {}", e);
        }
    });
    
    Ok(())
}

#[tauri::command]
fn inject_css(css: String) -> Result<(), String> {
    println!("[Livicat Tauri] CSS injection requested, length: {}", css.len());
    // For now, we'll just log - the actual injection will be added later
    Ok(())
}

#[tauri::command]
fn close_preview_window() -> Result<(), String> {
    println!("[Livicat Tauri] Preview window close requested");
    // Will be implemented later
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
    tauri::Builder::default()
        .setup(|app| {
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