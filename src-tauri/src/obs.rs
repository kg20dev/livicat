use base64::{engine::general_purpose, Engine};
use futures_util::SinkExt;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use tokio::net::TcpStream;
use tokio::time::timeout;
use tokio_tungstenite::connect_async;
use tokio_tungstenite::tungstenite::Message;
use tokio_tungstenite::{MaybeTlsStream, WebSocketStream};

const OBS_WS_PORT: u16 = 4455;
const HTTP_CHAT_PORT: u16 = 7842;
const LIVICAT_CHAT_SOURCE: &str = "Livicat Chat";
const PROBE_TIMEOUT_MS: u64 = 2000;

/// Result of probing the streaming app
#[derive(Debug, Serialize, Deserialize)]
pub struct StreamingAppInfo {
    pub detected: String, // "obs_compatible" | "none"
}

// Global flag so the HTTP server only starts once
static CHAT_SERVER_RUNNING: AtomicBool = AtomicBool::new(false);
static CHAT_SERVER_HANDLE: Mutex<Option<tokio::task::JoinHandle<()>>> = Mutex::new(None);

/* ─── Protocol Detection ───────────────────────────────────────── */

/// Determines whether the OBS WebSocket at `url` speaks v4 or v5.
enum ObsProtocol {
    V4,
    V5,
}

/// Connect to a WebSocket URL and probe which protocol the server speaks.
/// v5 greets with a Hello (op: 0) immediately. v4 stays silent until
/// the client sends a request.
async fn detect_protocol(
    url: &str,
) -> Result<
    (
        WebSocketStream<MaybeTlsStream<TcpStream>>,
        ObsProtocol,
    ),
    String,
> {
    let (mut ws, _) = connect_async(url)
        .await
        .map_err(|e| format!("WebSocket connection failed: {}", e))?;

    // Wait a short while for the server to send Hello (v5) or nothing (v4)
    let try_hello = timeout(std::time::Duration::from_millis(800), read_next_text(&mut ws))
        .await;

    match try_hello {
        Ok(Ok(text)) => {
            // Got a message — check if it's v5 Hello (op: 0)
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                if val["op"].as_i64() == Some(0) {
                    return Ok((ws, ObsProtocol::V5));
                }
            }
            // Not a v5 Hello → reconnect and go v4
            drop(ws);
            let (ws, _) = connect_async(url)
                .await
                .map_err(|e| format!("WebSocket connection failed: {}", e))?;
            Ok((ws, ObsProtocol::V4))
        }
        Ok(Err(e)) => Err(format!("WebSocket read error: {}", e)),
        Err(_timeout) => {
            // No message within 800ms → v4 (server waits for client)
            Ok((ws, ObsProtocol::V4))
        }
    }
}

/// Read one text frame from a WebSocket stream.
async fn read_next_text(
    stream: &mut WebSocketStream<MaybeTlsStream<TcpStream>>,
) -> Result<String, String> {
    use futures_util::StreamExt;
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(Message::Text(text)) => return Ok(text),
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(Message::Close(frame)) => {
                let reason = frame
                    .map(|f| f.reason.to_string())
                    .unwrap_or_default();
                return Err(format!("Connection closed: {}", if reason.is_empty() { "no reason" } else { &reason }));
            }
            Ok(Message::Binary(data)) => {
                return Err(format!("Unexpected binary frame ({} bytes)", data.len()));
            }
            Ok(_) => continue,
            Err(e) => return Err(format!("WebSocket error: {}", e)),
        }
    }
    Err("Connection ended".to_string())
}

/* ─── v5 Helpers ───────────────────────────────────────────────── */

async fn connect_auth_v5(
    _url: &str,
    password: Option<String>,
    mut ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    hello_text: String,
) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, String> {
    let hello_json: serde_json::Value =
        serde_json::from_str(&hello_text).map_err(|e| format!("Hello JSON error: {}", e))?;

    let mut identify = serde_json::json!({
        "op": 1,
        "d": { "rpcVersion": 1 }
    });

    if let Some(ref pw) = password {
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
        .map_err(|e| format!("Identify send failed: {}", e))?;

    // Read the Identified response (op: 2)
    let identified = read_v5_op(&mut ws, &[2])
        .await
        .map_err(|e| format!("Identify failed: {}", e))?;

    // Verify the Identified response indicates success
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&identified) {
        let negotiated = val["d"]["negotiatedRpcVersion"].as_i64();
        if negotiated.is_none() && val.get("d").and_then(|d| d.get("error")).is_some() {
            let err_msg = val["d"]["error"]
                .as_str()
                .unwrap_or("Unknown identification error");
            return Err(format!("OBS WebSocket identification rejected: {}", err_msg));
        }
    }

    Ok(ws)
}

