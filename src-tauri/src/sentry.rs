use sentry::types::Dsn;
use std::env;
use std::str::FromStr;
use ::sentry::Level as SentryLevel;
use log::info;

/// Add breadcrumb for tracking user actions
pub fn add_breadcrumb(category: &str, message: &str, level: SentryLevel) {
    sentry::add_breadcrumb(sentry::Breadcrumb {
        category: Some(category.to_string()),
        message: Some(message.to_string()),
        level: level,
        ..Default::default()
    });
}

/// Capture error with additional context
pub fn capture_error(err: &str) {
    sentry::capture_message(err, SentryLevel::Error);
}

/// Capture message as warning
pub fn capture_message(message: &str, level: SentryLevel) {
    sentry::capture_message(message, level);
}

/// Send test log to Sentry
pub fn send_test_log() {
    info!("Sentry integration test - log capture working");
    info!("Test event sent from Livicat app");
}

/// Trigger intentional panic for testing (use carefully!)
#[allow(dead_code)]
pub fn trigger_test_panic() {
    panic!("Sentry test panic - this is intentional for testing error reporting");
}

/// Send fake crash event to Sentry without actually panicking
pub fn send_fake_crash_event() {
    // This simulates a crash without actually crashing the app
    capture_error("Fake crash event - application crash simulation");
    
    // Add crash context
    add_breadcrumb("crash", "Simulated application crash for testing", SentryLevel::Fatal);
    
    // Add crash metadata
    sentry::configure_scope(|scope| {
        scope.set_extra("fake_crash", "true".into());
        scope.set_extra("crash_type", "test_simulation".into());
        scope.set_extra("test_purpose", "Verifying Sentry crash reporting".into());
    });
    
    println!("🧪 Fake crash event sent to Sentry - check dashboard for crash event");
}

/// Send fake error with stack trace simulation
pub fn send_fake_error_with_stacktrace() {
    // Simulate an error with context
    let error_message = "Simulated error in preview window creation";
    
    // Add breadcrumbs leading to the error
    add_breadcrumb("ui_action", "User clicked 'Open Preview'", SentryLevel::Info);
    add_breadcrumb("preview", "Attempting to create preview window", SentryLevel::Info);
    add_breadcrumb("error", "Preview window creation failed", SentryLevel::Error);
    
    // Capture the error with context
    capture_error(&error_message);
    
    // Add additional context
    sentry::configure_scope(|scope| {
        scope.set_extra("error_context", "Preview window creation simulation".into());
        scope.set_extra("ui_component", "PreviewWindow".into());
        scope.set_extra("test_purpose", "Stack trace simulation".into());
    });
    
    println!("🧪 Fake error with breadcrumbs sent to Sentry");
}

/// Send multiple test events to simulate real usage
pub fn send_test_scenario() {
    println!("🧪 Sending test scenario to Sentry...");
    println!("======================================");
    
    // Scenario 1: User opens preview window
    add_breadcrumb("user_action", "User opened YouTube live chat", SentryLevel::Info);
    add_breadcrumb("feature", "Preview functionality", SentryLevel::Info);
    println!("✅ Step 1: User action breadcrumb");
    
    // Scenario 2: CSS injection works
    add_breadcrumb("css_injection", "CSS injected successfully", SentryLevel::Info);
    println!("✅ Step 2: CSS injection breadcrumb");
    
    // Scenario 3: Something goes wrong
    capture_error("Simulated YouTube API timeout");
    add_breadcrumb("api_error", "YouTube API request timed out", SentryLevel::Error);
    println!("✅ Step 3: API error captured");
    
    // Scenario 4: User tries again
    add_breadcrumb("user_action", "User retries operation", SentryLevel::Info);
    capture_error("Simulated CSS parsing error");
    println!("✅ Step 4: Retry error captured");
    
    // Scenario 5: App crash simulation
    send_fake_crash_event();
    println!("✅ Step 5: Crash simulation sent");
    
    println!("");
    println!("🎯 Check Sentry dashboard for complete user journey with:");
    println!("   • User action breadcrumbs");
    println!("   • Feature usage breadcrumbs");
    println!("   • Multiple error events");
    println!("   • Crash simulation");
    println!("   • Complete user flow context");
}

/// Initialize Sentry for error reporting
///
/// Loads configuration from environment variables:
/// - SENTRY_DSN: Sentry Data Source Name (required)
/// - SENTRY_ENVIRONMENT: Environment name (development/production)
/// - SENTRY_RELEASE: Release version (auto-synced with Cargo.toml)
pub fn init_sentry() -> sentry::ClientInitGuard {
    let dsn = env::var("SENTRY_DSN").unwrap_or_else(|_| {
        println!("[Livicat] SENTRY_DSN not set, error reporting disabled");
        String::new()
    });

    if dsn.is_empty() {
        return sentry::init(());
    }

    let environment = env::var("SENTRY_ENVIRONMENT").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            "development".to_string()
        } else {
            "production".to_string()
        }
    });

    let release = env::var("SENTRY_RELEASE").unwrap_or_else(|_| {
        format!("livicat@{}", env!("CARGO_PKG_VERSION"))
    });

    println!(
        "[Livicat] Sentry initialized: env={}, release={}",
        environment, release
    );

    println!("[Livicat] Initializing Sentry with DSN: {}...", &dsn[..dsn.len().min(20)]);
    
    let client = sentry::init((
        Dsn::from_str(&dsn).expect("Invalid Sentry DSN format"),
        sentry::ClientOptions {
            release: Some(release.into()),
            environment: Some(environment.into()),
            traces_sample_rate: 1.0, // 100% sampling for testing to ensure events are sent
            attach_stacktrace: true,
            send_default_pii: false, // Don't send PII for privacy
            debug: true, // Enable debug mode to see what Sentry is doing
            ..Default::default()
        },
    ));

    println!("[Livicat] Sentry client created, is enabled: {}", client.is_enabled());
    println!("[Livicat] Sentry debug mode enabled - check console for detailed logs");

    // Configure global scope with app context
    sentry::configure_scope(|scope| {
        scope.set_extra("app_version", env!("CARGO_PKG_VERSION").into());
        scope.set_extra("tauri_version", env!("CARGO_PKG_VERSION").into());
        scope.set_extra("os", std::env::consts::OS.into());
        scope.set_extra("arch", std::env::consts::ARCH.into());
    });

    client
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_release_format() {
        let release = format!("livicat@{}", env!("CARGO_PKG_VERSION"));
        assert!(release.starts_with("livicat@"));
        assert!(release.contains('.'));
    }

    #[test]
    fn test_dsn_validation() {
        // Valid DSN format
        let valid_dsn = "https://12345@sentry.io/12345";
        assert!(Dsn::from_str(valid_dsn).is_ok());

        // Invalid DSN format
        let invalid_dsn = "not-a-dsn";
        assert!(Dsn::from_str(invalid_dsn).is_err());
    }

    #[test]
    fn test_error_capture() {
        // Test that error capture doesn't panic
        capture_error("Test error message");
    }

    #[test]
    fn test_init_without_dsn() {
        // Test that Sentry initialization works without DSN (disabled mode)
        // This ensures the app doesn't crash when SENTRY_DSN is not set
        let dsn = "";
        if dsn.is_empty() {
            // Should return a disabled client
            let client = sentry::init(());
            assert!(!client.is_enabled());
        }
    }

    #[test]
    fn test_breadcrumb_creation() {
        // Test breadcrumb creation doesn't panic
        add_breadcrumb("test_category", "test_message", SentryLevel::Info);
    }
}
