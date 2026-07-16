//! CSS/DOM renderer for the Monkeywork engine.
//!
//! Converts a laid-out [`RenderNode`] tree into an HTML + CSS representation.

pub mod css;

pub use css::{render, render_node_css, render_node_html};
