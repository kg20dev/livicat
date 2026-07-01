// src-tauri/src/processor.rs
//
// Layer 2 — Data Processor
// ─────────────────────────────────────────────────────────────────
// Parses raw YouTube chat data (initial DOM dump or WebSocket push
// frames) into clean ChatMessage structs.
//
// Transforms are applied in Rust (strip @, truncate) instead of
// MutationObserver JS — faster, more reliable, easier to test.
//
// Messages are stored in a ring buffer and broadcast to all
// consumers (preview, OBS renderer, etc.) via tokio::sync::broadcast.

use serde::{Deserialize, Serialize};
use std::collections::VecDeque;
use tokio::sync::broadcast;

// ─── Constants ────────────────────────────────────────────────────

/// Maximum number of messages kept in the ring buffer.
pub const RING_BUFFER_CAPACITY: usize = 150;

// ─── Clean message types (what consumers see) ─────────────────────

/// Role classification for styling (maps to CSS classes / data attrs).
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum ChatRole {
    Owner,
    Moderator,
    Member,
    SuperChat,
    Membership,
    Default,
}

/// A single processed chat message — this is what Layer 3 renders.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    /// Unique ID from YouTube (or synthetic for initial dump).
    pub id: String,
    /// Author display name (@ already stripped if configured).
    pub author: String,
    /// Message text content (plain text, emojis as shortcodes).
    pub text: String,
    /// URL to the author's profile photo (empty string if unavailable).
    #[serde(default)]
    pub photo: String,
    /// Hex colour for the author name (e.g. "#FF0000").
    pub author_color: String,
    /// URLs to badge images (mod, member, verified, etc.).
    pub badges: Vec<String>,
    /// Whether the author is a channel member.
    pub is_member: bool,
    /// Whether the author is a moderator.
    pub is_moderator: bool,
    /// Whether this is a paid super-chat message.
    pub is_super_chat: bool,
    /// Monetary amount shown for super chats (e.g. "$5.00").
    pub super_chat_amount: Option<String>,
    /// Approximate timestamp (ms since epoch).
    pub timestamp_ms: u64,
}

impl ChatMessage {
    /// Derive a styling role from the message flags.
    pub fn role(&self) -> ChatRole {
        if self.is_super_chat {
            ChatRole::SuperChat
        } else if self.is_moderator {
            ChatRole::Moderator
        } else if self.is_member {
            ChatRole::Member
        } else {
            ChatRole::Default
        }
    }
}

// ─── Shared message store (ring buffer + broadcast) ───────────────

/// Thread-safe shared store that keeps recent messages and broadcasts
/// new ones to all subscribers (renderer, preview, etc.).
#[derive(Clone)]
pub struct MessageStore {
    /// Ring buffer of recent messages (newest at the back).
    buffer: std::sync::Arc<std::sync::Mutex<VecDeque<ChatMessage>>>,
    /// Broadcast sender — clone this and call .subscribe() for a receiver.
    tx: broadcast::Sender<ChatMessage>,
}

impl MessageStore {
    pub fn new() -> Self {
        let (tx, _rx) = broadcast::channel(256);
        Self {
            buffer: std::sync::Arc::new(std::sync::Mutex::new(VecDeque::with_capacity(
                RING_BUFFER_CAPACITY,
            ))),
            tx,
        }
    }

    /// Push a new message: stores in ring buffer AND broadcasts.
    pub fn push(&self, msg: ChatMessage) {
        // Ring buffer
        {
            let mut buf = self.buffer.lock().unwrap();
            if buf.len() >= RING_BUFFER_CAPACITY {
                buf.pop_front();
            }
            buf.push_back(msg.clone());
        }
        // Broadcast — ignore error if no subscribers
        let _ = self.tx.send(msg);
    }

    /// Return the most recent `count` messages (oldest first).
    #[allow(dead_code)]
    pub fn recent(&self, count: usize) -> Vec<ChatMessage> {
        let buf = self.buffer.lock().unwrap();
        let count = count.min(buf.len());
        buf.iter()
            .rev()
            .take(count)
            .cloned()
            .collect::<Vec<_>>()
            .into_iter()
            .rev()
            .collect()
    }

    /// Return ALL messages in order (oldest first).
    pub fn all(&self) -> Vec<ChatMessage> {
        let buf = self.buffer.lock().unwrap();
        buf.iter().cloned().collect()
    }

