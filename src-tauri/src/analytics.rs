use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use uuid::Uuid;

const APTABASE_API_URL: &str = "https://us.aptabase.com/api/v1/event";
const DEVICE_ID_FILE: &str = ".aptabase_device_id";
const CONSENT_FILE: &str = ".aptabase_consent";

/// Analytics client for tracking events via Aptabase (privacy-first analytics).
pub struct AnalyticsClient {
    pub app_key: String,
    pub device_id: String,
    pub session_id: String,
    enabled: bool,
}

impl AnalyticsClient {
    /// Create a new analytics client
    ///
    /// # Arguments
    /// * `app_key` - Aptabase App Key
    /// * `device_id` - Unique device identifier (persistent UUID)
    pub fn new(app_key: String, device_id: String) -> Self {
        Self {
            app_key,
            device_id,
            session_id: Uuid::new_v4().to_string(),
            enabled: false,
        }
    }

    /// Check if analytics is enabled (user consented)
    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    /// Enable or disable analytics
    pub fn set_enabled(&mut self, enabled: bool) {
        self.enabled = enabled;
    }

    /// Track an event via Aptabase API
    ///
    /// This sends the event asynchronously using a blocking HTTP client
    /// spawned on a background thread, so it does NOT block the main thread.
    ///
    /// # Arguments
    /// * `name` - Event name (e.g. "app_launched", "feature_used")
    /// * `props` - Optional event properties (JSON object)
    pub fn track_event(&self, name: &str, props: Option<serde_json::Value>) {
        if !self.enabled {
            return;
        }

        let payload = serde_json::json!({
            "v": 1,
            "t": name,
            "s": self.session_id,
            "d": self.device_id,
            "props": props.unwrap_or(serde_json::Value::Null),
        });

        let final_payload = serde_json::json!({
            "events": [payload],
            "appVersion": env!("CARGO_PKG_VERSION"),
            "osVersion": std::env::consts::OS,
        });

        // Send async (non-blocking)
        let client = reqwest::blocking::Client::new();
        let url = format!("{}?key={}", APTABASE_API_URL, self.app_key);

        tauri::async_runtime::spawn(async move {
            let _ = client
                .post(&url)
                .header("Content-Type", "application/json")
                .json(&final_payload)
                .send();
        });
    }
}

/// Get or create a persistent device ID stored in the app data directory
///
/// # Arguments
/// * `app_data_dir` - Path to the app's data directory
///
/// # Returns
/// The device ID as a String
fn get_or_create_device_id(app_data_dir: &PathBuf) -> String {
    let device_file = app_data_dir.join(DEVICE_ID_FILE);

    // Try to read existing device ID
    if device_file.exists() {
        if let Ok(id) = fs::read_to_string(&device_file) {
            let trimmed = id.trim().to_string();
            if !trimmed.is_empty() {
                return trimmed;
            }
        }
    }

    // Create new device ID
    let new_id = Uuid::new_v4().to_string();
    if let Some(parent) = device_file.parent() {
        let _ = fs::create_dir_all(parent);
    }
    let _ = fs::write(&device_file, &new_id);
    new_id
}

/// Get the current analytics consent status
///
/// # Arguments
/// * `app_handle` - Tauri app handle
///
/// # Returns
/// true if analytics are consented, false otherwise
fn get_analytics_consent(app_handle: &tauri::AppHandle) -> bool {
    if let Ok(dir) = app_handle.path().app_data_dir() {
        let consent_file = dir.join(CONSENT_FILE);
        if consent_file.exists() {
            if let Ok(content) = fs::read_to_string(&consent_file) {
                return content.trim() == "true";
            }
        }
    }
    false
}

/// Set analytics consent status
///
/// # Arguments
/// * `app_handle` - Tauri app handle
/// * `enabled` - true to enable analytics, false to disable
///
/// # Returns
/// Ok(()) if successful, error otherwise
pub fn set_analytics_consent(app_handle: &tauri::AppHandle, enabled: bool) -> Result<(), Box<dyn std::error::Error>> {
    let path = app_handle.path().app_data_dir()?.join(CONSENT_FILE);
    fs::create_dir_all(path.parent().unwrap())?;
    fs::write(&path, if enabled { "true" } else { "false" })?;
    Ok(())
}

/// Initialize analytics module
///
/// Creates the analytics client with a persistent device ID
/// and restores the user's consent preference.
///
/// # Arguments
/// * `app_handle` - Tauri app handle
/// * `app_key` - Aptabase App Key
///
/// # Returns
/// An initialized AnalyticsClient
pub fn init_analytics(app_handle: &tauri::AppHandle, app_key: &str) -> AnalyticsClient {
    let app_data_dir = app_handle.path().app_data_dir().unwrap_or_else(|_| {
        // Fallback to temp dir if app data dir not available
        std::env::temp_dir().join("livicat")
    });

    let device_id = get_or_create_device_id(&app_data_dir);
    let mut client = AnalyticsClient::new(app_key.to_string(), device_id);

    // Restore consent preference
    if get_analytics_consent(app_handle) {
        client.set_enabled(true);
    }

    client
}