async fn read_v5_op(
    stream: &mut (impl futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    allowed_ops: &[u64],
) -> Result<String, String> {
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    let op = val["op"].as_i64().unwrap_or(-1) as u64;
                    if allowed_ops.contains(&op) {
                        return Ok(text);
                    }
                    // Skip events (op: 5)
                    if op == 5 {
                        continue;
                    }
                    // If it's op 7 (response) but we're waiting for identify (op 2), also skip
                    if op == 7 || op == 6 {
                        continue;
                    }
                }
                // Unknown text — return it anyway
                return Ok(text);
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(Message::Close(frame)) => {
                let reason = frame
                    .map(|f| f.reason.to_string())
                    .unwrap_or_default();
                let detail = if reason.is_empty() {
                    "no reason".to_string()
                } else {
                    reason
                };
                return Err(format!("Connection closed by server: {}", detail));
            }
            Ok(Message::Binary(data)) => {
                return Err(format!(
                    "Unexpected binary frame ({} bytes) — OBS may be using an older WebSocket protocol version",
                    data.len()
                ));
            }
            Ok(_) => continue,
            Err(e) => return Err(format!("WebSocket error: {}", e)),
        }
    }
    Err("Connection closed while waiting for response".to_string())
}

async fn send_v5_request(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    request_type: &str,
    request_data: serde_json::Value,
    request_id: &str,
) -> Result<serde_json::Value, String> {
    let req = serde_json::json!({
        "op": 6,
        "d": {
            "requestId": request_id,
            "requestType": request_type,
            "requestData": request_data,
        }
    });

    ws.send(Message::Text(req.to_string()))
        .await
        .map_err(|_| "Failed to send request".to_string())?;

    read_v5_response(ws, request_id).await
}

async fn read_v5_response(
    stream: &mut (impl futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    request_id: &str,
) -> Result<serde_json::Value, String> {
    while let Some(msg) = stream.next().await {
        let text = match msg {
            Ok(Message::Text(t)) => t,
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(Message::Close(frame)) => {
                let reason = frame
                    .map(|f| f.reason.to_string())
                    .unwrap_or_default();
                let detail = if reason.is_empty() {
                    "connection closed"
                } else {
                    &reason
                };
                return Err(format!("Server closed connection: {}", detail));
            }
            Ok(Message::Binary(data)) => {
                return Err(format!(
                    "Unexpected binary frame ({} bytes) — OBS may be using an older WebSocket protocol version",
                    data.len()
                ));
            }
            Ok(_) => continue,
            Err(e) => return Err(format!("WebSocket error: {}", e)),
        };

        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
            let op = val["op"].as_i64().unwrap_or(-1);
            if op == 7 {
                if val["d"]["requestId"] == request_id {
                    // Check for error status
                    if val["d"]["requestStatus"]["code"].as_i64() != Some(100) {
                        let comment = val["d"]["requestStatus"]["comment"]
                            .as_str()
                            .unwrap_or("Unknown error");
                        return Err(format!("Request failed: {}", comment));
                    }
                    return Ok(val);
                }
            }
            if op == 5 {
                continue; // Skip events
            }
        }
    }
    Err("Connection closed while waiting for response".to_string())
}

/* ─── v4 Helpers ──────────────────────────────────────────────────── */

