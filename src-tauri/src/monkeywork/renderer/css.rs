//! CSS renderer for the Monkeywork engine.
//!
//! Converts a [`RenderNode`] tree into an HTML document plus a CSS stylesheet.
//! Each render node becomes a `<div>` with an absolute-positioned CSS rule.

use crate::monkeywork::render_tree::{RenderBackground, RenderNode};

/// Render an entire render tree into `(html, css)`.
///
/// The returned `html` is a complete HTML document with the CSS inlined into a
/// `<style>` tag, and `css` is the stylesheet returned separately for callers
/// that need it on its own.
pub fn render(root: &RenderNode) -> (String, String) {
    let html = render_node_html(root);
    let css = render_all_css(root);
    (wrap_html(&html, &css), css)
}

/// Wrap inner HTML body content and CSS into a full HTML document.
fn wrap_html(inner: &str, css: &str) -> String {
    format!(
        r#"<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
<style>
{css}
</style>
</head>
<body>
<div class="lc-chat">
{inner}
</div>
</body>
</html>"#,
        css = css,
        inner = inner,
    )
}

/// Render a single render node (and its descendants) into nested HTML `<div>`s.
///
/// Text runs become inline `<span>` elements carrying the font/color styles.
pub fn render_node_html(node: &RenderNode) -> String {
    let class = component_to_class(&node.component_type);

    let text_html = if let Some(ref text) = node.text {
        if text.content.is_empty() {
            String::new()
        } else {
            format!(
                "<span style=\"font-family:{};font-size:{}px;font-weight:{};color:{};line-height:{}\">{}</span>",
                text.font, text.font_size, text.font_weight, text.color, text.line_height, text.content
            )
        }
    } else {
        String::new()
    };

    let children_html: String = node
        .children
        .iter()
        .map(render_node_html)
        .collect::<Vec<_>>()
        .join("\n");

    let separator = if children_html.is_empty() { "" } else { "\n" };

    format!(
        "<div class=\"{class}\" data-type=\"{comp}\">\n{text_html}{sep}{children_html}\n</div>",
        class = class,
        comp = node.component_type,
        text_html = text_html,
        sep = separator,
        children_html = children_html,
    )
}

/// Render the CSS for a single node and its descendants, indented by `depth`.
///
/// Properties are indented relative to the selector; children are emitted at
/// `depth + 1`. Recursion happens here, so [`render_all_css`] simply calls this
/// on the root to avoid duplicating child rules.
pub fn render_node_css(node: &RenderNode, depth: usize) -> String {
    let indent = "  ".repeat(depth);
    let class = component_to_class(&node.component_type);
    let mut lines = Vec::new();

    lines.push(format!("{}.{class} {{", indent));

    // Position & dimensions
    lines.push(format!("{}  position:absolute;", indent));
    lines.push(format!("{}  left:{}px;", indent, node.x));
    lines.push(format!("{}  top:{}px;", indent, node.y));
    lines.push(format!("{}  width:{}px;", indent, node.width));
    lines.push(format!("{}  height:{}px;", indent, node.height));

    // Padding [top, right, bottom, left]
    if node.padding.iter().any(|p| *p > 0.0) {
        lines.push(format!(
            "{}  padding:{}px {}px {}px {}px;",
            indent, node.padding[0], node.padding[1], node.padding[2], node.padding[3]
        ));
    }

    // Background
    if let Some(ref bg) = node.background {
        match bg {
            RenderBackground::Solid(color) => {
                lines.push(format!("{}  background:{};", indent, color));
            }
            RenderBackground::Svg(path, _insets) => {
                lines.push(format!("{}  background:url({});", indent, path));
                lines.push(format!("{}  background-size:contain;", indent));
                lines.push(format!("{}  background-repeat:no-repeat;", indent));
            }
            RenderBackground::NineSlice { asset, .. } => {
                lines.push(format!("{}  background:url({});", indent, asset));
                lines.push(format!("{}  background-size:100% 100%;", indent));
            }
            RenderBackground::Gradient { direction, stops } => {
                let stops_str: Vec<String> = stops
                    .iter()
                    .map(|(offset, color)| format!("{}% {}", offset * 100.0, color))
                    .collect();
                lines.push(format!(
                    "{}  background:linear-gradient({}deg, {});",
                    indent,
                    direction,
                    stops_str.join(", ")
                ));
            }
        }
    }

    // Text styles
    if let Some(ref text) = node.text {
        if !text.content.is_empty() {
            lines.push(format!("{}  font-family:{};", indent, text.font));
            lines.push(format!("{}  font-size:{}px;", indent, text.font_size));
            lines.push(format!("{}  font-weight:{};", indent, text.font_weight));
            lines.push(format!("{}  color:{};", indent, text.color));
            lines.push(format!("{}  line-height:{};", indent, text.line_height));
        }
    }

    lines.push(format!("{}}}", indent));

    // Children — recurse at increased depth
    for child in &node.children {
        lines.push(render_node_css(child, depth + 1));
    }

    lines.join("\n")
}

