//! Scene Graph types for the Monkeywork engine.
//!
//! These types describe the intermediate representation (IR) that themes are
//! compiled into. A [`SceneGraph`] is the root of the tree and is produced by
//! deserializing a JSON document.

use std::collections::HashMap;

use serde::Deserialize;

// ---------------------------------------------------------------------------
// Top-level scene graph
// ---------------------------------------------------------------------------

/// The root of a parsed scene graph.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SceneGraph {
    /// Schema version of the scene graph format.
    pub version: u32,
    /// Metadata describing the source theme.
    pub theme: ThemeMeta,
    /// Design tokens (colors, spacing, etc.) keyed by name.
    #[serde(default)]
    pub variables: HashMap<String, VariableValue>,
    /// Global chat layout configuration.
    pub chat: ChatConfig,
    /// The root component of the scene tree.
    pub scene: ComponentNode,
}

/// Metadata describing the theme a scene graph was produced from.
#[derive(Debug, Clone, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ThemeMeta {
    /// Machine-friendly theme identifier.
    pub id: String,
    /// Human-readable theme name.
    pub name: String,
    /// Theme author / attribution.
    pub author: String,
}

/// Global chat layout configuration.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatConfig {
    /// Message flow direction, e.g. `"bottom-up"` or `"top-down"`.
    #[serde(default = "default_direction")]
    pub direction: String,
    /// Vertical spacing between messages, in pixels.
    #[serde(default = "default_spacing")]
    pub spacing: f64,
    /// Maximum number of messages kept on screen.
    #[serde(default = "default_max_messages")]
    pub max_messages: u32,
}

fn default_direction() -> String {
    "bottom-up".to_string()
}

fn default_spacing() -> f64 {
    8.0
}

fn default_max_messages() -> u32 {
    10
}

// ---------------------------------------------------------------------------
// Component tree
// ---------------------------------------------------------------------------

/// A single node in the component scene tree.
#[derive(Debug, Clone, Deserialize)]
pub struct ComponentNode {
    /// Optional stable identifier for referencing the node from CSS/behaviors.
    #[serde(default)]
    pub id: Option<String>,
    /// The component type, sourced from the JSON `"type"` field.
    #[serde(rename = "type")]
    pub component_type: String,
    /// Arbitrary component properties keyed by name.
    #[serde(default)]
    pub props: HashMap<String, PropValue>,
    /// Optional structural configuration (e.g. explicit child slots).
    #[serde(default)]
    pub structure: Option<StructureConfig>,
    /// Optional visual styling configuration.
    #[serde(default)]
    pub style: Option<StyleConfig>,
    /// Optional behavior/animation configuration.
    #[serde(default)]
    pub behavior: Option<BehaviorConfig>,
    /// Child component nodes.
    #[serde(default)]
    pub children: Vec<ComponentNode>,
}

/// Structural configuration for a component.
#[derive(Debug, Clone, Deserialize)]
pub struct StructureConfig {
    /// Explicit, ordered list of named child slots.
    #[serde(default)]
    pub children: Option<Vec<String>>,
}

/// Visual styling configuration for a component.
#[derive(Debug, Clone, Deserialize)]
pub struct StyleConfig {
    /// Path to an SVG skin asset.
    pub skin: Option<String>,
    /// Background (color or 9-slice image).
    pub background: Option<BackgroundConfig>,
    /// Padding around the component's content.
    pub padding: Option<PaddingValue>,
    /// Corner radius, in pixels.
    pub radius: Option<f64>,
    /// Any additional, theme-specific style properties.
    #[serde(flatten)]
    pub extra: HashMap<String, PropValue>,
}

/// Behavior / animation configuration for a component.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BehaviorConfig {
    /// Class name of the enter animation.
    pub enter_animation: Option<String>,
    /// Class name of the exit animation.
    pub exit_animation: Option<String>,
}

/// Background configuration, supporting either solid colors or skinned images.
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackgroundConfig {
    /// The background kind, sourced from the JSON `"type"` field.
    #[serde(rename = "type")]
    pub bg_type: String,
    /// Solid background color.
    pub color: Option<String>,
    /// Path to a background image asset.
    pub asset: Option<String>,
    /// Content insets for 9-slice backgrounds.
    pub content_insets: Option<Insets>,
    /// Slice configuration for 9-slice backgrounds.
    pub slice: Option<SliceConfig>,
}