/// Authenticate via the v4 protocol (no initial handshake).
async fn connect_auth_v4(
    _url: &str,
    password: Option<String>,
    ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
) -> Result<WebSocketStream<MaybeTlsStream<TcpStream>>, String> {
    // v4: no Hello — ask for auth requirements first
    let mut stream = ws;

    // Send GetAuthRequired
    let msg_id = "auth-1";
    let get_auth = serde_json::json!({
        "op": 1,
        "d": {
            "request-type": "GetAuthRequired",
            "message-id": msg_id,
        }
    });
    stream
        .send(Message::Text(get_auth.to_string()))
        .await
        .map_err(|e| format!("GetAuthRequired send failed: {}", e))?;

    let auth_resp = read_v4_response(&mut stream, msg_id).await?;

    let auth_required = auth_resp["status"].as_str() == Some("ok")
        && auth_resp.get("authRequired").and_then(|v| v.as_bool()) == Some(true);

    if auth_required {
        // Authentication is required
        if password.as_deref().unwrap_or("").is_empty() {
            return Err("OBS WebSocket requires a password, but none was provided.".to_string());
        }
        let challenge = auth_resp["challenge"]
            .as_str()
            .ok_or("Missing auth challenge")?;
        let salt = auth_resp["salt"]
            .as_str()
            .ok_or("Missing auth salt")?;
        let pw = password.as_deref().unwrap_or("");
        let auth_secret = compute_obs_auth_v4(pw, challenge, salt)?;

        let msg_id = "auth-2";
        let auth_req = serde_json::json!({
            "op": 1,
            "d": {
                "request-type": "Authenticate",
                "message-id": msg_id,
                "auth": auth_secret,
            }
        });

        stream
            .send(Message::Text(auth_req.to_string()))
            .await
            .map_err(|e| format!("Authenticate send failed: {}", e))?;

        read_v4_response(&mut stream, msg_id).await?;
    }

    Ok(stream)
}

/// OBS WebSocket v4 auth: SHA256(password + salt) -> base64 -> SHA256(result + challenge) -> base64
fn compute_obs_auth_v4(password: &str, challenge: &str, salt: &str) -> Result<String, String> {
    let secret = format!("{}{}", password, salt);
    let base64_secret = general_purpose::STANDARD.encode(Sha256::digest(secret.as_bytes()));
    let auth = format!("{}{}", base64_secret, challenge);
    Ok(general_purpose::STANDARD.encode(Sha256::digest(auth.as_bytes())))
}

async fn read_v4_response(
    stream: &mut (impl futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>
              + Unpin),
    expected_msg_id: &str,
) -> Result<serde_json::Value, String> {
    while let Some(msg) = stream.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&text) {
                    // v4 responses have op: 1 and a "message-id" matching our request
                    let resp_body = val.get("d").unwrap_or(&val);
                    if resp_body["message-id"] == expected_msg_id {
                        let status = resp_body["status"].as_str().unwrap_or("error");
                        if status != "ok" {
                            let error = resp_body["error"].as_str().unwrap_or("Unknown error");
                            return Err(format!("v4 request failed: {}", error));
                        }
                        return Ok(resp_body.clone());
                    }
                }
                continue;
            }
            Ok(Message::Ping(_)) | Ok(Message::Pong(_)) => continue,
            Ok(Message::Close(frame)) => {
                let reason = frame
                    .map(|f| f.reason.to_string())
                    .unwrap_or_default();
                let detail = if reason.is_empty() {
                    "connection closed"
                } else {
                    &reason
                };
                return Err(format!("Server closed connection: {}", detail));
            }
            Ok(Message::Binary(data)) => {
                return Err(format!(
                    "Unexpected binary frame ({} bytes) — OBS may be using an older WebSocket protocol version",
                    data.len()
                ));
            }
            Ok(_) => continue,
            Err(e) => return Err(format!("WebSocket error: {}", e)),
        }
    }
    Err("Connection closed while waiting for response".to_string())
}

async fn send_v4_request(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    request_type: &str,
    request_data: serde_json::Value,
) -> Result<serde_json::Value, String> {
    let msg_id = format!("req-{}", request_type);
    let mut req = serde_json::json!({
        "op": 1,
        "d": {
            "request-type": request_type,
            "message-id": msg_id,
        }
    });
    // Merge request_data fields into the "d" object
    if let Some(obj) = request_data.as_object() {
        let d = req["d"].as_object_mut().unwrap();
        for (k, v) in obj {
            d.insert(k.clone(), v.clone());
        }
    }

    ws.send(Message::Text(req.to_string()))
        .await
        .map_err(|_| "Failed to send v4 request".to_string())?;

    read_v4_response(ws, &msg_id).await
}

/* ─── Generic helpers ──────────────────────────────────────────── */

async fn get_scenes_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
) -> Result<Vec<String>, String> {
    let resp = send_v5_request(ws, "GetSceneList", serde_json::json!({}), "get-scenes").await?;
    let mut scenes = Vec::new();
    if let Some(scenes_arr) = resp["d"]["responseData"]["scenes"].as_array() {
        for scene in scenes_arr {
            if let Some(name) = scene["sceneName"].as_str() {
                scenes.push(name.to_string());
            }
        }
    }
    scenes.sort();
    Ok(scenes)
}

