//! Layout engine for the Monkeywork engine.
//!
//! The layout engine walks a [`ComponentNode`] tree and produces a
//! [`RenderNode`] tree with resolved absolute positions and dimensions. It
//! implements a simplified block layout: each node consumes the full available
//! width, stacks its children vertically (with spacing), and adds its own
//! padding around the content box.

use std::collections::HashMap;

use crate::monkeywork::render_tree::*;
use crate::monkeywork::scene_graph::{ComponentNode, PropValue, SceneGraph};
use crate::monkeywork::tokens::ThemeContext;

/// Lay out an entire scene graph into a render tree.
///
/// The root scene node is laid out starting at `(0, 0)` with the given
/// `width`. The `height` parameter is reserved for future use (e.g. overflow
/// / viewport handling) but not currently enforced.
pub fn layout_scene(
    scene: &SceneGraph,
    ctx: &ThemeContext,
    width: f64,
    height: f64,
) -> RenderNode {
    let _ = height; // reserved for future overflow / viewport handling
    layout_node(&scene.scene, ctx, 0.0, 0.0, width)
}

/// Lay out a single component node into a render node.
///
/// `x` / `y` are the absolute position of this node's outer box (including
/// padding). `available_width` is the width available to this node's content.
pub fn layout_node(
    node: &ComponentNode,
    ctx: &ThemeContext,
    x: f64,
    y: f64,
    available_width: f64,
) -> RenderNode {
    // Special-case: Avatar uses its `size` prop for both width and height.
    if node.component_type == "Avatar" {
        let size = get_f64_prop(node, "size").unwrap_or(32.0);
        return RenderNode {
            component_type: node.component_type.clone(),
            x,
            y,
            width: size,
            height: size,
            background: None,
            padding: [0.0, 0.0, 0.0, 0.0],
            children: vec![],
            text: None,
        };
    }

    let padding = extract_padding(&node.props);
    let bg = extract_background(node);

    let content_x = x + padding[3]; // left
    let content_y = y + padding[0]; // top
    let content_width = available_width - padding[1] - padding[3]; // right + left

    let mut children: Vec<RenderNode> = Vec::new();
    let mut child_y = content_y;

    for child in &node.children {
        let child_render = layout_node(child, ctx, content_x, child_y, content_width);
        child_y += child_render.height + ctx.resolve_spacing_with_default("spacing", 8.0);
        children.push(child_render);
    }

    let content_height = if children.is_empty() {
        32.0 // default height for leaf nodes
    } else {
        child_y - content_y
    };

    let total_height = content_height + padding[0] + padding[2];

    RenderNode {
        component_type: node.component_type.clone(),
        x,
        y,
        width: available_width,
        height: total_height,
        background: bg,
        padding,
        children,
        text: extract_text(node, ctx),
    }
}

/// Lay out a flat list of message nodes sequentially along the y axis.
///
/// Each node is placed below the previous one, separated by the resolved
/// `spacing` token (defaulting to `8.0`).
pub fn layout_message_list(
    nodes: &[ComponentNode],
    ctx: &ThemeContext,
    width: f64,
    start_y: f64,
) -> Vec<RenderNode> {
    let mut renders = Vec::new();
    let mut current_y = start_y;
    for node in nodes {
        let render = layout_node(node, ctx, 0.0, current_y, width);
        current_y += render.height + ctx.resolve_spacing_with_default("spacing", 8.0);
        renders.push(render);
    }
    renders
}

// ---------------------------------------------------------------------------
// Extraction helpers
// ---------------------------------------------------------------------------

/// Extract padding `[top, right, bottom, left]` from a component's props.
///
/// Accepts either a 4-element numeric array or a single number applied to all
/// sides. Returns zeros when no padding is defined.
fn extract_padding(props: &HashMap<String, PropValue>) -> [f64; 4] {
    match props.get("padding") {
        Some(PropValue::Array(arr)) if arr.len() == 4 => {
            [to_f64(&arr[0]), to_f64(&arr[1]), to_f64(&arr[2]), to_f64(&arr[3])]
        }
        Some(PropValue::Number(n)) => [*n, *n, *n, *n],
        _ => [0.0, 0.0, 0.0, 0.0],
    }
}