    /// Get a receiver for live message updates.
    pub fn subscribe(&self) -> broadcast::Receiver<ChatMessage> {
        self.tx.subscribe()
    }
}

// ─── Parser helpers ───────────────────────────────────────────────

/// Parse a single YouTube live-chat WebSocket push frame.
/// Kept for reference + tests even though the headless module uses
/// DomMessage instead.
///
/// YouTube's live chat WebSocket sends JSON frames shaped like:
/// ```json
/// {
///   "continuationContents": {
///     "liveChatContinuation": {
///       "actions": [{
///         "addChatItemAction": {
///           "item": {
///             "liveChatTextMessageRenderer": { ... }
///           }
///         }
///       }]
///     }
///   }
/// }
/// ```
#[allow(dead_code)]
pub fn parse_websocket_frame(raw: &str) -> Vec<ChatMessage> {
    let root: serde_json::Value = match serde_json::from_str(raw) {
        Ok(v) => v,
        Err(_) => return vec![],
    };

    // Walk to the actions array
    let actions: Vec<serde_json::Value> = root
        .pointer("/continuationContents/liveChatContinuation/actions")
        .or_else(|| root.pointer("/liveChatContinuation/actions"))
        .and_then(|v| v.as_array().cloned())
        .unwrap_or_default();

    actions.iter().filter_map(parse_action).collect()
}

/// Try to extract a ChatMessage from a single action object.
fn parse_action(action: &serde_json::Value) -> Option<ChatMessage> {
    // Regular text message
    if let Some(r) = action.pointer("/addChatItemAction/item/liveChatTextMessageRenderer") {
        return Some(parse_text_renderer(r, false, None));
    }

    // Super Chat / paid message
    if let Some(r) = action.pointer("/addChatItemAction/item/liveChatPaidMessageRenderer") {
        let amount = r
            .pointer("/purchaseAmountText/simpleText")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        return Some(parse_text_renderer(r, false, amount));
    }

    // Super Sticker
    if let Some(r) = action.pointer("/addChatItemAction/item/liveChatPaidStickerRenderer") {
        let amount = r
            .pointer("/purchaseAmountText/simpleText")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string());
        return Some(parse_text_renderer(r, false, amount));
    }

    // Membership / member milestone
    if let Some(r) = action.pointer("/addChatItemAction/item/liveChatMembershipItemRenderer") {
        return Some(parse_text_renderer(r, true, None));
    }

    None
}

/// Parse a single DOM-scraped message from the MutationObserver.
///
/// The headless browser's MutationObserver serialises each new
/// `<yt-live-chat-text-message-renderer>` element into:
/// ```json
/// {
///   "author": "Username",
///   "text": "Message body",
///   "photo": "https://...photo.jpg",
///   "badges": ["https://...badge.png"],
///   "role": "default|moderator|member|super-chat|membership|owner"
/// }
/// ```
pub fn parse_dom_message(json: &str) -> Option<ChatMessage> {
    #[derive(Deserialize)]
    struct DomEntry {
        author: String,
        text: String,
        photo: Option<String>,
        badges: Vec<String>,
        role: String,
    }

    let entry: DomEntry = match serde_json::from_str(json) {
        Ok(v) => v,
        Err(e) => {
            log::warn!("[processor] Failed to parse DOM message: {e}");
            return None;
        }
    };

    let is_moderator = entry.role == "moderator";
    let is_member = entry.role == "member";
    let is_super_chat = entry.role == "super-chat" || entry.role == "membership";
    let super_chat_amount = if entry.role == "super-chat" || entry.role == "membership" {
        Some("DOM".to_string())
    } else {
        None
    };

    Some(ChatMessage {
        id: format!("dom-{}", current_timestamp_ms()),
        author: entry.author,
        text: entry.text,
        photo: entry.photo.unwrap_or_default(),
        author_color: String::new(),
        badges: entry.badges,
        is_member,
        is_moderator,
        is_super_chat,
        super_chat_amount,
        timestamp_ms: current_timestamp_ms(),
    })
}

