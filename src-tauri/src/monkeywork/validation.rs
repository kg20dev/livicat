//! Scene graph validation.
//!
//! Validates that a [`SceneGraph`] conforms to the Monkeywork component model:
//! - All component types are registered
//! - Parent-child relationships respect `allowed_children` constraints
//! - All errors are collected rather than failing fast

use crate::monkeywork::scene_graph::{SceneGraph, ComponentNode};
use crate::monkeywork::components::ComponentRegistry;

/// Result of scene graph validation.
#[derive(Debug)]
pub struct ValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
}

/// Validate a scene graph against the component registry.
///
/// Returns `Ok(ValidationResult)` when the scene is valid, or `Err(Vec<String>)`
/// when one or more validation errors are found. All errors are collected before
/// returning, providing a complete diagnostic report.
pub fn validate(scene: &SceneGraph) -> Result<ValidationResult, Vec<String>> {
    let registry = ComponentRegistry::default();
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    validate_node(&scene.scene, &registry, &mut errors, &mut warnings);

    if errors.is_empty() {
        Ok(ValidationResult { valid: true, errors, warnings })
    } else {
        Err(errors)
    }
}

/// Recursively validate a component node and its children.
///
/// An empty `allowed_children` list means the component is a leaf and may not
/// contain any children. When a node's type is unknown, its children are still
/// recursed into so that as many errors as possible are collected in one pass.
fn validate_node(
    node: &ComponentNode,
    registry: &ComponentRegistry,
    errors: &mut Vec<String>,
    warnings: &mut Vec<String>,
) {
    // Look up the component definition. If unknown, record an error but still
    // recurse into the children to surface additional problems.
    let def = match registry.get(&node.component_type) {
        Some(c) => c,
        None => {
            errors.push(format!("Unknown component type: {}", node.component_type));
            for child in &node.children {
                validate_node(child, registry, errors, warnings);
            }
            return;
        }
    };

    // Check allowed children. An empty list means no children are permitted.
    // Slot children (named slots like "Author" inside "AuthorBubble") are always
    // allowed — they are the component's designated content areas.
    for child in &node.children {
        let is_slot = def.slots.contains(&child.component_type);
        let allowed = &def.allowed_children;
        if !is_slot && !allowed.contains(&child.component_type) {
            if registry.get(&child.component_type).is_some() {
                // Valid component but wrong parent — error
                errors.push(format!(
                    "Component '{}' cannot contain '{}' (allowed: {:?})",
                    node.component_type, child.component_type, allowed
                ));
            }
            // If the child is also an unknown component, the recursive call
            // below will record the "Unknown component type" error.
        }
        validate_node(child, registry, errors, warnings);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::monkeywork::scene_graph::*;
    use std::collections::HashMap;

    fn make_scene(component_type: &str, children: Vec<ComponentNode>) -> SceneGraph {
        SceneGraph {
            version: 1,
            theme: ThemeMeta { id: "t".into(), name: "T".into(), author: "A".into() },
            variables: HashMap::new(),
            chat: ChatConfig { direction: "bottom-up".into(), spacing: 8.0, max_messages: 10 },
            scene: ComponentNode {
                id: None,
                component_type: component_type.into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children,
            },
        }
    }

    fn empty_node(component_type: &str) -> ComponentNode {
        ComponentNode {
            id: None,
            component_type: component_type.into(),
            props: HashMap::new(),
            structure: None,
            style: None,
            behavior: None,
            children: vec![],
        }
    }

    #[test]
    fn valid_scene_passes() {
        // ChatRoot -> MessageList -> Message -> [Avatar, AuthorBubble]
        // All parent-child relationships respect the registry's allowed_children.
        let scene = make_scene("ChatRoot", vec![
            ComponentNode {
                id: None,
                component_type: "MessageList".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![
                    ComponentNode {
                        id: None,
                        component_type: "Message".into(),
                        props: HashMap::new(),
                        structure: None,
                        style: None,
                        behavior: None,
                        children: vec![
                            empty_node("Avatar"),
                            empty_node("AuthorBubble"),
                        ],
                    }
                ],
            }
        ]);
        let result = validate(&scene);
        assert!(result.is_ok(), "Errors: {:?}", result.unwrap_err());
    }

    #[test]
    fn reject_unknown_component() {
        let scene = make_scene("UnknownThing", vec![]);
        let result = validate(&scene);
        assert!(result.is_err());
        let errs = result.unwrap_err();
        assert!(errs.iter().any(|e| e.contains("UnknownThing")));
    }

    #[test]
    fn reject_invalid_parent_child() {
        // Content is a leaf (empty allowed_children) and cannot contain Avatar.
        let scene = SceneGraph {
            version: 1,
            theme: ThemeMeta { id: "t".into(), name: "T".into(), author: "A".into() },
            variables: HashMap::new(),
            chat: ChatConfig { direction: "bottom-up".into(), spacing: 8.0, max_messages: 10 },
            scene: ComponentNode {
                id: None,
                component_type: "ChatRoot".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![
                    ComponentNode {
                        id: None,
                        component_type: "MessageList".into(),
                        props: HashMap::new(),
                        structure: None,
                        style: None,
                        behavior: None,
                        children: vec![
                            ComponentNode {
                                id: None,
                                component_type: "Message".into(),
                                props: HashMap::new(),
                                structure: None,
                                style: None,
                                behavior: None,
                                children: vec![
                                    ComponentNode {
                                        id: None,
                                        component_type: "Content".into(),
                                        props: HashMap::new(),
                                        structure: None,
                                        style: None,
                                        behavior: None,
                                        children: vec![
                                            empty_node("Avatar"),
                                        ],
                                    }
                                ],
                            }
                        ],
                    }
                ],
            },
        };
        let result = validate(&scene);
        assert!(result.is_err());
        let errs = result.unwrap_err();
        assert!(
            errs.iter().any(|e| e.contains("Content") && e.contains("Avatar")),
            "Expected a parent-child error about Content/Avatar, got: {:?}",
            errs
        );
    }

    #[test]
    fn multiple_errors_collected() {
        // Two unknown components nested: BadRoot -> BadChild
        let scene = SceneGraph {
            version: 1,
            theme: ThemeMeta { id: "t".into(), name: "T".into(), author: "A".into() },
            variables: HashMap::new(),
            chat: ChatConfig { direction: "bottom-up".into(), spacing: 8.0, max_messages: 10 },
            scene: ComponentNode {
                id: None,
                component_type: "BadRoot".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![
                    empty_node("BadChild"),
                ],
            },
        };
        let result = validate(&scene);
        assert!(result.is_err());
        assert!(result.unwrap_err().len() >= 2);
    }

    #[test]
    fn valid_result_carries_warnings() {
        // A valid scene returns Ok with an (empty) warnings vector.
        let scene = make_scene("ChatRoot", vec![empty_node("MessageList")]);
        let result = validate(&scene).expect("should be valid");
        assert!(result.valid);
        assert!(result.warnings.is_empty());
    }

    #[test]
    fn leaf_with_children_is_rejected() {
        // Avatar is a leaf but here has a child — must error.
        let scene = make_scene("ChatRoot", vec![
            ComponentNode {
                id: None,
                component_type: "MessageList".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![
                    ComponentNode {
                        id: None,
                        component_type: "Message".into(),
                        props: HashMap::new(),
                        structure: None,
                        style: None,
                        behavior: None,
                        children: vec![
                            ComponentNode {
                                id: None,
                                component_type: "Avatar".into(),
                                props: HashMap::new(),
                                structure: None,
                                style: None,
                                behavior: None,
                                children: vec![empty_node("Badge")],
                            },
                        ],
                    }
                ],
            }
        ]);
        let result = validate(&scene);
        assert!(result.is_err());
    }
}