/// Extract a background from a component's style or props.
///
/// Checks (in order):
/// 1. `style.skin` → SVG skin
/// 2. `style.background` → structured BackgroundConfig (solid color, asset, etc.)
/// 3. `props.skin` → SVG skin (legacy)
/// 4. `props.asset` → SVG skin (Decoration component)
/// 5. `props.background` → PropValue::Object with `{ type, color }`
fn extract_background(node: &ComponentNode) -> Option<RenderBackground> {
    // 1. style.skin (structured)
    if let Some(ref style) = node.style {
        if let Some(ref skin) = style.skin {
            return Some(RenderBackground::Svg(skin.clone(), Insets::default()));
        }
        if let Some(ref bg) = style.background {
            match bg.bg_type.as_str() {
                "solid" => {
                    if let Some(ref color) = bg.color {
                        return Some(RenderBackground::Solid(color.clone()));
                    }
                }
                "gradient" => {
                    // TODO: extract gradient stops from background config
                }
                _ => {}
            }
        }
    }

    // 2. props.skin (legacy)
    if let Some(PropValue::String(skin)) = node.props.get("skin") {
        return Some(RenderBackground::Svg(skin.clone(), Insets::default()));
    }

    // 3. props.asset (Decoration component — treat as SVG skin)
    if let Some(PropValue::String(asset)) = node.props.get("asset") {
        return Some(RenderBackground::Svg(asset.clone(), Insets::default()));
    }

    // 4. props.background as PropValue::Object { type: "solid", color: "..." }
    if let Some(PropValue::Object(obj)) = node.props.get("background") {
        if let Some(PropValue::String(bg_type)) = obj.get("type") {
            match bg_type.as_str() {
                "solid" => {
                    if let Some(PropValue::String(color)) = obj.get("color") {
                        return Some(RenderBackground::Solid(color.clone()));
                    }
                }
                _ => {}
            }
        }
    }

    None
}

/// Produce a [`TextRun`] for known text component types.
///
/// Reads font, color, weight, lineHeight, and letter-spacing from the
/// component's `props` map, resolving color values through the
/// [`ThemeContext`]. The `content` field is left empty; it is filled at
/// render time from live chat data.
///
/// Returns `None` for non-text components.
fn extract_text(node: &ComponentNode, ctx: &ThemeContext) -> Option<TextRun> {
    match node.component_type.as_str() {
        "Author" => {
            let font = get_string_prop(node, "font")
                .map(|f| ctx.resolve_font(&f))
                .unwrap_or_else(|| ctx.resolve_font("font"));
            let color = get_string_prop(node, "color")
                .map(|c| ctx.resolve_token(&c))
                .unwrap_or_else(|| ctx.resolve_token_with_default("color", "#FFFFFF"));
            let font_weight = get_f64_prop(node, "weight").unwrap_or(600.0) as u32;
            let line_height = get_f64_prop(node, "lineHeight").unwrap_or(1.0);
            let letter_spacing = get_f64_prop(node, "spacing").unwrap_or(0.0);
            let font_size = get_f64_prop(node, "fontSize").unwrap_or(14.0);
            Some(TextRun {
                content: String::new(),
                font,
                color,
                font_size,
                font_weight,
                line_height,
                letter_spacing,
            })
        }
        "Content" => {
            let font = get_string_prop(node, "font")
                .map(|f| ctx.resolve_font(&f))
                .unwrap_or_else(|| ctx.resolve_font("font"));
            let color = get_string_prop(node, "color")
                .map(|c| ctx.resolve_token(&c))
                .unwrap_or_else(|| ctx.resolve_token_with_default("text", "#FFFFFF"));
            let font_weight = get_f64_prop(node, "weight").unwrap_or(400.0) as u32;
            let line_height = get_f64_prop(node, "lineHeight").unwrap_or(1.4);
            let letter_spacing = get_f64_prop(node, "spacing").unwrap_or(0.0);
            let font_size = get_f64_prop(node, "fontSize").unwrap_or(14.0);
            Some(TextRun {
                content: String::new(),
                font,
                color,
                font_size,
                font_weight,
                line_height,
                letter_spacing,
            })
        }
        _ => None,
    }
}

