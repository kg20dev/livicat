//! Monkeywork engine — scene graph intermediate representation.
//!
//! This module hosts the types used to parse and represent the compiled
//! scene graph that themes are lowered into. Phase 1 covers the core types
//! and JSON parsing only.

pub mod components;
pub mod errors;
pub mod layout;
pub mod render_tree;
pub mod renderer;
pub mod scene_graph;
pub mod tokens;
pub mod validation;

#[cfg(test)]
mod integration_test;

pub use errors::MonkeyworkError;
pub use scene_graph::*;
