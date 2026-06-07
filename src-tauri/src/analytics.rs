use tauri::State;
use std::sync::{Arc, Mutex};
use serde_json::Value;

// Simple in-memory event queue (no polling to avoid Tokio runtime issues)
pub struct EventQueue {
    events: Mutex<Vec<Value>>,
}

type SharedEventQueue = Arc<EventQueue>;

#[tauri::command]
pub fn track_event(name: String, props: Option<Value>, state: State<SharedEventQueue>) -> Result<(), String> {
    let mut queue = state.events.lock().map_err(|e| format!("Lock error: {}", e))?;
    
    let event = serde_json::json!({
        "name": name,
        "props": props.unwrap_or(Value::Null),
    });
    
    queue.push(event.clone());
    
    // Immediately send to Aptabase (blocking HTTP)
    let client = reqwest::blocking::Client::new();
    let url = "https://us.aptabase.com/api/v1/event";
    
    // Get app key from environment (loaded by dotenvy)
    let app_key = std::env::var("APTABASE_APP_KEY").unwrap_or_else(|_| "".to_string());
    
    if app_key.is_empty() {
        println!("[Analytics] Skipped event (no app key): {}", name);
        return Ok(());
    }
    
    // Determine build mode (debug vs release)
    // In development: debug mode, in production: release mode
    let is_debug = cfg!(debug_assertions);
    
    let payload = serde_json::json!({
        "events": [event],
        "appVersion": env!("CARGO_PKG_VERSION"),
        "osVersion": std::env::consts::OS,
        "buildMode": if is_debug { "debug" } else { "release" },
    });
    
    println!("[Analytics] Sending event: {} (buildMode: {})", name, if is_debug { "debug" } else { "release" });
    
    match client.post(url).query(&[("key", app_key)]).json(&payload).send() {
        Ok(_) => println!("[Analytics] Event sent successfully"),
        Err(e) => println!("[Analytics] Failed to send event: {}", e),
    }
    
    Ok(())
}

pub fn create_analytics_state() -> SharedEventQueue {
    Arc::new(EventQueue {
        events: Mutex::new(Vec::new()),
    })
}