/// Render the complete CSS stylesheet for a render tree.
fn render_all_css(node: &RenderNode) -> String {
    // `render_node_css` already recurses into children, so a single call from
    // the root covers the entire tree without duplication.
    render_node_css(node, 0)
}

/// Convert a PascalCase component type into its CSS class name (`lc-<kebab>`).
fn component_to_class(component_type: &str) -> String {
    format!("lc-{}", to_kebab_case(component_type))
}

/// Convert `PascalCase`/`camelCase` to `kebab-case`.
fn to_kebab_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('-');
        }
        result.push(c.to_lowercase().next().unwrap_or(c));
    }
    result
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use crate::monkeywork::render_tree::*;

    fn make_solid_render(bg_color: &str) -> RenderNode {
        RenderNode {
            component_type: "MessageBubble".into(),
            x: 0.0,
            y: 0.0,
            width: 400.0,
            height: 60.0,
            background: Some(RenderBackground::Solid(bg_color.into())),
            padding: [8.0, 12.0, 8.0, 12.0],
            children: vec![RenderNode {
                component_type: "Content".into(),
                x: 12.0,
                y: 8.0,
                width: 376.0,
                height: 20.0,
                background: None,
                padding: [0.0, 0.0, 0.0, 0.0],
                children: vec![],
                text: Some(TextRun {
                    content: "Hello world".into(),
                    font: "Inter".into(),
                    color: "#FFFFFF".into(),
                    font_size: 14.0,
                    font_weight: 400,
                    line_height: 1.4,
                }),
            }],
            text: None,
        }
    }

    #[test]
    fn render_solid_background() {
        let node = make_solid_render("#FF0000");
        let css = render_node_css(&node, 0);
        assert!(css.contains("background:#FF0000"));
        assert!(css.contains("padding:8px 12px 8px 12px"));
    }

    #[test]
    fn render_svg_background() {
        let node = RenderNode {
            component_type: "MessageBubble".into(),
            x: 0.0,
            y: 0.0,
            width: 400.0,
            height: 60.0,
            background: Some(RenderBackground::Svg(
                "skins/bubble.svg".into(),
                Insets {
                    top: 18.0,
                    right: 24.0,
                    bottom: 18.0,
                    left: 24.0,
                },
            )),
            padding: [18.0, 24.0, 18.0, 24.0],
            children: vec![],
            text: None,
        };
        let css = render_node_css(&node, 0);
        assert!(css.contains("background:url(skins/bubble.svg)"));
    }

    #[test]
    fn render_text_run() {
        let node = RenderNode {
            component_type: "Content".into(),
            x: 0.0,
            y: 0.0,
            width: 200.0,
            height: 20.0,
            background: None,
            padding: [0.0, 0.0, 0.0, 0.0],
            children: vec![],
            text: Some(TextRun {
                content: "Test".into(),
                font: "Inter".into(),
                color: "#FFF".into(),
                font_size: 14.0,
                font_weight: 400,
                line_height: 1.4,
            }),
        };
        let html = render_node_html(&node);
        assert!(html.contains("Test"));
        assert!(html.contains("font-family:Inter"));
        assert!(html.contains("color:#FFF"));
    }

    #[test]
    fn render_full_tree() {
        let root = RenderNode {
            component_type: "ChatRoot".into(),
            x: 0.0,
            y: 0.0,
            width: 400.0,
            height: 100.0,
            background: None,
            padding: [0.0, 0.0, 0.0, 0.0],
            children: vec![make_solid_render("#333333")],
            text: None,
        };
        let (html, css) = render(&root);
        assert!(html.contains("lc-chat"));
        assert!(css.contains("background:#333333"));
    }

    #[test]
    fn indent_css_output() {
        let node = make_solid_render("#FF0000");
        let css = render_node_css(&node, 0);
        // Should have proper indentation
        assert!(css.contains("  "));
    }
}
