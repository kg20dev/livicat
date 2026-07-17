#[cfg(test)]
mod tests {
    use super::super::scene_graph::SceneGraph;
    use super::super::tokens::ThemeContext;
    use super::super::validation;
    use super::super::layout;
    use super::super::renderer;
    use serde_json::json;

    #[test]
    fn full_pipeline_parse_validate_layout_render() {
        let json = json!({
            "version": 1,
            "theme": { "id": "test", "name": "Test", "author": "A" },
            "variables": { "primary": "#FF0000" },
            "chat": { "direction": "bottom-up", "spacing": 8, "maxMessages": 10 },
            "scene": {
                "type": "ChatRoot",
                "children": [{
                    "type": "MessageList",
                    "children": [{
                        "type": "Message",
                        "children": [
                            { "type": "Avatar", "props": { "size": 48 } },
                            {
                                "type": "MessageBubble",
                                "props": { "skin": "skins/bubble.svg", "padding": [18, 24, 18, 24] }
                            }
                        ]
                    }]
                }]
            }
        });

        // Parse
        let scene: SceneGraph = serde_json::from_value(json).unwrap();
        assert_eq!(scene.version, 1);

        // Validate
        let validation_result = validation::validate(&scene).unwrap();
        assert!(validation_result.valid);

        // Layout
        let ctx = ThemeContext::from_variables(&scene.variables);
        let render_tree = layout::layout_scene(&scene, &ctx, 400.0, 600.0);
        assert_eq!(render_tree.component_type, "ChatRoot");

        // Render
        let (html, css) = renderer::render(&render_tree);
        assert!(html.contains("lc-chat"));
        assert!(css.contains("background:url(skins/bubble.svg)"));
    }

    /// Phase 8 — Phantom proof-of-concept.
    ///
    /// Drives the full pipeline (parse → validate → layout → render) against a
    /// real-world `.livi` scene graph on disk, reproducing the Phantom theme
    /// (Persona 5 jagged ribbon plates + tilted name flag).
    ///
    /// The author name and message body are rendered as skinned SVGs
    /// (`phantom-flag.svg`, `phantom-message.svg`), matching how the live
    /// Phantom theme paints its ribbons. Token resolution is verified directly
    /// through the [`ThemeContext`], which is the surface that resolves design
    /// tokens at render time.
    #[test]
    fn phantom_poc_parse_validate_render() {
        // The `.livi` file lives at the workspace root under `docs/v1/examples/`.
        // `CARGO_MANIFEST_DIR` points at the `src-tauri` crate, so step up one
        // level to reach the workspace root regardless of the test CWD.
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../docs/v1/examples/phantom.livi"
        );
        let json = std::fs::read_to_string(path)
            .expect("Failed to read phantom.livi");

        // Parse
        let scene: SceneGraph = serde_json::from_str(&json)
            .expect("Failed to parse phantom.livi");

        assert_eq!(scene.version, 1);
        assert_eq!(scene.theme.id, "phantom");
        assert_eq!(scene.scene.component_type, "ChatRoot");

        // Validate
        let result = validation::validate(&scene)
            .expect("Validation failed");
        assert!(result.valid, "Validation errors: {:?}", result.errors);

        // Layout
        let ctx = ThemeContext::from_variables(&scene.variables);
        let render_tree = layout::layout_scene(&scene, &ctx, 400.0, 600.0);
        assert_eq!(render_tree.component_type, "ChatRoot");
        assert!(!render_tree.children.is_empty());

        // Render
        let (html, css) = renderer::render(&render_tree);
        assert!(html.contains("lc-chat"));
        assert!(!css.is_empty());

        // Verify Phantom design tokens resolved through the theme context.
        assert_eq!(ctx.resolve_token("p5-red"), "#e3242b");
        assert_eq!(ctx.resolve_token("flag-fill"), "#0d0d0d");
        assert_eq!(ctx.resolve_spacing("spacing-lg"), 16.0);

        // Verify the Phantom skins were rendered into the stylesheet.
        assert!(css.contains("skins/phantom-flag.svg"));
        assert!(css.contains("skins/phantom-message.svg"));
    }

    /// Dump the engine HTML/CSS output for manual inspection.
    #[test]
    #[ignore] // run with --ignored to see output
    fn dump_phantom_output() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../src/marketplace/theme/installed/phantom.livicat/project.livi"
        );
        let json = std::fs::read_to_string(path).expect("Failed to read project.livi");
        let scene: SceneGraph = serde_json::from_str(&json).expect("Failed to parse");
        let ctx = ThemeContext::from_variables(&scene.variables);
        let render_tree = layout::layout_scene(&scene, &ctx, 400.0, 600.0);
        let (html, css) = renderer::render(&render_tree);
        eprintln!("=== ENGINE HTML ===");
        eprintln!("{}", html);
        eprintln!("\n=== ENGINE CSS ===");
        eprintln!("{}", css);
    }

    /// Read and render the marketplace .livicat project.livi for comparison
    /// against the real Phantom theme.css.
    #[test]
    fn marketplace_phantom_project_livi() {
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../src/marketplace/theme/installed/phantom.livicat/project.livi"
        );
        let json = std::fs::read_to_string(path)
            .expect("Failed to read project.livi");

        let scene: SceneGraph = serde_json::from_str(&json)
            .expect("Failed to parse project.livi");

        assert_eq!(scene.version, 1);
        assert_eq!(scene.theme.id, "phantom");

        let result = validation::validate(&scene).expect("Validation failed");
        assert!(result.valid, "Validation errors: {:?}", result.errors);

        let ctx = ThemeContext::from_variables(&scene.variables);
        let render_tree = layout::layout_scene(&scene, &ctx, 400.0, 600.0);
        let (_html, css) = renderer::render(&render_tree);

        // Verify skins rendered
        assert!(css.contains("skins/phantom-flag.svg"));
        assert!(css.contains("skins/phantom-message.svg"));
        // phantom-tail.svg is extracted via props.asset (Decoration component)
        assert!(css.contains("skins/phantom-tail.svg"));
    }
}
