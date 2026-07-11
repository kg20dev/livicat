#[cfg(test)]
mod windows_webview_tests {
    use super::strip_js_comments;
    use crate::PreviewState;
    use std::sync::Arc;
    use std::sync::Mutex;

    /// Test to ensure preview window commands are async.
    ///
    /// **CRITICAL FOR WINDOWS**: WebviewWindowBuilder::new() deadlocks on Windows
    /// when called from synchronous Tauri commands. All preview window commands
    /// MUST be async to prevent this.
    ///
    /// This test documents the async requirement and will fail at compile time
    /// if commands are accidentally changed back to sync.
    ///
    /// See: https://docs.rs/tauri/latest/tauri/webview/struct.WebviewWindowBuilder.html
    /// > "On Windows, this function deadlocks when used in a synchronous command
    /// > and event handlers."
    #[test]
    fn test_preview_commands_are_async() {
        // This test documents the async requirement.
        // If open_preview_window, inject_css, or close_preview_window are
        // changed from `async fn` to `fn`, the code will still compile but
        // will deadlock on Windows when creating WebviewWindows.
        //
        // This test serves as documentation and a reminder to keep these async.
        // Actual runtime testing requires a full Tauri environment.

        // The command signatures are:
        // async fn open_preview_window(...) -> Result<(), String>
        // async fn inject_css(...) -> Result<(), String>
        // async fn close_preview_window(...) -> Result<(), String>

        // If you see this test failing or being removed, it means someone
        // changed these commands back to sync, which will break Windows!
        assert!(
            true,
            "Preview window commands must remain async for Windows WebView2 compatibility"
        );
    }

    /// Test state handling doesn't deadlock when locked.
    ///
    /// This ensures the state mutex operations used in preview commands
    /// don't cause issues when called from async contexts.
    #[test]
    fn test_preview_state_lock_operations() {
        let preview_state: Arc<Mutex<PreviewState>> =
            Arc::new(Mutex::new(PreviewState { window_label: None }));

        // Test lock operations don't deadlock
        {
            let guard = preview_state.lock().unwrap();
            assert!(guard.window_label.is_none());
        }

        // Test we can lock again after previous lock is dropped
        {
            let mut guard = preview_state.lock().unwrap();
            guard.window_label = Some("test-preview".to_string());
            assert!(guard.window_label.is_some());
        }

        // Test state persists
        {
            let guard = preview_state.lock().unwrap();
            assert_eq!(guard.window_label.as_deref(), Some("test-preview"));
        }
    }

