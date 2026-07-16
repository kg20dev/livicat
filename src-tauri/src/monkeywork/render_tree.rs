//! Render Tree intermediate representation for the Monkeywork engine.
//!
//! [`RenderNode`] is the output of the layout engine — a positioned, styled
//! tree ready to be rasterized or emitted as DOM/CSS. Each node carries an
//! absolute position, resolved dimensions, an optional background, an optional
//! text run, and children.

// ---------------------------------------------------------------------------
// Render tree types
// ---------------------------------------------------------------------------

/// A single node in the render tree.
///
/// Coordinates (`x`, `y`) are absolute offsets from the top-left of the scene.
/// `padding` is stored as `[top, right, bottom, left]`.
#[derive(Debug, Clone, Default)]
pub struct RenderNode {
    /// The component type this node was produced from.
    pub component_type: String,
    /// Absolute x offset from the left edge of the scene, in pixels.
    pub x: f64,
    /// Absolute y offset from the top edge of the scene, in pixels.
    pub y: f64,
    /// Resolved width, in pixels.
    pub width: f64,
    /// Resolved height, in pixels.
    pub height: f64,
    /// Optional background (solid color, gradient, SVG skin, or 9-slice).
    pub background: Option<RenderBackground>,
    /// Padding `[top, right, bottom, left]`, in pixels.
    pub padding: [f64; 4],
    /// Child render nodes.
    pub children: Vec<RenderNode>,
    /// Optional text run for leaf text nodes.
    pub text: Option<TextRun>,
}

/// A styled run of text attached to a render node.
#[derive(Debug, Clone)]
pub struct TextRun {
    /// The text content (filled at render time from live chat data).
    pub content: String,
    /// Font family.
    pub font: String,
    /// Text color (CSS color string).
    pub color: String,
    /// Font size, in pixels.
    pub font_size: f64,
    /// Font weight (e.g. 400, 600).
    pub font_weight: u32,
    /// Line height multiplier.
    pub line_height: f64,
}

/// A resolved background for a render node.
#[derive(Debug, Clone)]
pub enum RenderBackground {
    /// Solid color background.
    Solid(String),
    /// Linear gradient defined by an angle and color stops.
    Gradient {
        /// Gradient angle in degrees.
        direction: f64,
        /// Color stops: `(position, color)` pairs.
        stops: Vec<(f64, String)>,
    },
    /// SVG skin background with content insets.
    Svg(String, Insets),
    /// Nine-slice image background.
    NineSlice {
        /// Path to the image asset.
        asset: String,
        /// Slice configuration.
        slice: Slice,
    },
}

/// Four-sided inset values (top, right, bottom, left).
#[derive(Debug, Clone, Default)]
pub struct Insets {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

/// Four-sided 9-slice values (top, right, bottom, left).
#[derive(Debug, Clone, Default)]
pub struct Slice {
    pub top: f64,
    pub right: f64,
    pub bottom: f64,
    pub left: f64,
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn render_node_defaults() {
        let node = RenderNode::default();
        assert_eq!(node.x, 0.0);
        assert_eq!(node.y, 0.0);
        assert_eq!(node.width, 0.0);
        assert_eq!(node.height, 0.0);
        assert!(node.children.is_empty());
    }

    #[test]
    fn render_node_with_text() {
        let node = RenderNode {
            text: Some(TextRun {
                content: "Hello".into(),
                font: "Inter".into(),
                color: "#FFF".into(),
                font_size: 14.0,
                font_weight: 400,
                line_height: 1.4,
            }),
            ..Default::default()
        };
        assert!(node.text.is_some());
        assert_eq!(node.text.as_ref().unwrap().content, "Hello");
    }
}
