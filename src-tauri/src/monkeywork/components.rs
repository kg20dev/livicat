//! Component registry and default values for the Monkeywork engine.
//!
//! Phase 2 introduces a static registry of the 12 component types that may
//! appear in a scene graph. Each [`ComponentDefinition`] describes the slots,
//! allowed properties, allowed child component types, and default property
//! values for a single component kind. The [`ComponentRegistry`] is the
//! authoritative lookup table used by downstream phases (validation, default
//! merging, etc.).

use std::collections::HashMap;

use crate::monkeywork::scene_graph::PropValue;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/// A description of a single component kind.
#[derive(Debug, Clone)]
pub struct ComponentDefinition {
    /// The component type name (e.g. `"MessageBubble"`).
    pub name: String,
    /// Named child slots (e.g. `["Content"]`).
    pub slots: Vec<String>,
    /// Allowed property names for this component.
    pub properties: Vec<String>,
    /// Allowed child component types.
    pub allowed_children: Vec<String>,
    /// Default property values applied when not overridden by the user.
    pub defaults: HashMap<String, PropValue>,
}

impl ComponentDefinition {
    /// Merge a set of user-supplied properties with this component's defaults.
    ///
    /// The defaults are cloned first, then any user-supplied values overwrite
    /// the matching default entries. The returned map therefore always
    /// contains every default key plus every user key.
    pub fn merge_with_defaults(&self, props: &HashMap<String, PropValue>) -> HashMap<String, PropValue> {
        let mut merged = self.defaults.clone();
        for (key, value) in props {
            merged.insert(key.clone(), value.clone());
        }
        merged
    }
}

/// The registry of all known component definitions.
#[derive(Debug, Clone)]
pub struct ComponentRegistry {
    components: HashMap<String, ComponentDefinition>,
}

impl Default for ComponentRegistry {
    fn default() -> Self {
        Self::new()
    }
}

impl ComponentRegistry {
    /// Build a registry populated with all 12 built-in component types.
    pub fn new() -> Self {
        let mut components = HashMap::new();

        let mut register = |def: ComponentDefinition| {
            components.insert(def.name.clone(), def);
        };

        // 1. ChatRoot — the top-level scene container.
        register(ComponentDefinition {
            name: "ChatRoot".to_string(),
            slots: vec![],
            properties: vec![],
            allowed_children: vec!["MessageList".to_string()],
            defaults: HashMap::new(),
        });

        // 2. MessageList — a vertical list of message rows.
        register(ComponentDefinition {
            name: "MessageList".to_string(),
            slots: vec![],
            properties: vec![],
            allowed_children: vec!["Message".to_string()],
            defaults: HashMap::new(),
        });

        // 3. Message — a single chat message row.
        register(ComponentDefinition {
            name: "Message".to_string(),
            slots: vec![],
            properties: vec![],
            allowed_children: vec![
                "Avatar".to_string(),
                "AuthorBubble".to_string(),
                "MessageBubble".to_string(),
                "Decoration".to_string(),
                "Timestamp".to_string(),
                "Badge".to_string(),
            ],
            defaults: HashMap::new(),
        });

        // 4. Avatar — the author's profile image.
        register(ComponentDefinition {
            name: "Avatar".to_string(),
            slots: vec![],
            properties: vec![
                "size".to_string(),
                "shape".to_string(),
                "border".to_string(),
                "shadow".to_string(),
                "offset".to_string(),
                "visibility".to_string(),
            ],
            allowed_children: vec![],
            defaults: map(&[
                ("size", PropValue::Number(40.0)),
                ("shape", PropValue::String("circle".to_string())),
            ]),
        });

        // 5. AuthorBubble — the skinned container wrapping an Author.
        register(ComponentDefinition {
            name: "AuthorBubble".to_string(),
            slots: vec!["Author".to_string()],
            properties: vec!["skin".to_string(), "padding".to_string()],
            allowed_children: vec!["Decoration".to_string()],
            defaults: map(&[
                ("skin", PropValue::String("solid".to_string())),
                ("padding", padding(4.0, 8.0, 4.0, 8.0)),
            ]),
        });

        // 6. MessageBubble — the skinned container wrapping message Content.
        register(ComponentDefinition {
            name: "MessageBubble".to_string(),
            slots: vec!["Content".to_string()],
            properties: vec![
                "skin".to_string(),
                "padding".to_string(),
                "animation".to_string(),
            ],
            allowed_children: vec!["Decoration".to_string()],
            defaults: map(&[
                ("skin", PropValue::String("solid".to_string())),
                ("padding", padding(8.0, 12.0, 8.0, 12.0)),
            ]),
        });

        // 7. Author — the author name text element.
        register(ComponentDefinition {
            name: "Author".to_string(),
            slots: vec![],
            properties: vec![
                "font".to_string(),
                "weight".to_string(),
                "color".to_string(),
                "outline".to_string(),
                "spacing".to_string(),
            ],
            allowed_children: vec![],
            defaults: map(&[
                ("color", PropValue::String("primary".to_string())),
                ("weight", PropValue::Number(600.0)),
            ]),
        });

        // 8. Content — the message body text element.
        register(ComponentDefinition {
            name: "Content".to_string(),
            slots: vec![],
            properties: vec![
                "font".to_string(),
                "color".to_string(),
                "lineHeight".to_string(),
                "wrapping".to_string(),
                "spacing".to_string(),
            ],
            allowed_children: vec![],
            defaults: map(&[
                ("color", PropValue::String("text".to_string())),
                ("lineHeight", PropValue::Number(1.4)),
            ]),
        });

        // 9. Decoration — a decorative overlay (sticker, emoji, etc.).
        register(ComponentDefinition {
            name: "Decoration".to_string(),
            slots: vec![],
            properties: vec![
                "asset".to_string(),
                "anchor".to_string(),
                "offsetX".to_string(),
                "offsetY".to_string(),
                "opacity".to_string(),
                "blendMode".to_string(),
            ],
            allowed_children: vec![],
            defaults: map(&[
                ("anchor", PropValue::String("top-right".to_string())),
                ("opacity", PropValue::Number(1.0)),
            ]),
        });

        // 10. SuperChat — a highlighted paid-message bubble.
        register(ComponentDefinition {
            name: "SuperChat".to_string(),
            slots: vec!["Content".to_string()],
            properties: vec![
                "skin".to_string(),
                "padding".to_string(),
                "amount".to_string(),
            ],
            allowed_children: vec!["Decoration".to_string()],
            defaults: map(&[("skin", PropValue::String("solid".to_string()))]),
        });

        // 11. Timestamp — the per-message time label.
        register(ComponentDefinition {
            name: "Timestamp".to_string(),
            slots: vec![],
            properties: vec![
                "format".to_string(),
                "opacity".to_string(),
                "position".to_string(),
            ],
            allowed_children: vec![],
            defaults: map(&[
                ("format", PropValue::String("HH:MM".to_string())),
                ("opacity", PropValue::Number(0.6)),
            ]),
        });

        // 12. Badge — a small icon (membership, moderator, etc.).
        register(ComponentDefinition {
            name: "Badge".to_string(),
            slots: vec![],
            properties: vec!["asset".to_string(), "size".to_string()],
            allowed_children: vec![],
            defaults: map(&[("size", PropValue::Number(16.0))]),
        });

        Self { components }
    }

