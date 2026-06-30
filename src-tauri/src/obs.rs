use base64::{engine::general_purpose, Engine};
use futures_util::SinkExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tokio::net::TcpStream;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

const OBS_WS_PORT: u16 = 4455;
const HTTP_CHAT_PORT: u16 = 7842;
const LIVICAT_CHAT_SOURCE: &str = "Livicat Chat";

/// Result of probing the streaming app
#[derive(Debug, Serialize, Deserialize)]
pub struct StreamingAppInfo {
    pub detected: String, // "obs_compatible" | "none"
}

// Global flag so the HTTP server only starts once
static CHAT_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);

/* ─── Commands ─────────────────────────────────────────────────── */

/// Probe `ws://localhost:4455` to see if OBS / PRISM is running with WebSocket enabled.
#[tauri::command]
pub async fn detect_streaming_app() -> StreamingAppInfo {
    match tokio::time::timeout(
        std::time::Duration::from_secs(2),
        connect_async(format!("ws://localhost:{}", OBS_WS_PORT)),
    )
    .await
    {
        Ok(Ok((_ws, _))) => StreamingAppInfo {
            detected: "obs_compatible".to_string(),
        },
        _ => StreamingAppInfo {
            detected: "none".to_string(),
        },
    }
}

/// Helper to connect and authenticate to OBS WebSocket
async fn connect_and_auth_obs(
    obs_url: &str,
    obs_password: Option<String>,
) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, String> {
    let (mut ws, _) = connect_async(obs_url)
        .await
        .map_err(|e| format!("WebSocket connection failed: {}", e))?;

    let hello = read_message_skip(&mut ws, &[0, 5])
        .await
        .ok_or("No hello message")??;
    let hello_json: serde_json::Value =
        serde_json::from_str(&hello).map_err(|e| format!("Hello JSON error: {}", e))?;

    let mut identify = serde_json::json!({
        "op": 1,
        "d": { "rpcVersion": 1 }
    });

    if let Some(ref pw) = obs_password {
        if !pw.is_empty() {
            if let Some(auth) = hello_json["d"]["authentication"].as_object() {
                let challenge = auth["challenge"].as_str().ok_or("Missing auth challenge")?;
                let salt = auth["salt"].as_str().ok_or("Missing auth salt")?;
                identify["d"]["authentication"] =
                    serde_json::json!(compute_obs_auth(pw, challenge, salt)?);
            }
        }
    }

    ws.send(Message::Text(identify.to_string()))
        .await
        .map_err(|e| format!("Identify send: {}", e))?;

    read_message_skip(&mut ws, &[2])
        .await
        .ok_or("No identified response")?
        .map_err(|e| format!("Identified error: {}", e))?;

    Ok(ws)
}

/// Fetch list of available scenes from OBS
#[tauri::command]
pub async fn obs_get_scenes(
    obs_url: String,
    obs_password: Option<String>,
) -> Result<Vec<String>, String> {
    let mut ws = connect_and_auth_obs(&obs_url, obs_password).await?;

    let req_id = "get-scenes";
    let get_scenes = serde_json::json!({
        "op": 6,
        "d": {
            "requestId": req_id,
            "requestType": "GetSceneList",
            "requestData": {}
        }
    });

    ws.send(Message::Text(get_scenes.to_string()))
        .await
        .map_err(|e| format!("GetSceneList send: {}", e))?;

    let resp = read_request_response(&mut ws, req_id)
        .await
        .map_err(|e| format!("GetSceneList response: {}", e))?;

    let mut scenes = Vec::new();
    if let Some(scenes_arr) = resp["d"]["responseData"]["scenes"].as_array() {
        for scene in scenes_arr {
            if let Some(name) = scene["sceneName"].as_str() {
                scenes.push(name.to_string());
            }
        }
    }

    // Sort scenes alphabetically
    scenes.sort();
    Ok(scenes)
}

