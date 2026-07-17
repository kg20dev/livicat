//! Theme context and token resolution.
//!
//! [`ThemeContext`] is the lookup table used by the renderer to resolve design
//! tokens (colors, spacing, fonts) at render time. It is built from a scene
//! graph's `variables` map, splitting the polymorphic [`VariableValue`] entries
//! into typed buckets for fast resolution.

use std::collections::HashMap;

use crate::monkeywork::scene_graph::VariableValue;

/// A resolved theme token store.
///
/// Holds typed buckets for colors, spacing, and fonts, alongside the raw
/// [`VariableValue`] map it was built from. Resolution falls back to the
/// provided key (or a default) when a token is undefined.
#[derive(Debug, Clone)]
pub struct ThemeContext {
    /// Color tokens (e.g. `"primary"` → `"#D50032"`).
    pub colors: HashMap<String, String>,
    /// Numeric spacing tokens (e.g. `"spacing-sm"` → `8.0`).
    pub spacing: HashMap<String, f64>,
    /// Font family tokens (e.g. `"font-heading"` → `"Persona"`).
    pub fonts: HashMap<String, String>,
    /// The raw variable values the context was built from.
    pub raw: HashMap<String, VariableValue>,
}

impl ThemeContext {
    /// Create an empty theme context with no tokens defined.
    pub fn new() -> Self {
        Self {
            colors: HashMap::new(),
            spacing: HashMap::new(),
            fonts: HashMap::new(),
            raw: HashMap::new(),
        }
    }

    /// Build a [`ThemeContext`] from a raw variable map.
    ///
    /// Each [`VariableValue`] is classified into the appropriate typed bucket:
    /// colors, numbers (spacing), or plain strings (fonts).
    pub fn from_variables(vars: &HashMap<String, VariableValue>) -> Self {
        let mut ctx = Self::new();
        for (key, value) in vars {
            ctx.raw.insert(key.clone(), value.clone());
            match value {
                VariableValue::Color(c) => {
                    ctx.colors.insert(key.clone(), c.clone());
                }
                VariableValue::Number(n) => {
                    ctx.spacing.insert(key.clone(), *n);
                }
                VariableValue::String(s) => {
                    ctx.fonts.insert(key.clone(), s.clone());
                }
            }
        }
        ctx
    }

    /// Resolve a string token, checking colors first, then fonts.
    ///
    /// Returns the raw `key` unchanged when no token is defined, so callers
    /// can detect unresolved tokens by comparing input and output.
    pub fn resolve_token(&self, key: &str) -> String {
        self.colors
            .get(key)
            .or_else(|| self.fonts.get(key))
            .cloned()
            .unwrap_or_else(|| key.to_string())
    }

    /// Resolve a numeric spacing token, returning `0.0` when undefined.
    pub fn resolve_spacing(&self, key: &str) -> f64 {
        self.spacing.get(key).copied().unwrap_or(0.0)
    }

    /// Resolve a font family token, returning the raw `key` when undefined.
    pub fn resolve_font(&self, key: &str) -> String {
        self.fonts
            .get(key)
            .cloned()
            .unwrap_or_else(|| key.to_string())
    }

    /// Resolve a string token, returning `default` when undefined.
    pub fn resolve_token_with_default(&self, key: &str, default: &str) -> String {
        self.colors
            .get(key)
            .or_else(|| self.fonts.get(key))
            .cloned()
            .unwrap_or_else(|| default.to_string())
    }

    /// Resolve a spacing token, returning `default` when undefined.
    pub fn resolve_spacing_with_default(&self, key: &str, default: f64) -> f64 {
        self.spacing.get(key).copied().unwrap_or(default)
    }
}

impl Default for ThemeContext {
    fn default() -> Self {
        Self::new()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_color_token() {
        let mut ctx = ThemeContext::new();
        ctx.colors.insert("primary".into(), "#D50032".into());

        let resolved = ctx.resolve_token("primary");
        assert_eq!(resolved, "#D50032");
    }

    #[test]
    fn resolve_spacing_token() {
        let mut ctx = ThemeContext::new();
        ctx.spacing.insert("sm".into(), 8.0);

        let resolved = ctx.resolve_spacing("sm");
        assert_eq!(resolved, 8.0);
    }

    #[test]
    fn resolve_font_token() {
        let mut ctx = ThemeContext::new();
        ctx.fonts.insert("heading".into(), "Persona".into());

        let resolved = ctx.resolve_font("heading");
        assert_eq!(resolved, "Persona");
    }

    #[test]
    fn undefined_token_returns_raw() {
        let ctx = ThemeContext::new();
        let resolved = ctx.resolve_token("nonexistent");
        assert_eq!(resolved, "nonexistent");
    }

    #[test]
    fn build_from_variables() {
        let mut vars = HashMap::new();
        vars.insert("primary".into(), VariableValue::Color("#FF0000".into()));
        vars.insert("spacing-sm".into(), VariableValue::Number(8.0));
        vars.insert(
            "font-heading".into(),
            VariableValue::String("Inter".into()),
        );

        let ctx = ThemeContext::from_variables(&vars);
        assert_eq!(ctx.resolve_token("primary"), "#FF0000");
        assert_eq!(ctx.resolve_spacing("spacing-sm"), 8.0);
        assert_eq!(ctx.resolve_font("font-heading"), "Inter");
    }

    #[test]
    fn user_overrides_defaults() {
        let mut vars = HashMap::new();
        vars.insert("primary".into(), VariableValue::Color("#0000FF".into()));

        let ctx = ThemeContext::from_variables(&vars);
        assert_eq!(ctx.resolve_token("primary"), "#0000FF");
    }

    #[test]
    fn resolve_color_with_default() {
        let ctx = ThemeContext::new();
        let resolved = ctx.resolve_token_with_default("primary", "#FFFFFF");
        assert_eq!(resolved, "#FFFFFF");
    }

    #[test]
    fn resolve_spacing_with_default() {
        let ctx = ThemeContext::new();
        let resolved = ctx.resolve_spacing_with_default("sm", 8.0);
        assert_eq!(resolved, 8.0);
    }
}