/// Four-sided inset values (top, right, bottom, left).
#[derive(Debug, Clone, Deserialize)]
pub struct Insets {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

/// Four-sided 9-slice values (top, right, bottom, left).
#[derive(Debug, Clone, Deserialize)]
pub struct SliceConfig {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

// ---------------------------------------------------------------------------
// Value enums
// ---------------------------------------------------------------------------

/// A design-token variable value. Strings are interpreted as colors when they
/// look like CSS color values, otherwise as plain strings.
#[derive(Debug, Clone, PartialEq)]
pub enum VariableValue {
    Color(String),
    Number(f64),
    String(String),
}

impl<'de> Deserialize<'de> for VariableValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::Number(n) => {
                n.as_f64().map(VariableValue::Number).ok_or_else(|| {
                    serde::de::Error::custom("variable number value is not a valid f64")
                })
            }
            serde_json::Value::String(s) => {
                if is_color(&s) {
                    Ok(VariableValue::Color(s))
                } else {
                    Ok(VariableValue::String(s))
                }
            }
            _ => Err(serde::de::Error::custom(
                "variable value must be a color string or a number",
            )),
        }
    }
}

/// Returns `true` when `s` looks like a CSS color value.
fn is_color(s: &str) -> bool {
    let trimmed = s.trim().to_ascii_lowercase();
    trimmed.starts_with('#') || trimmed.starts_with("rgb") || trimmed.starts_with("hsl")
}

/// A dynamically-typed component property value.
#[derive(Debug, Clone, PartialEq)]
pub enum PropValue {
    String(String),
    Number(f64),
    Bool(bool),
    Array(Vec<PropValue>),
    Object(HashMap<String, PropValue>),
}

impl PropValue {
    /// Convert a raw JSON value into a [`PropValue`].
    fn from_value(value: serde_json::Value) -> Result<PropValue, String> {
        match value {
            serde_json::Value::String(s) => Ok(PropValue::String(s)),
            serde_json::Value::Number(n) => n
                .as_f64()
                .map(PropValue::Number)
                .ok_or_else(|| "property number value is not a valid f64".to_string()),
            serde_json::Value::Bool(b) => Ok(PropValue::Bool(b)),
            serde_json::Value::Array(arr) => {
                let mut out = Vec::with_capacity(arr.len());
                for item in arr {
                    out.push(PropValue::from_value(item)?);
                }
                Ok(PropValue::Array(out))
            }
            serde_json::Value::Object(obj) => {
                let mut map = HashMap::with_capacity(obj.len());
                for (key, val) in obj {
                    map.insert(key, PropValue::from_value(val)?);
                }
                Ok(PropValue::Object(map))
            }
            serde_json::Value::Null => Err("property value must not be null".to_string()),
        }
    }
}

impl<'de> Deserialize<'de> for PropValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        PropValue::from_value(value).map_err(serde::de::Error::custom)
    }
}

/// Padding value, either a single scalar applied to all sides or an explicit
/// `[top, right, bottom, left]` array.
#[derive(Debug, Clone, PartialEq)]
pub enum PaddingValue {
    Single(f64),
    Array([f64; 4]),
}