async fn get_current_scene_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
) -> Result<String, String> {
    let resp = send_v5_request(ws, "GetSceneList", serde_json::json!({}), "get-current-scene").await?;
    resp["d"]["responseData"]["currentProgramSceneName"]
        .as_str()
        .ok_or("No current program scene found".to_string())
        .map(|s| s.to_string())
}

async fn get_scenes_v4(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
) -> Result<Vec<String>, String> {
    let resp = send_v4_request(ws, "GetSceneList", serde_json::json!({})).await?;
    let mut scenes = Vec::new();
    if let Some(scenes_arr) = resp.get("scenes").and_then(|v| v.as_array()) {
        for scene in scenes_arr {
            if let Some(name) = scene["name"].as_str() {
                scenes.push(name.to_string());
            }
        }
    }
    scenes.sort();
    Ok(scenes)
}

async fn get_current_scene_v4(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
) -> Result<String, String> {
    let resp = send_v4_request(ws, "GetCurrentScene", serde_json::json!({})).await?;
    resp.get("currentScene")
        .or_else(|| resp.get("name"))
        .and_then(|v| v.as_str())
        .ok_or("No current scene found".to_string())
        .map(|s| s.to_string())
}

/* ─── Commands ─────────────────────────────────────────────────── */

/// Probe `ws://localhost:4455` to see if OBS / PRISM is running with WebSocket enabled.
#[tauri::command]
pub async fn detect_streaming_app() -> StreamingAppInfo {
    match tokio::time::timeout(
        std::time::Duration::from_millis(PROBE_TIMEOUT_MS),
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

/// Integrated connect + authenticate + fetch scenes.
/// Auto-detects v4 vs v5 OBS WebSocket protocol.
#[tauri::command]
pub async fn obs_get_scenes(
    obs_url: String,
    obs_password: Option<String>,
) -> Result<Vec<String>, String> {
    // Step 1: Connect and detect protocol
    let (ws, proto) = detect_protocol(&obs_url).await?;

    match proto {
        ObsProtocol::V5 => {
            // Need the hello text — reconnect and capture it
            let (mut ws, _) = connect_async(&obs_url)
                .await
                .map_err(|e| format!("Connect failed: {}", e))?;
            let hello = read_v5_op(&mut ws, &[0, 5])
                .await
                .map_err(|e| format!("Waiting for OBS WebSocket greeting failed: {}", e))?;
            let mut ws = connect_auth_v5(&obs_url, obs_password, ws, hello).await?;
            let scenes = get_scenes_v5(&mut ws).await?;
            Ok(scenes)
        }
        ObsProtocol::V4 => {
            let mut ws = connect_auth_v4(&obs_url, obs_password, ws).await?;
            let scenes = get_scenes_v4(&mut ws).await?;
            Ok(scenes)
        }
    }
}

/// Create or update a Browser Source in OBS / PRISM via WebSocket.
/// Auto-detects v4 vs v5 protocol.
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

    let (ws, proto) = detect_protocol(&obs_url).await?;

    match proto {
        ObsProtocol::V5 => handle_send_v5(ws, &obs_url, obs_password, &source_name, &chat_url, &css, scene_name.as_deref(), width, height).await,
        ObsProtocol::V4 => handle_send_v4(ws, &obs_url, obs_password, &source_name, &chat_url, &css, scene_name.as_deref(), width, height).await,
    }
}

async fn handle_send_v5(
    _initial_ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    obs_url: &str,
    obs_password: Option<String>,
    source_name: &str,
    chat_url: &str,
    css: &str,
    scene_name: Option<&str>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let (mut ws, _) = connect_async(obs_url)
        .await
        .map_err(|e| format!("Connect failed: {}", e))?;

    let hello = read_v5_op(&mut ws, &[0, 5])
        .await
        .map_err(|e| format!("Greeting failed: {}", e))?;

    let mut ws = connect_auth_v5(obs_url, obs_password, ws, hello).await?;

    // Determine target scene
    let target_scene = match scene_name {
        Some(name) if !name.is_empty() => name.to_string(),
        _ => get_current_scene_v5(&mut ws).await?,
    };

    // Check if source already exists
    let exists = check_source_exists_v5(&mut ws, source_name).await?;

    let settings = serde_json::json!({
        "url": chat_url,
        "css": css,
        "width": width,
        "height": height,
        "reroute_audio": false,
        "restart_when_active": false,
    });

    if exists {
        update_source_v5(&mut ws, source_name, &settings).await?;
        ensure_in_scene_v5(&mut ws, source_name, &target_scene).await?;
        Ok("updated".to_string())
    } else {
        create_source_v5(&mut ws, &target_scene, source_name, &settings).await?;
        Ok("created".to_string())
    }
}

async fn check_source_exists_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    source_name: &str,
) -> Result<bool, String> {
    let list_resp = send_v5_request(ws, "GetInputList", serde_json::json!({"inputKind": "browser_source"}), "check-livicat").await?;
    Ok(list_resp["d"]["responseData"]["inputs"]
        .as_array()
        .map(|inputs| inputs.iter().any(|i| i["inputName"] == source_name))
        .unwrap_or(false))
}