/// Coerce a [`PropValue`] into an `f64`, returning `0.0` for non-numbers.
fn to_f64(v: &PropValue) -> f64 {
    match v {
        PropValue::Number(n) => *n,
        _ => 0.0,
    }
}

/// Extract a string value from a component's props map.
fn get_string_prop(node: &ComponentNode, key: &str) -> Option<String> {
    match node.props.get(key) {
        Some(PropValue::String(s)) => Some(s.clone()),
        _ => None,
    }
}

/// Extract a numeric value from a component's props map.
fn get_f64_prop(node: &ComponentNode, key: &str) -> Option<f64> {
    match node.props.get(key) {
        Some(PropValue::Number(n)) => Some(*n),
        _ => None,
    }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::monkeywork::scene_graph::*;
    use crate::monkeywork::tokens::ThemeContext;
    use std::collections::HashMap;

    fn make_message_node(skin: &str, padding: Vec<f64>) -> ComponentNode {
        ComponentNode {
            id: None,
            component_type: "MessageBubble".into(),
            props: {
                let mut m = HashMap::new();
                m.insert("skin".into(), PropValue::String(skin.into()));
                m.insert(
                    "padding".into(),
                    PropValue::Array(padding.into_iter().map(PropValue::Number).collect()),
                );
                m
            },
            structure: None,
            style: None,
            behavior: None,
            children: vec![ComponentNode {
                id: None,
                component_type: "Content".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![],
            }],
        }
    }

    #[test]
    fn compute_message_dimensions() {
        let ctx = ThemeContext::new();
        let node = make_message_node("solid", vec![8.0, 12.0, 8.0, 12.0]);
        let render = layout_node(&node, &ctx, 0.0, 0.0, 400.0);

        // Width should be parent width (400)
        assert_eq!(render.width, 400.0);
        // Height should account for padding (8 + 8 = 16 minimum)
        assert!(render.height >= 16.0);
    }

    #[test]
    fn apply_padding() {
        let ctx = ThemeContext::new();
        let node = make_message_node("solid", vec![10.0, 20.0, 10.0, 20.0]);
        let render = layout_node(&node, &ctx, 0.0, 0.0, 400.0);

        // Content area should be inset by padding
        assert!(!render.children.is_empty());
        let child = &render.children[0];
        assert_eq!(child.x, 20.0); // left padding
        assert_eq!(child.y, 10.0); // top padding
    }

    #[test]
    fn layout_nested_components() {
        let ctx = ThemeContext::new();
        let scene = SceneGraph {
            version: 1,
            theme: ThemeMeta {
                id: "t".into(),
                name: "T".into(),
                author: "A".into(),
            },
            variables: HashMap::new(),
            chat: ChatConfig {
                direction: "bottom-up".into(),
                spacing: 8.0,
                max_messages: 10,
            },
            scene: ComponentNode {
                id: None,
                component_type: "ChatRoot".into(),
                props: HashMap::new(),
                structure: None,
                style: None,
                behavior: None,
                children: vec![ComponentNode {
                    id: None,
                    component_type: "MessageList".into(),
                    props: HashMap::new(),
                    structure: None,
                    style: None,
                    behavior: None,
                    children: vec![make_message_node("solid", vec![8.0, 12.0, 8.0, 12.0])],
                }],
            },
        };

        let render = layout_scene(&scene, &ctx, 400.0, 600.0);
        assert_eq!(render.component_type, "ChatRoot");
        assert!(!render.children.is_empty());
    }

    #[test]
    fn position_nodes_sequentially() {
        let ctx = ThemeContext::new();
        let nodes = vec![
            make_message_node("solid", vec![8.0, 12.0, 8.0, 12.0]),
            make_message_node("solid", vec![8.0, 12.0, 8.0, 12.0]),
        ];

        let renders = layout_message_list(&nodes, &ctx, 400.0, 0.0);
        assert_eq!(renders.len(), 2);
        // Second message should be below first
        assert!(renders[1].y > renders[0].y);
    }
}