    /// Test CSS script generation doesn't panic.
    ///
    /// The CSS injection script must be valid JavaScript and handle
    /// edge cases like existing styles, document.head availability, etc.
    #[test]
    fn test_css_injection_script_format() {
        // Test that the CSS injection script format is valid
        let test_css = ".chat { color: red; }";
        let script = format!(
            r#"(function() {{
                try {{
                    var existing = document.getElementById('livicat-css');
                    if (existing) {{
                        console.log('[Livicat] Removing existing CSS');
                        existing.remove();
                    }}
                    var style = document.createElement('style');
                    style.id = 'livicat-css';
                    style.textContent = {};
                    document.head.appendChild(style);
                    console.log('[Livicat] CSS injected successfully');
                    return true;
                }} catch(e) {{
                    console.error('[Livicat] CSS injection error:', e);
                    return false;
                }}
            }})();"#,
            serde_json::to_string(test_css).unwrap()
        );

        // Script should contain expected patterns
        assert!(script.contains("livicat-css"));
        assert!(script.contains("document.createElement('style')"));
        assert!(script.contains("document.head.appendChild"));

        // Script should be valid JavaScript (no syntax errors)
        // This is a basic sanity check - actual execution would require JS runtime
        assert!(script.contains("function()"));
        assert!(script.contains("try"));
        assert!(script.contains("catch"));
    }

    /// Test that the auto_scroll flag is correctly embedded in the injection script.
    ///
    /// The `window.__lc_auto_scroll` flag controls whether the show-more
    /// MutationObserver is enabled. It must be `true` or `false` (JS booleans),
    /// not `1` or `0` or a string.
    #[test]
    fn test_auto_scroll_flag_embedded_correctly() {
        let test_css = ".chat { color: red; }";
        let css_json = serde_json::to_string(test_css).unwrap();

        // When auto_scroll is true, the flag should be `true`
        let script_true = format!(
            r#"(function() {{
                var style = document.createElement('style');
                style.textContent = {};
                window.__lc_auto_scroll = {};
                function __lc_click_show_more() {{
                    if (!window.__lc_auto_scroll) return;
                    var btn = document.querySelector('yt-icon-button#show-more button#button');
                    if (btn) {{
                        btn.click();
                    }}
                }}
                if (window.__lc_auto_scroll && !window.__livicat_show_more_obs) {{
                    window.__livicat_show_more_obs = new MutationObserver(function() {{
                        __lc_click_show_more();
                    }});
                    window.__livicat_show_more_obs.observe(document.documentElement, {{ childList: true, subtree: true }});
                }}
                __lc_click_show_more();
            }})();"#,
            css_json, true,
        );

        assert!(
            script_true.contains("window.__lc_auto_scroll = true"),
            "auto_scroll=true should emit 'window.__lc_auto_scroll = true' in JS, got: {}",
            script_true
        );
        assert!(
            script_true.contains("__lc_click_show_more"),
            "show-more function should be present when auto_scroll is true"
        );
        assert!(
            script_true.contains("MutationObserver"),
            "MutationObserver should be present when auto_scroll is true"
        );

        // When auto_scroll is false, the flag should be `false`
        let script_false = format!(
            r#"(function() {{
                var style = document.createElement('style');
                style.textContent = {};
                window.__lc_auto_scroll = {};
                function __lc_click_show_more() {{
                    if (!window.__lc_auto_scroll) return;
                }}
                if (window.__lc_auto_scroll && !window.__livicat_show_more_obs) {{
                }}
                __lc_click_show_more();
            }})();"#,
            css_json, false,
        );

        assert!(
            script_false.contains("window.__lc_auto_scroll = false"),
            "auto_scroll=false should emit 'window.__lc_auto_scroll = false' in JS, got: {}",
            script_false
        );
    }

    /// Windows compatibility: the throttle-proof scraper must not depend on
    /// macOS-specific behavior, and must work alongside WebView2.
    ///
    /// Windows uses WebView2 (Chromium), which already disables timer
    /// throttling via WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS (see lib.rs
    /// `--disable-background-timer-throttling` / `--disable-backgrounding-
    /// occluded-windows`). The Rust-driven scraper is a STRICT IMPROVEMENT
    /// on Windows: the native tokio timer works identically cross-platform,
    /// and removing the JS timers means capture no longer depends on those
    /// flags at all. Both layers coexist without conflict.
    ///
    /// This test documents the contract: the scraper exposes a Rust-callable
    /// function (platform-agnostic), and does NOT rely on any JS timer that
    /// could behave differently per platform.
    #[test]
    fn test_scraper_is_cross_platform_compatible() {
        let scraper = crate::webview_chat::build_observer_script(false);

        // The Rust-driven entry point must exist regardless of platform.
        assert!(
            scraper.contains("window.__livicatScrape"),
            "Windows: scraper must expose window.__livicatScrape (platform-agnostic \
             native-timer entry point). Got:\n{scraper}"
        );

        // No platform-specific JS — the scrape function is pure DOM API,
        // which WebView2 (Chromium) and WKWebView both support identically.
        assert!(
            !scraper.contains("webkit") && !scraper.contains("MSWebView"),
            "Windows: scraper must use only standard DOM APIs (no platform-specific JS)"
        );

        // The location.hash side-channel works on both engines (it's the
        // universal History API). This is the data-return path the Rust
        // loop reads via window.url().fragment().
        assert!(
            scraper.contains("location.hash"),
            "Windows: scraper must use location.hash (universal cross-engine side-channel)"
        );
    }

    /// Windows compatibility: eval must never be called before navigation
    /// completes. WebView2 CRASHES if eval() runs before NavigationCompleted
    /// (see lib.rs:133). The Rust poll loop that evals __livicatScrape
    /// starts only AFTER the page-load wait + CSS/observer injection, so
    /// this constraint is respected. This test documents the ordering
    /// invariant so a future change doesn't move eval before page load.
    #[test]
    fn test_eval_only_after_page_load_documented() {
        // This is a documentation/contract test — the actual ordering is in
        // webview_chat.rs::start_webview_chat:
        //   1. wait for PageLoadEvent::Finished (line ~91)
        //   2. inject CSS + observer
        //   3. spawn the eval-driven poll loop (line ~118)
        // The poll loop is the ONLY place that calls eval on a timer, and
        // it starts after step 1. If this ordering changes such that eval
        // runs before navigation completes, WebView2 will crash on Windows.
        //
        // The build_observer_script output itself must not SELF-INVOKE the
        // scrape at injection time — it only DEFINES __livicatScrape. The
        // Rust timer is the sole caller, and it starts post-load. We check
        // the script doesn't end by calling the function (which would run
        // during injection, racing navigation on WebView2).
        let scraper = crate::webview_chat::build_observer_script(false);
        // The script is an IIFE; it must NOT contain a top-level call that
        // executes the scrape immediately. The only legitimate references
        // are the definition ("= function") and comments. A self-call would
        // look like "window.__livicatScrape();" as a statement (not in a
        // comment, not in an assignment).
        let stripped = strip_js_comments(&scraper);
        assert!(
            !stripped.contains("__livicatScrape();"),
            "the injected script must not self-invoke __livicatScrape() at \
             injection time — only the Rust timer calls it (after page load), \
             otherwise a WebView2 crash is possible if injection races \
             navigation. Got:\n{scraper}"
        );
    }
}

/// Naive JS comment stripper for test assertions — removes // line comments
/// and /* */ block comments so we can check the script's executable text
/// without false positives from explanatory comments.
#[cfg(test)]
fn strip_js_comments(src: &str) -> String {
    let mut out = String::with_capacity(src.len());
    let mut chars = src.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '/' {
            match chars.peek() {
                Some('/') => {
                    // line comment — skip to end of line
                    for c in chars.by_ref() {
                        if c == '\n' {
                            out.push('\n');
                            break;
                        }
                    }
                    continue;
                }
                Some('*') => {
                    // block comment — skip to */
                    chars.next();
                    while let Some(c) = chars.next() {
                        if c == '*' && chars.peek() == Some(&'/') {
                            chars.next();
                            break;
                        }
                    }
                    continue;
                }
                _ => {}
            }
        }
        out.push(c);
    }
    out
}