async fn update_source_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    source_name: &str,
    settings: &serde_json::Value,
) -> Result<(), String> {
    send_v5_request(
        ws,
        "SetInputSettings",
        serde_json::json!({
            "inputName": source_name,
            "inputSettings": settings,
        }),
        "update-livicat-settings",
    )
    .await?;
    Ok(())
}

async fn ensure_in_scene_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    source_name: &str,
    target_scene: &str,
) -> Result<(), String> {
    let items_resp = send_v5_request(
        ws,
        "GetSceneItemList",
        serde_json::json!({"sceneName": target_scene}),
        "get-scene-items",
    )
    .await?;

    let in_scene = items_resp["d"]["responseData"]["sceneItems"]
        .as_array()
        .map(|items| items.iter().any(|item| item["sourceName"] == source_name))
        .unwrap_or(false);

    if !in_scene {
        send_v5_request(
            ws,
            "CreateSceneItem",
            serde_json::json!({
                "sceneName": target_scene,
                "sourceName": source_name,
                "sceneItemEnabled": true,
            }),
            "add-item-to-scene",
        )
        .await?;
    }
    Ok(())
}

async fn create_source_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    target_scene: &str,
    source_name: &str,
    settings: &serde_json::Value,
) -> Result<(), String> {
    send_v5_request(
        ws,
        "CreateInput",
        serde_json::json!({
            "sceneName": target_scene,
            "inputName": source_name,
            "inputKind": "browser_source",
            "inputSettings": settings,
            "sceneItemEnabled": true,
        }),
        "create-livicat",
    )
    .await?;
    Ok(())
}

/// v4 version of sending a browser source
async fn handle_send_v4(
    _initial_ws: WebSocketStream<MaybeTlsStream<TcpStream>>,
    obs_url: &str,
    obs_password: Option<String>,
    source_name: &str,
    chat_url: &str,
    css: &str,
    scene_name: Option<&str>,
    width: u32,
    height: u32,
) -> Result<String, String> {
    let (ws, _) = connect_async(obs_url)
        .await
        .map_err(|e| format!("Connect failed: {}", e))?;

    let mut ws = connect_auth_v4(obs_url, obs_password, ws).await?;

    // Determine target scene
    let target_scene = match scene_name {
        Some(name) if !name.is_empty() => name.to_string(),
        _ => get_current_scene_v4(&mut ws).await?,
    };

    let settings = serde_json::json!({
        "url": chat_url,
        "css": css,
        "width": width,
        "height": height,
        "reroute_audio": false,
        "restart_when_active": false,
    });

    // v4: Check if source exists by listing sources
    let sources_resp = send_v4_request(
        &mut ws,
        "GetSourcesList",
        serde_json::json!({}),
    )
    .await?;

    let exists = sources_resp.get("sources")
        .and_then(|v| v.as_array())
        .map(|sources| sources.iter().any(|s| s["name"] == source_name))
        .unwrap_or(false);

    if exists {
        // Update existing source
        send_v4_request(
            &mut ws,
            "SetSourceSettings",
            serde_json::json!({
                "sourceName": source_name,
                "sourceSettings": settings,
            }),
        )
        .await?;
        Ok("updated".to_string())
    } else {
        // Create source in scene
        // v4 uses CreateSource on a specific scene
        send_v4_request(
            &mut ws,
            "CreateSource",
            serde_json::json!({
                "sourceName": source_name,
                "sourceKind": "browser_source",
                "sourceSettings": settings,
                "sceneName": target_scene,
                "setVisible": true,
            }),
        )
        .await?;
        Ok("created".to_string())
    }
}