impl<'de> Deserialize<'de> for PaddingValue {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: serde::Deserializer<'de>,
    {
        let value = serde_json::Value::deserialize(deserializer)?;
        match value {
            serde_json::Value::Number(n) => n
                .as_f64()
                .map(PaddingValue::Single)
                .ok_or_else(|| serde::de::Error::custom("padding number is not a valid f64")),
            serde_json::Value::Array(arr) => {
                if arr.len() != 4 {
                    return Err(serde::de::Error::custom(
                        "padding array must contain exactly 4 numbers",
                    ));
                }
                let mut nums = [0.0f64; 4];
                for (index, item) in arr.into_iter().enumerate() {
                    nums[index] = item.as_f64().ok_or_else(|| {
                        serde::de::Error::custom("padding array contains a non-numeric value")
                    })?;
                }
                Ok(PaddingValue::Array(nums))
            }
            _ => Err(serde::de::Error::custom(
                "padding must be a number or a 4-element array",
            )),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn parse_valid_project_livi() {
        let json = json!({
            "version": 1,
            "theme": {
                "id": "test",
                "name": "Test Theme",
                "author": "Test"
            },
            "variables": {
                "primary": "#FF0000",
                "spacing-sm": 8
            },
            "chat": {
                "direction": "bottom-up",
                "spacing": 12,
                "maxMessages": 8
            },
            "scene": {
                "type": "ChatRoot",
                "children": [
                    {
                        "type": "MessageList",
                        "children": [
                            {
                                "type": "Message",
                                "children": [
                                    { "type": "Avatar", "props": { "size": 48 } },
                                    {
                                        "type": "AuthorBubble",
                                        "props": { "skin": "skins/author.svg" },
                                        "children": [{ "type": "Author" }]
                                    },
                                    {
                                        "type": "MessageBubble",
                                        "props": { "skin": "skins/message.svg" },
                                        "children": [{ "type": "Content" }]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        });

        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        assert_eq!(scene.version, 1);
        assert_eq!(scene.theme.id, "test");
        assert_eq!(scene.chat.direction, "bottom-up");
        assert_eq!(scene.chat.spacing, 12.0);
        assert_eq!(scene.chat.max_messages, 8);

        // Verify scene tree
        assert_eq!(scene.scene.component_type, "ChatRoot");
        assert_eq!(scene.scene.children.len(), 1);

        let message_list = &scene.scene.children[0];
        assert_eq!(message_list.component_type, "MessageList");
        assert_eq!(message_list.children.len(), 1);

        let message = &message_list.children[0];
        assert_eq!(message.component_type, "Message");
        assert_eq!(message.children.len(), 3);
    }

    #[test]
    fn parse_variables() {
        let json = json!({
            "version": 1,
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {
                "primary": "#FF0000",
                "secondary": "#000000",
                "spacing-sm": 8,
                "spacing-md": 16
            },
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 },
            "scene": { "type": "ChatRoot", "children": [] }
        });

        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        assert_eq!(scene.variables.len(), 4);
        assert_eq!(
            scene.variables["primary"],
            VariableValue::Color("#FF0000".into())
        );
        assert_eq!(scene.variables["spacing-sm"], VariableValue::Number(8.0));
    }

    #[test]
    fn parse_component_props() {
        let json = json!({
            "version": 1,
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {},
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 },
            "scene": {
                "type": "MessageBubble",
                "props": {
                    "skin": "skins/bubble.svg",
                    "padding": [18, 24, 18, 24],
                    "animation": "comic-pop"
                },
                "children": [{ "type": "Content" }]
            }
        });

        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        let bubble = &scene.scene;
        assert_eq!(bubble.component_type, "MessageBubble");
        assert_eq!(
            bubble.props["skin"],
            PropValue::String("skins/bubble.svg".into())
        );
        assert_eq!(
            bubble.props["animation"],
            PropValue::String("comic-pop".into())
        );
    }

    #[test]
    fn parse_nested_children() {
        let json = json!({
            "version": 1,
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {},
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 },
            "scene": {
                "type": "ChatRoot",
                "children": [{
                    "type": "MessageList",
                    "children": [{
                        "type": "Message",
                        "children": [
                            { "type": "Avatar" },
                            { "type": "AuthorBubble", "children": [{ "type": "Author" }] },
                            { "type": "MessageBubble", "children": [{ "type": "Content" }] }
                        ]
                    }]
                }]
            }
        });

        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        let msg = &scene.scene.children[0].children[0];
        assert_eq!(msg.children.len(), 3);
        assert_eq!(msg.children[0].component_type, "Avatar");
        assert_eq!(msg.children[1].component_type, "AuthorBubble");
        assert_eq!(msg.children[2].component_type, "MessageBubble");
    }

    #[test]
    fn reject_missing_version() {
        let json = json!({
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {},
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 },
            "scene": { "type": "ChatRoot", "children": [] }
        });

        let result = serde_json::from_value::<SceneGraph>(json);
        assert!(result.is_err());
    }

    #[test]
    fn reject_missing_scene() {
        let json = json!({
            "version": 1,
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {},
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 }
        });

        let result = serde_json::from_value::<SceneGraph>(json);
        assert!(result.is_err());
    }

    #[test]
    fn reject_invalid_json() {
        let result = serde_json::from_str::<SceneGraph>("not json");
        assert!(result.is_err());
    }

    #[test]
    fn parse_optional_chat_fields_default() {
        let json = json!({
            "version": 1,
            "theme": { "id": "t", "name": "T", "author": "A" },
            "variables": {},
            "chat": {},
            "scene": { "type": "ChatRoot", "children": [] }
        });

        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        assert_eq!(scene.chat.direction, "bottom-up");
        assert_eq!(scene.chat.spacing, 8.0);
        assert_eq!(scene.chat.max_messages, 10);
    }

    #[test]
    fn parse_padding_value_single_and_array() {
        let single: PaddingValue = serde_json::from_str("16").unwrap();
        assert_eq!(single, PaddingValue::Single(16.0));

        let arr: PaddingValue = serde_json::from_str("[18, 24, 18, 24]").unwrap();
        assert_eq!(arr, PaddingValue::Array([18.0, 24.0, 18.0, 24.0]));

        let bad = serde_json::from_str::<PaddingValue>("[1, 2, 3]");
        assert!(bad.is_err());
    }

    #[test]
    fn parse_variable_string_is_not_color() {
        let v: VariableValue = serde_json::from_str("\"comic-pop\"").unwrap();
        assert_eq!(v, VariableValue::String("comic-pop".into()));
    }
}