/// Extract fields from a liveChatTextMessageRenderer (or paid variant).
fn parse_text_renderer(
    r: &serde_json::Value,
    is_member: bool,
    super_chat_amount: Option<String>,
) -> ChatMessage {
    let id = r["id"].as_str().unwrap_or("").to_string();

    let author = r
        .pointer("/authorName/simpleText")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let author_color = r
        .pointer("/authorNameTextColor")
        .and_then(|v| v.as_u64())
        .map(argb_to_hex)
        .unwrap_or_default();

    let text = extract_runs_text(r);

    let badges = extract_badges(r);

    // Check badge icon types directly from the renderer
    let is_moderator = r
        .pointer("/authorBadges")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter().any(|b| {
                b.pointer("/liveChatAuthorBadgeRenderer/icon/iconType")
                    .and_then(|v| v.as_str())
                    == Some("MODERATOR")
            })
        })
        .unwrap_or(false);

    let is_super_chat = super_chat_amount.is_some();

    ChatMessage {
        id,
        author,
        text,
        photo: String::new(),
        author_color,
        badges,
        is_member,
        is_moderator,
        is_super_chat,
        super_chat_amount,
        timestamp_ms: current_timestamp_ms(),
    }
}

/// Extract plain text from YouTube's "runs" array format.
///
/// YouTube stores message text as an array of runs:
/// ```json
/// "message": {
///   "runs": [
///     { "text": "Hello " },
///     { "emoji": { "emojiId": ":)",
///                  "shortcuts": [":)"] } },
///     { "text": " world" }
///   ]
/// }
/// ```
fn extract_runs_text(r: &serde_json::Value) -> String {
    let runs = r
        .pointer("/message/runs")
        .or_else(|| r.pointer("/headerSubtext/runs"))
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();

    let mut out = String::new();
    for run in &runs {
        if let Some(text) = run["text"].as_str() {
            out.push_str(text);
        } else if let Some(shortcuts) = run.pointer("/emoji/shortcuts").and_then(|v| v.as_array())
        {
            if let Some(first) = shortcuts.first().and_then(|v| v.as_str()) {
                out.push_str(first);
            }
        }
    }
    out
}

/// Extract badge image URLs from a renderer's authorBadges array.
fn extract_badges(r: &serde_json::Value) -> Vec<String> {
    r.pointer("/authorBadges")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|b| {
                    b.pointer("/liveChatAuthorBadgeRenderer/customThumbnail/thumbnails/0/url")
                        .or_else(|| {
                            b.pointer(
                                "/liveChatAuthorBadgeRenderer/customThumbnail/thumbnails/1/url",
                            )
                        })
                        .and_then(|v| v.as_str())
                        .map(|s| s.to_string())
                })
                .collect()
        })
        .unwrap_or_default()
}

// ─── Helpers ──────────────────────────────────────────────────────

fn current_timestamp_ms() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

/// Convert YouTube's ARGB u64 colour to a CSS hex string.
/// YouTube stores colours as ARGB (e.g. 0xFFAA0000 → "#AA0000").
fn argb_to_hex(argb: u64) -> String {
    let r = (argb >> 16) & 0xFF;
    let g = (argb >> 8) & 0xFF;
    let b = argb & 0xFF;
    format!("#{r:02X}{g:02X}{b:02X}")
}