/* ─── Remove Source ────────────────────────────────────────────── */

/// Remove the Livicat browser source from OBS via WebSocket (v5).
async fn remove_source_v5(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    source_name: &str,
) -> Result<(), String> {
    send_v5_request(ws, "RemoveInput", serde_json::json!({
        "inputName": source_name,
    }), "remove-livicat").await?;
    Ok(())
}

/// Remove the Livicat browser source from OBS via WebSocket (v4).
async fn remove_source_v4(
    ws: &mut (impl futures_util::SinkExt<Message> + Unpin + futures_util::StreamExt<Item = Result<Message, tokio_tungstenite::tungstenite::Error>>),
    source_name: &str,
) -> Result<(), String> {
    // Get current scene to find item ID
    let scene_resp = send_v4_request(ws, "GetCurrentScene", serde_json::json!({})).await?;
    let scene_name = scene_resp["name"].as_str().ok_or("No current scene")?;
    let sources = scene_resp.get("sources").and_then(|v| v.as_array()).ok_or("No sources found")?;

    let item = sources.iter().find(|s| s["name"] == source_name)
        .ok_or_else(|| format!("Source '{}' not found in current scene", source_name))?;
    let item_id = item["id"].as_i64().unwrap_or(0);

    send_v4_request(ws, "RemoveSceneItem", serde_json::json!({
        "scene": scene_name,
        "item": { "name": source_name, "id": item_id },
    })).await?;
    Ok(())
}

/// Remove the Livicat browser source from OBS / PRISM via WebSocket.
/// Auto-detects v4 vs v5 protocol.
#[tauri::command]
pub async fn obs_remove_browser_source(
    obs_url: String,
    obs_password: Option<String>,
    source_name: Option<String>,
) -> Result<(), String> {
    let source_name = source_name.unwrap_or_else(|| LIVICAT_CHAT_SOURCE.to_string());

    let (ws, proto) = detect_protocol(&obs_url).await?;

    match proto {
        ObsProtocol::V5 => {
            let (mut ws, _) = connect_async(&obs_url)
                .await
                .map_err(|e| format!("Connect failed: {}", e))?;
            let hello = read_v5_op(&mut ws, &[0, 5])
                .await
                .map_err(|e| format!("Greeting failed: {}", e))?;
            let mut ws = connect_auth_v5(&obs_url, obs_password, ws, hello).await?;
            remove_source_v5(&mut ws, &source_name).await?;
        }
        ObsProtocol::V4 => {
            let mut ws = connect_auth_v4(&obs_url, obs_password, ws).await?;
            remove_source_v4(&mut ws, &source_name).await?;
        }
    }

    Ok(())
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

    let handle = tokio::spawn(async move {
        axum::serve(listener, app).await.ok();
        CHAT_SERVER_RUNNING.store(false, Ordering::SeqCst);
    });

    if let Ok(mut guard) = CHAT_SERVER_HANDLE.lock() {
        *guard = Some(handle);
    }

    Ok(port)
}

/// Stop the HTTP chat server gracefully.
#[tauri::command]
pub async fn stop_chat_server() -> Result<(), String> {
    if let Ok(mut guard) = CHAT_SERVER_HANDLE.lock() {
        if let Some(handle) = guard.take() {
            handle.abort();
            CHAT_SERVER_RUNNING.store(false, Ordering::SeqCst);
            return Ok(());
        }
    }
    Err("Chat server is not running".to_string())
}

/* ─── Misc ─────────────────────────────────────────────────────── */

async fn serve_chat_html(
    axum::extract::State(html): axum::extract::State<Arc<String>>,
) -> axum::response::Html<String> {
    axum::response::Html((*html).clone())
}

/// OBS WebSocket v5 auth – SHA256(password + salt) base64'd, then
/// SHA256(salted_hash + challenge) base64'd.
fn compute_obs_auth(password: &str, challenge: &str, salt: &str) -> Result<String, String> {
    let salted = format!("{}{}", password, salt);
    let salted_hash = general_purpose::STANDARD.encode(Sha256::digest(salted.as_bytes()));

    let combined = format!("{}{}", salted_hash, challenge);
    let auth_hash = general_purpose::STANDARD.encode(Sha256::digest(combined.as_bytes()));

    Ok(auth_hash)
}