/// Create or update a Browser Source in OBS / PRISM via WebSocket.
#[tauri::command]
pub async fn obs_send_browser_source(
    obs_url: String,
    obs_password: Option<String>,
    video_id: String,
    css: String,
    source_name: Option<String>,
    scene_name: Option<String>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let source_name = source_name.unwrap_or_else(|| LIVICAT_CHAT_SOURCE.to_string());

    let chat_url = format!(
        "https://www.youtube.com/live_chat?is_popout=1&v={}",
        video_id
    );

    let mut ws = connect_and_auth_obs(&obs_url, obs_password).await?;

    // ---- Determine target scene name ----
    let target_scene = match scene_name {
        Some(name) if !name.is_empty() => name,
        _ => {
            // Fetch current program scene
            let req_id = "get-current-scene";
            let get_scenes = serde_json::json!({
                "op": 6,
                "d": {
                    "requestId": req_id,
                    "requestType": "GetSceneList",
                    "requestData": {}
                }
            });
            ws.send(Message::Text(get_scenes.to_string()))
                .await
                .map_err(|e| format!("GetSceneList send: {}", e))?;
            let resp = read_request_response(&mut ws, req_id)
                .await
                .map_err(|e| format!("GetSceneList response: {}", e))?;
            resp["d"]["responseData"]["currentProgramSceneName"]
                .as_str()
                .ok_or("Failed to get current scene name")?
                .to_string()
        }
    };

    // ---- Check if source already exists globally ----
    let req_id_check = "check-livicat";
    let get_list = serde_json::json!({
        "op": 6,
        "d": {
            "requestId": req_id_check,
            "requestType": "GetInputList",
            "requestData": { "inputKind": "browser_source" }
        }
    });

    ws.send(Message::Text(get_list.to_string()))
        .await
        .map_err(|e| format!("GetInputList send: {}", e))?;

    let list_resp = read_request_response(&mut ws, req_id_check)
        .await
        .map_err(|e| format!("GetInputList response: {}", e))?;

    let exists = list_resp["d"]["responseData"]["inputs"]
        .as_array()
        .map(|inputs| inputs.iter().any(|i| i["inputName"] == source_name))
        .unwrap_or(false);

    // ---- Create or update ----
    let settings = serde_json::json!({
        "url": chat_url,
        "css": css,
        "width": width,
        "height": height,
        "reroute_audio": false,
        "restart_when_active": false,
    });

    if exists {
        // Update input settings
        let req_id = "update-livicat-settings";
        let update = serde_json::json!({
            "op": 6,
            "d": {
                "requestId": req_id,
                "requestType": "SetInputSettings",
                "requestData": {
                    "inputName": source_name,
                    "inputSettings": settings
                }
            }
        });

        ws.send(Message::Text(update.to_string()))
            .await
            .map_err(|e| format!("Update send: {}", e))?;

        read_request_response(&mut ws, req_id)
            .await
            .map_err(|e| format!("Update response: {}", e))?;

        // Check if scene item already exists in target scene
        let req_id_items = "get-scene-items";
        let get_items = serde_json::json!({
            "op": 6,
            "d": {
                "requestId": req_id_items,
                "requestType": "GetSceneItemList",
                "requestData": { "sceneName": target_scene }
            }
        });

        ws.send(Message::Text(get_items.to_string()))
            .await
            .map_err(|e| format!("GetSceneItemList send: {}", e))?;

        let items_resp = read_request_response(&mut ws, req_id_items)
            .await
            .map_err(|e| format!("GetSceneItemList response: {}", e))?;

        let in_scene = items_resp["d"]["responseData"]["sceneItems"]
            .as_array()
            .map(|items| items.iter().any(|item| item["sourceName"] == source_name))
            .unwrap_or(false);

        if !in_scene {
            // Source exists but not in the target scene, add it
            let req_id_add = "add-item-to-scene";
            let add_item = serde_json::json!({
                "op": 6,
                "d": {
                    "requestId": req_id_add,
                    "requestType": "CreateSceneItem",
                    "requestData": {
                        "sceneName": target_scene,
                        "sourceName": source_name,
                        "sceneItemEnabled": true
                    }
                }
            });

            ws.send(Message::Text(add_item.to_string()))
                .await
                .map_err(|e| format!("CreateSceneItem send: {}", e))?;

            read_request_response(&mut ws, req_id_add)
                .await
                .map_err(|e| format!("CreateSceneItem response: {}", e))?;
        }

        Ok("updated".to_string())
    } else {
        // Create new input in the target scene
        let req_id = "create-livicat";
        let create = serde_json::json!({
            "op": 6,
            "d": {
                "requestId": req_id,
                "requestType": "CreateInput",
                "requestData": {
                    "sceneName": target_scene,
                    "inputName": source_name,
                    "inputKind": "browser_source",
                    "inputSettings": settings,
                    "sceneItemEnabled": true
                }
            }
        });

        ws.send(Message::Text(create.to_string()))
            .await
            .map_err(|e| format!("Create send: {}", e))?;

        read_request_response(&mut ws, req_id)
            .await
            .map_err(|e| format!("Create response: {}", e))?;

        Ok("created".to_string())
    }
}