    /// Look up a component definition by name.
    pub fn get(&self, name: &str) -> Option<&ComponentDefinition> {
        self.components.get(name)
    }

    /// Borrow the entire component map.
    pub fn all(&self) -> &HashMap<String, ComponentDefinition> {
        &self.components
    }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/// Build a `PropValue::Array` padding value `[top, right, bottom, left]`.
fn padding(top: f64, right: f64, bottom: f64, left: f64) -> PropValue {
    PropValue::Array(vec![
        PropValue::Number(top),
        PropValue::Number(right),
        PropValue::Number(bottom),
        PropValue::Number(left),
    ])
}

/// Build a `HashMap` from a slice of `(key, value)` pairs.
fn map(pairs: &[(&str, PropValue)]) -> HashMap<String, PropValue> {
    pairs
        .iter()
        .map(|(k, v)| (k.to_string(), v.clone()))
        .collect()
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn lookup_message_bubble() {
        let reg = ComponentRegistry::default();
        let comp = reg.get("MessageBubble").unwrap();
        assert_eq!(comp.name, "MessageBubble");
        assert!(comp.slots.contains(&"Content".to_string()));
        assert!(comp.properties.contains(&"skin".to_string()));
        assert!(comp.properties.contains(&"padding".to_string()));
    }

    #[test]
    fn lookup_avatar() {
        let reg = ComponentRegistry::default();
        let comp = reg.get("Avatar").unwrap();
        assert!(comp.properties.contains(&"size".to_string()));
        assert!(comp.properties.contains(&"shape".to_string()));
    }

    #[test]
    fn all_12_types_registered() {
        let reg = ComponentRegistry::default();
        let types = vec![
            "ChatRoot",
            "MessageList",
            "Message",
            "Avatar",
            "AuthorBubble",
            "MessageBubble",
            "Author",
            "Content",
            "Decoration",
            "SuperChat",
            "Timestamp",
            "Badge",
        ];
        for t in types {
            assert!(reg.get(t).is_some(), "Missing component: {}", t);
        }
    }

    #[test]
    fn merge_props_with_defaults() {
        let reg = ComponentRegistry::default();
        let comp = reg.get("MessageBubble").unwrap();
        let mut props = HashMap::new();
        props.insert(
            "padding".to_string(),
            PropValue::Array(vec![
                PropValue::Number(20.0),
                PropValue::Number(20.0),
                PropValue::Number(20.0),
                PropValue::Number(20.0),
            ]),
        );

        let merged = comp.merge_with_defaults(&props);
        // User override wins
        assert!(merged.contains_key("padding"));
        // Default skin is applied
        assert!(merged.contains_key("skin"));
    }

    #[test]
    fn reject_unknown_component() {
        let reg = ComponentRegistry::default();
        assert!(reg.get("UnknownThing").is_none());
    }

    #[test]
    fn chat_root_allows_message_list() {
        let reg = ComponentRegistry::default();
        let comp = reg.get("ChatRoot").unwrap();
        assert!(comp.allowed_children.contains(&"MessageList".to_string()));
    }

    #[test]
    fn content_cannot_contain_avatar() {
        let reg = ComponentRegistry::default();
        let comp = reg.get("Content").unwrap();
        assert!(!comp.allowed_children.contains(&"Avatar".to_string()));
    }
}