// ─── Tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── Realistic sample: text message WS frame ────────────────

    const SAMPLE_TEXT_FRAME: &str = r#"{
        "continuationContents": {
            "liveChatContinuation": {
                "actions": [{
                    "addChatItemAction": {
                        "item": {
                            "liveChatTextMessageRenderer": {
                                "id": "Ch0KGnNvbWVybWFuLXRlc3QtbWVzc2FnZS0xMjM4",
                                "authorName": { "simpleText": "@UserOne" },
                                "authorNameTextColor": 4278190335,
                                "message": {
                                    "runs": [
                                        { "text": "Hello " },
                                        { "emoji": { "emojiId": ":)",
                                                     "shortcuts": [":)"] } },
                                        { "text": " world" }
                                    ]
                                },
                                "authorBadges": [
                                    { "liveChatAuthorBadgeRenderer": {
                                        "customThumbnail": {
                                            "thumbnails": [
                                                { "url": "https://yt3.ggpht.com/mod.png" }
                                            ]
                                        },
                                        "icon": { "iconType": "MODERATOR" }
                                    }}
                                ]
                            }
                        }
                    }
                }]
            }
        }
    }"#;

    #[test]
    fn test_parse_websocket_frame_text() {
        let msgs = parse_websocket_frame(SAMPLE_TEXT_FRAME);
        assert_eq!(msgs.len(), 1);

        let msg = &msgs[0];
        assert_eq!(msg.id, "Ch0KGnNvbWVybWFuLXRlc3QtbWVzc2FnZS0xMjM4");
        assert_eq!(msg.author, "@UserOne");
        assert_eq!(msg.text, "Hello :) world");
        assert_eq!(msg.author_color, "#0000FF");
        assert_eq!(msg.badges.len(), 1);
        assert!(msg.badges[0].contains("mod.png"));
        assert!(msg.is_moderator);
        assert!(!msg.is_member);
        assert!(!msg.is_super_chat);
        assert!(msg.super_chat_amount.is_none());
    }

    // ── Realistic sample: super chat WS frame ──────────────────

    const SAMPLE_SUPERCHAT_FRAME: &str = r#"{
        "continuationContents": {
            "liveChatContinuation": {
                "actions": [{
                    "addChatItemAction": {
                        "item": {
                            "liveChatPaidMessageRenderer": {
                                "id": "super-chat-msg-001",
                                "authorName": { "simpleText": "@RichViewer" },
                                "authorNameTextColor": 4294198070,
                                "purchaseAmountText": { "simpleText": "$20.00" },
                                "message": {
                                    "runs": [{"text": "Love the stream!"}]
                                },
                                "authorBadges": []
                            }
                        }
                    }
                }]
            }
        }
    }"#;

    #[test]
    fn test_parse_websocket_frame_superchat() {
        let msgs = parse_websocket_frame(SAMPLE_SUPERCHAT_FRAME);
        assert_eq!(msgs.len(), 1);

        let msg = &msgs[0];
        assert!(msg.is_super_chat);
        assert_eq!(msg.super_chat_amount.as_deref(), Some("$20.00"));
        assert_eq!(msg.text, "Love the stream!");
        // 4294198070 = 0xFFF44336 -> #F44336
        assert_eq!(msg.author_color, "#F44336");
    }

    // ── Realistic sample: membership WS frame ──────────────────

    const SAMPLE_MEMBERSHIP_FRAME: &str = r#"{
        "continuationContents": {
            "liveChatContinuation": {
                "actions": [{
                    "addChatItemAction": {
                        "item": {
                            "liveChatMembershipItemRenderer": {
                                "id": "member-join-042",
                                "authorName": { "simpleText": "@NewMember" },
                                "headerSubtext": {
                                    "runs": [{"text": "Welcome to the club!"}]
                                },
                                "authorBadges": [
                                    { "liveChatAuthorBadgeRenderer": {
                                        "customThumbnail": {
                                            "thumbnails": [
                                                {"url": "https://yt3.ggpht.com/member_badge.png"}
                                            ]
                                        }
                                    }}
                                ]
                            }
                        }
                    }
                }]
            }
        }
    }"#;

    #[test]
    fn test_parse_websocket_frame_membership() {
        let msgs = parse_websocket_frame(SAMPLE_MEMBERSHIP_FRAME);
        assert_eq!(msgs.len(), 1);

        let msg = &msgs[0];
        assert!(msg.is_member);
        assert!(!msg.is_super_chat);
        assert_eq!(msg.badges.len(), 1);
        assert!(msg.badges[0].contains("member_badge.png"));
        assert_eq!(msg.text, "Welcome to the club!");
    }

    // ── Empty / invalid frame ──────────────────────────────────

    #[test]
    fn test_parse_websocket_frame_empty() {
        let msgs = parse_websocket_frame("{}");
        assert!(msgs.is_empty());
    }

    #[test]
    fn test_parse_websocket_frame_invalid() {
        let msgs = parse_websocket_frame("not json at all");
        assert!(msgs.is_empty());
    }

    // ── MessageStore ───────────────────────────────────────────

    #[test]
    fn test_message_store_push_and_recent() {
        let store = MessageStore::new();
        assert!(store.recent(10).is_empty());

        push_test_msg(&store, "a", "UserA", "Hello");
        push_test_msg(&store, "b", "UserB", "World");

        let recent = store.recent(10);
        assert_eq!(recent.len(), 2);
        assert_eq!(recent[0].author, "UserA");
        assert_eq!(recent[1].author, "UserB");
    }

    #[test]
    fn test_message_store_ring_buffer_capacity() {
        let store = MessageStore::new();
        for i in 0..RING_BUFFER_CAPACITY + 20 {
            push_test_msg(&store, &format!("m{i}"), "User", "Msg");
        }
        let all = store.all();
        assert_eq!(all.len(), RING_BUFFER_CAPACITY);
        // Oldest should be m20 (first 20 evicted)
        assert_eq!(all[0].id, format!("m{}", 20));
    }

    #[test]
    fn test_message_store_all_ordering() {
        let store = MessageStore::new();
        push_test_msg(&store, "1", "A", "First");
        push_test_msg(&store, "2", "B", "Second");
        push_test_msg(&store, "3", "C", "Third");

        let all = store.all();
        assert_eq!(all.len(), 3);
        assert_eq!(all[0].id, "1");
        assert_eq!(all[2].id, "3");
    }

    #[test]
    fn test_message_store_broadcast() {
        let store = MessageStore::new();
        let mut rx = store.subscribe();

        push_test_msg(&store, "bc1", "User", "Broadcast test");

        let received = rx.try_recv();
        assert!(received.is_ok());
        assert_eq!(received.unwrap().id, "bc1");
    }

    // ── Role detection ─────────────────────────────────────────

    #[test]
    fn test_chat_role_default() {
        let msg = ChatMessage {
            id: "r1".into(),
            author: "User".into(),
            text: "Hi".into(),
            photo: String::new(),
            author_color: "#FFF".into(),
            badges: vec![],
            is_member: false,
            is_moderator: false,
            is_super_chat: false,
            super_chat_amount: None,
            timestamp_ms: 1000,
        };
        assert_eq!(msg.role(), ChatRole::Default);
    }

    #[test]
    fn test_chat_role_moderator() {
        let msg = ChatMessage {
            id: "r2".into(),
            author: "Mod".into(),
            text: "Hi".into(),
            photo: String::new(),
            author_color: "#FFF".into(),
            badges: vec![],
            is_member: false,
            is_moderator: true,
            is_super_chat: false,
            super_chat_amount: None,
            timestamp_ms: 1000,
        };
        assert_eq!(msg.role(), ChatRole::Moderator);
    }

    #[test]
    fn test_chat_role_super_chat() {
        let msg = ChatMessage {
            id: "r3".into(),
            author: "Tipper".into(),
            text: "Hi".into(),
            photo: String::new(),
            author_color: "#FFF".into(),
            badges: vec![],
            is_member: false,
            is_moderator: false,
            is_super_chat: true,
            super_chat_amount: Some("$5.00".into()),
            timestamp_ms: 1000,
        };
        assert_eq!(msg.role(), ChatRole::SuperChat);
    }

    #[test]
    fn test_chat_role_member() {
        let msg = ChatMessage {
            id: "r4".into(),
            author: "Member".into(),
            text: "Hi".into(),
            photo: String::new(),
            author_color: "#FFF".into(),
            badges: vec![],
            is_member: true,
            is_moderator: false,
            is_super_chat: false,
            super_chat_amount: None,
            timestamp_ms: 1000,
        };
        assert_eq!(msg.role(), ChatRole::Member);
    }

    // ── argb_to_hex ────────────────────────────────────────────

    #[test]
    fn test_argb_to_hex() {
        assert_eq!(argb_to_hex(0xFFAA0000), "#AA0000");
        assert_eq!(argb_to_hex(0xFF00FF00), "#00FF00");
        assert_eq!(argb_to_hex(0xFF0000FF), "#0000FF");
        assert_eq!(argb_to_hex(0xFFFFFFFF), "#FFFFFF");
        assert_eq!(argb_to_hex(0xFF000000), "#000000");
        assert_eq!(argb_to_hex(0x55777777), "#777777");
        assert_eq!(argb_to_hex(4278190335), "#0000FF"); // common YouTube blue
    }

    // ── Fixture helper ─────────────────────────────────────────

    fn push_test_msg(store: &MessageStore, id: &str, author: &str, text: &str) {
        store.push(ChatMessage {
            id: id.into(),
            author: author.into(),
            text: text.into(),
            photo: String::new(),
            author_color: "#FFF".into(),
            badges: vec![],
            is_member: false,
            is_moderator: false,
            is_super_chat: false,
            super_chat_amount: None,
            timestamp_ms: current_timestamp_ms(),
        });
    }
}