/// Start a local HTTP server (`http://127.0.0.1:7842`) that serves the
/// styled YouTube live chat as a plain HTML page with an `<iframe>`.
#[tauri::command]
pub async fn start_chat_server(video_id: String, css: String) -> Result<u16, String> {
    if CHAT_SERVER_RUNNING.load(Ordering::SeqCst) {
        return Ok(HTTP_CHAT_PORT);
    }

    let chat_url = format!(
        "https://www.youtube.com/live_chat?is_popout=1&v={}",
        video_id
    );

    let html = format!(
        r#"<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <style>
    * {{ margin:0; padding:0; box-sizing:border-box; }}
    html,body {{ width:100%; height:100%; overflow:hidden; background:transparent; }}
    iframe {{ width:100%; height:100%; border:none; }}
  </style>
  <style>{css}</style>
</head>
<body>
  <iframe src="{chat_url}" frameborder="0"></iframe>
</body>
</html>"#
    );

    let listener = tokio::net::TcpListener::bind(format!("127.0.0.1:{}", HTTP_CHAT_PORT))
        .await
        .map_err(|e| format!("Failed to bind HTTP server: {}", e))?;

    let port = listener.local_addr().map_err(|e| e.to_string())?.port();
    let shared_html = Arc::new(html);

    let app = axum::Router::new()
        .route("/", axum::routing::get(serve_chat_html))
        .with_state(shared_html);

    CHAT_SERVER_RUNNING.store(true, Ordering::SeqCst);

    tokio::spawn(async move {
        axum::serve(listener, app).await.ok();
        CHAT_SERVER_RUNNING.store(false, Ordering::SeqCst);
    });

    Ok(port)
}

/* ─── Helpers ──────────────────────────────────────────────────── */

async fn serve_chat_html(
    axum::extract::State(html): axum::extract::State<Arc<String>>,
) -> axum::response::Html<String> {
    axum::response::Html((*html).clone())
}

/// OBS WebSocket auth – SHA256(password + salt) base64'd, then
/// SHA256(salted_hash + challenge) base64'd.
fn compute_obs_auth(password: &str, challenge: &str, salt: &str) -> Result<String, String> {
    let salted = format!("{}{}", password, salt);
    let salted_hash = general_purpose::STANDARD.encode(Sha256::digest(salted.as_bytes()));

    let combined = format!("{}{}", salted_hash, challenge);
    let auth_hash = general_purpose::STANDARD.encode(Sha256::digest(combined.as_bytes()));

    Ok(auth_hash)
}

/// Read the **next** WebSocket text message whose `op` code is in the
/// allowed set.  Silently skips events (op: 5) and other noise.
async fn read_message_skip(
    stream: &mut (impl futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    allowed_ops: &[u64],
) -> Option<Result<String, String>> {
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    let op = val["op"].as_i64().unwrap_or(-1) as u64;
                    if allowed_ops.contains(&op) {
                        return Some(Ok(text));
                    }
                    // Skip events (op: 5) — keep waiting
                    if op == 5 {
                        continue;
                    }
                }
                return Some(Ok(text));
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(_) => return Some(Err("Unexpected binary message".to_string())),
            Err(e) => return Some(Err(format!("WS error: {}", e))),
        }
    }
    None
}

/// Send a request and wait for the matching response (op: 7) by `requestId`.
async fn read_request_response(
    stream: &mut (impl futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    request_id: &str,
) -> Result<serde_json::Value, String> {
    while let Some(msg) = stream.next().await {
        let text = msg.map_err(|e| format!("WS error: {}", e))?;
        let text = text
            .to_text()
            .map_err(|e| format!("Not text: {}", e))?
            .to_string();

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
            let op = val["op"].as_i64().unwrap_or(-1);
            if op == 7 {
                if val["d"]["requestId"] == request_id {
                    return Ok(val);
                }
            }
            // Skip other ops (events, etc.)
            if op == 5 {
                continue;
            }
        }
    }
    Err("Connection closed while waiting for response".to_string())
}
